import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { validateBpeConfig } from './fiscal-config.validator';
import { FiscalStorageService } from './fiscal-storage.service';
import { BpeIntegrationConfig } from './fiscal.types';
import { NsBpeClient } from './ns-bpe.client';

@Injectable()
export class FiscalRepository {
  private readonly ns = new NsBpeClient();
  private readonly storage = new FiscalStorageService();

  constructor(private readonly db: DatabaseService) {}

  async readiness() {
    const configRow = await this.activeConfig();
    const missingCities = await this.db.query<{ sigla: string; nome: string }>(
      `SELECT sigla,nome FROM cidade WHERE ativo=true AND codigo_ibge IS NULL ORDER BY nome`,
    );
    let valid = false;
    let error: string | null = null;
    if (configRow) {
      try {
        validateBpeConfig(configRow.valor);
        valid = true;
      } catch (cause) {
        error = cause instanceof Error ? cause.message : 'Configuracao fiscal invalida';
      }
    }
    const value = configRow?.valor as Partial<BpeIntegrationConfig> | undefined;
    return {
      provider: value?.provider ?? 'ns',
      habilitada: value?.habilitada === true,
      ambiente: value?.ambiente ?? null,
      configVersao: configRow?.versao ?? null,
      configuracaoValida: valid,
      erroConfiguracao: error,
      tokenConfigurado: this.ns.isConfigured(),
      webhookConfigurado: Boolean(process.env.BPE_WEBHOOK_USER && process.env.BPE_WEBHOOK_PASSWORD),
      storageConfigurado: Boolean(process.env.OBJECT_STORAGE_ENDPOINT),
      cidadesSemCodigoIbge: missingCities.rows,
      pronta: Boolean(value?.habilitada && valid && this.ns.isConfigured() && process.env.OBJECT_STORAGE_ENDPOINT && !missingCities.rows.length),
    };
  }

  async findByTicket(ticketId: string) {
    const row = await this.db.one(
      `SELECT f.id,f.bilhete_id,f.tipo,f.status,f.provider,f.chave,f.protocolo,f.ns_nrec,
              f.ambiente,f.serie,f.numero,f.tentativas,f.emitido_em,f.cancelado_em,
              f.erro,f.criado_em,f.atualizado_em,
              (f.xml_objeto_chave IS NOT NULL) AS xml_disponivel,
              (f.pdf_objeto_chave IS NOT NULL) AS pdf_disponivel,
              (f.cancelamento_xml_objeto_chave IS NOT NULL) AS cancelamento_xml_disponivel
       FROM bilhete_documento_fiscal f WHERE f.bilhete_id=$1 LIMIT 1`,
      [ticketId],
    );
    if (!row) throw new NotFoundException('Documento fiscal do bilhete nao encontrado');
    return row;
  }

  async reprocess(ticketId: string, userId: string) {
    const row = await this.db.one<{ id: string; status: string }>(
      `UPDATE bilhete_documento_fiscal
       SET status='pendente',erro=NULL,proxima_tentativa_em=now(),tentativas=0
       WHERE bilhete_id=$1 AND status IN ('erro','rejeitado','contingencia','pendente','processando')
       RETURNING id,status`,
      [ticketId],
    );
    if (!row) throw new BadRequestException('O BP-e nao pode ser reprocessado no estado atual');
    await this.audit(row.id, 'reprocessar_bpe', userId, { bilheteId: ticketId });
    return this.findByTicket(ticketId);
  }

  async download(ticketId: string, kind: 'xml' | 'pdf' | 'cancelamento_xml') {
    const columns = kind === 'xml'
      ? ['xml_bucket', 'xml_objeto_chave']
      : kind === 'pdf'
        ? ['pdf_bucket', 'pdf_objeto_chave']
        : ['cancelamento_xml_bucket', 'cancelamento_xml_objeto_chave'];
    const row = await this.db.one<Record<string, string | null>>(
      `SELECT ${columns.join(',')} FROM bilhete_documento_fiscal WHERE bilhete_id=$1`,
      [ticketId],
    );
    const key = row?.[columns[1]];
    if (!key) throw new NotFoundException('Documento fiscal ainda nao esta disponivel');
    try {
      const url = await this.storage.presignedGet(key, 300);
      return { url, expiraEm: new Date(Date.now() + 300_000).toISOString(), tipo: kind };
    } catch (cause) {
      throw new ServiceUnavailableException(cause instanceof Error ? cause.message : 'Falha ao gerar download');
    }
  }

