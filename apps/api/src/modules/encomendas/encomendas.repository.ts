import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { EncomendasConfig, validateEncomendasConfig } from './encomendas-config.validator';

export type EncomendaEvidenceType = 'foto_encomenda' | 'documento_nf' | 'documento_dc' | 'assinatura_dc';
export type EvidenceUpload = { tipo: EncomendaEvidenceType; url: string; hash: string; nome: string; mime: string; bytes: number };
export type CreateEncomendaInput = {
  viagemId: string;
  clienteRemetenteId: string;
  remetenteNome: string;
  remetenteDocumento: string;
  remetenteTelefone: string;
  destinatarioNome: string;
  destinatarioDocumento: string;
  destinatarioTelefone: string;
  cidadeOrigemSigla: string;
  cidadeDestinoSigla: string;
  tamanhoCodigo: string;
  pesoTotal: number;
  totalVolumes: number;
  valorDeclarado: number;
  valorCobrado?: number;
  motivoAjusteValor?: string;
  conteudoDeclarado: string;
  quemPaga: 'remetente' | 'destinatario';
  formaPagamento?: string;
  documentoTipo: 'NF' | 'DC';
  documentoNumero?: string;
  evidenciaFotoId: string;
  evidenciaDocumentoId?: string;
  cotacaoId?: string;
  clientUuid: string;
};

@Injectable()
export class EncomendasRepository {
  constructor(private readonly db: DatabaseService) {}

  async configuration() {
    const current = await this.activeConfiguration();
    return { versao: current.versao, configVersaoId: current.id, valor: current.valor };
  }

  async list() {
    const result = await this.db.query(`
      SELECT c.id, c.codigo, c.numero_pedido, c.status::text, c.viagem_id, c.cidade_origem_sigla,
             c.cidade_destino_sigla, c.valor_declarado, c.valor_cobrado, c.peso_total, c.criado_em,
             v.codigo AS viagem_codigo, e.nome AS embarcacao_nome,
             ed.remetente_nome, ed.remetente_documento, ed.remetente_telefone,
             ed.destinatario_nome, ed.destinatario_documento, ed.destinatario_telefone,
             ed.tamanho_codigo, ed.conteudo_declarado, ed.quem_paga, ed.forma_pagamento,
             ed.documento_tipo, ed.documento_fiscal_id, ed.foto_encomenda_url,
             ed.valor_tabela, ed.valor_cobrado AS detalhe_valor_cobrado, ed.motivo_ajuste_valor,
             ed.status_documental, ed.cotacao_id, tp.versao AS tabela_preco_versao,
             cv.versao AS config_versao,
             count(vol.id)::int AS total_volumes,
             dc.id AS declaracao_id, dc.assinatura_hash, dc.aceite_em,
             df.numero AS documento_numero, df.arquivo_url AS documento_url, df.status::text AS documento_status
      FROM encomenda_detalhe ed
      JOIN carga c ON c.id = ed.carga_id
      JOIN viagem v ON v.id = c.viagem_id
      JOIN embarcacao e ON e.id = v.embarcacao_id
      JOIN config_versao cv ON cv.id = ed.config_versao_id
      LEFT JOIN tabela_preco tp ON tp.id = ed.tabela_preco_id
      LEFT JOIN volume vol ON vol.carga_id = c.id
      LEFT JOIN declaracao_conteudo dc ON dc.carga_id = c.id
      LEFT JOIN documento_fiscal df ON df.id = ed.documento_fiscal_id
      GROUP BY c.id, v.codigo, e.nome, ed.id, tp.versao, cv.versao, dc.id, df.id
      ORDER BY c.criado_em DESC
      LIMIT 500
    `);
    const legacy = await this.db.query(`
      SELECT c.id, c.codigo, c.numero_pedido, c.status::text, c.viagem_id, c.cidade_origem_sigla,
             c.cidade_destino_sigla, c.valor_declarado, c.valor_cobrado, c.peso_total, c.criado_em,
             v.codigo AS viagem_codigo, e.nome AS embarcacao_nome,
             cr.nome AS remetente_nome, cr.cpf_cnpj AS remetente_documento,
             COALESCE((SELECT contato->>'valor' FROM jsonb_array_elements(COALESCE(cr.contatos, '[]'::jsonb)) contato
                       WHERE contato->>'tipo' IN ('telefone', 'whatsapp') LIMIT 1), '') AS remetente_telefone,
             COALESCE(c.destinatario_nome, 'Nao registrado') AS destinatario_nome,
             '' AS destinatario_documento, '' AS destinatario_telefone,
             NULL::text AS tamanho_codigo, NULL::text AS conteudo_declarado,
             NULL::text AS quem_paga, NULL::text AS forma_pagamento,
             NULL::text AS documento_tipo, NULL::uuid AS documento_fiscal_id,
             NULL::text AS foto_encomenda_url,
             c.valor_cobrado AS valor_tabela, c.valor_cobrado AS detalhe_valor_cobrado,
             NULL::text AS motivo_ajuste_valor, 'legado_incompleto'::text AS status_documental,
             NULL::uuid AS cotacao_id, NULL::integer AS tabela_preco_versao,
             NULL::integer AS config_versao, count(vol.id)::int AS total_volumes,
             dc.id AS declaracao_id, dc.assinatura_hash, dc.aceite_em,
             NULL::text AS documento_numero, NULL::text AS documento_url, NULL::text AS documento_status,
             true AS legado
      FROM carga c
      JOIN viagem v ON v.id = c.viagem_id
      JOIN embarcacao e ON e.id = v.embarcacao_id
      JOIN cliente cr ON cr.id = c.cliente_remetente_id
      LEFT JOIN volume vol ON vol.carga_id = c.id
      LEFT JOIN declaracao_conteudo dc ON dc.carga_id = c.id
      LEFT JOIN encomenda_detalhe ed ON ed.carga_id = c.id
      WHERE c.categoria = 'encomenda' AND ed.id IS NULL
      GROUP BY c.id, v.codigo, e.nome, cr.id, dc.id
      ORDER BY c.criado_em DESC
      LIMIT 500
    `);
    return [...result.rows.map((row) => mapRow({ ...row, legado: false })), ...legacy.rows.map(mapRow)]
      .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
      .slice(0, 500);
  }

