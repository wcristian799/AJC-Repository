import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  AlertaOperacionalSeveridade,
  AlertaOperacionalStatus,
  CreateAlertaOperacionalInput,
  UpdateAlertaOperacionalInput,
} from './operacao.types';

const SEVERIDADES: AlertaOperacionalSeveridade[] = ['info', 'warning', 'danger'];
const STATUS: AlertaOperacionalStatus[] = ['aberto', 'resolvido', 'cancelado'];

@Injectable()
export class OperacaoRepository {
  constructor(private readonly db: DatabaseService) {}

  async relatorioDia(data?: string) {
    const { dia, inicio, fim } = parseDiaOperacional(data);
    const [viagens, bilhetes, tms, caixas, alertas, viagensDetalhe] = await Promise.all([
      this.db.one<{
        total: string;
        planejadas: string;
        em_curso: string;
        concluidas: string;
        canceladas: string;
      }>(
        `
        SELECT
          count(*)::text AS total,
          count(*) FILTER (WHERE status = 'planejada')::text AS planejadas,
          count(*) FILTER (WHERE status = 'em_curso')::text AS em_curso,
          count(*) FILTER (WHERE status = 'concluida')::text AS concluidas,
          count(*) FILTER (WHERE status = 'cancelada')::text AS canceladas
        FROM viagem
        WHERE data_hora_saida >= $1::timestamptz AND data_hora_saida < $2::timestamptz
        `,
        [inicio, fim],
      ),
      this.db.one<{
        emitidos: string;
        validados: string;
        cancelados: string;
        receita: string | null;
      }>(
        `
        SELECT
          count(*) FILTER (WHERE status <> 'cancelado')::text AS emitidos,
          count(*) FILTER (WHERE validado_em IS NOT NULL AND status <> 'cancelado')::text AS validados,
          count(*) FILTER (WHERE status = 'cancelado')::text AS cancelados,
          COALESCE(sum(preco_pago) FILTER (WHERE status <> 'cancelado'), 0)::text AS receita
        FROM bilhete
        WHERE criado_em >= $1::timestamptz AND criado_em < $2::timestamptz
        `,
        [inicio, fim],
      ),
      this.db.one<{
        cargas: string;
        encomendas: string;
        volumes: string;
        peso_total: string | null;
        valor_declarado: string | null;
      }>(
        `
        SELECT
          count(DISTINCT c.id) FILTER (WHERE c.categoria = 'carga')::text AS cargas,
          count(DISTINCT c.id) FILTER (WHERE c.categoria = 'encomenda')::text AS encomendas,
          count(v.id)::text AS volumes,
          COALESCE(sum(c.peso_total), 0)::text AS peso_total,
          COALESCE(sum(c.valor_declarado), 0)::text AS valor_declarado
        FROM carga c
        LEFT JOIN volume v ON v.carga_id = c.id
        WHERE c.criado_em >= $1::timestamptz AND c.criado_em < $2::timestamptz
        `,
        [inicio, fim],
      ),
      this.db.one<{
        caixas_abertos: string;
        movimentos: string;
        entradas: string | null;
        saidas: string | null;
        saldo_movimentos: string | null;
      }>(
        `
        SELECT
          (SELECT count(*)::text FROM caixa WHERE status = 'aberto') AS caixas_abertos,
          count(cm.id)::text AS movimentos,
          COALESCE(sum(cm.valor) FILTER (WHERE cm.valor > 0), 0)::text AS entradas,
          COALESCE(sum(abs(cm.valor)) FILTER (WHERE cm.valor < 0), 0)::text AS saidas,
          COALESCE(sum(cm.valor), 0)::text AS saldo_movimentos
        FROM caixa_movimento cm
        WHERE cm.criado_em >= $1::timestamptz AND cm.criado_em < $2::timestamptz
        `,
        [inicio, fim],
      ),
      this.db.one<{
        abertos: string;
        criticos: string;
        resolvidos_dia: string;
      }>(
        `
        SELECT
          count(*) FILTER (WHERE status = 'aberto')::text AS abertos,
          count(*) FILTER (WHERE status = 'aberto' AND severidade = 'danger')::text AS criticos,
          count(*) FILTER (WHERE resolvido_em >= $1::timestamptz AND resolvido_em < $2::timestamptz)::text AS resolvidos_dia
        FROM alerta_operacional
        WHERE criado_em < $2::timestamptz
        `,
        [inicio, fim],
      ),
      this.db.query<{
        id: string;
        codigo: string | null;
        embarcacao_nome: string;
        origem_sigla: string;
        destino_sigla: string | null;
        data_hora_saida: Date;
        status: string;
        bilhetes: string;
        volumes: string;
        receita: string | null;
      }>(
        `
        WITH bilhetes_viagem AS (
          SELECT viagem_id, count(*) AS bilhetes, COALESCE(sum(preco_pago), 0) AS receita
          FROM bilhete
          WHERE status <> 'cancelado'
          GROUP BY viagem_id
        ),
        volumes_viagem AS (
          SELECT c.viagem_id, count(vol.id) AS volumes
          FROM carga c
          LEFT JOIN volume vol ON vol.carga_id = c.id
          GROUP BY c.viagem_id
        )
        SELECT v.id, v.codigo, e.nome AS embarcacao_nome, v.origem_sigla, v.destino_sigla,
               v.data_hora_saida, v.status::text,
               COALESCE(bv.bilhetes, 0)::text AS bilhetes,
               COALESCE(vv.volumes, 0)::text AS volumes,
               COALESCE(bv.receita, 0)::text AS receita
        FROM viagem v
        JOIN embarcacao e ON e.id = v.embarcacao_id
        LEFT JOIN bilhetes_viagem bv ON bv.viagem_id = v.id
        LEFT JOIN volumes_viagem vv ON vv.viagem_id = v.id
        WHERE v.data_hora_saida >= $1::timestamptz AND v.data_hora_saida < $2::timestamptz
        ORDER BY v.data_hora_saida ASC
        LIMIT 100
        `,
        [inicio, fim],
      ),
    ]);

    return {
      data: dia,
      geradoEm: new Date().toISOString(),
      periodo: { inicio, fim },
      viagens: {
        total: Number(viagens?.total ?? 0),
        planejadas: Number(viagens?.planejadas ?? 0),
        emCurso: Number(viagens?.em_curso ?? 0),
        concluidas: Number(viagens?.concluidas ?? 0),
        canceladas: Number(viagens?.canceladas ?? 0),
        detalhe: viagensDetalhe.rows.map((row) => ({
          id: row.id,
          codigo: row.codigo,
          embarcacaoNome: row.embarcacao_nome,
          origemSigla: row.origem_sigla,
          destinoSigla: row.destino_sigla,
          dataHoraSaida: row.data_hora_saida instanceof Date ? row.data_hora_saida.toISOString() : row.data_hora_saida,
          status: row.status,
          bilhetes: Number(row.bilhetes),
          volumes: Number(row.volumes),
          receita: Number(row.receita ?? 0),
        })),
      },
      vendas: {
        bilhetesEmitidos: Number(bilhetes?.emitidos ?? 0),
        bilhetesValidados: Number(bilhetes?.validados ?? 0),
        bilhetesCancelados: Number(bilhetes?.cancelados ?? 0),
        receita: Number(bilhetes?.receita ?? 0),
      },
      tms: {
        cargas: Number(tms?.cargas ?? 0),
        encomendas: Number(tms?.encomendas ?? 0),
        volumes: Number(tms?.volumes ?? 0),
        pesoTotal: Number(tms?.peso_total ?? 0),
        valorDeclarado: Number(tms?.valor_declarado ?? 0),
      },
      caixa: {
        caixasAbertos: Number(caixas?.caixas_abertos ?? 0),
        movimentos: Number(caixas?.movimentos ?? 0),
        entradas: Number(caixas?.entradas ?? 0),
        saidas: Number(caixas?.saidas ?? 0),
        saldoMovimentos: Number(caixas?.saldo_movimentos ?? 0),
      },
      alertas: {
        abertos: Number(alertas?.abertos ?? 0),
        criticos: Number(alertas?.criticos ?? 0),
        resolvidosDia: Number(alertas?.resolvidos_dia ?? 0),
      },
    };
  }

