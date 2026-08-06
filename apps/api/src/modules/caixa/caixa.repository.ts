import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  AbrirCaixaInput,
  CriarComissaoInput,
  CriarFaturaInput,
  FinanceiroTituloInput,
  FinanceiroTitulosFiltro,
  LiquidarTituloInput,
  MovimentoCaixaInput,
} from './caixa.types';

@Injectable()
export class CaixaRepository {
  constructor(private readonly db: DatabaseService) {}

  async list() {
    const result = await this.db.query(`
      SELECT c.id, c.operador_id, c.tipo, c.referencia, c.status::text, c.aberto_em, c.fechado_em,
             c.valor_abertura, c.valor_fechamento, u.nome AS operador_nome,
             COALESCE(sum(CASE WHEN cm.valor > 0 THEN cm.valor ELSE 0 END), 0)::numeric(12,2) AS entradas_dia,
             COALESCE(sum(CASE WHEN cm.valor < 0 THEN abs(cm.valor) ELSE 0 END), 0)::numeric(12,2) AS saidas_dia,
             (c.valor_abertura + COALESCE(sum(cm.valor), 0))::numeric(12,2) AS saldo
      FROM caixa c JOIN usuario u ON u.id = c.operador_id
      LEFT JOIN caixa_movimento cm ON cm.caixa_id = c.id AND cm.criado_em::date = now()::date
      GROUP BY c.id, u.nome ORDER BY c.aberto_em DESC LIMIT 100
    `);
    return result.rows.map((row) => this.mapMoney(row, ['valor_abertura', 'valor_fechamento', 'entradas_dia', 'saidas_dia', 'saldo']));
  }

  async abrir(input: AbrirCaixaInput, operadorId: string) {
    const aberto = await this.db.one('SELECT id FROM caixa WHERE operador_id = $1 AND status = $2::status_caixa LIMIT 1', [operadorId, 'aberto']);
    if (aberto) return this.find(aberto.id);
    return this.db.one(`INSERT INTO caixa (operador_id, tipo, referencia, valor_abertura) VALUES ($1, $2, $3, $4) RETURNING *`, [operadorId, input.tipo ?? 'porto', input.referencia ?? 'Caixa do porto', input.valorAbertura ?? 0]);
  }

