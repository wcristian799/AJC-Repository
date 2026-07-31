import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateViagemInput, NotifyEscalasInput, TransicionarViagemInput, UpdateViagemInput } from './navegacao.types';

export interface ViagemDto {
  id: string;
  codigo: string | null;
  embarcacaoId: string;
  embarcacaoNome: string;
  origemSigla: string;
  destinoSigla: string | null;
  dataHoraSaida: string;
  dataHoraRetorno: string | null;
  status: string;
  situacao: string | null;
  capacidadePaxDisponivel: Record<string, unknown>;
  observacoes: string | null;
  rotaTemplateId: string | null;
  configVersaoId: string | null;
  configVersao: number | null;
  cicloUuid: string | null;
  motivoCancelamento: string | null;
  escalas: {
    id: string;
    cidadeSigla: string;
    ordem: number;
    dataHoraPrevista: string | null;
    dataHoraReal: string | null;
    observacao: string | null;
  }[];
}

export interface EscalaColaboradorDto {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorWhatsapp: string | null;
  colaboradorFuncaoBase: string | null;
  cidadeSigla: string | null;
  viagemId: string | null;
  viagemCodigo: string | null;
  embarcacaoNome: string | null;
  origemSigla: string | null;
  destinoSigla: string | null;
  dataHoraSaida: string | null;
  dataHoraRetorno: string | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  funcao: string | null;
  status: string;
  statusOriginal: string;
  notificadoEm: string | null;
  confirmadoEm: string | null;
  conflito: boolean;
}

@Injectable()
export class NavegacaoRepository {
  constructor(private readonly db: DatabaseService) {}

  async listViagens(): Promise<ViagemDto[]> {
    const result = await this.db.query<{ id: string }>(
      `
      SELECT id
      FROM viagem
      ORDER BY data_hora_saida DESC
      LIMIT 100
      `,
    );
    const viagens: ViagemDto[] = [];
    for (const row of result.rows) {
      const viagem = await this.findViagem(row.id);
      if (viagem) viagens.push(viagem);
    }
    return viagens;
  }

  async findViagem(id: string): Promise<ViagemDto | null> {
    const row = await this.db.one<{
      id: string;
      codigo: string | null;
      embarcacao_id: string;
      embarcacao_nome: string;
      origem_sigla: string;
      destino_sigla: string | null;
      data_hora_saida: Date;
      data_hora_retorno: Date | null;
      status: string;
      situacao: string | null;
      capacidade_pax_disponivel: Record<string, unknown>;
      observacoes: string | null;
      rota_template_id: string | null;
      config_versao_id: string | null;
      config_versao: number | null;
      ciclo_uuid: string | null;
      motivo_cancelamento: string | null;
    }>(
      `
      SELECT v.id, v.codigo, v.embarcacao_id, e.nome AS embarcacao_nome,
             v.origem_sigla, v.destino_sigla, v.data_hora_saida, v.data_hora_retorno,
             v.status::text, v.situacao::text, v.capacidade_pax_disponivel, v.observacoes,
             v.rota_template_id, v.config_versao_id, cv.versao AS config_versao,
             v.ciclo_uuid, v.motivo_cancelamento
      FROM viagem v
      JOIN embarcacao e ON e.id = v.embarcacao_id
      LEFT JOIN config_versao cv ON cv.id = v.config_versao_id
      WHERE v.id = $1
      LIMIT 1
      `,
      [id],
    );
    if (!row) return null;

    const escalas = await this.db.query<{
      id: string;
      cidade_sigla: string;
      ordem: number;
      data_hora_prevista: Date | null;
      data_hora_real: Date | null;
      observacao: string | null;
    }>(
      `
      SELECT id, cidade_sigla, ordem, data_hora_prevista, data_hora_real, observacao
      FROM viagem_escala
      WHERE viagem_id = $1
      ORDER BY ordem
      `,
      [id],
    );

    return {
      id: row.id,
      codigo: row.codigo,
      embarcacaoId: row.embarcacao_id,
      embarcacaoNome: row.embarcacao_nome,
      origemSigla: row.origem_sigla,
      destinoSigla: row.destino_sigla,
      dataHoraSaida: row.data_hora_saida.toISOString(),
      dataHoraRetorno: row.data_hora_retorno?.toISOString() ?? null,
      status: row.status,
      situacao: row.situacao,
      capacidadePaxDisponivel: row.capacidade_pax_disponivel ?? {},
      observacoes: row.observacoes,
      rotaTemplateId: row.rota_template_id,
      configVersaoId: row.config_versao_id,
      configVersao: row.config_versao,
      cicloUuid: row.ciclo_uuid,
      motivoCancelamento: row.motivo_cancelamento,
      escalas: escalas.rows.map((escala) => ({
        id: escala.id,
        cidadeSigla: escala.cidade_sigla,
        ordem: escala.ordem,
        dataHoraPrevista: escala.data_hora_prevista?.toISOString() ?? null,
        dataHoraReal: escala.data_hora_real?.toISOString() ?? null,
        observacao: escala.observacao,
      })),
    };
  }

