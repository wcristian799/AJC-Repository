import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { TmsControlConfig, validateTmsControlConfig } from './tms-control-config.validator';
import { TmsControlQuery, TmsControlVolumesQuery } from './tms.types';

type NormalizedControlQuery = {
  busca: string | null;
  embarcacaoId: string | null;
  cidadeSigla: string | null;
  status: string | null;
  dataInicio: string;
  dataFim: string;
  pagina: number;
  porPagina: number;
};

@Injectable()
export class TmsControlRepository {
  constructor(private readonly db: DatabaseService) {}

  async list(query: TmsControlQuery, exportMode = false) {
    const configValue = await this.getConfig();
    const filters = this.normalizeQuery(query, configValue.config, exportMode);
    const result = await this.db.one<{ payload: Record<string, unknown> }>(
      this.controlQuerySql(),
      [
        filters.dataInicio,
        filters.dataFim,
        filters.busca,
        filters.embarcacaoId,
        filters.cidadeSigla,
        filters.status,
        configValue.config.timezone,
        filters.porPagina,
        (filters.pagina - 1) * filters.porPagina,
      ],
    );
    const payload = result?.payload ?? { items: [], total: 0, totals: this.emptyTotals() };
    return {
      ...payload,
      filtros: filters,
      paginacao: {
        pagina: filters.pagina,
        porPagina: filters.porPagina,
        total: Number(payload.total ?? 0),
        paginas: Math.max(1, Math.ceil(Number(payload.total ?? 0) / filters.porPagina)),
      },
      configuracao: {
        versao: configValue.versao,
        ...configValue.config,
      },
      atualizadoEm: new Date().toISOString(),
      exportacao: exportMode ? {
        limite: configValue.config.limiteExportacao,
        truncada: Number(payload.total ?? 0) > filters.porPagina,
      } : undefined,
    };
  }

  async listVolumes(viagemId: string, query: TmsControlVolumesQuery) {
    assertUuid(viagemId, 'viagemId');
    const configValue = await this.getConfig();
    const trip = await this.db.one<{ id: string; codigo: string | null; embarcacao_nome: string }>(
      `SELECT v.id, v.codigo, e.nome AS embarcacao_nome
       FROM viagem v JOIN embarcacao e ON e.id = v.embarcacao_id
       WHERE v.id = $1`,
      [viagemId],
    );
    if (!trip) throw new NotFoundException('Viagem nao encontrada');
    const pagina = positiveInteger(query.pagina, 1, 'pagina');
    const porPagina = boundedInteger(query.porPagina, configValue.config.itensPorPagina, 5, configValue.config.maximoPorPagina, 'porPagina');
    const status = query.status?.trim() || null;
    if (status && !['cadastrado', 'conferido', 'embarcado', 'entregue', 'divergente'].includes(status)) {
      throw new BadRequestException('status de volume invalido');
    }
    const busca = normalizeOptional(query.busca, 120);
    const cidade = normalizeOptional(query.cidadeSigla, 4)?.toUpperCase() ?? null;
    const rows = await this.db.query<{
      id: string;
      total_registros: number;
      eventos_total: number;
      ultimo_evento: unknown;
      [key: string]: unknown;
    }>(
      `
      SELECT vol.id, vol.id AS uuid, vol.indice_volume, vol.total_volumes,
             vol.peso, vol.status::text, vol.criado_em, vol.atualizado_em,
             c.id AS carga_id, c.codigo AS carga_codigo, c.numero_pedido,
             c.cidade_destino_sigla, c.valor_declarado, c.valor_cobrado,
             cli.id AS cliente_id, cli.codigo AS cliente_codigo, cli.nome AS cliente_nome,
             count(*) OVER()::int AS total_registros,
             (SELECT count(*)::int FROM evento_volume ev WHERE ev.volume_id = vol.id) AS eventos_total,
             (SELECT jsonb_build_object(
                'id', ev.id, 'tipo', ev.tipo::text, 'ocorridoEm', ev.ocorrido_em,
                'usuarioNome', u.nome, 'observacao', ev.obs,
                'fotoUrl', ev.foto_url, 'fotoHash', ev.foto_hash,
                'gps', CASE WHEN ev.gps IS NULL THEN NULL ELSE ST_AsGeoJSON(ev.gps::geometry)::jsonb END
              )
              FROM evento_volume ev
              JOIN usuario u ON u.id = ev.usuario_id
              WHERE ev.volume_id = vol.id
              ORDER BY ev.ocorrido_em DESC, ev.criado_em DESC
              LIMIT 1) AS ultimo_evento
      FROM volume vol
      JOIN carga c ON c.id = vol.carga_id
      JOIN cliente cli ON cli.id = c.cliente_remetente_id
      WHERE c.viagem_id = $1
        AND c.status <> 'cancelada'
        AND ($2::text IS NULL OR unaccent(lower(concat_ws(' ', vol.id::text, c.codigo, c.numero_pedido, cli.codigo, cli.nome))) LIKE '%' || unaccent(lower($2)) || '%')
        AND ($3::text IS NULL OR c.cidade_destino_sigla = $3)
        AND ($4::text IS NULL OR vol.status::text = $4)
      ORDER BY vol.criado_em DESC, vol.indice_volume
      LIMIT $5 OFFSET $6
      `,
      [viagemId, busca, cidade, status, porPagina, (pagina - 1) * porPagina],
    );
    const total = Number(rows.rows[0]?.total_registros ?? 0);
    const divergencias = await this.db.query(
      `
      SELECT vol.id, vol.id AS uuid, c.codigo AS carga_codigo, c.cidade_destino_sigla,
             cli.codigo AS cliente_codigo, cli.nome AS cliente_nome, vol.atualizado_em,
             (SELECT ev.obs FROM evento_volume ev WHERE ev.volume_id = vol.id AND ev.tipo = 'divergencia' ORDER BY ev.ocorrido_em DESC LIMIT 1) AS observacao
      FROM volume vol
      JOIN carga c ON c.id = vol.carga_id
      JOIN cliente cli ON cli.id = c.cliente_remetente_id
      WHERE c.viagem_id = $1 AND c.status <> 'cancelada' AND vol.status = 'divergente'
      ORDER BY vol.atualizado_em DESC
      LIMIT $2
      `,
      [viagemId, configValue.config.limiteDivergenciasPainel],
    );
    return {
      viagem: { id: trip.id, codigo: trip.codigo, embarcacaoNome: trip.embarcacao_nome },
      items: rows.rows.map(({ total_registros: _total, ...row }) => ({
        ...row,
        peso: row.peso === null ? null : Number(row.peso),
        valor_declarado: row.valor_declarado === null ? null : Number(row.valor_declarado),
        valor_cobrado: row.valor_cobrado === null ? null : Number(row.valor_cobrado),
        eventos_total: Number(row.eventos_total ?? 0),
      })),
      divergencias: divergencias.rows,
      paginacao: { pagina, porPagina, total, paginas: Math.max(1, Math.ceil(total / porPagina)) },
      atualizadoEm: new Date().toISOString(),
    };
  }

