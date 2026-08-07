import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService, DbExecutor } from '../../database/database.service';

export interface CreateCotacaoInput {
  tipo: 'encomenda' | 'carga' | 'veiculo';
  clienteId: string;
  agenteId?: string | null;
  origemSigla?: string | null;
  destinoSigla?: string | null;
  parametros?: Record<string, unknown>;
  valorEstimado?: number | null;
  validade?: string | null;
  clientUuid?: string | null;
}

export interface PedidoEnvioInput {
  tipo: 'carga' | 'encomenda' | 'veiculo' | 'maquina';
  clienteId: string;
  agenteId?: string | null;
  cotacaoId?: string | null;
  origemSigla: string;
  destinoSigla: string;
  status?: 'registrado' | 'aguardando_documentos' | 'pronto_operacao' | 'cancelado';
  parametros?: Record<string, unknown>;
  valorEstimado?: number | null;
  observacao?: string | null;
  clientUuid?: string | null;
}

@Injectable()
export class CrmRepository {
  constructor(private readonly db: DatabaseService) {}

  async listCotacoes() {
    const result = await this.db.query(
      `
      SELECT cot.id, cot.tipo::text, cot.cliente_id, c.nome AS cliente_nome,
             cot.agente_id, a.nome AS agente_nome, cot.origem_sigla, cot.destino_sigla,
             cot.parametros, cot.valor_estimado, cot.validade, cot.status::text,
             cot.convertida_carga_id, cg.codigo AS carga_codigo, cot.criado_em
      FROM cotacao cot
      JOIN cliente c ON c.id = cot.cliente_id
      LEFT JOIN agente a ON a.id = cot.agente_id
      LEFT JOIN carga cg ON cg.id = cot.convertida_carga_id
      ORDER BY cot.criado_em DESC
      LIMIT 300
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      clienteId: row.cliente_id,
      clienteNome: row.cliente_nome,
      agenteId: row.agente_id,
      agenteNome: row.agente_nome,
      origemSigla: row.origem_sigla,
      destinoSigla: row.destino_sigla,
      parametros: row.parametros ?? {},
      valorEstimado: row.valor_estimado === null ? null : Number(row.valor_estimado),
      validade: row.validade,
      status: row.status,
      convertidaCargaId: row.convertida_carga_id,
      cargaCodigo: row.carga_codigo,
      criadoEm: row.criado_em,
    }));
  }

  async listPedidos(filters: { clienteId?: string; status?: string; busca?: string } = {}) {
    const result = await this.db.query(
      `SELECT p.*,c.nome AS cliente_nome,c.codigo AS cliente_codigo,a.nome AS agente_nome,
              cot.status::text AS cotacao_status,cg.codigo AS carga_codigo
       FROM pedido_envio p
       JOIN cliente c ON c.id=p.cliente_id
       LEFT JOIN agente a ON a.id=p.agente_id
       LEFT JOIN cotacao cot ON cot.id=p.cotacao_id
       LEFT JOIN carga cg ON cg.id=p.carga_id
       WHERE p.excluido_em IS NULL
         AND ($1::uuid IS NULL OR p.cliente_id=$1)
         AND ($2::text IS NULL OR p.status=$2)
         AND ($3::text IS NULL OR unaccent(lower(p.codigo||' '||c.nome||' '||COALESCE(p.observacao,''))) LIKE '%'||unaccent(lower($3))||'%')
       ORDER BY p.criado_em DESC LIMIT 300`,
      [filters.clienteId || null, filters.status || null, filters.busca?.trim() || null],
    );
    return result.rows.map(mapPedido);
  }

  async createPedido(input: PedidoEnvioInput, userId: string) {
    this.validatePedido(input);
    return this.db.tx(async (client) => {
      if (input.clientUuid) {
        const found = await client.query('SELECT id FROM pedido_envio WHERE client_uuid=$1', [input.clientUuid]);
        if (found.rows[0]) return this.findPedido(found.rows[0].id, client);
      }
      await client.query("SELECT pg_advisory_xact_lock(hashtext('pedido_envio_codigo'))");
      const sequence = await client.query(
        `SELECT COALESCE(MAX(substring(codigo from '[0-9]+$')::int),0)+1 AS proximo
         FROM pedido_envio WHERE codigo LIKE $1`,
        [`PED-${new Date().getFullYear()}-%`],
      );
      const codigo = `PED-${new Date().getFullYear()}-${String(sequence.rows[0].proximo).padStart(5, '0')}`;
      const inserted = await client.query(
        `INSERT INTO pedido_envio(codigo,tipo,cliente_id,agente_id,cotacao_id,origem_sigla,destino_sigla,status,
          parametros,valor_estimado,observacao,criado_por,atualizado_por,client_uuid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$12,$13) RETURNING id`,
        [codigo,input.tipo,input.clienteId,input.agenteId||null,input.cotacaoId||null,input.origemSigla,input.destinoSigla,
          input.status||'registrado',JSON.stringify(input.parametros||{}),input.valorEstimado??null,input.observacao?.trim()||null,userId,input.clientUuid||null],
      );
      await client.query(
        `INSERT INTO audit_evento(entidade,entidade_id,acao,usuario_id,dados_depois,client_uuid)
         VALUES ('pedido_envio',$1,'criar',$2,$3::jsonb,$4)`,
        [inserted.rows[0].id,userId,JSON.stringify({codigo,tipo:input.tipo,status:input.status||'registrado'}),input.clientUuid||null],
      );
      return this.findPedido(inserted.rows[0].id, client);
    });
  }

  async updatePedido(id: string, input: PedidoEnvioInput, userId: string) {
    this.validatePedido(input);
    const before = await this.db.one('SELECT * FROM pedido_envio WHERE id=$1 AND excluido_em IS NULL', [id]);
    if (!before) throw new BadRequestException('Pedido de envio nao encontrado');
    if (before.status === 'convertido') throw new BadRequestException('Pedido convertido nao pode ser alterado');
    const row = await this.db.one(
      `UPDATE pedido_envio SET tipo=$2,cliente_id=$3,agente_id=$4,cotacao_id=$5,origem_sigla=$6,destino_sigla=$7,
       status=$8,parametros=$9::jsonb,valor_estimado=$10,observacao=$11,atualizado_por=$12 WHERE id=$1 RETURNING id`,
      [id,input.tipo,input.clienteId,input.agenteId||null,input.cotacaoId||null,input.origemSigla,input.destinoSigla,
        input.status||before.status,JSON.stringify(input.parametros||{}),input.valorEstimado??null,input.observacao?.trim()||null,userId],
    );
    await this.db.query(
      `INSERT INTO audit_evento(entidade,entidade_id,acao,usuario_id,dados_antes,dados_depois)
       VALUES ('pedido_envio',$1,'atualizar',$2,$3::jsonb,$4::jsonb)`,
      [id,userId,JSON.stringify(before),JSON.stringify(input)],
    );
    return this.findPedido(row!.id);
  }

  private validatePedido(input: PedidoEnvioInput) {
    if (!['carga','encomenda','veiculo','maquina'].includes(input.tipo)) throw new BadRequestException('Tipo de pedido invalido');
    if (!input.clienteId || !input.origemSigla || !input.destinoSigla) throw new BadRequestException('Cliente, origem e destino sao obrigatorios');
    if (input.origemSigla === input.destinoSigla) throw new BadRequestException('Origem e destino devem ser diferentes');
    if (input.valorEstimado != null && Number(input.valorEstimado) < 0) throw new BadRequestException('Valor estimado invalido');
  }

  private async findPedido(id: string, executor: DbExecutor = this.db) {
    const result = await executor.query(
      `SELECT p.*,c.nome AS cliente_nome,c.codigo AS cliente_codigo,a.nome AS agente_nome,
              cot.status::text AS cotacao_status,cg.codigo AS carga_codigo
       FROM pedido_envio p JOIN cliente c ON c.id=p.cliente_id
       LEFT JOIN agente a ON a.id=p.agente_id LEFT JOIN cotacao cot ON cot.id=p.cotacao_id
       LEFT JOIN carga cg ON cg.id=p.carga_id WHERE p.id=$1`, [id],
    );
    return mapPedido(result.rows[0]);
  }

  async createCotacao(input: CreateCotacaoInput, userId: string) {
    if (!['encomenda', 'carga', 'veiculo'].includes(input.tipo)) {
      throw new BadRequestException('tipo invalido');
    }
    if (!input.clienteId) throw new BadRequestException('clienteId obrigatorio');
    if (input.clientUuid) {
      const existing = await this.db.one<{ id: string }>('SELECT id FROM cotacao WHERE client_uuid = $1', [input.clientUuid]);
      if (existing) return this.findCotacao(existing.id);
    }
    if (input.valorEstimado !== undefined && input.valorEstimado !== null && Number(input.valorEstimado) < 0) {
      throw new BadRequestException('valorEstimado invalido');
    }
    const row = await this.db.one(
      `
      INSERT INTO cotacao (
        tipo, cliente_id, agente_id, origem_sigla, destino_sigla,
        parametros, valor_estimado, validade, status, criado_por, client_uuid
      )
      VALUES (
        $1::tipo_cotacao, $2, $3, $4, $5, $6::jsonb, $7::numeric,
        COALESCE($8::timestamptz, now() + interval '7 days'),
        'aberta', $9, $10
      )
      RETURNING id
      `,
      [
        input.tipo,
        input.clienteId,
        input.agenteId ?? null,
        input.origemSigla ?? null,
        input.destinoSigla ?? null,
        JSON.stringify(input.parametros ?? {}),
        input.valorEstimado ?? null,
        input.validade ?? null,
        userId,
        input.clientUuid ?? null,
      ],
    );
    return this.findCotacao(row.id);
  }

  private async findCotacao(id: string) {
    const result = await this.db.query(
      `
      SELECT cot.id, cot.tipo::text, cot.cliente_id, c.nome AS cliente_nome,
             cot.agente_id, a.nome AS agente_nome, cot.origem_sigla, cot.destino_sigla,
             cot.parametros, cot.valor_estimado, cot.validade, cot.status::text,
             cot.convertida_carga_id, cg.codigo AS carga_codigo, cot.criado_em
      FROM cotacao cot
      JOIN cliente c ON c.id = cot.cliente_id
      LEFT JOIN agente a ON a.id = cot.agente_id
      LEFT JOIN carga cg ON cg.id = cot.convertida_carga_id
      WHERE cot.id = $1
      `,
      [id],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      tipo: row.tipo,
      clienteId: row.cliente_id,
      clienteNome: row.cliente_nome,
      agenteId: row.agente_id,
      agenteNome: row.agente_nome,
      origemSigla: row.origem_sigla,
      destinoSigla: row.destino_sigla,
      parametros: row.parametros ?? {},
      valorEstimado: row.valor_estimado === null ? null : Number(row.valor_estimado),
      validade: row.validade,
      status: row.status,
      convertidaCargaId: row.convertida_carga_id,
      cargaCodigo: row.carga_codigo,
      criadoEm: row.criado_em,
    };
  }

  async historicoCliente(clienteId: string) {
    const cargas = await this.db.query(
      `
      SELECT cg.id, cg.codigo, cg.categoria, cg.cidade_origem_sigla, cg.cidade_destino_sigla,
             cg.valor_cobrado, cg.peso_total, cg.criado_em,
             COUNT(v.id)::int AS volumes
      FROM carga cg
      LEFT JOIN volume v ON v.carga_id = cg.id
      WHERE cg.cliente_remetente_id = $1
      GROUP BY cg.id
      ORDER BY cg.criado_em DESC
      LIMIT 20
      `,
      [clienteId],
    );
    const bilhetes = await this.db.query(
      `
      SELECT b.id, b.codigo, b.classe::text, b.preco_pago, b.status::text,
             v.origem_sigla, v.destino_sigla, v.data_hora_saida, e.nome AS embarcacao_nome
      FROM bilhete b
      JOIN viagem v ON v.id = b.viagem_id
      JOIN embarcacao e ON e.id = v.embarcacao_id
      WHERE b.cliente_id = $1
      ORDER BY b.criado_em DESC
      LIMIT 20
      `,
      [clienteId],
    );
    return {
      cargas: cargas.rows.map((row) => ({
        id: row.id,
        codigo: row.codigo,
        categoria: row.categoria,
        trecho: `${row.cidade_origem_sigla ?? 'BEL'} -> ${row.cidade_destino_sigla ?? '-'}`,
        valor: row.valor_cobrado === null ? null : Number(row.valor_cobrado),
        pesoTotal: row.peso_total === null ? null : Number(row.peso_total),
        volumes: Number(row.volumes ?? 0),
        criadoEm: row.criado_em,
      })),
      bilhetes: bilhetes.rows.map((row) => ({
        id: row.id,
        codigo: row.codigo,
        classe: row.classe,
        trecho: `${row.origem_sigla} -> ${row.destino_sigla ?? '-'}`,
        valor: row.preco_pago === null ? null : Number(row.preco_pago),
        status: row.status,
        saida: row.data_hora_saida,
        embarcacaoNome: row.embarcacao_nome,
      })),
    };
  }
}

function mapPedido(row: any) {
  return {
    id: row.id, codigo: row.codigo, tipo: row.tipo, clienteId: row.cliente_id,
    clienteNome: row.cliente_nome, clienteCodigo: row.cliente_codigo, agenteId: row.agente_id,
    agenteNome: row.agente_nome, cotacaoId: row.cotacao_id, cotacaoStatus: row.cotacao_status,
    origemSigla: row.origem_sigla, destinoSigla: row.destino_sigla, status: row.status,
    parametros: row.parametros || {}, valorEstimado: row.valor_estimado == null ? null : Number(row.valor_estimado),
    observacao: row.observacao, cargaId: row.carga_id, cargaCodigo: row.carga_codigo,
    envioVeiculoId: row.envio_veiculo_id, criadoEm: row.criado_em, atualizadoEm: row.atualizado_em,
  };
}