  async routeTemplates(): Promise<unknown> {
    const row = await this.db.one<{ id: string; versao: number; valor: { rotas?: unknown[] } }>(
      `
      SELECT v.id, v.versao, v.valor
      FROM config_chave c
      JOIN config_versao v ON v.chave_id = c.id AND v.ativo = true
      WHERE c.chave = 'navegacao_rotas_horarios'
      LIMIT 1
      `,
    );
    if (!row) return [];
    return (row.valor?.rotas ?? []).map((rota) => ({
      ...(rota && typeof rota === 'object' ? rota : {}),
      configVersaoId: row.id,
      configVersao: row.versao,
    }));
  }

  async listEscalasColaboradores(): Promise<EscalaColaboradorDto[]> {
    const result = await this.db.query<{
      id: string;
      colaborador_id: string;
      colaborador_nome: string;
      colaborador_whatsapp: string | null;
      colaborador_funcao_base: string | null;
      cidade_sigla: string | null;
      viagem_id: string | null;
      viagem_codigo: string | null;
      embarcacao_nome: string | null;
      origem_sigla: string | null;
      destino_sigla: string | null;
      data_hora_saida: Date | null;
      data_hora_retorno: Date | null;
      periodo_inicio: Date | null;
      periodo_fim: Date | null;
      funcao: string | null;
      status: string;
      notificado_em: Date | null;
      confirmado_em: Date | null;
      conflito: boolean;
    }>(
      `
      WITH escalas AS (
        SELECT
          ec.*,
          COALESCE(ec.periodo_inicio, v.data_hora_saida) AS inicio_efetivo,
          COALESCE(ec.periodo_fim, v.data_hora_retorno, v.data_hora_saida + interval '8 hours') AS fim_efetivo
        FROM escala_colaborador ec
        LEFT JOIN viagem v ON v.id = ec.viagem_id
      )
      SELECT
        ec.id,
        ec.colaborador_id,
        c.nome AS colaborador_nome,
        c.contato_whatsapp AS colaborador_whatsapp,
        c.funcao AS colaborador_funcao_base,
        c.cidade_sigla,
        ec.viagem_id,
        v.codigo AS viagem_codigo,
        e.nome AS embarcacao_nome,
        v.origem_sigla,
        v.destino_sigla,
        v.data_hora_saida,
        v.data_hora_retorno,
        ec.periodo_inicio,
        ec.periodo_fim,
        ec.funcao,
        ec.status::text,
        ec.notificado_em,
        ec.confirmado_em,
        EXISTS (
          SELECT 1
          FROM escalas other_ec
          WHERE other_ec.id <> ec.id
            AND other_ec.colaborador_id = ec.colaborador_id
            AND other_ec.status <> 'cancelada'
            AND ec.status <> 'cancelada'
            AND ec.inicio_efetivo IS NOT NULL
            AND other_ec.inicio_efetivo IS NOT NULL
            AND tstzrange(ec.inicio_efetivo, ec.fim_efetivo, '[)')
              && tstzrange(other_ec.inicio_efetivo, other_ec.fim_efetivo, '[)')
        ) AS conflito
      FROM escalas ec
      JOIN colaborador c ON c.id = ec.colaborador_id
      LEFT JOIN viagem v ON v.id = ec.viagem_id
      LEFT JOIN embarcacao e ON e.id = v.embarcacao_id
      WHERE c.excluido_em IS NULL
      ORDER BY COALESCE(v.data_hora_saida, ec.periodo_inicio) DESC NULLS LAST, c.nome
      LIMIT 500
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      colaboradorId: row.colaborador_id,
      colaboradorNome: row.colaborador_nome,
      colaboradorWhatsapp: row.colaborador_whatsapp,
      colaboradorFuncaoBase: row.colaborador_funcao_base,
      cidadeSigla: row.cidade_sigla,
      viagemId: row.viagem_id,
      viagemCodigo: row.viagem_codigo,
      embarcacaoNome: row.embarcacao_nome,
      origemSigla: row.origem_sigla,
      destinoSigla: row.destino_sigla,
      dataHoraSaida: row.data_hora_saida?.toISOString() ?? null,
      dataHoraRetorno: row.data_hora_retorno?.toISOString() ?? null,
      periodoInicio: row.periodo_inicio?.toISOString() ?? null,
      periodoFim: row.periodo_fim?.toISOString() ?? null,
      funcao: row.funcao,
      status: row.conflito ? 'conflito' : row.status,
      statusOriginal: row.status,
      notificadoEm: row.notificado_em?.toISOString() ?? null,
      confirmadoEm: row.confirmado_em?.toISOString() ?? null,
      conflito: row.conflito,
    }));
  }

  async notifyEscalas(input: NotifyEscalasInput, userId: string): Promise<EscalaColaboradorDto[]> {
    const ids = [...new Set((input.escalaIds ?? []).filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];
    if (ids.length === 0) {
      throw new BadRequestException('escalaIds obrigatorio');
    }
    const updatedIds = await this.db.tx(async (client) => {
      const updated = await client.query<{ id: string }>(
        `
        UPDATE escala_colaborador
        SET status = 'notificada',
            notificado_em = COALESCE(notificado_em, now())
        WHERE id = ANY($1::uuid[])
          AND status NOT IN ('confirmada', 'cancelada')
        RETURNING id
        `,
        [ids],
      );
      if (updated.rows.length === 0) {
        throw new BadRequestException('Nenhuma escala pendente para notificar');
      }
      for (const [index, row] of updated.rows.entries()) {
        await client.query(
          `
          INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois, client_uuid)
          SELECT
            'escala_colaborador',
            id,
              'atualizar',
            $2,
              jsonb_build_object(
              'tipo_evento', 'notificar_whatsapp_stub',
              'canal', 'whatsapp',
              'status', 'stub_enfileirado',
              'motivo_stub', 'provedor WhatsApp/SMS pendente',
              'notificado_em', notificado_em
            ),
            $3::uuid
          FROM escala_colaborador
          WHERE id = $1::uuid
          ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
          `,
          [row.id, userId, index === 0 ? input.clientUuid ?? null : null],
        );
      }
      return updated.rows.map((row) => row.id);
    });

    const escalas = await this.listEscalasColaboradores();
    return escalas.filter((escala) => updatedIds.includes(escala.id));
  }

  async createViagem(input: CreateViagemInput, userId: string): Promise<ViagemDto> {
    if (!input.escalas || input.escalas.length === 0) {
      throw new BadRequestException('Ao menos uma escala/parada e obrigatoria');
    }
    const destinoSigla = input.destinoSigla ?? input.escalas[input.escalas.length - 1].cidadeSigla;
    const capacidade = sanitizeCapacidade(input.capacidadePaxDisponivel ?? {});
    await this.validatePlanejamento({
      embarcacaoId: input.embarcacaoId,
      dataHoraSaida: input.dataHoraSaida,
      dataHoraRetorno: input.dataHoraRetorno,
      rotaTemplateId: input.rotaTemplateId,
      configVersaoId: input.configVersaoId,
    });

    const viagemId = await this.db.tx(async (client) => {
      if (input.clientUuid) {
        const existing = await client.query<{ id: string }>(
          'SELECT id FROM viagem WHERE client_uuid = $1::uuid LIMIT 1',
          [input.clientUuid],
        );
        if (existing.rows[0]) return existing.rows[0].id;
      }

      const codigo = await this.nextCodigo();
      const viagemResult = await client.query<{ id: string }>(
        `
        INSERT INTO viagem (
          codigo, embarcacao_id, origem_sigla, destino_sigla, data_hora_saida,
          data_hora_retorno, capacidade_pax_disponivel, observacoes, client_uuid, criado_por,
          rota_template_id, config_versao_id, ciclo_uuid
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, COALESCE($9::uuid, gen_random_uuid()), $10,
                $11, $12::uuid, $13::uuid)
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
        RETURNING id
        `,
        [
          codigo,
          input.embarcacaoId,
          input.origemSigla,
          destinoSigla,
          input.dataHoraSaida,
          input.dataHoraRetorno ?? null,
          JSON.stringify(capacidade),
          input.observacoes ?? null,
          input.clientUuid ?? null,
          userId,
          input.rotaTemplateId,
          input.configVersaoId,
          input.cicloUuid ?? null,
        ],
      );
      const id = viagemResult.rows[0]?.id;
      if (!id) {
        const existing = await client.query<{ id: string }>(
          'SELECT id FROM viagem WHERE client_uuid = $1::uuid LIMIT 1',
          [input.clientUuid],
        );
        if (existing.rows[0]) return existing.rows[0].id;
        throw new BadRequestException('Viagem duplicada nao localizada');
      }

      for (const [index, escala] of input.escalas.entries()) {
        await client.query(
          `
          INSERT INTO viagem_escala (viagem_id, cidade_sigla, ordem, data_hora_prevista, observacao)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [id, escala.cidadeSigla, index + 1, escala.dataHoraPrevista ?? null, escala.observacao ?? null],
        );
      }
      return id;
    });

    const viagem = await this.findViagem(viagemId);
    if (!viagem) {
      throw new BadRequestException('Viagem criada mas nao encontrada');
    }
    return viagem;
  }

  async updateViagem(id: string, input: UpdateViagemInput, userId: string): Promise<ViagemDto> {
    const before = await this.findViagem(id);
    if (!before) {
      throw new BadRequestException('Viagem nao encontrada');
    }
    if (before.status !== 'planejada') {
      throw new BadRequestException('Somente viagens planejadas podem ser editadas');
    }

    const capacidade = input.capacidadePaxDisponivel === undefined
      ? before.capacidadePaxDisponivel
      : sanitizeCapacidade(input.capacidadePaxDisponivel);
    const escalas = input.escalas;
    const nextSaida = input.dataHoraSaida ?? before.dataHoraSaida;
    const nextRetorno = input.dataHoraRetorno === undefined ? before.dataHoraRetorno : input.dataHoraRetorno;
    if (!nextRetorno) {
      throw new BadRequestException('dataHoraRetorno obrigatorio');
    }
    if (Date.parse(nextRetorno) <= Date.parse(nextSaida)) {
      throw new BadRequestException('dataHoraRetorno deve ser posterior a dataHoraSaida');
    }
    await this.validatePlanejamento({
      embarcacaoId: input.embarcacaoId ?? before.embarcacaoId,
      dataHoraSaida: nextSaida,
      dataHoraRetorno: nextRetorno,
      rotaTemplateId: input.rotaTemplateId ?? before.rotaTemplateId ?? undefined,
      configVersaoId: input.configVersaoId ?? before.configVersaoId ?? undefined,
    }, id);

    await this.db.tx(async (client) => {
      await client.query(
        `
        UPDATE viagem
        SET embarcacao_id = COALESCE($2::uuid, embarcacao_id),
            origem_sigla = COALESCE($3, origem_sigla),
            destino_sigla = $4,
            data_hora_saida = COALESCE($5::timestamptz, data_hora_saida),
            data_hora_retorno = $6::timestamptz,
            status = COALESCE($7::status_viagem, status),
            situacao = $8::situacao_viagem,
            capacidade_pax_disponivel = $9::jsonb,
            observacoes = $10,
            rota_template_id = COALESCE($11, rota_template_id),
            config_versao_id = COALESCE($12::uuid, config_versao_id),
            ciclo_uuid = $13::uuid,
            atualizado_em = now()
        WHERE id = $1::uuid
        `,
        [
          id,
          input.embarcacaoId ?? null,
          emptyToNull(input.origemSigla),
          input.destinoSigla === undefined ? before.destinoSigla : emptyToNull(input.destinoSigla),
          input.dataHoraSaida ?? null,
          input.dataHoraRetorno === undefined ? before.dataHoraRetorno : input.dataHoraRetorno,
          input.status ?? null,
          input.situacao === undefined ? before.situacao ?? null : input.situacao,
          JSON.stringify(capacidade),
          input.observacoes === undefined ? before.observacoes : emptyToNull(input.observacoes),
          input.rotaTemplateId ?? null,
          input.configVersaoId ?? null,
          input.cicloUuid === undefined ? before.cicloUuid : input.cicloUuid,
        ],
      );

      if (escalas) {
        await client.query('DELETE FROM viagem_escala WHERE viagem_id = $1::uuid', [id]);
        for (const [index, escala] of escalas.entries()) {
          await client.query(
            `
            INSERT INTO viagem_escala (viagem_id, cidade_sigla, ordem, data_hora_prevista, observacao)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [id, escala.cidadeSigla, index + 1, escala.dataHoraPrevista ?? null, escala.observacao ?? null],
          );
        }
      }

      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_antes, dados_depois)
        VALUES ($1, $2, 'atualizar', $3, $4::jsonb, $5::jsonb)
        `,
        ['viagem', id, userId, JSON.stringify(before), JSON.stringify(input)],
      );
    });

    const viagem = await this.findViagem(id);
    if (!viagem) {
      throw new BadRequestException('Viagem atualizada mas nao encontrada');
    }
    return viagem;
  }

  async transicionarViagem(id: string, input: TransicionarViagemInput, userId: string): Promise<ViagemDto> {
    const before = await this.findViagem(id);
    if (!before) throw new BadRequestException('Viagem nao encontrada');

    const transitions: Record<string, Partial<Record<'iniciar' | 'concluir' | 'cancelar', string>>> = {
      planejada: { iniciar: 'em_curso', cancelar: 'cancelada' },
      em_curso: { concluir: 'concluida', cancelar: 'cancelada' },
    };
    const nextStatus = input.acao ? transitions[before.status]?.[input.acao] : undefined;
    if (!nextStatus) throw new BadRequestException(`Transicao ${input.acao} invalida para viagem ${before.status}`);

    await this.db.tx(async (client) => {
      if (input.clientUuid) {
        const duplicate = await client.query('SELECT 1 FROM audit_evento WHERE client_uuid = $1::uuid LIMIT 1', [input.clientUuid]);
        if (duplicate.rows[0]) return;
      }
      await client.query(
        `UPDATE viagem
            SET status = $2::status_viagem,
                situacao = CASE WHEN $2 = 'em_curso' THEN 'no_prazo'::situacao_viagem ELSE situacao END,
                motivo_cancelamento = CASE WHEN $2 = 'cancelada' THEN $3 ELSE motivo_cancelamento END,
                atualizado_em = now()
          WHERE id = $1::uuid`,
        [id, nextStatus, emptyToNull(input.motivo)],
      );
      await client.query(
        `INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_antes, dados_depois, client_uuid)
         VALUES ('viagem', $1, 'atualizar', $2, $3::jsonb, $4::jsonb, $5::uuid)
         ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING`,
        [id, userId, JSON.stringify({ status: before.status }), JSON.stringify({ status: nextStatus, acao: input.acao, motivo: emptyToNull(input.motivo) }), input.clientUuid ?? null],
      );
    });
    const viagem = await this.findViagem(id);
    if (!viagem) throw new BadRequestException('Viagem atualizada mas nao encontrada');
    return viagem;
  }

  private async validatePlanejamento(
    input: {
      embarcacaoId: string;
      dataHoraSaida: string;
      dataHoraRetorno?: string | null;
      rotaTemplateId?: string;
      configVersaoId?: string;
    },
    excludeId?: string,
  ): Promise<void> {
    if (!input.rotaTemplateId || !input.configVersaoId) {
      throw new BadRequestException('Rota e versao da configuracao sao obrigatorias');
    }
    const boat = await this.db.one<{ status: string }>(
      'SELECT status::text FROM embarcacao WHERE id = $1::uuid AND excluido_em IS NULL',
      [input.embarcacaoId],
    );
    if (!boat) throw new BadRequestException('Embarcacao nao encontrada');
    if (boat.status !== 'ativa') throw new BadRequestException('Embarcacao indisponivel para planejamento');

    const config = await this.db.one<{ valor: { rotas?: Array<{ id?: string }> } }>(
      `SELECT cv.valor
         FROM config_versao cv
         JOIN config_chave cc ON cc.id = cv.chave_id
        WHERE cv.id = $1::uuid AND cc.chave = 'navegacao_rotas_horarios'`,
      [input.configVersaoId],
    );
    if (!config?.valor?.rotas?.some((rota) => rota.id === input.rotaTemplateId)) {
      throw new BadRequestException('Rota nao pertence a versao informada');
    }

    const conflict = await this.db.one<{ codigo: string | null }>(
      `SELECT codigo FROM viagem
        WHERE embarcacao_id = $1::uuid
          AND status <> 'cancelada'
          AND id <> COALESCE($4::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
          AND tstzrange(data_hora_saida, COALESCE(data_hora_retorno, data_hora_saida + interval '8 hours'), '[)')
              && tstzrange($2::timestamptz, $3::timestamptz, '[)')
        LIMIT 1`,
      [input.embarcacaoId, input.dataHoraSaida, input.dataHoraRetorno, excludeId ?? null],
    );
    if (conflict) throw new BadRequestException(`Embarcacao ja alocada na viagem ${conflict.codigo ?? 'existente'} nesse periodo`);
  }

  private async nextCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const row = await this.db.one<{ total: string }>(
      `
      SELECT count(*)::text AS total
      FROM viagem
      WHERE codigo LIKE $1
      `,
      [`V-${year}-%`],
    );
    const sequence = Number(row?.total ?? 0) + 1;
    return `V-${year}-${String(sequence).padStart(4, '0')}`;
  }
}

function emptyToNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function sanitizeCapacidade(input: Record<string, unknown>) {
  const output: Record<string, number> = {};
  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = key.trim();
    if (!normalizedKey) continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) throw new BadRequestException(`capacidade invalida para ${normalizedKey}`);
    output[normalizedKey] = Math.floor(numeric);
  }
  return output;
}