  async listVolumeEvents(volumeId: string) {
    assertUuid(volumeId, 'volumeId');
    const configValue = await this.getConfig();
    const volume = await this.db.one<{ id: string; uuid: string; carga_codigo: string | null }>(
      `SELECT vol.id, vol.id AS uuid, c.codigo AS carga_codigo
       FROM volume vol JOIN carga c ON c.id = vol.carga_id WHERE vol.id = $1`,
      [volumeId],
    );
    if (!volume) throw new NotFoundException('Volume nao encontrado');
    const events = await this.db.query(
      `
      SELECT ev.id, ev.tipo::text, ev.obs AS observacao, ev.ocorrido_em, ev.criado_em,
             ev.foto_url, ev.foto_hash, ev.client_uuid, u.id AS usuario_id, u.nome AS usuario_nome,
             CASE WHEN ev.gps IS NULL THEN NULL ELSE ST_AsGeoJSON(ev.gps::geometry)::jsonb END AS gps
      FROM evento_volume ev
      JOIN usuario u ON u.id = ev.usuario_id
      WHERE ev.volume_id = $1
      ORDER BY ev.ocorrido_em DESC, ev.criado_em DESC
      LIMIT $2
      `,
      [volumeId, configValue.config.limiteEventosPorVolume],
    );
    return { volume, items: events.rows, limite: configValue.config.limiteEventosPorVolume };
  }

  private async getConfig(): Promise<{ versao: number; config: TmsControlConfig }> {
    const row = await this.db.one<{ versao: number; valor: unknown }>(
      `SELECT cv.versao, cv.valor
       FROM config_versao cv
       JOIN config_chave cc ON cc.id = cv.chave_id
       WHERE cc.chave = 'tms_controle_viagem' AND cc.ativo = true AND cv.ativo = true
       LIMIT 1`,
    );
    if (!row) throw new BadRequestException('Configuracao tms_controle_viagem nao publicada');
    validateTmsControlConfig(row.valor);
    return { versao: row.versao, config: row.valor };
  }

