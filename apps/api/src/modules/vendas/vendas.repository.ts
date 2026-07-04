import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { AuthTokenPayload } from '../auth/auth.types';
import { CreateBilheteInput, CreateCortesiaInput, ValidarBilheteInput } from './vendas.types';

@Injectable()
export class VendasRepository {
  constructor(private readonly db: DatabaseService) {}

  async resumo() {
    const canais = await this.db.query<{
      canal: string;
      bilhetes: string;
      receita: string | null;
      online: boolean;
    }>(
      `
      SELECT
        COALESCE(NULLIF(b.canal, ''), b.tipo::text) AS canal,
        count(*)::text AS bilhetes,
        COALESCE(sum(b.preco_pago), 0)::text AS receita,
        bool_or(COALESCE(NULLIF(b.canal, ''), b.tipo::text) IN ('portal', 'online', 'app')) AS online
      FROM bilhete b
      WHERE b.status <> 'cancelado'
        AND b.criado_em >= date_trunc('day', now())
      GROUP BY COALESCE(NULLIF(b.canal, ''), b.tipo::text)
      ORDER BY receita DESC, bilhetes DESC
      `,
    );

    const ocupacao = await this.db.query<{
      classe: string;
      capacidade: string;
      ocupados: string;
      receita: string | null;
    }>(
      `
      WITH capacidades AS (
        SELECT
          key AS classe,
          sum(
            CASE
              WHEN jsonb_typeof(value) = 'number' THEN (value #>> '{}')::numeric
              WHEN jsonb_typeof(value) = 'object' THEN COALESCE((value->>'capacidade')::numeric, 0)
              ELSE 0
            END
          ) AS capacidade
        FROM viagem v
        CROSS JOIN LATERAL jsonb_each(COALESCE(v.capacidade_pax_disponivel, '{}'::jsonb))
        WHERE v.status IN ('planejada', 'em_curso')
        GROUP BY key
      ),
      vendidos AS (
        SELECT b.classe::text AS classe, count(*) AS ocupados, COALESCE(sum(b.preco_pago), 0) AS receita
        FROM bilhete b
        JOIN viagem v ON v.id = b.viagem_id
        WHERE b.status <> 'cancelado'
          AND v.status IN ('planejada', 'em_curso')
        GROUP BY b.classe::text
      )
      SELECT
        COALESCE(c.classe, v.classe) AS classe,
        COALESCE(c.capacidade, 0)::text AS capacidade,
        COALESCE(v.ocupados, 0)::text AS ocupados,
        COALESCE(v.receita, 0)::text AS receita
      FROM capacidades c
      FULL JOIN vendidos v ON v.classe = c.classe
      ORDER BY COALESCE(c.capacidade, 0) DESC, COALESCE(v.ocupados, 0) DESC
      `,
    );

    const agentes = await this.db.query<{
      id: string;
      nome: string;
      cidade_sigla: string;
      clientes: string;
      bilhetes: string;
      volume_mes: string | null;
      comissao_pct: string | null;
    }>(
      `
      SELECT
        a.id,
        a.nome,
        a.cidade_sigla,
        count(DISTINCT c.id)::text AS clientes,
        count(DISTINCT b.id)::text AS bilhetes,
        COALESCE(sum(b.preco_pago) FILTER (WHERE b.criado_em >= date_trunc('month', now())), 0)::text AS volume_mes,
        a.percentual_comissao::text AS comissao_pct
      FROM agente a
      LEFT JOIN cliente c ON c.agente_id = a.id AND c.excluido_em IS NULL
      LEFT JOIN bilhete b ON b.cliente_id = c.id AND b.status <> 'cancelado'
      WHERE a.excluido_em IS NULL AND a.ativo = true
      GROUP BY a.id
      ORDER BY volume_mes DESC, clientes DESC, a.nome
      LIMIT 20
      `,
    );

    return {
      canais: canais.rows.map((row) => ({
        id: row.canal,
        canal: row.canal,
        bilhetes: Number(row.bilhetes),
        receita: Number(row.receita ?? 0),
        online: row.online,
      })),
      ocupacao: ocupacao.rows.map((row) => ({
        classe: row.classe,
        capacidade: Number(row.capacidade),
        ocupados: Number(row.ocupados),
        receita: Number(row.receita ?? 0),
      })),
      agentes: agentes.rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        cidadeSigla: row.cidade_sigla,
        clientes: Number(row.clientes),
        bilhetes: Number(row.bilhetes),
        volumeMes: Number(row.volume_mes ?? 0),
        comissaoPct: row.comissao_pct === null ? null : Number(row.comissao_pct),
      })),
    };
  }

  async listBilhetes(viagemId?: string) {
    const params: unknown[] = [];
    const filter = viagemId ? 'WHERE b.viagem_id = $1' : '';
    if (viagemId) params.push(viagemId);
    const result = await this.db.query(
      `
      SELECT b.id, b.codigo, b.qr_token, b.viagem_id, v.codigo AS viagem_codigo,
             v.origem_sigla, v.destino_sigla, v.data_hora_saida,
             e.nome AS embarcacao_nome, b.cliente_id, c.nome AS cliente_nome,
             b.passageiro_nome, b.passageiro_documento, b.classe::text, b.subtipo,
             b.tipo::text, b.canal, b.assento, b.preco_pago, b.status::text,
             b.validado_em, b.criado_em, cm.forma_pagamento::text
      FROM bilhete b
      JOIN viagem v ON v.id = b.viagem_id
      JOIN embarcacao e ON e.id = v.embarcacao_id
      LEFT JOIN cliente c ON c.id = b.cliente_id
      LEFT JOIN caixa_movimento cm ON cm.id = b.caixa_movimento_id
      ${filter}
      ORDER BY b.criado_em DESC
      LIMIT 300
      `,
      params,
    );
    return result.rows.map((row) => ({ ...row, preco_pago: row.preco_pago === null ? null : Number(row.preco_pago) }));
  }

  async findBilhete(idOrQr: string) {
    const row = await this.db.one(
      `
      SELECT b.*, v.codigo AS viagem_codigo, v.origem_sigla, v.destino_sigla,
             v.data_hora_saida, e.nome AS embarcacao_nome, c.nome AS cliente_nome
      FROM bilhete b
      JOIN viagem v ON v.id = b.viagem_id
      JOIN embarcacao e ON e.id = v.embarcacao_id
      LEFT JOIN cliente c ON c.id = b.cliente_id
      WHERE b.id::text = $1 OR b.qr_token = $1 OR b.codigo = $1
      LIMIT 1
      `,
      [idOrQr],
    );
    return row ? { ...row, preco_pago: row.preco_pago === null ? null : Number(row.preco_pago) } : null;
  }

  async createBilhete(input: CreateBilheteInput, userId: string) {
    if (!input.viagemId) throw new BadRequestException('viagemId obrigatorio');
    if (!input.classe) throw new BadRequestException('classe obrigatoria');
    const tipo = input.tipo ?? 'pdv';
    const precoPago = tipo === 'cortesia' || tipo === 'gratuidade' ? 0 : input.precoPago ?? null;
    const formaPagamento = input.formaPagamento ?? (tipo === 'cortesia' || tipo === 'gratuidade' ? tipo : 'dinheiro');

    const bilheteId = await this.db.tx(async (client) => {
      if (input.clientUuid) {
        const existing = await client.query<{ id: string }>(
          'SELECT id FROM bilhete WHERE client_uuid = $1::uuid LIMIT 1',
          [input.clientUuid],
        );
        if (existing.rows[0]) return existing.rows[0].id;
      }

      const viagem = await client.query<{ capacidade_pax_disponivel: Record<string, unknown> | null }>(
        'SELECT capacidade_pax_disponivel FROM viagem WHERE id = $1 FOR UPDATE',
        [input.viagemId],
      );
      if (!viagem.rows[0]) throw new NotFoundException('Viagem nao encontrada');

      const capacidade = this.capacidadeDaClasse(viagem.rows[0].capacidade_pax_disponivel, input.classe);
      if (capacidade !== null) {
        const ocupados = await client.query<{ total: string }>(
          `
          SELECT count(*)::text AS total
          FROM bilhete
          WHERE viagem_id = $1
            AND classe = $2::classe_passagem
            AND status <> 'cancelado'
          `,
          [input.viagemId, input.classe],
        );
        if (Number(ocupados.rows[0]?.total ?? 0) >= capacidade) {
          throw new BadRequestException('Capacidade esgotada para esta classe nesta viagem');
        }
      }

      const codigo = await this.nextCodigo();
      const qrToken = await this.nextQrToken(codigo);
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO bilhete (
          codigo, viagem_id, cliente_id, passageiro_nome, passageiro_documento,
          classe, subtipo, tipo, canal, item_preco_id, preco_pago, qr_token,
          assento, observacoes, client_uuid, criado_por
        )
        VALUES ($1, $2, $3, $4, $5, $6::classe_passagem, $7, $8::tipo_bilhete, $9,
                $10, $11::numeric, $12, $13, $14, $15::uuid, $16)
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
        RETURNING id
        `,
        [
          codigo,
          input.viagemId,
          input.clienteId ?? null,
          input.passageiroNome ?? null,
          input.passageiroDocumento ?? null,
          input.classe,
          input.subtipo ?? null,
          tipo,
          input.canal ?? tipo,
          input.itemPrecoId ?? null,
          precoPago,
          qrToken,
          input.assento ?? null,
          input.observacoes ?? null,
          input.clientUuid ?? null,
          userId,
        ],
      );
      const id = inserted.rows[0]?.id;
      if (!id) {
        const existing = await client.query<{ id: string }>(
          'SELECT id FROM bilhete WHERE client_uuid = $1::uuid LIMIT 1',
          [input.clientUuid],
        );
        if (existing.rows[0]) return existing.rows[0].id;
        throw new BadRequestException('Bilhete duplicado nao localizado');
      }

      if (input.caixaId) {
        const movimento = await client.query<{ id: string }>(
          `
          INSERT INTO caixa_movimento (
            caixa_id, tipo, forma_pagamento, valor, bilhete_id, criado_por, client_uuid, observacao
          )
          VALUES ($1, 'venda_passagem', $2::forma_pagamento, $3::numeric, $4, $5, $6::uuid, $7)
          RETURNING id
          `,
          [input.caixaId, formaPagamento, precoPago ?? 0, id, userId, input.clientUuid ? randomUUID() : null, `Bilhete ${codigo}`],
        );
        await client.query('UPDATE bilhete SET caixa_movimento_id = $2 WHERE id = $1', [id, movimento.rows[0].id]);
      }

      if (tipo === 'gratuidade') {
        await client.query(
          `
          INSERT INTO gratuidade (bilhete_id, tipo_legal, documento_url, registrado_por)
          VALUES ($1, $2::tipo_gratuidade, $3::text, $4)
          `,
          [id, input.gratuidadeTipo ?? 'outro', input.documentoUrl ?? null, userId],
        );
      }

      if (tipo === 'cortesia' && input.cortesiaCodigo) {
        await client.query('UPDATE cortesia SET bilhete_id = $2 WHERE codigo = $1', [input.cortesiaCodigo, id]);
      }

      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois, client_uuid)
        VALUES ('bilhete', $1, 'criar', $2, jsonb_build_object('codigo', $3::text, 'tipo', $4::text), $5::uuid)
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
        `,
        [id, userId, codigo, tipo, input.clientUuid ?? null],
      );

      if (input.emitirBpe === true) {
        await client.query(
          `
          INSERT INTO bilhete_documento_fiscal (bilhete_id, status, servico, payload, emitido_em)
          VALUES ($1, 'stub_emitido', 'stub', $2::jsonb, now())
          ON CONFLICT (bilhete_id) DO NOTHING
          `,
          [id, JSON.stringify({ motivo: 'BP-e stub pelo PDV - fornecedor/SEFAZ/PFX ainda nao configurados' })],
        );
      }
      return id;
    });

    return this.findBilhete(bilheteId);
  }

  private capacidadeDaClasse(capacidadePax: Record<string, unknown> | null, classe: string): number | null {
    const raw = capacidadePax?.[classe];
    const value = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as { capacidade?: unknown; disponivel?: unknown }).capacidade ?? (raw as { disponivel?: unknown }).disponivel
      : raw;
    const capacidade = Number(value);
    return Number.isFinite(capacidade) && capacidade > 0 ? capacidade : null;
  }

  async validarBilhete(idOrQr: string, input: ValidarBilheteInput, user: AuthTokenPayload) {
    const bilhete = await this.findBilhete(input.qrToken ?? idOrQr);
    if (!bilhete) throw new NotFoundException('Bilhete nao encontrado');
    if (bilhete.status !== 'emitido') {
      return { resultado: bilhete.status === 'validado' || bilhete.status === 'usado' ? 'ja_validado' : 'bloqueado', bilhete };
    }
    const gps = input.latitude !== undefined && input.longitude !== undefined
      ? `SRID=4326;POINT(${input.longitude} ${input.latitude})`
      : null;
    await this.db.tx(async (client) => {
      await client.query(
        `
        UPDATE bilhete
        SET status = 'validado', validado_em = COALESCE($4::timestamptz, now()), validado_por = $2,
            validado_gps = CASE WHEN $3::text IS NULL THEN NULL ELSE ST_GeogFromText($3) END
        WHERE id = $1
        `,
        [bilhete.id, user.sub, gps, input.validadoEm ?? null],
      );
      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, perfil, dispositivo, gps, dados_depois, client_uuid)
        VALUES (
          'bilhete', $1, 'validar', $2, $3, $4,
          CASE WHEN $5::text IS NULL THEN NULL ELSE ST_GeogFromText($5) END,
          jsonb_build_object('status', 'validado'::text, 'validadoEm', COALESCE($7::timestamptz, now())), $6::uuid
        )
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
        `,
        [bilhete.id, user.sub, user.perfilNome, input.dispositivo ?? null, gps, input.clientUuid ?? null, input.validadoEm ?? null],
      );
    });
    return { resultado: 'valido', bilhete: await this.findBilhete(bilhete.id) };
  }

  async manifesto(viagemId: string) {
    const bilhetes = await this.listBilhetes(viagemId);
    const resumo = bilhetes.reduce<Record<string, { total: number; receita: number }>>((acc, bilhete) => {
      const key = bilhete.tipo === 'cortesia' || bilhete.tipo === 'gratuidade' || bilhete.tipo === 'contrato' ? bilhete.tipo : 'paga';
      acc[key] ??= { total: 0, receita: 0 };
      acc[key].total += 1;
      acc[key].receita += Number(bilhete.preco_pago ?? 0);
      return acc;
    }, {});
    return { viagemId, resumo, bilhetes };
  }

  async listCortesias(viagemId?: string) {
    const params: unknown[] = [];
    const filter = viagemId ? 'WHERE co.viagem_id = $1' : '';
    if (viagemId) params.push(viagemId);
    const result = await this.db.query(
      `
      SELECT co.*, v.codigo AS viagem_codigo, u.nome AS concedido_por_nome,
             CASE WHEN co.bilhete_id IS NULL THEN 'nao_usada' ELSE 'usada' END AS status
      FROM cortesia co
      JOIN viagem v ON v.id = co.viagem_id
      JOIN usuario u ON u.id = co.concedido_por
      ${filter}
      ORDER BY co.criado_em DESC
      LIMIT 200
      `,
      params,
    );
    return result.rows;
  }

  async createCortesia(input: CreateCortesiaInput, userId: string) {
    if (!input.viagemId) throw new BadRequestException('viagemId obrigatorio');
    const limite = await this.getLimiteCortesiaPorViagem();
    const emitidas = await this.db.one<{ total: string }>(
      'SELECT count(*)::text AS total FROM cortesia WHERE viagem_id = $1',
      [input.viagemId],
    );
    if (Number(emitidas?.total ?? 0) >= limite) {
      throw new BadRequestException(`Limite de ${limite} cortesia(s) por viagem atingido`);
    }
    const codigo = `AJC-CORT-${randomBytes(3).toString('hex').toUpperCase()}`;
    return this.db.one(
      `
      INSERT INTO cortesia (codigo, viagem_id, classe, motivo, concedido_por, observacoes, client_uuid)
      VALUES ($1, $2, $3::classe_passagem, $4, $5, $6, $7)
      ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO UPDATE
        SET observacoes = EXCLUDED.observacoes
      RETURNING *
      `,
      [codigo, input.viagemId, input.classe ?? null, input.motivo ?? null, userId, input.observacoes ?? null, input.clientUuid ?? null],
    );
  }

  async listGratuidades(viagemId?: string) {
    const params: unknown[] = [];
    const filter = viagemId ? 'WHERE b.viagem_id = $1' : '';
    if (viagemId) params.push(viagemId);
    const result = await this.db.query(
      `
      SELECT g.*, b.codigo AS bilhete_codigo, b.passageiro_nome, b.passageiro_documento,
             b.viagem_id, v.codigo AS viagem_codigo
      FROM gratuidade g
      JOIN bilhete b ON b.id = g.bilhete_id
      JOIN viagem v ON v.id = b.viagem_id
      ${filter}
      ORDER BY g.criado_em DESC
      LIMIT 200
      `,
      params,
    );
    return result.rows;
  }

  private async nextCodigo() {
    const year = new Date().getFullYear();
    const row = await this.db.one<{ total: string }>('SELECT count(*)::text AS total FROM bilhete WHERE codigo LIKE $1', [`BIL-${year}-%`]);
    return `BIL-${year}-${String(Number(row?.total ?? 0) + 1).padStart(5, '0')}`;
  }

  private async nextQrToken(codigo: string) {
    return `${codigo}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private async getLimiteCortesiaPorViagem() {
    const config = await this.db.one<{ valor: unknown }>(
      `
      SELECT v.valor
      FROM config_chave c
      JOIN config_versao v ON v.chave_id = c.id AND v.ativo = true
      WHERE c.chave = 'limite_cortesia'
      LIMIT 1
      `,
    );
    const valor = config?.valor as { porViagem?: unknown; limite?: unknown } | undefined;
    const limit = Number(valor?.porViagem ?? valor?.limite);
    if (!Number.isInteger(limit) || limit < 1) {
      throw new BadRequestException('Config limite_cortesia.porViagem nao publicada');
    }
    return limit;
  }
}
