import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface CreateCotacaoInput {
  tipo: 'encomenda' | 'carga' | 'veiculo';
  clienteId: string;
  agenteId?: string | null;
  origemSigla?: string | null;
  destinoSigla?: string | null;
  parametros?: Record<string, unknown>;
  valorEstimado?: number | null;
  validade?: string | null;
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

  async createCotacao(input: CreateCotacaoInput, userId: string) {
    if (!['encomenda', 'carga', 'veiculo'].includes(input.tipo)) {
      throw new BadRequestException('tipo invalido');
    }
    if (!input.clienteId) throw new BadRequestException('clienteId obrigatorio');
    if (input.valorEstimado !== undefined && input.valorEstimado !== null && Number(input.valorEstimado) < 0) {
      throw new BadRequestException('valorEstimado invalido');
    }
    const row = await this.db.one(
      `
      INSERT INTO cotacao (
        tipo, cliente_id, agente_id, origem_sigla, destino_sigla,
        parametros, valor_estimado, validade, status, criado_por
      )
      VALUES (
        $1::tipo_cotacao, $2, $3, $4, $5, $6::jsonb, $7::numeric,
        COALESCE($8::timestamptz, now() + interval '7 days'),
        'aberta', $9
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