  async detail(id: string) {
    const items = await this.list();
    const item = items.find((row) => row.id === id);
    if (!item) throw new NotFoundException('Encomenda nao encontrada');
    const events = await this.db.query(`
      SELECT ev.id, ev.tipo::text, ev.ocorrido_em, ev.criado_em, ev.obs,
             u.nome AS usuario_nome, vol.id AS volume_id, vol.indice_volume, vol.total_volumes,
             ent.protocolo AS entrega_protocolo, ent.entregue_em
      FROM volume vol
      LEFT JOIN evento_volume ev ON ev.volume_id = vol.id
      LEFT JOIN usuario u ON u.id = ev.usuario_id
      LEFT JOIN entrega_volume entv ON entv.volume_id = vol.id
      LEFT JOIN entrega_comprovante ent ON ent.id = entv.entrega_id
      WHERE vol.carga_id = $1
      ORDER BY COALESCE(ev.ocorrido_em, vol.criado_em), vol.indice_volume
    `, [id]);
    const evidencias = await this.db.query(
      'SELECT id, tipo, arquivo_url, arquivo_hash, arquivo_nome, arquivo_mime, arquivo_bytes, criado_em FROM encomenda_evidencia WHERE carga_id = $1 ORDER BY criado_em',
      [id],
    );
    return { ...item, eventos: events.rows, evidencias: evidencias.rows };
  }

  async registerEvidence(upload: EvidenceUpload, userId: string, clientUuid?: string) {
    if (clientUuid) {
      const existing = await this.db.one('SELECT * FROM encomenda_evidencia WHERE client_uuid = $1', [clientUuid]);
      if (existing) return existing;
    }
    return this.db.one(`
      INSERT INTO encomenda_evidencia (tipo, arquivo_url, arquivo_hash, arquivo_nome, arquivo_mime, arquivo_bytes, client_uuid, criado_por)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tipo, arquivo_url, arquivo_hash, arquivo_nome, arquivo_mime, arquivo_bytes, criado_em
    `, [upload.tipo, upload.url, upload.hash, upload.nome, upload.mime, upload.bytes, clientUuid ?? null, userId]);
  }