  async titulos(filtro: FinanceiroTitulosFiltro = {}) {
    const params: unknown[] = [];
    const where = ['ft.excluido_em IS NULL'];
    const add = (value: unknown, sql: string) => { params.push(value); where.push(sql.replace('$n', `$${params.length}`)); };
    if (filtro.tipo) add(filtro.tipo, `ft.tipo = $n::tipo_titulo_financeiro`);
    if (filtro.de) add(filtro.de, `(COALESCE(ft.competencia, ft.vencimento) >= $n::date)`);
    if (filtro.ate) add(filtro.ate, `(COALESCE(ft.competencia, ft.vencimento) <= $n::date)`);
    if (filtro.status) add(filtro.status, `ft.status::text = $n`);
    if (filtro.planoContaId) add(filtro.planoContaId, `ft.plano_conta_id = $n`);
    if (filtro.centroCustoId) add(filtro.centroCustoId, `ft.centro_custo_id = $n`);
    if (filtro.busca?.trim()) { const term = `%${filtro.busca.trim()}%`; add(term, `(ft.descricao ILIKE $n OR ft.parte_nome ILIKE $n OR COALESCE(ft.origem, '') ILIKE $n)`); }
    const pageSize = Math.min(Math.max(Number(filtro.pageSize ?? 250), 1), 500);
    const page = Math.max(Number(filtro.page ?? 1), 1);
    params.push(pageSize, (page - 1) * pageSize);
    const result = await this.db.query(`
      SELECT ft.id, ft.tipo::text, ft.descricao, ft.parte_nome, ft.vencimento, ft.competencia,
             ft.valor, ft.valor_liquidado, ft.pago_em, ft.status::text, ft.origem, ft.observacao,
             ft.cliente_id, ft.fornecedor_id, ft.agente_id, ft.viagem_id, ft.plano_conta_id, ft.centro_custo_id,
             ft.caixa_movimento_id, ft.carga_id, ft.bilhete_id, ft.cotacao_id, ft.parcela_numero, ft.parcelas_total,
             ft.documento_nome, ft.documento_url, ft.documento_hash, ft.client_uuid, ft.criado_em, ft.atualizado_em,
             cli.nome AS cliente_nome, f.nome AS fornecedor_nome, a.nome AS agente_nome,
             cg.codigo AS carga_codigo, b.codigo AS bilhete_codigo, v.codigo AS viagem_codigo,
             pc.codigo AS plano_conta_codigo, pc.nome AS plano_conta_nome,
             cc.codigo AS centro_custo_codigo, cc.nome AS centro_custo_nome
      FROM financeiro_titulo ft
      LEFT JOIN cliente cli ON cli.id = ft.cliente_id
      LEFT JOIN fornecedor f ON f.id = ft.fornecedor_id
      LEFT JOIN agente a ON a.id = ft.agente_id
      LEFT JOIN carga cg ON cg.id = ft.carga_id
      LEFT JOIN bilhete b ON b.id = ft.bilhete_id
      LEFT JOIN viagem v ON v.id = ft.viagem_id
      LEFT JOIN financeiro_plano_conta pc ON pc.id = ft.plano_conta_id
      LEFT JOIN financeiro_centro_custo cc ON cc.id = ft.centro_custo_id
      WHERE ${where.join(' AND ')}
      ORDER BY COALESCE(ft.competencia, ft.vencimento) ASC, ft.criado_em DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    return result.rows.map((row) => this.mapMoney(row, ['valor', 'valor_liquidado']));
  }

  async resumo(filtro: FinanceiroTitulosFiltro = {}) {
    const params: unknown[] = [];
    const where = ['ft.excluido_em IS NULL'];
    if (filtro.de) { params.push(filtro.de); where.push(`COALESCE(ft.competencia, ft.vencimento) >= $${params.length}::date`); }
    if (filtro.ate) { params.push(filtro.ate); where.push(`COALESCE(ft.competencia, ft.vencimento) <= $${params.length}::date`); }
    const row = await this.db.one(`
      SELECT COALESCE(sum(CASE WHEN tipo='receber' AND status NOT IN ('recebido','cancelado') THEN valor - valor_liquidado ELSE 0 END),0)::numeric AS a_receber,
             COALESCE(sum(CASE WHEN tipo='pagar' AND status NOT IN ('pago','cancelado') THEN valor - valor_liquidado ELSE 0 END),0)::numeric AS a_pagar,
             COALESCE(sum(CASE WHEN tipo='receber' AND status='recebido' THEN valor_liquidado ELSE 0 END),0)::numeric AS recebido,
             COALESCE(sum(CASE WHEN tipo='pagar' AND status='pago' THEN valor_liquidado ELSE 0 END),0)::numeric AS pago,
             count(*)::int AS total,
             count(*) FILTER (WHERE status IN ('vencida'))::int AS vencidas
      FROM financeiro_titulo ft WHERE ${where.join(' AND ')}` , params);
    return this.mapMoney(row, ['a_receber', 'a_pagar', 'recebido', 'pago']);
  }

  async criarTitulo(input: FinanceiroTituloInput, userId: string) {
    if (!['receber', 'pagar'].includes(input.tipo)) throw new BadRequestException('tipo invalido');
    if (!input.descricao?.trim()) throw new BadRequestException('descricao obrigatoria');
    if (!input.parteNome?.trim()) throw new BadRequestException('parteNome obrigatorio');
    if (!input.vencimento) throw new BadRequestException('vencimento obrigatorio');
    if (input.valor === undefined || !Number.isFinite(Number(input.valor)) || Number(input.valor) < 0) throw new BadRequestException('valor invalido');
    const row = await this.db.one(`
      INSERT INTO financeiro_titulo (
        tipo, descricao, parte_nome, vencimento, competencia, valor, status, origem, observacao,
        cliente_id, fornecedor_id, agente_id, caixa_movimento_id, carga_id, bilhete_id, cotacao_id,
        plano_conta_id, centro_custo_id, viagem_id, documento_nome, documento_url, documento_hash,
        parcela_numero, parcelas_total, criado_por, atualizado_por, client_uuid
      ) VALUES (
        $1::tipo_titulo_financeiro,$2,$3,$4::date,COALESCE($5::date,$4::date),$6::numeric,
        COALESCE($7::status_titulo_financeiro,'aberto'::status_titulo_financeiro),$8,$9,
        $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$25,$26::uuid
      )
      ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO UPDATE SET
        descricao=EXCLUDED.descricao, parte_nome=EXCLUDED.parte_nome, vencimento=EXCLUDED.vencimento,
        competencia=EXCLUDED.competencia, valor=EXCLUDED.valor, observacao=EXCLUDED.observacao,
        plano_conta_id=EXCLUDED.plano_conta_id, centro_custo_id=EXCLUDED.centro_custo_id,
        atualizado_por=EXCLUDED.atualizado_por, atualizado_em=now()
      RETURNING *
    `, [
      input.tipo, input.descricao.trim(), input.parteNome.trim(), input.vencimento, input.competencia ?? null,
      input.valor, input.status ?? null, input.origem ?? 'manual', input.observacao ?? null,
      input.clienteId ?? null, input.fornecedorId ?? null, input.agenteId ?? null, input.caixaMovimentoId ?? null,
      input.cargaId ?? null, input.bilheteId ?? null, input.cotacaoId ?? null, input.planoContaId ?? null,
      input.centroCustoId ?? null, input.viagemId ?? null, input.documentoNome ?? null, input.documentoUrl ?? null,
      input.documentoHash ?? null, input.parcelaNumero ?? null, input.parcelasTotal ?? null, userId, input.clientUuid ?? null,
    ]);
    await this.db.query(`INSERT INTO financeiro_titulo_evento (titulo_id,status_novo,valor_movimento,observacao,usuario_id) VALUES ($1,$2,$3,$4,$5)`, [row.id, row.status, row.valor, 'titulo criado', userId]);
    return this.mapMoney(row, ['valor', 'valor_liquidado']);
  }

  async liquidarTitulo(id: string, input: LiquidarTituloInput, userId: string) {
    return this.db.tx(async (client) => {
      if (input.clientUuid) {
        const replay = await client.query<any>(
          'SELECT titulo_id FROM financeiro_titulo_liquidacao WHERE client_uuid = $1::uuid LIMIT 1',
          [input.clientUuid],
        );
        if (replay.rows[0]) {
          const existing = await client.query<any>(
            'SELECT * FROM financeiro_titulo WHERE id = $1 AND excluido_em IS NULL',
            [replay.rows[0].titulo_id],
          );
          if (existing.rows[0]) return this.mapMoney(existing.rows[0], ['valor', 'valor_liquidado']);
        }
      }
      const current = await client.query<any>('SELECT * FROM financeiro_titulo WHERE id=$1 AND excluido_em IS NULL FOR UPDATE', [id]);
      if (!current.rows[0]) throw new NotFoundException('Titulo financeiro nao encontrado');
      const titulo = current.rows[0];
      if (['cancelado','pago','recebido'].includes(titulo.status) && Number(titulo.valor_liquidado) >= Number(titulo.valor)) throw new BadRequestException('Titulo ja liquidado ou cancelado');
      const restante = Number(titulo.valor) - Number(titulo.valor_liquidado ?? 0);
      const valor = input.valor === undefined ? restante : Number(input.valor);
      if (!Number.isFinite(valor) || valor <= 0 || valor > restante + 0.005) throw new BadRequestException('Valor de liquidacao invalido');
      const novoLiquidado = Number(titulo.valor_liquidado ?? 0) + valor;
      const novoStatus = novoLiquidado >= Number(titulo.valor) - 0.005 ? (titulo.tipo === 'receber' ? 'recebido' : 'pago') : 'aberto';
      const updated = await client.query<any>(`UPDATE financeiro_titulo SET valor_liquidado=$2, status=$3::status_titulo_financeiro, pago_em=CASE WHEN $4 THEN COALESCE($5::timestamptz, now()) ELSE pago_em END, liquidado_por=$6, atualizado_por=$6 WHERE id=$1 RETURNING *`, [id, novoLiquidado, novoStatus, novoStatus === 'recebido' || novoStatus === 'pago', input.dataLiquidacao ?? null, userId]);
      await client.query(`INSERT INTO financeiro_titulo_liquidacao (titulo_id,valor,data_liquidacao,forma_pagamento,caixa_movimento_id,observacao,usuario_id,client_uuid) VALUES ($1,$2,COALESCE($3::timestamptz,now()),$4::forma_pagamento,$5,$6,$7,$8) ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING`, [id, valor, input.dataLiquidacao ?? null, input.formaPagamento ?? null, input.caixaMovimentoId ?? null, input.observacao ?? null, userId, input.clientUuid ?? null]);
      await client.query(`INSERT INTO financeiro_titulo_evento (titulo_id,status_anterior,status_novo,valor_movimento,observacao,usuario_id) VALUES ($1,$2,$3,$4,$5,$6)`, [id, titulo.status, novoStatus, valor, input.observacao ?? 'liquidacao registrada', userId]);
      return this.mapMoney(updated.rows[0], ['valor', 'valor_liquidado']);
    });
  }

  async historicoTitulo(id: string) {
    return (await this.db.query(`SELECT fte.*, u.nome AS usuario_nome FROM financeiro_titulo_evento fte LEFT JOIN usuario u ON u.id=fte.usuario_id WHERE titulo_id=$1 ORDER BY criado_em DESC`, [id])).rows.map((r) => this.mapMoney(r, ['valor_movimento']));
  }

  async comissoes() {
    const result = await this.db.query(`SELECT fc.*, a.nome AS agente_nome, v.codigo AS viagem_codigo, tr.descricao AS titulo_receber_descricao, tp.id AS titulo_pagar_id FROM financeiro_comissao fc JOIN agente a ON a.id=fc.agente_id LEFT JOIN viagem v ON v.id=fc.viagem_id LEFT JOIN financeiro_titulo tr ON tr.id=fc.titulo_receber_id LEFT JOIN financeiro_titulo tp ON tp.id=fc.titulo_pagar_id ORDER BY fc.criado_em DESC LIMIT 500`);
    return result.rows.map((r) => this.mapMoney(r, ['base_valor', 'percentual', 'valor']));
  }

  async criarComissao(input: CriarComissaoInput, userId: string) {
    if (!input.agenteId || !input.tituloReceberId || !Number.isFinite(Number(input.baseValor)) || !Number.isFinite(Number(input.percentual))) throw new BadRequestException('Agente, conta a receber, base e percentual sao obrigatorios');
    if (Number(input.percentual) < 0 || Number(input.percentual) > 100) throw new BadRequestException('Percentual invalido');
    const titulo = await this.db.one<{ tipo: string; agente_id: string | null }>('SELECT tipo::text, agente_id FROM financeiro_titulo WHERE id=$1 AND excluido_em IS NULL', [input.tituloReceberId]);
    if (!titulo || titulo.tipo !== 'receber') throw new BadRequestException('Vincule uma conta a receber valida');
    const valor = Math.round(Number(input.baseValor) * Number(input.percentual)) / 100;
    const row = await this.db.one(`INSERT INTO financeiro_comissao (agente_id,viagem_id,titulo_receber_id,base_valor,percentual,valor,criado_por,atualizado_por,client_uuid) VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8) ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO UPDATE SET base_valor=EXCLUDED.base_valor,percentual=EXCLUDED.percentual,valor=EXCLUDED.valor,atualizado_por=EXCLUDED.atualizado_por RETURNING *`, [input.agenteId, input.viagemId ?? null, input.tituloReceberId ?? null, input.baseValor, input.percentual, valor, userId, input.clientUuid ?? null]);
    return this.mapMoney(row, ['base_valor', 'percentual', 'valor']);
  }

  async transicionarComissao(id: string, destino: 'liberada' | 'pago' | 'cancelada', userId: string) {
    return this.db.tx(async (client) => {
      const current = await client.query<any>('SELECT * FROM financeiro_comissao WHERE id=$1 FOR UPDATE', [id]);
      if (!current.rows[0]) throw new NotFoundException('Comissao nao encontrada');
      const c = current.rows[0];
      if (c.status === 'cancelada' && destino !== 'cancelada') throw new BadRequestException('Comissao cancelada nao pode voltar ao fluxo');
      if (destino === 'liberada' && c.status !== 'em_aberto') throw new BadRequestException('A comissao precisa estar em aberto antes da liberacao');
      if (destino === 'liberada') {
        if (!c.titulo_receber_id) throw new BadRequestException('Comissao sem conta a receber vinculada');
        const ar = await client.query<any>(`SELECT status FROM financeiro_titulo WHERE id=$1`, [c.titulo_receber_id]);
        if (!['recebido'].includes(ar.rows[0]?.status)) throw new BadRequestException('A conta a receber ainda nao foi recebida');
      }
      if (destino === 'cancelada' && c.status === 'pago') throw new BadRequestException('Comissao paga nao pode ser cancelada');
      if (destino === 'pago') {
        if (c.status !== 'liberada') throw new BadRequestException('A comissao precisa estar liberada antes do pagamento');
        const config = await client.query<any>(`SELECT v.valor FROM config_chave ch JOIN config_versao v ON v.chave_id=ch.id AND v.ativo=true WHERE ch.chave='financeiro_operacao' LIMIT 1`);
        if (config.rows[0]?.valor?.comissoes?.permitirRepasseManual === false) throw new BadRequestException('Repasse manual de comissao desativado em Cadastros');
      }
      const nowField = destino === 'liberada' ? 'liberada_em' : destino === 'pago' ? 'paga_em' : 'cancelada_em';
      const updated = await client.query<any>(`UPDATE financeiro_comissao SET status=$2::status_comissao_financeira, ${nowField}=now(), atualizado_por=$3 WHERE id=$1 RETURNING *`, [id, destino, userId]);
      await client.query(`INSERT INTO audit_evento (entidade,entidade_id,acao,usuario_id,dados_depois) VALUES ('financeiro_comissao',$1,'atualizar',$2,$3::jsonb)`, [id, userId, JSON.stringify({ statusAnterior: c.status, status: destino })]);
      return this.mapMoney(updated.rows[0], ['base_valor', 'percentual', 'valor']);
    });
  }

  async dre(de?: string, ate?: string) {
    const configRow = await this.db.one<{ valor: any }>(`SELECT v.valor FROM config_chave c JOIN config_versao v ON v.chave_id=c.id AND v.ativo=true WHERE c.chave='financeiro_operacao' LIMIT 1`);
    if (!configRow) throw new BadRequestException('Configure o financeiro antes de consultar a DRE');
    const modo = configRow.valor?.dre?.modo === 'competencia' ? 'competencia' : 'caixa';
    const params: unknown[] = [];
    const dateExpression = modo === 'caixa' ? `COALESCE(ft.pago_em::date,ft.competencia,ft.vencimento)` : `COALESCE(ft.competencia,ft.vencimento)`;
    const valueExpression = modo === 'caixa' ? `ft.valor_liquidado` : `ft.valor`;
    const where = [`ft.excluido_em IS NULL`, modo === 'caixa' ? `ft.status IN ('recebido','pago')` : `ft.status <> 'cancelado'`];
    if (de) { params.push(de); where.push(`${dateExpression} >= $${params.length}::date`); }
    if (ate) { params.push(ate); where.push(`${dateExpression} <= $${params.length}::date`); }
    const rows = await this.db.query(`SELECT '${modo}' AS modo, COALESCE(pc.natureza, CASE WHEN ft.tipo='receber' THEN 'receita' ELSE 'despesa' END) AS natureza, COALESCE(pc.codigo,'SEM_CLASSIFICACAO') AS codigo, COALESCE(pc.nome,'Sem classificacao') AS conta, COALESCE(cc.codigo,'SEM_CC') AS centro_custo_codigo, COALESCE(cc.nome,'Sem centro de custo') AS centro_custo, COALESCE(SUM(${valueExpression}),0)::numeric AS total FROM financeiro_titulo ft LEFT JOIN financeiro_plano_conta pc ON pc.id=ft.plano_conta_id LEFT JOIN financeiro_centro_custo cc ON cc.id=ft.centro_custo_id WHERE ${where.join(' AND ')} GROUP BY 1,2,3,4,5,6 ORDER BY 1,2,4`, params);
    return rows.rows.map((r) => this.mapMoney(r, ['total']));
  }

  async faturas() {
    const rows = await this.db.query(`SELECT ff.*, ft.descricao AS titulo_descricao FROM financeiro_fatura ff LEFT JOIN financeiro_titulo ft ON ft.id=ff.titulo_id WHERE ff.excluido_em IS NULL ORDER BY ff.criado_em DESC LIMIT 500`);
    return rows.rows.map((r) => this.mapMoney(r, ['valor']));
  }

  async planoContas() {
    return (await this.db.query(`SELECT pc.*, pai.codigo AS conta_pai_codigo, pai.nome AS conta_pai_nome FROM financeiro_plano_conta pc LEFT JOIN financeiro_plano_conta pai ON pai.id=pc.conta_pai_id WHERE pc.excluido_em IS NULL ORDER BY pc.codigo`)).rows;
  }

  async salvarPlanoConta(input: { id?: string; codigo?: string; nome?: string; natureza?: string; contaPaiId?: string | null; ativo?: boolean }, userId: string) {
    if (!input.codigo?.trim() || !input.nome?.trim() || !['receita','despesa','ativo','passivo','patrimonio'].includes(input.natureza ?? '')) throw new BadRequestException('Codigo, nome e natureza validos sao obrigatorios');
    const row = input.id
      ? await this.db.one(`UPDATE financeiro_plano_conta SET codigo=$2,nome=$3,natureza=$4,conta_pai_id=$5,ativo=COALESCE($6,ativo),atualizado_por=$7 WHERE id=$1 AND excluido_em IS NULL RETURNING *`, [input.id,input.codigo.trim(),input.nome.trim(),input.natureza,input.contaPaiId ?? null,input.ativo,userId])
      : await this.db.one(`INSERT INTO financeiro_plano_conta (codigo,nome,natureza,conta_pai_id,ativo,criado_por,atualizado_por) VALUES ($1,$2,$3,$4,COALESCE($5,true),$6,$6) RETURNING *`, [input.codigo.trim(),input.nome.trim(),input.natureza,input.contaPaiId ?? null,input.ativo,userId]);
    return row;
  }

  async centrosCusto() { return (await this.db.query(`SELECT * FROM financeiro_centro_custo WHERE excluido_em IS NULL ORDER BY codigo`)).rows; }

  async salvarCentroCusto(input: { id?: string; codigo?: string; nome?: string; ativo?: boolean }, userId: string) {
    if (!input.codigo?.trim() || !input.nome?.trim()) throw new BadRequestException('Codigo e nome do centro de custo sao obrigatorios');
    return input.id
      ? this.db.one(`UPDATE financeiro_centro_custo SET codigo=$2,nome=$3,ativo=COALESCE($4,ativo),atualizado_por=$5 WHERE id=$1 AND excluido_em IS NULL RETURNING *`, [input.id,input.codigo.trim(),input.nome.trim(),input.ativo,userId])
      : this.db.one(`INSERT INTO financeiro_centro_custo (codigo,nome,ativo,criado_por,atualizado_por) VALUES ($1,$2,COALESCE($3,true),$4,$4) RETURNING *`, [input.codigo.trim(),input.nome.trim(),input.ativo,userId]);
  }

  async criarFatura(input: CriarFaturaInput, userId: string) {
    if (!['emitida','recebida'].includes(input.tipo)) throw new BadRequestException('Tipo de fatura invalido');
    if (!Number.isFinite(Number(input.valor)) || Number(input.valor) < 0) throw new BadRequestException('Valor de fatura invalido');
    const row = await this.db.one(`INSERT INTO financeiro_fatura (tipo,cnpj_emitente,cnpj_destinatario,numero,chave_acesso,emissao,vencimento,valor,status,titulo_id,arquivo_url,arquivo_hash,observacao,criado_por,atualizado_por,client_uuid) VALUES ($1,$2,$3,$4,$5,$6::date,$7::date,$8,$9,$10,$11,$12,$13,$14,$14,$15) ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO UPDATE SET status=EXCLUDED.status,titulo_id=EXCLUDED.titulo_id,observacao=EXCLUDED.observacao,atualizado_por=EXCLUDED.atualizado_por RETURNING *`, [input.tipo,input.cnpjEmitente ?? null,input.cnpjDestinatario ?? null,input.numero ?? null,input.chaveAcesso ?? null,input.emissao ?? null,input.vencimento ?? null,input.valor,input.status ?? 'pendente',input.tituloId ?? null,input.arquivoUrl ?? null,input.arquivoHash ?? null,input.observacao ?? null,userId,input.clientUuid ?? null]);
    return this.mapMoney(row, ['valor']);
  }

  async find(id: string) {
    const caixa = await this.db.one('SELECT * FROM caixa WHERE id = $1', [id]);
    if (!caixa) throw new NotFoundException('Caixa nao encontrado');
    return caixa;
  }

  async movimentos(caixaId: string) {
    const result = await this.db.query(`SELECT cm.*, b.codigo AS bilhete_codigo, cg.codigo AS carga_codigo FROM caixa_movimento cm LEFT JOIN bilhete b ON b.id=cm.bilhete_id LEFT JOIN carga cg ON cg.id=cm.carga_id WHERE cm.caixa_id=$1 ORDER BY cm.criado_em DESC LIMIT 300`, [caixaId]);
    return result.rows.map((row) => this.mapMoney(row, ['valor']));
  }

  async movimento(caixaId: string, input: MovimentoCaixaInput, userId: string) {
    if (input.valor === undefined || Number.isNaN(Number(input.valor))) throw new BadRequestException('valor obrigatorio');
    const row = await this.db.one(`INSERT INTO caixa_movimento (caixa_id,tipo,forma_pagamento,valor,bilhete_id,carga_id,criado_por,client_uuid,observacao) VALUES ($1,$2::tipo_movimento_caixa,$3::forma_pagamento,$4::numeric,$5,$6,$7,$8::uuid,$9) ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO UPDATE SET observacao=EXCLUDED.observacao RETURNING *`, [caixaId,input.tipo ?? 'outro',input.formaPagamento ?? null,input.valor,input.bilheteId ?? null,input.cargaId ?? null,userId,input.clientUuid ?? null,input.observacao ?? null]);
    return this.mapMoney(row, ['valor']);
  }

  async fechar(id: string, valorFechamento?: number) {
    const row = await this.db.one(`UPDATE caixa SET status='fechado', fechado_em=now(), valor_fechamento=$2 WHERE id=$1 AND status='aberto' RETURNING *`, [id, valorFechamento ?? null]);
    if (!row) throw new NotFoundException('Caixa aberto nao encontrado');
    return row;
  }

  private mapMoney<T extends Record<string, any>>(row: T, fields: string[]) {
    const mapped: Record<string, any> = { ...row };
    for (const field of fields) if (mapped[field] !== null && mapped[field] !== undefined) mapped[field] = Number(mapped[field]);
    return mapped as T;
  }
}