  private normalizeQuery(query: TmsControlQuery, config: TmsControlConfig, exportMode: boolean): NormalizedControlQuery {
    const today = dateInTimezone(new Date(), config.timezone);
    const defaultStart = shiftIsoDate(today, -config.diasPassadosPadrao);
    const defaultEnd = shiftIsoDate(today, config.diasFuturosPadrao);
    const dataInicio = validDate(query.dataInicio, defaultStart, 'dataInicio');
    const dataFim = validDate(query.dataFim, defaultEnd, 'dataFim');
    if (dataInicio > dataFim) throw new BadRequestException('dataInicio deve ser anterior ou igual a dataFim');
    const status = normalizeOptional(query.status, 20);
    if (status && !['planejada', 'em_curso', 'concluida', 'cancelada'].includes(status)) {
      throw new BadRequestException('status de viagem invalido');
    }
    return {
      busca: normalizeOptional(query.busca, 120),
      embarcacaoId: optionalUuid(query.embarcacaoId, 'embarcacaoId'),
      cidadeSigla: normalizeOptional(query.cidadeSigla, 4)?.toUpperCase() ?? null,
      status,
      dataInicio,
      dataFim,
      pagina: exportMode ? 1 : positiveInteger(query.pagina, 1, 'pagina'),
      porPagina: exportMode
        ? config.limiteExportacao
        : boundedInteger(query.porPagina, config.itensPorPagina, 5, config.maximoPorPagina, 'porPagina'),
    };
  }

  private emptyTotals() {
    return { viagens: 0, volumes: 0, conferidos: 0, embarcados: 0, entregues: 0, divergentes: 0, valorDeclarado: null, valorCobrado: null, cargasSemValorDeclarado: 0, cargasSemValorCobrado: 0 };
  }

