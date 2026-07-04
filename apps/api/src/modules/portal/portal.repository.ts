import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import {
  CreatePortalPagamentoInput,
  CreatePortalPedidoInput,
  GatewayStubWebhookInput,
  PortalPedidoItemInput,
  PortalViagensQuery,
} from './portal.types';

type ViagemRow = {
  id: string;
  codigo: string;
  origem_sigla: string;
  destino_sigla: string;
  data_hora_saida: Date;
  data_hora_retorno: Date | null;
  capacidade_pax_disponivel: Record<string, number | string | null>;
  embarcacao_nome: string;
};

@Injectable()
export class PortalRepository {
  private readonly defaultTtlMinutes = 10;
  private readonly systemUserIdCache = new Map<string, string>();

  constructor(private readonly db: DatabaseService) {}

  async listViagens(query: PortalViagensQuery) {
    await this.expireReservasVencidas();
    const params: unknown[] = [];
    const filters = ["v.status <> 'cancelada'::status_viagem", "v.data_hora_saida >= now() - interval '1 day'"];
    if (query.origem) {
      params.push(query.origem);
      filters.push(`v.origem_sigla = $${params.length}`);
    }
    if (query.destino) {
      params.push(query.destino);
      filters.push(`v.destino_sigla = $${params.length}`);
    }
    if (query.data) {
      params.push(query.data);
      filters.push(`v.data_hora_saida::date = $${params.length}::date`);
    }
    const result = await this.db.query<ViagemRow>(
      `
      SELECT v.id, v.codigo, v.origem_sigla, v.destino_sigla, v.data_hora_saida,
             v.data_hora_retorno, v.capacidade_pax_disponivel,
             e.nome AS embarcacao_nome
      FROM viagem v
      JOIN embarcacao e ON e.id = v.embarcacao_id
      WHERE ${filters.join(' AND ')}
      ORDER BY v.data_hora_saida
      LIMIT 50
      `,
      params,
    );

    const ofertas: Array<Record<string, unknown>> = [];
    for (const viagem of result.rows) {
      const classes = await this.classesDisponiveis(viagem);
      ofertas.push({
        id: viagem.id,
        codigo: viagem.codigo,
        origem: viagem.origem_sigla,
        destino: viagem.destino_sigla,
        embarcacao: viagem.embarcacao_nome,
        saida: viagem.data_hora_saida.toISOString(),
        chegada: viagem.data_hora_retorno?.toISOString() ?? null,
        classes,
      });
    }
    return ofertas;
  }

