import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AbrirCaixaInput, FinanceiroTituloInput, MovimentoCaixaInput } from './caixa.types';

@Injectable()
export class CaixaRepository {
  constructor(private readonly db: DatabaseService) {}

  async list() {
    const result = await this.db.query(
      `
      SELECT c.id, c.tipo, c.referencia, c.status::text, c.aberto_em, c.fechado_em,
             c.valor_abertura, c.valor_fechamento, u.nome AS operador_nome,
             COALESCE(sum(CASE WHEN cm.valor > 0 THEN cm.valor ELSE 0 END), 0)::numeric(12,2) AS entradas_dia,
             COALESCE(sum(CASE WHEN cm.valor < 0 THEN abs(cm.valor) ELSE 0 END), 0)::numeric(12,2) AS saidas_dia,
             (c.valor_abertura + COALESCE(sum(cm.valor), 0))::numeric(12,2) AS saldo
      FROM caixa c
      JOIN usuario u ON u.id = c.operador_id
      LEFT JOIN caixa_movimento cm ON cm.caixa_id = c.id AND cm.criado_em::date = now()::date
      GROUP BY c.id, u.nome
      ORDER BY c.aberto_em DESC
      LIMIT 100
      `,
    );
    return result.rows.map((row) => ({
      ...row,
      valor_abertura: Number(row.valor_abertura),
      valor_fechamento: row.valor_fechamento === null ? null : Number(row.valor_fechamento),
      entradas_dia: Number(row.entradas_dia),
      saidas_dia: Number(row.saidas_dia),
      saldo: Number(row.saldo),
    }));
  }