  async create(input: CreateEncomendaInput, userId: string) {
    validateCreate(input);
    const existing = await this.db.one<{ id: string }>('SELECT id FROM carga WHERE client_uuid = $1', [input.clientUuid]);
    if (existing) return this.detail(existing.id);
    const activeConfig = await this.activeConfiguration();
    const config = activeConfig.valor;
    const size = config.tamanhos.find((item) => item.ativo && item.codigo === input.tamanhoCodigo.toUpperCase());
    if (!size) throw new BadRequestException('Tamanho nao esta ativo na configuracao publicada');
    if (input.pesoTotal > size.pesoMaxKg) throw new BadRequestException(`Peso excede o limite configurado de ${size.pesoMaxKg} kg para ${size.codigo}`);
    const price = await this.price(input, config.limiteValorFixo);
    const charged = input.valorCobrado === undefined ? price.valorTabela : Number(input.valorCobrado);
    if (!Number.isFinite(charged) || charged < 0) throw new BadRequestException('valorCobrado invalido');
    if (Math.abs(charged - price.valorTabela) > 0.009 && !input.motivoAjusteValor?.trim()) {
      throw new BadRequestException('Informe o motivo para alterar o valor calculado pela tabela');
    }
    if (input.documentoTipo === 'DC' && !config.termo.publicado) {
      throw new BadRequestException('Termo da Declaracao de Conteudo ainda nao foi publicado em Cadastros');
    }
    const payment = config.formasPagamento.find((item) => item.ativo && item.codigo === input.formaPagamento);
    if (input.quemPaga === 'remetente' && !payment) throw new BadRequestException('Forma de pagamento invalida ou inativa');

    const id = await this.db.tx(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`codigo:ENC:${new Date().getFullYear()}`]);
      await lockAndValidateTrip(client, input);
      const foto = await evidence(client, input.evidenciaFotoId, 'foto_encomenda', userId);
      const documento = input.evidenciaDocumentoId
        ? await evidence(client, input.evidenciaDocumentoId, input.documentoTipo === 'NF' ? 'documento_nf' : 'documento_dc', userId)
        : null;
      if (config.exigeFotoEncomenda && !foto) throw new BadRequestException('Foto da encomenda obrigatoria');
      if (config.exigeDocumento && input.documentoTipo === 'NF' && !documento) throw new BadRequestException('Anexo da Nota Fiscal obrigatorio');
      const codigo = await nextCode(client);
      const inserted = await client.query<{ id: string }>(`
        INSERT INTO carga (
          codigo, numero_pedido, categoria, viagem_id, cliente_remetente_id, destinatario_nome,
          cidade_origem_sigla, cidade_destino_sigla, tipo_recebimento, valor_declarado,
          valor_cobrado, peso_total, client_uuid, criado_por, atualizado_por
        ) VALUES ($1, $1, 'encomenda', $2, $3, $4, $5, $6, 'porto_balsa', $7, $8, $9, $10, $11, $11)
        RETURNING id
      `, [codigo, input.viagemId, input.clienteRemetenteId, input.destinatarioNome.trim(), input.cidadeOrigemSigla, input.cidadeDestinoSigla, input.valorDeclarado, charged, input.pesoTotal, input.clientUuid, userId]);
      const cargaId = inserted.rows[0].id;
      const documentRow = await client.query<{ id: string }>(`
        INSERT INTO documento_fiscal (tipo, numero, valor, cliente_id, carga_id, arquivo_url, arquivo_hash, origem, status, lancado_por)
        VALUES ($1::tipo_documento_fiscal, $2, $3, $4, $5, $6, $7, 'operacao', $8::status_documento_fiscal, $9)
        RETURNING id
      `, [input.documentoTipo === 'NF' ? 'NFe' : 'DC', input.documentoNumero ?? codigo, input.valorDeclarado, input.clienteRemetenteId, cargaId, documento?.arquivo_url ?? null, documento?.arquivo_hash ?? null, input.documentoTipo === 'NF' ? 'conferida' : 'pendente', userId]);
      for (let index = 1; index <= input.totalVolumes; index += 1) {
        await client.query(`INSERT INTO volume (carga_id, indice_volume, total_volumes, peso, status, client_uuid)
          VALUES ($1, $2, $3, $4, 'cadastrado', gen_random_uuid())`, [cargaId, index, input.totalVolumes, input.pesoTotal / input.totalVolumes]);
      }
      await client.query(`
        INSERT INTO encomenda_detalhe (
          carga_id, cotacao_id, remetente_nome, remetente_documento, remetente_telefone,
          destinatario_nome, destinatario_documento, destinatario_telefone, tamanho_codigo,
          conteudo_declarado, quem_paga, forma_pagamento, documento_tipo, documento_fiscal_id,
          foto_encomenda_url, foto_encomenda_hash, valor_tabela, valor_cobrado, motivo_ajuste_valor,
          config_versao_id, tabela_preco_id, status_documental, criado_por, atualizado_por
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$23)
      `, [cargaId, input.cotacaoId ?? null, input.remetenteNome.trim(), digits(input.remetenteDocumento), input.remetenteTelefone.trim(), input.destinatarioNome.trim(), digits(input.destinatarioDocumento), input.destinatarioTelefone.trim(), size.codigo, input.conteudoDeclarado.trim(), input.quemPaga, input.formaPagamento ?? null, input.documentoTipo, documentRow.rows[0].id, foto.arquivo_url, foto.arquivo_hash, price.valorTabela, charged, input.motivoAjusteValor?.trim() || null, activeConfig.id, price.tabelaId, input.documentoTipo === 'NF' ? 'pronta' : 'aguardando_documento', userId]);
      await client.query('UPDATE encomenda_evidencia SET carga_id = $1 WHERE id = ANY($2::uuid[])', [cargaId, [input.evidenciaFotoId, input.evidenciaDocumentoId].filter(Boolean)]);
      await createFinancial(client, { ...input, valorCobrado: charged }, cargaId, userId, config.prazoRecebimentoDias);
      if (input.cotacaoId) {
        const converted = await client.query(`UPDATE cotacao SET status = 'convertida', convertida_carga_id = $2 WHERE id = $1 AND tipo = 'encomenda' AND status = 'aberta' RETURNING id`, [input.cotacaoId, cargaId]);
        if (!converted.rows[0]) throw new BadRequestException('Cotacao inexistente, expirada ou ja convertida');
      }
      await client.query(`INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois, client_uuid)
        VALUES ('encomenda', $1, 'criar_despacho', $2, $3::jsonb, $4)`, [cargaId, userId, JSON.stringify({ codigo, valorTabela: price.valorTabela, valorCobrado: charged, documentoTipo: input.documentoTipo, configVersao: activeConfig.versao, tabelaPrecoVersao: price.versao, quemPaga: input.quemPaga }), input.clientUuid]);
      return cargaId;
    });
    return this.detail(id);
  }

  async saveDeclaration(cargaId: string, input: { evidenciaAssinaturaId: string; aceiteEm?: string; dispositivo?: string; clientUuid: string }, userId: string) {
    if (!input.evidenciaAssinaturaId || !input.clientUuid) throw new BadRequestException('Assinatura e clientUuid obrigatorios');
    const config = await this.activeConfiguration();
    if (!config.valor.termo.publicado) throw new BadRequestException('Termo da DC nao publicado');
    const existingAudit = await this.db.one('SELECT id FROM audit_evento WHERE client_uuid = $1', [input.clientUuid]);
    if (existingAudit) return this.detail(cargaId);
    await this.db.tx(async (client) => {
      const detail = await client.query<{ documento_fiscal_id: string; conteudo_declarado: string; valor_declarado: string }>(`
        SELECT ed.documento_fiscal_id, ed.conteudo_declarado, c.valor_declarado
        FROM encomenda_detalhe ed JOIN carga c ON c.id = ed.carga_id
        WHERE ed.carga_id = $1 AND ed.documento_tipo = 'DC' FOR UPDATE`, [cargaId]);
      if (!detail.rows[0]) throw new NotFoundException('Encomenda com DC nao encontrada');
      const signature = await evidence(client, input.evidenciaAssinaturaId, 'assinatura_dc', userId);
      const aceiteEm = input.aceiteEm ?? new Date().toISOString();
      await client.query(`
        INSERT INTO declaracao_conteudo (carga_id, valor_declarado, descricao_informada, config_termo_versao_id, assinatura_url, assinatura_hash, aceite_em, dispositivo)
        VALUES ($1,$2,$3,$4,$5,$6,$7::timestamptz,$8)
        ON CONFLICT (carga_id) DO UPDATE SET valor_declarado=EXCLUDED.valor_declarado, descricao_informada=EXCLUDED.descricao_informada,
          config_termo_versao_id=EXCLUDED.config_termo_versao_id, assinatura_url=EXCLUDED.assinatura_url,
          assinatura_hash=EXCLUDED.assinatura_hash, aceite_em=EXCLUDED.aceite_em, dispositivo=EXCLUDED.dispositivo
      `, [cargaId, detail.rows[0].valor_declarado, detail.rows[0].conteudo_declarado, config.id, signature.arquivo_url, signature.arquivo_hash, aceiteEm, input.dispositivo ?? 'web-console']);
      await client.query(`UPDATE documento_fiscal SET arquivo_url=$2, arquivo_hash=$3, status='conferida', atualizado_em=now() WHERE id=$1`, [detail.rows[0].documento_fiscal_id, signature.arquivo_url, signature.arquivo_hash]);
      await client.query(`UPDATE encomenda_detalhe SET status_documental='pronta', atualizado_por=$2 WHERE carga_id=$1`, [cargaId, userId]);
      await client.query('UPDATE encomenda_evidencia SET carga_id=$1 WHERE id=$2', [cargaId, input.evidenciaAssinaturaId]);
      await client.query(`INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois, client_uuid)
        VALUES ('encomenda', $1, 'assinar_declaracao_conteudo', $2, $3::jsonb, $4)`, [cargaId, userId, JSON.stringify({ configVersao: config.versao, aceiteEm, assinaturaHash: signature.arquivo_hash }), input.clientUuid]);
    });
    return this.detail(cargaId);
  }

  private async activeConfiguration(): Promise<{ id: string; versao: number; valor: EncomendasConfig }> {
    const row = await this.db.one<{ id: string; versao: number; valor: unknown }>(`
      SELECT cv.id, cv.versao, cv.valor FROM config_versao cv JOIN config_chave cc ON cc.id=cv.chave_id
      WHERE cc.chave='encomendas_operacao' AND cv.ativo=true LIMIT 1`);
    if (!row) throw new BadRequestException('Configuracao de encomendas nao publicada');
    validateEncomendasConfig(row.valor);
    return { ...row, valor: row.valor };
  }

  private async price(input: CreateEncomendaInput, limit: number) {
    const row = await this.db.one<{ tabela_id: string; versao: number; valor: string | null; percentual: string | null }>(`
      SELECT tp.id AS tabela_id, tp.versao,
             max(ip.valor) FILTER (WHERE ip.tamanho=$3) AS valor,
             max(ip.percentual) AS percentual
      FROM tabela_preco tp JOIN item_preco ip ON ip.tabela_id=tp.id
      WHERE tp.tipo='encomenda' AND tp.ativo=true AND ip.origem_sigla=$1 AND ip.destino_sigla=$2
      GROUP BY tp.id, tp.versao
      LIMIT 1`, [input.cidadeOrigemSigla, input.cidadeDestinoSigla, input.tamanhoCodigo]);
    if (!row) throw new BadRequestException('Nao existe preco publicado para o trecho e tamanho selecionados');
    const fixed = row.valor === null ? null : Number(row.valor);
    const percentage = row.percentual === null ? null : Number(row.percentual);
    const valorTabela = input.valorDeclarado <= limit ? fixed : percentage === null ? null : roundMoney(input.valorDeclarado * percentage / 100);
    if (valorTabela === null || !Number.isFinite(valorTabela) || valorTabela < 0) throw new BadRequestException('Tabela de preco incompleta para esta encomenda');
    return { valorTabela, tabelaId: row.tabela_id, versao: row.versao };
  }
}