  async listAlertas(status: AlertaOperacionalStatus = 'aberto') {
    if (!STATUS.includes(status)) throw new BadRequestException('status invalido');
    const result = await this.db.query(
      `
      SELECT ao.id, ao.titulo, ao.detalhe, ao.severidade::text, ao.status::text,
             ao.origem, ao.modulo, ao.entidade, ao.entidade_id, ao.client_uuid,
             ao.criado_por, ao.resolvido_por, ao.criado_em, ao.resolvido_em, ao.atualizado_em,
             uc.nome AS criado_por_nome, ur.nome AS resolvido_por_nome
      FROM alerta_operacional ao
      LEFT JOIN usuario uc ON uc.id = ao.criado_por
      LEFT JOIN usuario ur ON ur.id = ao.resolvido_por
      WHERE ao.status = $1::status_alerta_operacional
      ORDER BY
        CASE ao.severidade
          WHEN 'danger' THEN 3
          WHEN 'warning' THEN 2
          ELSE 1
        END DESC,
        ao.criado_em DESC
      LIMIT 200
      `,
      [status],
    );
    return result.rows;
  }

  async createAlerta(input: CreateAlertaOperacionalInput, userId: string) {
    const titulo = this.requireText(input.titulo, 'titulo', 160);
    const detalhe = this.requireText(input.detalhe, 'detalhe', 2000);
    const severidade = this.parseSeveridade(input.severidade ?? 'warning');
    const row = await this.db.tx(async (client) => {
      const inserted = await client.query(
        `
        INSERT INTO alerta_operacional (
          titulo, detalhe, severidade, status, origem, modulo,
          entidade, entidade_id, client_uuid, criado_por
        )
        VALUES ($1, $2, $3::severidade_alerta_operacional, 'aberto', 'manual',
                $4, $5, $6::uuid, $7::uuid, $8)
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO UPDATE
        SET titulo = EXCLUDED.titulo,
            detalhe = EXCLUDED.detalhe,
            severidade = EXCLUDED.severidade,
            modulo = EXCLUDED.modulo,
            entidade = EXCLUDED.entidade,
            entidade_id = EXCLUDED.entidade_id,
            atualizado_em = now()
        RETURNING *
        `,
        [
          titulo,
          detalhe,
          severidade,
          this.nullableText(input.modulo, 60),
          this.nullableText(input.entidade, 60),
          input.entidadeId ?? null,
          input.clientUuid ?? null,
          userId,
        ],
      );
      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois, client_uuid)
        VALUES ('alerta_operacional', $1, 'criar', $2, $3::jsonb, $4)
        `,
        [
          inserted.rows[0].id,
          userId,
          JSON.stringify({
            titulo,
            detalhe,
            severidade,
            status: inserted.rows[0].status,
            modulo: input.modulo ?? null,
          }),
          input.clientUuid ?? null,
        ],
      );
      return inserted.rows[0];
    });
    return this.findAlerta(row.id);
  }

  async updateAlerta(id: string, input: UpdateAlertaOperacionalInput, userId: string) {
    const current = await this.findAlerta(id);
    if (!current) throw new NotFoundException('Alerta nao encontrado');
    const status = input.status ? this.parseStatus(input.status) : current.status;
    const severidade = input.severidade ? this.parseSeveridade(input.severidade) : current.severidade;
    const titulo = input.titulo === undefined ? current.titulo : this.requireText(input.titulo, 'titulo', 160);
    const detalhe = input.detalhe === undefined ? current.detalhe : this.requireText(input.detalhe, 'detalhe', 2000);
    const modulo = input.modulo === undefined ? current.modulo : this.nullableText(input.modulo, 60);
    const entidade = input.entidade === undefined ? current.entidade : this.nullableText(input.entidade, 60);
    const entidadeId = input.entidadeId === undefined ? current.entidade_id : input.entidadeId;

    await this.db.tx(async (client) => {
      await client.query(
        `
        UPDATE alerta_operacional
        SET titulo = $2,
            detalhe = $3,
            severidade = $4::severidade_alerta_operacional,
            status = $5::status_alerta_operacional,
            modulo = $6,
            entidade = $7,
            entidade_id = $8::uuid,
            resolvido_por = CASE WHEN $5 = 'resolvido' THEN $9::uuid ELSE NULL END,
            resolvido_em = CASE WHEN $5 = 'resolvido' THEN COALESCE(resolvido_em, now()) ELSE NULL END
        WHERE id = $1
        `,
        [id, titulo, detalhe, severidade, status, modulo, entidade, entidadeId ?? null, userId],
      );
      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_antes, dados_depois, client_uuid)
        VALUES ('alerta_operacional', $1, 'atualizar', $2, $3::jsonb, $4::jsonb, $5)
        `,
        [
          id,
          userId,
          JSON.stringify({
            titulo: current.titulo,
            detalhe: current.detalhe,
            severidade: current.severidade,
            status: current.status,
          }),
          JSON.stringify({ titulo, detalhe, severidade, status, modulo, entidade, entidadeId }),
          input.clientUuid ?? null,
        ],
      );
    });
    return this.findAlerta(id);
  }

  async findAlerta(id: string) {
    return this.db.one(
      `
      SELECT ao.id, ao.titulo, ao.detalhe, ao.severidade::text, ao.status::text,
             ao.origem, ao.modulo, ao.entidade, ao.entidade_id, ao.client_uuid,
             ao.criado_por, ao.resolvido_por, ao.criado_em, ao.resolvido_em, ao.atualizado_em,
             uc.nome AS criado_por_nome, ur.nome AS resolvido_por_nome
      FROM alerta_operacional ao
      LEFT JOIN usuario uc ON uc.id = ao.criado_por
      LEFT JOIN usuario ur ON ur.id = ao.resolvido_por
      WHERE ao.id = $1
      LIMIT 1
      `,
      [id],
    );
  }

  private requireText(value: string | undefined, field: string, max: number) {
    const text = value?.trim();
    if (!text) throw new BadRequestException(`${field} obrigatorio`);
    if (text.length > max) throw new BadRequestException(`${field} excede ${max} caracteres`);
    return text;
  }

  private nullableText(value: string | null | undefined, max: number) {
    const text = value?.trim();
    if (!text) return null;
    if (text.length > max) throw new BadRequestException(`campo excede ${max} caracteres`);
    return text;
  }

  private parseSeveridade(value: string): AlertaOperacionalSeveridade {
    if (!SEVERIDADES.includes(value as AlertaOperacionalSeveridade)) {
      throw new BadRequestException('severidade invalida');
    }
    return value as AlertaOperacionalSeveridade;
  }

  private parseStatus(value: string): AlertaOperacionalStatus {
    if (!STATUS.includes(value as AlertaOperacionalStatus)) {
      throw new BadRequestException('status invalido');
    }
    return value as AlertaOperacionalStatus;
  }
}

function parseDiaOperacional(input?: string) {
  const dia = input?.trim() || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new BadRequestException('data deve estar no formato YYYY-MM-DD');
  const start = new Date(`${dia}T00:00:00-03:00`);
  if (Number.isNaN(start.getTime())) throw new BadRequestException('data invalida');
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    dia,
    inicio: start.toISOString(),
    fim: end.toISOString(),
  };
}