  async abrir(input: AbrirCaixaInput, operadorId: string) {
    const aberto = await this.db.one('SELECT id FROM caixa WHERE operador_id = $1 AND status = $2::status_caixa LIMIT 1', [operadorId, 'aberto']);
    if (aberto) return this.find(aberto.id);
    return this.db.one(
      `
      INSERT INTO caixa (operador_id, tipo, referencia, valor_abertura)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [operadorId, input.tipo ?? 'porto', input.referencia ?? 'Caixa do porto', input.valorAbertura ?? 0],
    );
  }

  async titulos(tipo?: 'receber' | 'pagar') {
    const params: unknown[] = [];
    const where = ['ft.excluido_em IS NULL'];
    if (tipo) {
      params.push(tipo);
      where.push(`ft.tipo = $${params.length}::tipo_titulo_financeiro`);
    }
    const result = await this.db.query(
      `
      SELECT ft.id, ft.tipo::text, ft.descricao, ft.parte_nome, ft.vencimento,
             ft.valor, ft.status::text, ft.origem, ft.observacao,
             ft.cliente_id, ft.fornecedor_id, ft.agente_id,
             ft.caixa_movimento_id, ft.carga_id, ft.bilhete_id, ft.cotacao_id,
             ft.client_uuid, ft.criado_em, ft.atualizado_em,
             cli.nome AS cliente_nome,
             f.nome AS fornecedor_nome,
             a.nome AS agente_nome,
             cm.valor AS caixa_movimento_valor,
             cg.codigo AS carga_codigo,
             b.codigo AS bilhete_codigo
      FROM financeiro_titulo ft
      LEFT JOIN cliente cli ON cli.id = ft.cliente_id
      LEFT JOIN fornecedor f ON f.id = ft.fornecedor_id
      LEFT JOIN agente a ON a.id = ft.agente_id
      LEFT JOIN caixa_movimento cm ON cm.id = ft.caixa_movimento_id
      LEFT JOIN carga cg ON cg.id = ft.carga_id
      LEFT JOIN bilhete b ON b.id = ft.bilhete_id
      WHERE ${where.join(' AND ')}
      ORDER BY ft.vencimento ASC, ft.criado_em DESC
      LIMIT 500
      `,
      params,
    );
    return result.rows.map((row) => ({
      ...row,
      valor: Number(row.valor),
      caixa_movimento_valor: row.caixa_movimento_valor === null ? null : Number(row.caixa_movimento_valor),
    }));
  }

  async criarTitulo(input: FinanceiroTituloInput, userId: string) {
    if (!['receber', 'pagar'].includes(input.tipo)) {
      throw new BadRequestException('tipo invalido');
    }
    if (!input.descricao?.trim()) throw new BadRequestException('descricao obrigatoria');
    if (!input.parteNome?.trim()) throw new BadRequestException('parteNome obrigatorio');
    if (!input.vencimento) throw new BadRequestException('vencimento obrigatorio');
    if (input.valor === undefined || Number.isNaN(Number(input.valor)) || Number(input.valor) < 0) {
      throw new BadRequestException('valor invalido');
    }
    const row = await this.db.one(
      `
      INSERT INTO financeiro_titulo (
        tipo, descricao, parte_nome, vencimento, valor, status, origem, observacao,
        cliente_id, fornecedor_id, agente_id, caixa_movimento_id, carga_id,
        bilhete_id, cotacao_id, criado_por, atualizado_por, client_uuid
      )
      VALUES (
        $1::tipo_titulo_financeiro, $2, $3, $4::date, $5::numeric,
        COALESCE($6::status_titulo_financeiro, 'aberto'::status_titulo_financeiro),
        $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16, $17::uuid
      )
      ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO UPDATE
      SET descricao = EXCLUDED.descricao,
          parte_nome = EXCLUDED.parte_nome,
          vencimento = EXCLUDED.vencimento,
          valor = EXCLUDED.valor,
          status = EXCLUDED.status,
          origem = EXCLUDED.origem,
          observacao = EXCLUDED.observacao,
          atualizado_por = EXCLUDED.atualizado_por,
          atualizado_em = now()
      RETURNING *
      `,
      [
        input.tipo,
        input.descricao.trim(),
        input.parteNome.trim(),
        input.vencimento,
        input.valor,
        input.status ?? null,
        input.origem ?? 'manual',
        input.observacao ?? null,
        input.clienteId ?? null,
        input.fornecedorId ?? null,
        input.agenteId ?? null,
        input.caixaMovimentoId ?? null,
        input.cargaId ?? null,
        input.bilheteId ?? null,
        input.cotacaoId ?? null,
        userId,
        input.clientUuid ?? null,
      ],
    );
    return { ...row, valor: Number(row.valor) };
  }

  async find(id: string) {
    const caixa = await this.db.one('SELECT * FROM caixa WHERE id = $1', [id]);
    if (!caixa) throw new NotFoundException('Caixa nao encontrado');
    return caixa;
  }

  async movimentos(caixaId: string) {
    const result = await this.db.query(
      `
      SELECT cm.*, b.codigo AS bilhete_codigo, cg.codigo AS carga_codigo
      FROM caixa_movimento cm
      LEFT JOIN bilhete b ON b.id = cm.bilhete_id
      LEFT JOIN carga cg ON cg.id = cm.carga_id
      WHERE cm.caixa_id = $1
      ORDER BY cm.criado_em DESC
      LIMIT 300
      `,
      [caixaId],
    );
    return result.rows.map((row) => ({ ...row, valor: Number(row.valor) }));
  }

  async movimento(caixaId: string, input: MovimentoCaixaInput, userId: string) {
    if (input.valor === undefined || Number.isNaN(Number(input.valor))) {
      throw new BadRequestException('valor obrigatorio');
    }
    const row = await this.db.one(
      `
      INSERT INTO caixa_movimento (
        caixa_id, tipo, forma_pagamento, valor, bilhete_id, carga_id,
        criado_por, client_uuid, observacao
      )
      VALUES ($1, $2::tipo_movimento_caixa, $3::forma_pagamento, $4::numeric, $5, $6, $7, $8::uuid, $9)
      RETURNING *
      `,
      [
        caixaId,
        input.tipo ?? 'outro',
        input.formaPagamento ?? null,
        input.valor,
        input.bilheteId ?? null,
        input.cargaId ?? null,
        userId,
        input.clientUuid ?? null,
        input.observacao ?? null,
      ],
    );
    return { ...row, valor: Number(row.valor) };
  }

  async fechar(id: string, valorFechamento?: number) {
    const row = await this.db.one(
      `
      UPDATE caixa
      SET status = 'fechado', fechado_em = now(), valor_fechamento = $2
      WHERE id = $1 AND status = 'aberto'
      RETURNING *
      `,
      [id, valorFechamento ?? null],
    );
    if (!row) throw new NotFoundException('Caixa aberto nao encontrado');
    return row;
  }
}