function validateCreate(input: CreateEncomendaInput) {
  const required = ['viagemId','clienteRemetenteId','remetenteNome','remetenteDocumento','remetenteTelefone','destinatarioNome','destinatarioDocumento','destinatarioTelefone','cidadeOrigemSigla','cidadeDestinoSigla','tamanhoCodigo','conteudoDeclarado','evidenciaFotoId','clientUuid'] as const;
  for (const key of required) if (!String(input[key] ?? '').trim()) throw new BadRequestException(`${key} obrigatorio`);
  if (!['remetente','destinatario'].includes(input.quemPaga)) throw new BadRequestException('quemPaga invalido');
  if (!['NF','DC'].includes(input.documentoTipo)) throw new BadRequestException('documentoTipo invalido');
  if (digits(input.remetenteDocumento).length < 11 || digits(input.destinatarioDocumento).length < 11) throw new BadRequestException('CPF/CNPJ de remetente e destinatario invalidos');
  if (!Number.isFinite(Number(input.pesoTotal)) || Number(input.pesoTotal) <= 0) throw new BadRequestException('pesoTotal deve ser maior que zero');
  if (!Number.isInteger(Number(input.totalVolumes)) || Number(input.totalVolumes) < 1) throw new BadRequestException('totalVolumes deve ser inteiro positivo');
  if (!Number.isFinite(Number(input.valorDeclarado)) || Number(input.valorDeclarado) <= 0) throw new BadRequestException('valorDeclarado deve ser maior que zero');
}
async function evidence(client: PoolClient, id: string, type: EncomendaEvidenceType, userId: string) {
  const row = await client.query(`SELECT * FROM encomenda_evidencia WHERE id=$1 AND tipo=$2 AND criado_por=$3 AND carga_id IS NULL FOR UPDATE`, [id, type, userId]);
  if (!row.rows[0]) throw new BadRequestException(`Evidencia ${type} invalida, vinculada ou pertencente a outro usuario`);
  return row.rows[0];
}
async function lockAndValidateTrip(client: PoolClient, input: CreateEncomendaInput) {
  const trip = await client.query(`
    SELECT v.id,
      EXISTS (SELECT 1 FROM viagem_escala ve WHERE ve.viagem_id=v.id AND ve.cidade_sigla=$2) OR v.origem_sigla=$2 OR v.destino_sigla=$2 AS tem_origem,
      EXISTS (SELECT 1 FROM viagem_escala ve WHERE ve.viagem_id=v.id AND ve.cidade_sigla=$3) OR v.origem_sigla=$3 OR v.destino_sigla=$3 AS tem_destino
    FROM viagem v WHERE v.id=$1 AND v.status IN ('planejada','em_curso') FOR UPDATE
  `, [input.viagemId, input.cidadeOrigemSigla, input.cidadeDestinoSigla]);
  if (!trip.rows[0] || !trip.rows[0].tem_origem || !trip.rows[0].tem_destino) throw new BadRequestException('Viagem inexistente/inativa ou sem o trecho selecionado');
  const cities = await client.query('SELECT count(*)::int AS total FROM cidade WHERE sigla=ANY($1::varchar[]) AND ativo=true', [[input.cidadeOrigemSigla, input.cidadeDestinoSigla]]);
  if (Number(cities.rows[0]?.total) !== new Set([input.cidadeOrigemSigla, input.cidadeDestinoSigla]).size) throw new BadRequestException('Origem ou destino invalido');
}
async function nextCode(client: PoolClient) {
  const year = new Date().getFullYear();
  const count = await client.query<{ total: string }>('SELECT count(*)::text AS total FROM carga WHERE codigo LIKE $1', [`ENC-${year}-%`]);
  return `ENC-${year}-${String(Number(count.rows[0]?.total ?? 0) + 1).padStart(4, '0')}`;
}
async function createFinancial(client: PoolClient, input: CreateEncomendaInput & { valorCobrado: number }, cargaId: string, userId: string, days: number) {
  if (input.quemPaga === 'remetente') {
    const cash = await client.query<{ id: string }>("SELECT id FROM caixa WHERE operador_id=$1 AND status='aberto' ORDER BY aberto_em DESC LIMIT 1 FOR UPDATE", [userId]);
    if (!cash.rows[0]) throw new BadRequestException('Abra o caixa do operador antes de receber o frete da encomenda');
    await client.query(`INSERT INTO caixa_movimento (caixa_id,tipo,forma_pagamento,valor,carga_id,criado_por,client_uuid,observacao)
      VALUES ($1,'despacho_carga',$2::forma_pagamento,$3,$4,$5,gen_random_uuid(),'Frete de encomenda pago pelo remetente')`, [cash.rows[0].id, input.formaPagamento, input.valorCobrado, cargaId, userId]);
  } else {
    await client.query(`INSERT INTO financeiro_titulo (tipo,descricao,parte_nome,vencimento,valor,status,origem,cliente_id,carga_id,criado_por,atualizado_por,client_uuid)
      VALUES ('receber','Frete de encomenda - pagamento no destino',$1,(current_date + $2::int),$3,'aberto','encomenda_destinatario',$4,$5,$6,$6,gen_random_uuid())`, [input.destinatarioNome.trim(), days, input.valorCobrado, input.clienteRemetenteId, cargaId, userId]);
  }
}
function mapRow(row: Record<string, any>) {
  return { ...row, valor_declarado: Number(row.valor_declarado), valor_cobrado: Number(row.detalhe_valor_cobrado), valor_tabela: Number(row.valor_tabela), peso_total: Number(row.peso_total), total_volumes: Number(row.total_volumes), dc_assinada: Boolean(row.assinatura_hash && row.aceite_em) };
}
function digits(value: string) { return String(value ?? '').replace(/\D/g, ''); }
function roundMoney(value: number) { return Math.round(value * 100) / 100; }
