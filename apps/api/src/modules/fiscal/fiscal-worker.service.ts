import { setTimeout as sleep } from 'node:timers/promises';
import { Pool, PoolClient } from 'pg';
import { buildBpePayload, BpeSourceData } from './bpe-payload.builder';
import { validateBpeConfig } from './fiscal-config.validator';
import { FiscalStorageService } from './fiscal-storage.service';
import { BpeIntegrationConfig, BpeStatusResponse } from './fiscal.types';
import { NsBpeClient } from './ns-bpe.client';

type ConfigRow = { id: string; versao: number; valor: unknown };

export class FiscalWorkerService {
  private readonly ns = new NsBpeClient();
  private readonly storage = new FiscalStorageService();

  constructor(private readonly pool: Pool) {}

  async listReady(limit = 50) {
    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM bilhete_documento_fiscal
       WHERE status IN ('pendente','processando','contingencia','erro')
         AND COALESCE(proxima_tentativa_em, criado_em) <= now()
       ORDER BY criado_em
       LIMIT $1`,
      [limit],
    );
    return result.rows.map((row) => row.id);
  }

  async process(documentId: string) {
    const configRow = await this.activeConfig();
    if (!configRow) return { skipped: 'configuracao ausente' };
    validateBpeConfig(configRow.valor);
    const config = configRow.valor as BpeIntegrationConfig;
    if (!config.habilitada) return { skipped: 'integracao desabilitada' };
    if (!this.ns.isConfigured()) return this.fail(documentId, config, new Error('BPE_NS_TOKEN nao configurado'));

    try {
      const prepared = await this.prepare(documentId, configRow, config);
      if (!prepared) return { skipped: 'documento ja processado ou fora da fila' };
      let nsNRec = prepared.nsNRec;
      if (!nsNRec) {
        const issue = await this.ns.issue(prepared.payload);
        if (Number(issue.status) !== 200 || !issue.nsNRec) {
          throw new Error(issue.motivo || `NS recusou o envio com status ${issue.status}`);
        }
        nsNRec = String(issue.nsNRec);
        await this.pool.query(
          `UPDATE bilhete_documento_fiscal SET ns_nrec=$2, proxima_tentativa_em=now() WHERE id=$1`,
          [documentId, nsNRec],
        );
      }
      for (let attempt = 0; attempt < config.operacao.tentativasConsulta; attempt += 1) {
        if (attempt > 0) await sleep(config.operacao.pollingSegundos * 1000);
        const status = await this.ns.status(config.emitente.cnpj, nsNRec);
        const outcome = await this.handleStatus(documentId, config, status);
        if (outcome.done) return outcome;
      }
      await this.pool.query(
        `UPDATE bilhete_documento_fiscal
         SET status='processando', proxima_tentativa_em=now()+($2::text || ' minutes')::interval,
             erro='Aguardando processamento da NS/SEFAZ'
         WHERE id=$1`,
        [documentId, config.operacao.retryMinutos],
      );
      return { done: false, status: 'processando' };
    } catch (error) {
      return this.fail(documentId, config, error);
    }
  }

  private async activeConfig(): Promise<ConfigRow | null> {
    const result = await this.pool.query<ConfigRow>(
      `SELECT cv.id, cv.versao, cv.valor
       FROM config_chave cc JOIN config_versao cv ON cv.chave_id=cc.id AND cv.ativo=true
       WHERE cc.chave='vendas_bpe_integracao' AND cc.ativo=true LIMIT 1`,
    );
    return result.rows[0] ?? null;
  }

  private async prepare(documentId: string, configRow: ConfigRow, config: BpeIntegrationConfig) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const fiscal = await client.query<{
        id: string; status: string; ns_nrec: string | null; numero: number | null; tentativas: number;
      }>(
        `SELECT id,status,ns_nrec,numero,tentativas FROM bilhete_documento_fiscal
         WHERE id=$1 AND COALESCE(proxima_tentativa_em,criado_em) <= now()
         FOR UPDATE`,
        [documentId],
      );
      const current = fiscal.rows[0];
      if (!current || !['pendente', 'processando', 'contingencia', 'erro'].includes(current.status)) {
        await client.query('ROLLBACK');
        return null;
      }
      if (current.tentativas >= config.operacao.maxTentativas && current.status === 'erro') {
        await client.query('ROLLBACK');
        return null;
      }
      const number = current.numero ?? await this.reserveNumber(client, config);
      const source = await this.loadSource(client, documentId, number);
      const built = buildBpePayload(config, source);
      const leaseSeconds = Math.max(
        60,
        config.operacao.pollingSegundos * config.operacao.tentativasConsulta + 30,
      );
      await client.query(
        `UPDATE bilhete_documento_fiscal
         SET status='processando', provider='ns', ambiente=$2, serie=$3, numero=$4,
             config_versao_id=$5, tentativas=tentativas+1, processado_em=now(),
             proxima_tentativa_em=now()+($9::text || ' seconds')::interval, erro=NULL,
             payload=jsonb_build_object(
               'configVersao',$6::int,
               'accessKeyPreview',$7::text,
               'nsRequest',$8::jsonb
             )
         WHERE id=$1`,
        [
          documentId,
          config.ambiente === 'producao' ? 1 : 2,
          config.serie,
          number,
          configRow.id,
          configRow.versao,
          built.accessKeyPreview,
          JSON.stringify(built.payload),
          leaseSeconds,
        ],
      );
      await client.query('COMMIT');
      return { payload: built.payload, nsNRec: current.ns_nrec };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async reserveNumber(client: PoolClient, config: BpeIntegrationConfig) {
    await client.query(
      `INSERT INTO bpe_numeracao (cnpj_emitente,ambiente,serie,proximo_numero)
       VALUES ($1,$2,$3,$4) ON CONFLICT (cnpj_emitente,ambiente,serie) DO NOTHING`,
      [config.emitente.cnpj.replace(/\D/g, ''), config.ambiente === 'producao' ? 1 : 2, config.serie, config.numeroInicial],
    );
    await client.query(
      `UPDATE bpe_numeracao SET proximo_numero=GREATEST(proximo_numero,$4), atualizado_em=now()
       WHERE cnpj_emitente=$1 AND ambiente=$2 AND serie=$3`,
      [config.emitente.cnpj.replace(/\D/g, ''), config.ambiente === 'producao' ? 1 : 2, config.serie, config.numeroInicial],
    );
    const sequence = await client.query<{ proximo_numero: number }>(
      `SELECT proximo_numero FROM bpe_numeracao
       WHERE cnpj_emitente=$1 AND ambiente=$2 AND serie=$3 FOR UPDATE`,
      [config.emitente.cnpj.replace(/\D/g, ''), config.ambiente === 'producao' ? 1 : 2, config.serie],
    );
    const number = sequence.rows[0]?.proximo_numero;
    if (!number) throw new Error('Numeracao de BP-e nao inicializada');
    await client.query(
      `UPDATE bpe_numeracao SET proximo_numero=proximo_numero+1, atualizado_em=now()
       WHERE cnpj_emitente=$1 AND ambiente=$2 AND serie=$3`,
      [config.emitente.cnpj.replace(/\D/g, ''), config.ambiente === 'producao' ? 1 : 2, config.serie],
    );
    return number;
  }

  private async loadSource(client: PoolClient, documentId: string, number: number): Promise<BpeSourceData> {
    const result = await client.query<{
      fiscal_id: string; passageiro_nome: string | null; passageiro_documento: string | null;
      classe: string; preco_pago: string; origem_sigla: string; origem_nome: string; origem_uf: string;
      origem_codigo_ibge: string | null; destino_sigla: string; destino_nome: string; destino_uf: string;
      destino_codigo_ibge: string | null; data_hora_saida: Date; troco: string | null;
    }>(
      `SELECT f.id AS fiscal_id,b.passageiro_nome,b.passageiro_documento,b.classe::text,
              COALESCE(b.preco_pago,0)::text AS preco_pago,
              COALESCE(b.origem_sigla,v.origem_sigla) AS origem_sigla,co.nome AS origem_nome,co.uf AS origem_uf,
              co.codigo_ibge AS origem_codigo_ibge,
              COALESCE(b.destino_sigla,v.destino_sigla) AS destino_sigla,cd.nome AS destino_nome,cd.uf AS destino_uf,
              cd.codigo_ibge AS destino_codigo_ibge,v.data_hora_saida,
              COALESCE(vp.troco,0)::text AS troco
       FROM bilhete_documento_fiscal f
       JOIN bilhete b ON b.id=f.bilhete_id
       JOIN viagem v ON v.id=b.viagem_id
       JOIN cidade co ON co.sigla=COALESCE(b.origem_sigla,v.origem_sigla)
       JOIN cidade cd ON cd.sigla=COALESCE(b.destino_sigla,v.destino_sigla)
       LEFT JOIN venda_pos vp ON vp.id=b.venda_pos_id
       WHERE f.id=$1`,
      [documentId],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Bilhete do documento fiscal nao encontrado');
    const payments = await client.query<{ forma_pagamento: string; valor: string }>(
      `SELECT forma_pagamento::text, sum(valor_aplicado)::text AS valor
       FROM venda_pos_pagamento p
       JOIN bilhete b ON b.venda_pos_id=p.venda_pos_id
       JOIN bilhete_documento_fiscal f ON f.bilhete_id=b.id
       WHERE f.id=$1 GROUP BY forma_pagamento
       UNION ALL
       SELECT cm.forma_pagamento::text, cm.valor::text
       FROM bilhete_documento_fiscal f
       JOIN bilhete b ON b.id=f.bilhete_id
       JOIN caixa_movimento cm ON cm.id=b.caixa_movimento_id
       WHERE f.id=$1 AND b.venda_pos_id IS NULL`,
      [documentId],
    );
    const rawPayments = payments.rows.map((payment) => ({ formaPagamento: payment.forma_pagamento, valor: Number(payment.valor) }));
    return {
      fiscalId: row.fiscal_id,
      numero: number,
      passageiroNome: row.passageiro_nome,
      passageiroDocumento: row.passageiro_documento,
      classe: row.classe,
      precoPago: Number(row.preco_pago),
      troco: Number(row.troco ?? 0),
      origemSigla: row.origem_sigla,
      origemNome: row.origem_nome,
      origemUf: row.origem_uf,
      origemCodigoIbge: row.origem_codigo_ibge,
      destinoSigla: row.destino_sigla,
      destinoNome: row.destino_nome,
      destinoUf: row.destino_uf,
      destinoCodigoIbge: row.destino_codigo_ibge,
      dataHoraEmbarque: row.data_hora_saida.toISOString(),
      pagamentos: allocatePayments(rawPayments, Number(row.preco_pago)),
    };
  }

  private async handleStatus(documentId: string, config: BpeIntegrationConfig, response: BpeStatusResponse) {
    const cStat = Number(response.cStat ?? response.erro?.cStat);
    const reason = response.xMotivo ?? response.erro?.xMotivo ?? response.motivo ?? 'Sem detalhe da NS';
    if (cStat === 100 && response.chBPe && response.nProt) {
      const download = await this.ns.download(response.chBPe, config.ambiente === 'producao' ? 1 : 2);
      const xml = download.xml ?? response.xml;
      if (!xml || !download.pdf) throw new Error('NS autorizou, mas nao entregou XML e DABPE completos');
      const prefix = `${config.ambiente}/${response.chBPe}`;
      const xmlObject = await this.storage.put(`${prefix}/bpe.xml`, Buffer.from(xml, 'utf8'), 'application/xml');
      const pdfObject = await this.storage.put(`${prefix}/dabpe.pdf`, Buffer.from(download.pdf, 'base64'), 'application/pdf');
      await this.pool.query(
        `UPDATE bilhete_documento_fiscal
         SET status='autorizado', chave=$2, protocolo=$3, emitido_em=COALESCE($4::timestamptz,now()),
             proxima_tentativa_em=NULL, erro=NULL,
             xml_bucket=$5,xml_objeto_chave=$6,xml_hash_sha256=$7,
             pdf_bucket=$8,pdf_objeto_chave=$9,pdf_hash_sha256=$10
         WHERE id=$1`,
        [documentId, response.chBPe, response.nProt, response.dhRecbto ?? null,
          xmlObject.bucket, xmlObject.key, xmlObject.hash, pdfObject.bucket, pdfObject.key, pdfObject.hash],
      );
      return { done: true, status: 'autorizado', chave: response.chBPe };
    }
    if (cStat === -100) {
      await this.pool.query(
        `UPDATE bilhete_documento_fiscal SET status='contingencia',erro=$2,
         proxima_tentativa_em=now()+($3::text || ' minutes')::interval WHERE id=$1`,
        [documentId, reason, config.operacao.retryMinutos],
      );
      return { done: true, status: 'contingencia' };
    }
    if ([103, 105, 106].includes(cStat) || Number(response.status) < 0 || !Number.isFinite(cStat)) {
      return { done: false, status: 'processando' };
    }
    await this.pool.query(
      `UPDATE bilhete_documento_fiscal SET status='rejeitado',erro=$2,proxima_tentativa_em=NULL WHERE id=$1`,
      [documentId, `cStat ${cStat}: ${reason}`],
    );
    return { done: true, status: 'rejeitado', cStat, reason };
  }

  private async fail(documentId: string, config: BpeIntegrationConfig, error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida na emissao de BP-e';
    await this.pool.query(
      `UPDATE bilhete_documento_fiscal SET status='erro',erro=$2,
       proxima_tentativa_em=CASE WHEN tentativas < $3 THEN now()+($4::text || ' minutes')::interval ELSE NULL END
       WHERE id=$1 AND status NOT IN ('autorizado','cancelado')`,
      [documentId, message, config.operacao.maxTentativas, config.operacao.retryMinutos],
    );
    return { done: true, status: 'erro', error: message };
  }
}

function allocatePayments(payments: Array<{ formaPagamento: string; valor: number }>, ticketValue: number) {
  if (payments.length <= 1) return payments.length ? [{ ...payments[0], valor: ticketValue }] : [];
  const total = payments.reduce((sum, payment) => sum + payment.valor, 0);
  if (total <= 0) return [];
  let allocated = 0;
  return payments.map((payment, index) => {
    const value = index === payments.length - 1
      ? Number((ticketValue - allocated).toFixed(2))
      : Number(((payment.valor / total) * ticketValue).toFixed(2));
    allocated += value;
    return { ...payment, valor: value };
  });
}