  private controlQuerySql() {
    return `
      WITH filtered_trips AS (
        SELECT v.id, v.codigo, v.embarcacao_id, e.nome AS embarcacao_nome,
               v.origem_sigla, v.destino_sigla, v.data_hora_saida, v.data_hora_retorno,
               v.status::text, v.situacao::text
        FROM viagem v
        JOIN embarcacao e ON e.id = v.embarcacao_id
        WHERE v.data_hora_saida >= ($1::date::timestamp AT TIME ZONE $7)
          AND v.data_hora_saida < (($2::date + 1)::timestamp AT TIME ZONE $7)
          AND ($3::text IS NULL OR unaccent(lower(concat_ws(' ', v.codigo, e.nome, v.origem_sigla, v.destino_sigla))) LIKE '%' || unaccent(lower($3)) || '%')
          AND ($4::uuid IS NULL OR v.embarcacao_id = $4)
          AND ($6::text IS NULL OR v.status::text = $6)
          AND ($5::text IS NULL OR v.destino_sigla = $5 OR EXISTS (
            SELECT 1 FROM viagem_escala ve WHERE ve.viagem_id = v.id AND ve.cidade_sigla = $5
          ) OR EXISTS (
            SELECT 1 FROM carga c WHERE c.viagem_id = v.id AND c.status <> 'cancelada' AND c.cidade_destino_sigla = $5
          ))
      ),
      carga_agg AS (
        SELECT c.viagem_id,
               count(*)::int AS cargas,
               sum(c.valor_declarado) AS valor_declarado,
               sum(c.valor_cobrado) AS valor_cobrado,
               count(*) FILTER (WHERE c.valor_declarado IS NULL)::int AS cargas_sem_valor_declarado,
               count(*) FILTER (WHERE c.valor_cobrado IS NULL)::int AS cargas_sem_valor_cobrado
        FROM carga c
        JOIN filtered_trips ft ON ft.id = c.viagem_id
        WHERE c.status <> 'cancelada'
        GROUP BY c.viagem_id
      ),
      volume_flags AS (
        SELECT vol.id, c.viagem_id, vol.status::text,
               (vol.status::text IN ('conferido','embarcado','entregue') OR
                coalesce(bool_or(ev.tipo::text IN ('recebido','conferido','embarcado','reconferido','desembarcado','entregue')), false)) AS passou_conferencia,
               (vol.status::text IN ('embarcado','entregue') OR
                coalesce(bool_or(ev.tipo::text IN ('embarcado','reconferido','desembarcado','entregue')), false)) AS passou_embarque,
               (vol.status::text = 'entregue' OR coalesce(bool_or(ev.tipo::text = 'entregue'), false)) AS passou_entrega
        FROM volume vol
        JOIN carga c ON c.id = vol.carga_id AND c.status <> 'cancelada'
        JOIN filtered_trips ft ON ft.id = c.viagem_id
        LEFT JOIN evento_volume ev ON ev.volume_id = vol.id
        GROUP BY vol.id, c.viagem_id, vol.status
      ),
      volume_agg AS (
        SELECT viagem_id, count(*)::int AS volumes,
               count(*) FILTER (WHERE passou_conferencia)::int AS conferidos,
               count(*) FILTER (WHERE passou_embarque)::int AS embarcados,
               count(*) FILTER (WHERE passou_entrega)::int AS entregues,
               count(*) FILTER (WHERE status = 'divergente')::int AS divergentes
        FROM volume_flags GROUP BY viagem_id
      ),
      escala_agg AS (
        SELECT ft.id AS viagem_id,
               count(ve.id)::int AS escalas_total,
               count(ve.id) FILTER (WHERE ve.data_hora_real IS NOT NULL)::int AS escalas_realizadas,
               coalesce(jsonb_agg(jsonb_build_object(
                 'id', ve.id, 'cidadeSigla', ve.cidade_sigla, 'ordem', ve.ordem,
                 'dataHoraPrevista', ve.data_hora_prevista, 'dataHoraReal', ve.data_hora_real
               ) ORDER BY ve.ordem) FILTER (WHERE ve.id IS NOT NULL), '[]'::jsonb) AS escalas
        FROM filtered_trips ft LEFT JOIN viagem_escala ve ON ve.viagem_id = ft.id
        GROUP BY ft.id
      ),
      base AS (
        SELECT ft.*, coalesce(ca.cargas, 0) AS cargas,
               coalesce(va.volumes, 0) AS volumes, coalesce(va.conferidos, 0) AS conferidos,
               coalesce(va.embarcados, 0) AS embarcados, coalesce(va.entregues, 0) AS entregues,
               coalesce(va.divergentes, 0) AS divergentes,
               ca.valor_declarado, ca.valor_cobrado,
               coalesce(ca.cargas_sem_valor_declarado, 0) AS cargas_sem_valor_declarado,
               coalesce(ca.cargas_sem_valor_cobrado, 0) AS cargas_sem_valor_cobrado,
               ea.escalas,
               CASE
                 WHEN ft.status = 'concluida' THEN 100
                 WHEN ft.status = 'planejada' THEN 0
                 WHEN coalesce(ea.escalas_total, 0) = 0 THEN CASE WHEN ft.status = 'em_curso' THEN 25 ELSE 0 END
                 ELSE least(99, round((1 + coalesce(ea.escalas_realizadas, 0))::numeric / (1 + ea.escalas_total) * 100))::int
               END AS progresso_percentual
        FROM filtered_trips ft
        LEFT JOIN carga_agg ca ON ca.viagem_id = ft.id
        LEFT JOIN volume_agg va ON va.viagem_id = ft.id
        LEFT JOIN escala_agg ea ON ea.viagem_id = ft.id
      ),
      page AS (
        SELECT * FROM base ORDER BY data_hora_saida DESC LIMIT $8 OFFSET $9
      )
      SELECT jsonb_build_object(
        'items', coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY data_hora_saida DESC) FROM page), '[]'::jsonb),
        'total', (SELECT count(*) FROM base),
        'totals', jsonb_build_object(
          'viagens', (SELECT count(*) FROM base),
          'volumes', coalesce((SELECT sum(volumes) FROM base), 0),
          'conferidos', coalesce((SELECT sum(conferidos) FROM base), 0),
          'embarcados', coalesce((SELECT sum(embarcados) FROM base), 0),
          'entregues', coalesce((SELECT sum(entregues) FROM base), 0),
          'divergentes', coalesce((SELECT sum(divergentes) FROM base), 0),
          'valorDeclarado', (SELECT sum(valor_declarado) FROM base),
          'valorCobrado', (SELECT sum(valor_cobrado) FROM base),
          'cargasSemValorDeclarado', coalesce((SELECT sum(cargas_sem_valor_declarado) FROM base), 0),
          'cargasSemValorCobrado', coalesce((SELECT sum(cargas_sem_valor_cobrado) FROM base), 0)
        )
      ) AS payload
    `;
  }
}

function normalizeOptional(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > max) throw new BadRequestException(`valor deve ter no maximo ${max} caracteres`);
  return normalized;
}

function assertUuid(value: string, field: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestException(`${field} deve ser um UUID valido`);
  }
}

function optionalUuid(value: unknown, field: string) {
  const normalized = normalizeOptional(value, 80);
  if (normalized) assertUuid(normalized, field);
  return normalized;
}

function validDate(value: unknown, fallback: string, field: string): string {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`))) {
    throw new BadRequestException(`${field} invalida`);
  }
  return value;
}

function positiveInteger(value: unknown, fallback: number, field: string): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new BadRequestException(`${field} deve ser inteiro positivo`);
  return parsed;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number, field: string): number {
  const parsed = positiveInteger(value, fallback, field);
  if (parsed < min || parsed > max) throw new BadRequestException(`${field} deve estar entre ${min} e ${max}`);
  return parsed;
}

function dateInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function shiftIsoDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