  async createPedido(input: CreatePortalPedidoInput) {
    if (!input.viagemId) throw new BadRequestException('viagemId obrigatorio');
    if (!input.itens?.length) throw new BadRequestException('Ao menos um item e obrigatorio');
    if (!input.termoAceito) throw new BadRequestException('Termo de aceite obrigatorio');
    await this.expireReservasVencidas();

    const ttl = Math.max(1, Math.min(input.ttlMinutos ?? this.defaultTtlMinutes, 30));
    const codigo = await this.nextPedidoCodigo();
    const pedidoId = await this.db.tx(async (client) => {
      const viagem = await this.findViagem(client, input.viagemId);
      if (!viagem) throw new NotFoundException('Viagem nao encontrada');
      const clienteId = await this.upsertCliente(client, input.cliente);
      const expiraEm = new Date(Date.now() + ttl * 60_000);
      const normalized = input.itens.map((item) => this.normalizeItem(item));

      for (const item of normalized) {
        await this.lockSlot(client, viagem.id, item.classe, item.assento ?? '');
      }

      let total = 0;
      const pricedItems: Array<ReturnType<typeof this.normalizeItem> & { valorUnitario: number }> = [];
      for (const item of normalized) {
        const valorUnitario = await this.findPreco(client, viagem, item);
        await this.assertDisponibilidade(client, viagem, item, item.quantidade);
        total += valorUnitario * item.quantidade;
        pricedItems.push({ ...item, valorUnitario });
      }

      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO portal_pedido (
          codigo, cliente_id, visitante_nome, visitante_documento, visitante_email,
          visitante_whatsapp, viagem_id, status, valor_total, termo_aceito,
          termo_aceito_em, expira_em, client_uuid
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'reservado', $8::numeric, true, now(), $9, $10::uuid)
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO UPDATE
          SET atualizado_em = now()
        RETURNING id
        `,
        [
          codigo,
          clienteId,
          input.cliente?.nome ?? null,
          input.cliente?.documento ?? null,
          input.cliente?.email ?? null,
          input.cliente?.whatsapp ?? null,
          viagem.id,
          total,
          expiraEm,
          input.clientUuid ?? null,
        ],
      );
      const id = inserted.rows[0].id;

      for (const item of pricedItems) {
        await client.query(
          `
          INSERT INTO portal_reserva (
            pedido_id, viagem_id, classe, subtipo, assento, quantidade, valor_unitario, expira_em
          )
          VALUES ($1, $2, $3::classe_passagem, $4, $5, $6, $7::numeric, $8)
          `,
          [id, viagem.id, item.classe, item.subtipo ?? null, item.assento ?? null, item.quantidade, item.valorUnitario, expiraEm],
        );
      }

      return id;
    });

    return this.findPedido(pedidoId);
  }

  async findPedido(idOrCodigo: string) {
    const pedido = await this.db.one(
      `
      SELECT p.*, v.codigo AS viagem_codigo, v.origem_sigla, v.destino_sigla,
             v.data_hora_saida, e.nome AS embarcacao_nome, c.nome AS cliente_nome
      FROM portal_pedido p
      JOIN viagem v ON v.id = p.viagem_id
      JOIN embarcacao e ON e.id = v.embarcacao_id
      LEFT JOIN cliente c ON c.id = p.cliente_id
      WHERE p.id::text = $1 OR p.codigo = $1
      LIMIT 1
      `,
      [idOrCodigo],
    );
    if (!pedido) return null;
    const reservas = await this.db.query(
      'SELECT * FROM portal_reserva WHERE pedido_id = $1 ORDER BY criado_em',
      [pedido.id],
    );
    const pagamentos = await this.db.query(
      'SELECT * FROM portal_pagamento WHERE pedido_id = $1 ORDER BY criado_em DESC',
      [pedido.id],
    );
    const bilhetes = await this.db.query(
      `
      SELECT b.*
      FROM bilhete b
      WHERE b.observacoes LIKE $1
      ORDER BY b.criado_em
      `,
      [`%${pedido.codigo}%`],
    );
    return {
      ...pedido,
      valor_total: Number(pedido.valor_total),
      reservas: reservas.rows.map((row) => ({ ...row, valor_unitario: Number(row.valor_unitario) })),
      pagamentos: pagamentos.rows.map((row) => ({ ...row, valor: Number(row.valor) })),
      bilhetes: bilhetes.rows.map((row) => ({ ...row, preco_pago: row.preco_pago === null ? null : Number(row.preco_pago) })),
    };
  }

  async createPagamento(codigo: string, input: CreatePortalPagamentoInput) {
    const metodo = input.metodo ?? 'pix';
    const pedido = await this.findPedido(codigo);
    if (!pedido) throw new NotFoundException('Pedido nao encontrado');
    if (!['reservado', 'falha_pagamento', 'aguardando_pagamento'].includes(pedido.status)) {
      throw new BadRequestException(`Pedido em status ${pedido.status} nao aceita pagamento`);
    }
    if (new Date(pedido.expira_em).getTime() <= Date.now()) {
      await this.expireReservasVencidas();
      throw new BadRequestException('Reserva expirada');
    }
    const gatewayPaymentId = `stub_${pedido.codigo}_${randomBytes(4).toString('hex')}`;
    const row = await this.db.one(
      `
      INSERT INTO portal_pagamento (pedido_id, gateway, gateway_payment_id, metodo, status, valor, payload)
      VALUES ($1, 'stub', $2, $3, 'pendente', $4::numeric, $5::jsonb)
      RETURNING *
      `,
      [
        pedido.id,
        gatewayPaymentId,
        metodo,
        pedido.valor_total,
        JSON.stringify({ ambiente: 'stub', instrucao: 'Use /api/portal/webhooks/stub para confirmar.' }),
      ],
    );
    await this.db.query(
      "UPDATE portal_pedido SET status = 'aguardando_pagamento' WHERE id = $1 AND status IN ('reservado','falha_pagamento')",
      [pedido.id],
    );
    return {
      ...row,
      valor: Number(row?.valor ?? 0),
      checkout: {
        gateway: 'stub',
        gatewayPaymentId,
        metodo,
        pixCopiaCola: metodo === 'pix' ? `000201AJC${pedido.codigo}${gatewayPaymentId}` : null,
        redirectUrl: null,
      },
    };
  }

  async processWebhook(input: GatewayStubWebhookInput) {
    const eventId = input.eventId ?? `stub_${randomBytes(8).toString('hex')}`;
    const status = input.status ?? 'aprovado';
    const payload = JSON.stringify(input.payload ?? input);
    const existing = await this.db.one('SELECT * FROM portal_webhook_evento WHERE gateway = $1 AND event_id = $2', ['stub', eventId]);
    if (existing?.status === 'processado') {
      return { idempotente: true, evento: existing, pedido: input.pedidoCodigo ? await this.findPedido(input.pedidoCodigo) : null };
    }

    const result = await this.db.tx(async (client) => {
      const evento = existing ?? (await client.query(
        `
        INSERT INTO portal_webhook_evento (gateway, event_id, payload)
        VALUES ('stub', $1, $2::jsonb)
        RETURNING *
        `,
        [eventId, payload],
      )).rows[0];

      const pedido = await this.findPedidoForWebhook(client, input);
      if (!pedido) throw new NotFoundException('Pedido do webhook nao encontrado');
      if (pedido.status === 'emitido') {
        await client.query("UPDATE portal_webhook_evento SET status = 'processado', processado_em = now() WHERE id = $1", [evento.id]);
        return pedido.id;
      }

      if (status === 'recusado') {
        await client.query(
          `
          UPDATE portal_pagamento
          SET status = 'recusado', payload = payload || $2::jsonb
          WHERE pedido_id = $1 AND ($3::text IS NULL OR gateway_payment_id = $3)
          `,
          [pedido.id, payload, input.gatewayPaymentId ?? null],
        );
        await client.query("UPDATE portal_pedido SET status = 'falha_pagamento' WHERE id = $1", [pedido.id]);
        await client.query("UPDATE portal_webhook_evento SET status = 'processado', processado_em = now() WHERE id = $1", [evento.id]);
        return pedido.id;
      }

      if (new Date(pedido.expira_em).getTime() <= Date.now()) {
        await client.query("UPDATE portal_pedido SET status = 'expirado' WHERE id = $1", [pedido.id]);
        await client.query("UPDATE portal_reserva SET status = 'expirada' WHERE pedido_id = $1 AND status = 'ativa'", [pedido.id]);
        throw new BadRequestException('Reserva expirada antes da confirmacao de pagamento');
      }

      await client.query(
        `
        UPDATE portal_pagamento
        SET status = 'aprovado', confirmado_em = now(), payload = payload || $2::jsonb
        WHERE pedido_id = $1 AND ($3::text IS NULL OR gateway_payment_id = $3)
        `,
        [pedido.id, payload, input.gatewayPaymentId ?? null],
      );
      await client.query("UPDATE portal_pedido SET status = 'pago', pago_em = now() WHERE id = $1", [pedido.id]);
      await this.emitirBilhetes(client, pedido.id);
      await client.query("UPDATE portal_webhook_evento SET status = 'processado', processado_em = now() WHERE id = $1", [evento.id]);
      return pedido.id;
    });

    return { idempotente: false, pedido: await this.findPedido(result) };
  }

  async bilhetesCliente(documento?: string, email?: string) {
    if (!documento && !email) throw new BadRequestException('documento ou email obrigatorio');
    const result = await this.db.query(
      `
      SELECT b.id, b.codigo, b.qr_token, b.passageiro_nome, b.passageiro_documento,
             b.classe::text, b.subtipo, b.assento, b.preco_pago, b.status::text,
             v.origem_sigla, v.destino_sigla, v.data_hora_saida, e.nome AS embarcacao_nome
      FROM bilhete b
      JOIN viagem v ON v.id = b.viagem_id
      JOIN embarcacao e ON e.id = v.embarcacao_id
      LEFT JOIN cliente c ON c.id = b.cliente_id
      WHERE ($1::text IS NULL OR b.passageiro_documento = $1 OR c.cpf_cnpj = $1)
        AND ($2::text IS NULL OR c.contatos::text ILIKE '%' || $2 || '%')
      ORDER BY v.data_hora_saida DESC
      LIMIT 100
      `,
      [documento ?? null, email ?? null],
    );
    return result.rows.map((row) => ({ ...row, preco_pago: row.preco_pago === null ? null : Number(row.preco_pago) }));
  }

  private async classesDisponiveis(viagem: ViagemRow) {
    const classes = Object.entries(viagem.capacidade_pax_disponivel ?? {}).filter(([, raw]) => Number(raw ?? 0) > 0);
    const rows: Array<Record<string, unknown>> = [];
    for (const [classe, rawCapacidade] of classes) {
      const capacidade = Number(rawCapacidade ?? 0);
      const usados = await this.ocupados(viagem.id, classe);
      const preco = await this.findPreco(this.db, viagem, { classe });
      rows.push({
        classe,
        label: this.classLabel(classe),
        capacidade,
        ocupados: usados,
        restantes: Math.max(0, capacidade - usados),
        preco,
      });
    }
    return rows;
  }

  private async emitirBilhetes(client: PoolClient, pedidoId: string) {
    const pedido = await client.query(
      `
      SELECT p.*, c.nome AS cliente_nome
      FROM portal_pedido p
      LEFT JOIN cliente c ON c.id = p.cliente_id
      WHERE p.id = $1
      FOR UPDATE OF p
      `,
      [pedidoId],
    );
    const pedidoRow = pedido.rows[0];
    if (!pedidoRow) throw new NotFoundException('Pedido nao encontrado para emissao');
    if (pedidoRow.status === 'emitido') return;

    const reservas = await client.query(
      "SELECT * FROM portal_reserva WHERE pedido_id = $1 AND status = 'ativa' ORDER BY criado_em",
      [pedidoId],
    );
    const systemUserId = await this.systemUserId(client);
    for (const reserva of reservas.rows) {
      await this.lockSlot(client, reserva.viagem_id, reserva.classe, reserva.assento ?? '');
      await this.assertDisponibilidade(client, await this.findViagem(client, reserva.viagem_id), {
        classe: reserva.classe,
        subtipo: reserva.subtipo,
        assento: reserva.assento,
        quantidade: Number(reserva.quantidade),
      }, 0);
      for (let i = 0; i < Number(reserva.quantidade); i++) {
        const codigo = await this.nextBilheteCodigo(client);
        const qrToken = `${codigo}-${randomBytes(4).toString('hex').toUpperCase()}`;
        const bilhete = await client.query<{ id: string }>(
          `
          INSERT INTO bilhete (
            codigo, viagem_id, cliente_id, passageiro_nome, passageiro_documento,
            classe, subtipo, tipo, canal, preco_pago, qr_token, assento,
            observacoes, criado_por
          )
          VALUES ($1, $2, $3, $4, $5, $6::classe_passagem, $7, 'online',
                  'portal', $8::numeric, $9, $10, $11, $12)
          RETURNING id
          `,
          [
            codigo,
            reserva.viagem_id,
            pedidoRow.cliente_id,
            pedidoRow.visitante_nome ?? pedidoRow.cliente_nome,
            pedidoRow.visitante_documento,
            reserva.classe,
            reserva.subtipo,
            reserva.valor_unitario,
            qrToken,
            reserva.assento,
            `Emitido pelo portal no pedido ${pedidoRow.codigo}`,
            systemUserId,
          ],
        );
        await client.query(
          `
          INSERT INTO termo_aceite (bilhete_id, config_termo_versao_id, aceito_em, dispositivo)
          VALUES ($1, $2, COALESCE($3, now()), 'portal')
          `,
          [bilhete.rows[0].id, pedidoRow.termo_versao_id, pedidoRow.termo_aceito_em],
        );
        await client.query(
          `
          INSERT INTO bilhete_documento_fiscal (bilhete_id, status, provider, payload, emitido_em)
          VALUES ($1, 'stub_emitido', 'stub', $2::jsonb, now())
          ON CONFLICT (bilhete_id) DO NOTHING
          `,
          [bilhete.rows[0].id, JSON.stringify({ motivo: 'BP-e stub ate fornecedor/SEFAZ/PFX estarem configurados' })],
        );
        await client.query(
          `
          INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois)
          VALUES ('bilhete', $1, 'criar', $2, jsonb_build_object('origem', 'portal', 'pedido', $3::text))
          `,
          [bilhete.rows[0].id, systemUserId, pedidoRow.codigo],
        );
      }
    }

    await client.query("UPDATE portal_reserva SET status = 'confirmada' WHERE pedido_id = $1 AND status = 'ativa'", [pedidoId]);
    await client.query("UPDATE portal_pedido SET status = 'emitido', emitido_em = now() WHERE id = $1", [pedidoId]);
  }

  private async assertDisponibilidade(client: PoolClient | DatabaseService, viagem: ViagemRow | null, item: ReturnType<typeof this.normalizeItem>, quantidadeExtra: number) {
    if (!viagem) throw new NotFoundException('Viagem nao encontrada');
    const capacidade = Number(viagem.capacidade_pax_disponivel?.[item.classe] ?? 0);
    if (capacidade <= 0) throw new BadRequestException(`Classe ${item.classe} indisponivel para esta viagem`);
    const ocupados = await this.ocupados(viagem.id, item.classe, client);
    const quantidade = quantidadeExtra === 0 ? 0 : item.quantidade;
    if (ocupados + quantidade > capacidade) {
      throw new BadRequestException(`Classe ${item.classe} sem vagas suficientes`);
    }
    if (item.assento) {
      const assento = await client.query(
        `
        SELECT 1
        FROM (
          SELECT assento FROM bilhete
          WHERE viagem_id = $1 AND classe = $2::classe_passagem AND assento = $3
            AND status NOT IN ('cancelado','reembolsado')
          UNION ALL
          SELECT assento FROM portal_reserva
          WHERE viagem_id = $1 AND classe = $2::classe_passagem AND assento = $3
            AND status = 'ativa' AND expira_em > now()
        ) x
        LIMIT 1
        `,
        [viagem.id, item.classe, item.assento],
      );
      if (assento.rows.length) throw new BadRequestException('Assento/camarote indisponivel');
    }
  }

  private async ocupados(viagemId: string, classe: string, executor: PoolClient | DatabaseService = this.db) {
    const row = await executor.query<{ total: string }>(
      `
      SELECT (
        COALESCE((SELECT count(*) FROM bilhete
          WHERE viagem_id = $1 AND classe = $2::classe_passagem
            AND status NOT IN ('cancelado','reembolsado')), 0)
        +
        COALESCE((SELECT sum(quantidade) FROM portal_reserva
          WHERE viagem_id = $1 AND classe = $2::classe_passagem
            AND status = 'ativa' AND expira_em > now()), 0)
      )::text AS total
      `,
      [viagemId, classe],
    );
    return Number(row.rows[0]?.total ?? 0);
  }

  private async findPreco(executor: PoolClient | DatabaseService, viagem: ViagemRow, item: { classe: string; subtipo?: string | null }) {
    const row = await executor.query<{ valor: string }>(
      `
      SELECT ip.valor::text AS valor
      FROM item_preco ip
      JOIN tabela_preco tp ON tp.id = ip.tabela_id
      WHERE tp.tipo = 'passagem' AND tp.ativo = true
        AND ip.origem_sigla = $1 AND ip.destino_sigla = $2
        AND ip.classe = $3::classe_passagem
        AND ($4::text IS NULL OR ip.subtipo = $4)
      ORDER BY CASE WHEN ip.subtipo = $4 THEN 0 ELSE 1 END, ip.valor
      LIMIT 1
      `,
      [viagem.origem_sigla, viagem.destino_sigla, item.classe, item.subtipo ?? null],
    );
    if (!row.rows[0]) throw new BadRequestException(`Preco nao configurado para ${item.classe} no trecho`);
    return Number(row.rows[0].valor);
  }

  private normalizeItem(item: PortalPedidoItemInput) {
    const classeMap: Record<string, string> = {
      vip: 'rede_sala_vip',
      rede_vip: 'rede_sala_vip',
      camarote_royal: 'suite_master',
      royal: 'suite_master',
    };
    const classe = classeMap[item.classe] ?? item.classe;
    return {
      classe,
      subtipo: item.subtipo ?? (classe === 'suite_master' ? '2_pessoas' : undefined),
      quantidade: Math.max(1, Math.min(Number(item.quantidade ?? 1), 8)),
      assento: item.assento,
    };
  }

  private async findViagem(executor: PoolClient | DatabaseService, viagemId: string): Promise<ViagemRow | null> {
    const row = await executor.query<ViagemRow>(
      `
      SELECT v.id, v.codigo, v.origem_sigla, v.destino_sigla, v.data_hora_saida,
             v.data_hora_retorno, v.capacidade_pax_disponivel,
             e.nome AS embarcacao_nome
      FROM viagem v
      JOIN embarcacao e ON e.id = v.embarcacao_id
      WHERE v.id = $1
      LIMIT 1
      `,
      [viagemId],
    );
    return row.rows[0] ?? null;
  }

  private async upsertCliente(client: PoolClient, cliente?: { nome?: string; documento?: string; email?: string; whatsapp?: string }) {
    if (!cliente?.nome && !cliente?.documento && !cliente?.email) return null;
    const contatos = JSON.stringify([
      ...(cliente.email ? [{ tipo: 'email', valor: cliente.email }] : []),
      ...(cliente.whatsapp ? [{ tipo: 'whatsapp', valor: cliente.whatsapp }] : []),
    ]);
    if (cliente.documento) {
      const existing = await client.query('SELECT id FROM cliente WHERE cpf_cnpj = $1 AND excluido_em IS NULL LIMIT 1', [cliente.documento]);
      if (existing.rows[0]?.id) {
        await client.query('UPDATE cliente SET nome = COALESCE($2, nome), contatos = CASE WHEN $3::jsonb = []::jsonb THEN contatos ELSE $3::jsonb END, atualizado_em = now() WHERE id = $1', [existing.rows[0].id, cliente.nome ?? null, contatos]);
        return existing.rows[0].id;
      }
    }
    const inserted = await client.query<{ id: string }>(
      `
      INSERT INTO cliente (tipo, nome, cpf_cnpj, contatos)
      VALUES ($1::tipo_pessoa, $2, $3, $4::jsonb)
      RETURNING id
      `,
      [cliente.documento && cliente.documento.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF', cliente.nome ?? cliente.email ?? 'Cliente Portal', cliente.documento ?? null, contatos],
    );
    return inserted.rows[0].id;
  }

  private async findPedidoForWebhook(client: PoolClient, input: GatewayStubWebhookInput) {
    const result = await client.query(
      `
      SELECT p.*
      FROM portal_pedido p
      LEFT JOIN portal_pagamento pg ON pg.pedido_id = p.id
      WHERE ($1::text IS NOT NULL AND p.codigo = $1)
         OR ($2::text IS NOT NULL AND pg.gateway_payment_id = $2)
      ORDER BY p.criado_em DESC
      LIMIT 1
      FOR UPDATE OF p
      `,
      [input.pedidoCodigo ?? null, input.gatewayPaymentId ?? null],
    );
    return result.rows[0] ?? null;
  }

  private async expireReservasVencidas() {
    await this.db.query(
      `
      UPDATE portal_reserva SET status = 'expirada'
      WHERE status = 'ativa' AND expira_em <= now()
      `,
    );
    await this.db.query(
      `
      UPDATE portal_pedido SET status = 'expirado'
      WHERE status IN ('reservado','aguardando_pagamento','falha_pagamento')
        AND expira_em <= now()
      `,
    );
  }

  private async lockSlot(client: PoolClient, viagemId: string, classe: string, assento: string) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`portal:${viagemId}:${classe}:${assento}`]);
  }

  private async nextPedidoCodigo() {
    const year = new Date().getFullYear();
    const row = await this.db.one<{ total: string }>('SELECT count(*)::text AS total FROM portal_pedido WHERE codigo LIKE $1', [`PED-${year}-%`]);
    return `PED-${year}-${String(Number(row?.total ?? 0) + 1).padStart(5, '0')}`;
  }

  private async nextBilheteCodigo(client: PoolClient) {
    const year = new Date().getFullYear();
    const row = await client.query<{ total: string }>('SELECT count(*)::text AS total FROM bilhete WHERE codigo LIKE $1', [`BIL-${year}-%`]);
    return `BIL-${year}-${String(Number(row.rows[0]?.total ?? 0) + 1).padStart(5, '0')}`;
  }

  private async systemUserId(client: PoolClient) {
    if (this.systemUserIdCache.get('admin')) return this.systemUserIdCache.get('admin')!;
    const row = await client.query<{ id: string }>("SELECT id FROM usuario WHERE login = 'admin' LIMIT 1");
    if (!row.rows[0]?.id) throw new BadRequestException('Usuario admin seed nao encontrado');
    this.systemUserIdCache.set('admin', row.rows[0].id);
    return row.rows[0].id;
  }

  private classLabel(classe: string) {
    const labels: Record<string, string> = {
      rede: 'Rede',
      rede_sala_vip: 'Rede Sala VIP',
      camarote: 'Camarote',
      suite_comum: 'Suite Comum',
      suite_comum_vip: 'Suite Comum VIP',
      suite_master: 'Suite Master',
      suite_master_vip: 'Suite Master VIP',
      mega_suite: 'Mega Suite',
    };
    return labels[classe] ?? classe;
  }
}