  async cancel(ticketId: string, reason: string, userId: string) {
    if (reason.trim().length < 15) throw new BadRequestException('A justificativa deve ter ao menos 15 caracteres');
    const row = await this.db.tx(async (client) => {
      const result = await client.query<{
        id: string; status: string; chave: string | null; protocolo: string | null; ambiente: number | null;
      }>(
        `SELECT id,status,chave,protocolo,ambiente
         FROM bilhete_documento_fiscal WHERE bilhete_id=$1 FOR UPDATE`,
        [ticketId],
      );
      const current = result.rows[0];
      if (!current) throw new NotFoundException('BP-e nao encontrado');
      if (current.status !== 'autorizado' || !current.chave || !current.protocolo || !current.ambiente) {
        throw new BadRequestException('Somente BP-e autorizado pode ser cancelado');
      }
      await client.query(
        `UPDATE bilhete_documento_fiscal
         SET status='cancelamento_pendente',erro=NULL,atualizado_em=now() WHERE id=$1`,
        [current.id],
      );
      return current;
    });
    try {
      const response = await this.ns.cancel({
        chBPe: row.chave,
        tpAmb: row.ambiente as 1 | 2,
        dhEvento: fiscalDate(new Date()),
        nProt: row.protocolo,
        xJust: reason.trim(),
      });
      const event = response.retEvento;
      if (Number(event?.cStat) !== 135 || !event?.xml || !event.nProt) {
        throw new Error(event?.xMotivo || response.motivo || 'Cancelamento nao autorizado');
      }
      const object = await this.storage.put(
        `${row.ambiente === 1 ? 'producao' : 'homologacao'}/${row.chave}/cancelamento.xml`,
        Buffer.from(event.xml, 'utf8'),
        'application/xml',
      );
      await this.db.query(
        `UPDATE bilhete_documento_fiscal
         SET status='cancelado',cancelamento_protocolo=$2,cancelado_em=COALESCE($3::timestamptz,now()),
             cancelamento_xml_bucket=$4,cancelamento_xml_objeto_chave=$5,cancelamento_xml_hash_sha256=$6,erro=NULL
         WHERE id=$1`,
        [row.id, event.nProt, event.dhRegEvento ?? null, object.bucket, object.key, object.hash],
      );
      await this.audit(row.id, 'cancelar_bpe', userId, { bilheteId: ticketId, justificativa: reason.trim(), protocolo: event.nProt });
      return this.findByTicket(ticketId);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Falha ao cancelar BP-e';
      await this.db.query(`UPDATE bilhete_documento_fiscal SET status='autorizado',erro=$2 WHERE id=$1`, [row.id, message]);
      throw new ServiceUnavailableException(message);
    }
  }

  async processNsWebhook(authorization: string | undefined, payload: Record<string, unknown>) {
    this.assertWebhookAuthorization(authorization);
    const key = String(payload.chBPe ?? '').trim();
    const cStat = Number(payload.cStat);
    const eventId = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const inserted = await this.db.one<{ id: string }>(
      `INSERT INTO bpe_webhook_evento(provider,event_id,chave_bpe,payload)
       VALUES ('ns',$1,$2,$3::jsonb)
       ON CONFLICT(provider,event_id) DO NOTHING RETURNING id`,
      [eventId, key || null, JSON.stringify(payload)],
    );
    if (!inserted) return { ok: true, duplicate: true };
    try {
      if (key) {
        if (cStat === -100) {
          await this.db.query(
            `UPDATE bilhete_documento_fiscal SET status='contingencia',chave=COALESCE(chave,$1),
             erro=$2,proxima_tentativa_em=now()
             WHERE chave=$1 OR payload->>'accessKeyPreview'=$1`,
            [key, String(payload.xMotivo ?? 'BP-e em contingencia')],
          );
        } else {
          await this.db.query(
            `UPDATE bilhete_documento_fiscal SET status='processando',chave=COALESCE(chave,$1),
             proxima_tentativa_em=now(),erro=NULL
             WHERE chave=$1 OR payload->>'accessKeyPreview'=$1`,
            [key],
          );
        }
      }
      await this.db.query(`UPDATE bpe_webhook_evento SET status='processado',processado_em=now() WHERE id=$1`, [inserted.id]);
      return { ok: true };
    } catch (cause) {
      await this.db.query(
        `UPDATE bpe_webhook_evento SET status='erro',erro=$2,processado_em=now() WHERE id=$1`,
        [inserted.id, cause instanceof Error ? cause.message : 'Falha no webhook'],
      );
      throw cause;
    }
  }

  private async activeConfig() {
    return this.db.one<{ id: string; versao: number; valor: unknown }>(
      `SELECT cv.id,cv.versao,cv.valor FROM config_chave cc
       JOIN config_versao cv ON cv.chave_id=cc.id AND cv.ativo=true
       WHERE cc.chave='vendas_bpe_integracao' AND cc.ativo=true LIMIT 1`,
    );
  }

  private assertWebhookAuthorization(header: string | undefined) {
    const expectedUser = process.env.BPE_WEBHOOK_USER ?? '';
    const expectedPassword = process.env.BPE_WEBHOOK_PASSWORD ?? '';
    if (!expectedUser || !expectedPassword || !header?.startsWith('Basic ')) {
      throw new UnauthorizedException('Webhook fiscal nao autorizado');
    }
    const actual = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const expected = `${expectedUser}:${expectedPassword}`;
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Webhook fiscal nao autorizado');
    }
  }

  private audit(entityId: string, action: string, userId: string, data: unknown) {
    return this.db.query(
      `INSERT INTO audit_evento(entidade,entidade_id,acao,usuario_id,dados_depois)
       VALUES ('bilhete_documento_fiscal',$1,$2,$3,$4::jsonb)`,
      [entityId, action, userId, JSON.stringify(data)],
    );
  }
}

function fiscalDate(date: Date) {
  const value = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Belem', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date).replace(' ', 'T');
  return `${value}-03:00`;
}
