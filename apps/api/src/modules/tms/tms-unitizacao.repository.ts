import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  AddConferenciaItemInput,
  CloseConferenciaInput,
  OpenConferenciaInput,
  PrintTargetEtiquetaInput,
  ReleasePaleteInput,
  SaveLocalOperacionalInput,
  SavePaleteInput,
  ScanConferenciaVolumeInput,
} from "./tms.types";
import { canScanVolume, operationTarget } from "./tms-volume-flow";
import {
  TmsUnitizacaoConfig,
  UnitizacaoCodigo,
  validateTmsUnitizacaoConfig,
} from "./tms-unitizacao-config.validator";

type PaleteQuery = {
  busca?: string;
  status?: string;
  proprietario?: string;
  localId?: string;
  pagina?: string;
  porPagina?: string;
};

@Injectable()
export class TmsUnitizacaoRepository {
  constructor(private readonly db: DatabaseService) {}

  async listProprietarios() {
    const result = await this.db.query(
      `SELECT * FROM (
         SELECT 'AJC'::text AS chave, 'AJC'::text AS tipo, NULL::uuid AS id, 'AJC'::text AS nome, NULL::text AS documento
         UNION ALL
         SELECT 'cliente:' || c.id, 'cliente', c.id, c.nome, c.cpf_cnpj FROM cliente c
         UNION ALL
         SELECT 'fornecedor:' || f.id, 'fornecedor', f.id, f.nome, f.cnpj FROM fornecedor f WHERE f.ativo = true AND f.excluido_em IS NULL
       ) owners ORDER BY lower(nome), tipo`,
    );
    return result.rows;
  }

  async listLocais(includeInactive = false) {
    const result = await this.db.query(
      `SELECT lo.*, c.nome AS cidade_nome, e.nome AS embarcacao_nome
       FROM local_operacional lo
       LEFT JOIN cidade c ON c.sigla = lo.cidade_sigla
       LEFT JOIN embarcacao e ON e.id = lo.embarcacao_id
       WHERE lo.excluido_em IS NULL AND ($1::boolean OR lo.ativo = true)
       ORDER BY lo.ativo DESC, lower(lo.nome)`,
      [includeInactive],
    );
    return result.rows;
  }

  async createLocal(input: SaveLocalOperacionalInput, userId: string) {
    this.validateLocal(input);
    const row = await this.db.one(
      `INSERT INTO local_operacional (codigo, nome, tipo, cidade_sigla, embarcacao_id, ativo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        input.codigo.trim().toUpperCase(),
        input.nome.trim(),
        input.tipo,
        input.cidadeSigla?.trim().toUpperCase() || null,
        input.embarcacaoId || null,
        input.ativo ?? true,
      ],
    );
    await this.audit(
      "local_operacional",
      String(row!.id),
      "criar",
      userId,
      null,
      row,
    );
    return row;
  }

  async updateLocal(
    id: string,
    input: SaveLocalOperacionalInput,
    userId: string,
  ) {
    this.validateLocal(input);
    const before = await this.db.one(
      "SELECT * FROM local_operacional WHERE id = $1 AND excluido_em IS NULL",
      [id],
    );
    if (!before)
      throw new NotFoundException("Local operacional nao encontrado");
    const row = await this.db.one(
      `UPDATE local_operacional SET codigo=$2, nome=$3, tipo=$4, cidade_sigla=$5, embarcacao_id=$6, ativo=$7
       WHERE id=$1 RETURNING *`,
      [
        id,
        input.codigo.trim().toUpperCase(),
        input.nome.trim(),
        input.tipo,
        input.cidadeSigla?.trim().toUpperCase() || null,
        input.embarcacaoId || null,
        input.ativo ?? true,
      ],
    );
    await this.audit("local_operacional", id, "atualizar", userId, before, row);
    return row;
  }

  async listPaletes(query: PaleteQuery) {
    const page = positiveInteger(query.pagina, 1);
    const perPage = boundedInteger(query.porPagina, 20, 10, 100);
    const offset = (page - 1) * perPage;
    const search = normalize(query.busca, 120);
    const status = normalize(query.status, 30);
    const owner = normalize(query.proprietario, 80);
    const localId = normalize(query.localId, 50);
    const result = await this.db.query<{
      total_registros: number;
      [key: string]: unknown;
    }>(
      `SELECT p.id, p.codigo, p.proprietario::text, p.status::text, p.tipo_unitizacao, p.estado_composicao, p.ativo,
              p.local_operacional_id, lo.nome AS local_nome, lo.tipo AS local_tipo, lo.cidade_sigla AS local_cidade_sigla,
              p.cliente_proprietario_id, p.fornecedor_proprietario_id,
              CASE WHEN p.proprietario='AJC' THEN 'AJC' ELSE COALESCE(cli.nome, forn.nome, 'Proprietario legado sem vinculo') END AS proprietario_nome,
              CASE WHEN p.cliente_proprietario_id IS NOT NULL THEN 'cliente' WHEN p.fornecedor_proprietario_id IS NOT NULL THEN 'fornecedor' ELSE p.proprietario::text END AS proprietario_tipo,
              COALESCE(cli.cpf_cnpj, forn.cnpj) AS proprietario_documento,
              pv.id AS alocacao_id, pv.viagem_id, v.codigo AS viagem_codigo, pv.cidade_destino_sigla,
              COALESCE(comp.documentos,0)::int AS documentos, COALESCE(comp.cargas,0)::int AS cargas,
              COALESCE(comp.volumes,0)::int AS volumes, comp.ultima_conferencia_em,
              count(*) OVER()::int AS total_registros
       FROM palete p
       LEFT JOIN local_operacional lo ON lo.id=p.local_operacional_id
       LEFT JOIN cliente cli ON cli.id=p.cliente_proprietario_id
       LEFT JOIN fornecedor forn ON forn.id=p.fornecedor_proprietario_id
       LEFT JOIN palete_viagem pv ON pv.palete_id=p.id AND pv.status='ativa'
       LEFT JOIN viagem v ON v.id=pv.viagem_id
       LEFT JOIN LATERAL (
         SELECT count(DISTINCT cri.documento_fiscal_id) AS documentos, count(DISTINCT cri.carga_id) AS cargas,
                count(DISTINCT crv.volume_id) AS volumes, max(cr.aberta_em) AS ultima_conferencia_em
         FROM conferencia_recebimento cr
         LEFT JOIN conferencia_recebimento_item cri ON cri.conferencia_id=cr.id
         LEFT JOIN conferencia_recebimento_volume crv ON crv.conferencia_id=cr.id
         WHERE cr.palete_id=p.id AND cr.status <> 'cancelada'
       ) comp ON true
       WHERE p.excluido_em IS NULL
         AND ($1::text IS NULL OR unaccent(lower(p.id::text || ' ' || p.codigo || ' ' || COALESCE(cli.nome, forn.nome, 'AJC') || ' ' || COALESCE(v.codigo,'') || ' ' || COALESCE(lo.nome,''))) LIKE '%' || unaccent(lower($1)) || '%')
         AND ($2::text IS NULL OR p.status::text=$2)
         AND ($3::text IS NULL OR ($3='AJC' AND p.proprietario='AJC') OR $3='cliente:'||p.cliente_proprietario_id OR $3='fornecedor:'||p.fornecedor_proprietario_id)
         AND ($4::uuid IS NULL OR p.local_operacional_id=$4::uuid)
       ORDER BY p.ativo DESC, p.codigo
       LIMIT $5 OFFSET $6`,
      [search, status, owner, localId, perPage, offset],
    );
    const total = Number(result.rows[0]?.total_registros ?? 0);
    return {
      items: result.rows.map(({ total_registros: _total, ...row }) => row),
      paginacao: {
        pagina: page,
        porPagina: perPage,
        total,
        paginas: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  async createPalete(input: SavePaleteInput, userId: string) {
    await this.validatePalete(input);
    const prefix = input.proprietario === "AJC" ? "AJC" : "TER";
    return this.db.tx(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `palete_codigo_${prefix}`,
      ]);
      const sequence = await client.query<{ next_number: string }>(
        `SELECT COALESCE(max((regexp_match(codigo, $1))[1]::int),0)+1 AS next_number FROM palete WHERE codigo ~ $2`,
        [`^${prefix}-(\\d+)$`, `^${prefix}-[0-9]+$`],
      );
      const codigo = `${prefix}-${String(Number(sequence.rows[0]?.next_number ?? 1)).padStart(3, "0")}`;
      const row = await client.query(
        `INSERT INTO palete (codigo, proprietario, terceiro_id, cliente_proprietario_id, fornecedor_proprietario_id, local_operacional_id, ativo)
         VALUES ($1,$2::proprietario_palete,$3,$4,$5,$6,$7) RETURNING *`,
        [
          codigo,
          input.proprietario,
          input.clienteProprietarioId ?? input.fornecedorProprietarioId ?? null,
          input.clienteProprietarioId ?? null,
          input.fornecedorProprietarioId ?? null,
          input.localOperacionalId,
          input.ativo ?? true,
        ],
      );
      await client.query(
        `INSERT INTO audit_evento (entidade,entidade_id,acao,usuario_id,dados_depois) VALUES ('palete',$1,'criar',$2,$3::jsonb)`,
        [row.rows[0].id, userId, JSON.stringify(row.rows[0])],
      );
      return row.rows[0];
    });
  }

  async updatePalete(id: string, input: SavePaleteInput, userId: string) {
    await this.validatePalete(input);
    const before = await this.db.one<{
      status: string;
      estado_composicao: string;
      [key: string]: unknown;
    }>("SELECT * FROM palete WHERE id=$1 AND excluido_em IS NULL", [id]);
    if (!before) throw new NotFoundException("Palete nao encontrado");
    if (before.status !== "livre" || before.estado_composicao !== "vazio")
      throw new BadRequestException(
        "Proprietario e local so podem ser editados com o palete livre e vazio",
      );
    const row = await this.db.one(
      `UPDATE palete SET proprietario=$2::proprietario_palete, terceiro_id=$3, cliente_proprietario_id=$4,
       fornecedor_proprietario_id=$5, local_operacional_id=$6, ativo=$7 WHERE id=$1 RETURNING *`,
      [
        id,
        input.proprietario,
        input.clienteProprietarioId ?? input.fornecedorProprietarioId ?? null,
        input.clienteProprietarioId ?? null,
        input.fornecedorProprietarioId ?? null,
        input.localOperacionalId,
        input.ativo ?? true,
      ],
    );
    await this.audit("palete", id, "atualizar", userId, before, row);
    return row;
  }

  async listDocumentosDisponiveis(
    viagemId: string,
    busca?: string,
    modoOperacao: "conferencia" | "embarque" = "conferencia",
  ) {
    if (!["conferencia", "embarque"].includes(modoOperacao))
      throw new BadRequestException("Modo operacional invalido");
    const search = normalize(busca, 120);
    const result = await this.db.query(
      `SELECT df.id, df.tipo::text, df.numero, df.status::text, df.carga_id,
              c.codigo AS carga_codigo, c.cidade_destino_sigla, c.tipo_unitizacao, c.tipo_recebimento::text,
              cli.codigo AS cliente_codigo, cli.nome AS cliente_nome,
              count(vol.id)::int AS quantidade_declarada,
              COALESCE(used.quantidade_informada,0)::int AS quantidade_alocada,
              GREATEST(count(vol.id)-COALESCE(used.quantidade_informada,0),0)::int AS quantidade_restante
       FROM documento_fiscal df
       JOIN carga c ON c.id=df.carga_id
       JOIN cliente cli ON cli.id=c.cliente_remetente_id
       JOIN volume vol ON vol.carga_id=c.id
       LEFT JOIN LATERAL (
         SELECT sum(cri.quantidade_informada)::int AS quantidade_informada
         FROM conferencia_recebimento_item cri JOIN conferencia_recebimento cr ON cr.id=cri.conferencia_id
         WHERE cri.documento_fiscal_id=df.id AND cr.status <> 'cancelada' AND cr.modo_operacao=$3
       ) used ON true
       WHERE c.viagem_id=$1
         AND ($3 = 'embarque' OR c.tipo_recebimento = 'porto_balsa')
         AND ($2::text IS NULL OR unaccent(lower(COALESCE(df.numero,'')||' '||c.codigo||' '||cli.codigo||' '||cli.nome)) LIKE '%'||unaccent(lower($2))||'%')
       GROUP BY df.id,c.id,cli.id,used.quantidade_informada
       ORDER BY cli.nome, df.numero NULLS LAST LIMIT 100`,
      [viagemId, search, modoOperacao],
    );
    return result.rows;
  }

  async openConferencia(input: OpenConferenciaInput, userId: string) {
    if (input.clientUuid) {
      const existing = await this.db.one(
        "SELECT * FROM conferencia_recebimento WHERE client_uuid=$1",
        [input.clientUuid],
      );
      if (existing) return this.getConferencia(String(existing.id));
    }
    const config = await this.config();
    const type = input.tipoUnitizacao;
    const modoOperacao = input.modoOperacao ?? "conferencia";
    if (!["conferencia", "embarque"].includes(modoOperacao))
      throw new BadRequestException("Modo operacional invalido");
    if (!["AVULSA", "MP", "PD", "PC"].includes(type))
      throw new BadRequestException("Tipo de unitizacao invalido");
    if (type === "AVULSA" && !config.recebimento.permitirAvulsa)
      throw new BadRequestException(
        "Recebimento avulso esta desativado na configuracao",
      );
    if (
      type !== "AVULSA" &&
      !config.unitizacoes.some((item) => item.codigo === type && item.ativo)
    )
      throw new BadRequestException(`${type} esta desativado na configuracao`);
    if (
      (type === "AVULSA" && input.paleteId) ||
      (type !== "AVULSA" && !input.paleteId)
    )
      throw new BadRequestException(
        type === "AVULSA"
          ? "Recebimento avulso nao usa palete"
          : "Selecione o palete",
      );
    await this.validateTripDestination(
      input.viagemId,
      input.cidadeDestinoSigla,
    );
    await this.requireActiveLocation(input.localOperacionalId);

    const id = await this.db.tx(async (client) => {
      if (input.paleteId) {
        const pallet = (
          await client.query<{
            id: string;
            codigo: string;
            status: string;
            tipo_unitizacao: string | null;
            estado_composicao: string;
            local_operacional_id: string | null;
            ativo: boolean;
          }>(
            "SELECT id,codigo,status::text,tipo_unitizacao,estado_composicao,local_operacional_id,ativo FROM palete WHERE id=$1 AND excluido_em IS NULL FOR UPDATE",
            [input.paleteId],
          )
        ).rows[0];
        if (!pallet || !pallet.ativo)
          throw new BadRequestException("Palete inexistente ou inativo");
        if (
          pallet.local_operacional_id &&
          pallet.local_operacional_id !== input.localOperacionalId &&
          modoOperacao !== "embarque"
        )
          throw new BadRequestException(
            `${pallet.codigo} esta registrado em outro local operacional`,
          );
        if (pallet.tipo_unitizacao && pallet.tipo_unitizacao !== type)
          throw new BadRequestException(
            `${pallet.codigo} ja esta classificado como ${pallet.tipo_unitizacao}`,
          );
        const active = (
          await client.query<{
            id: string;
            viagem_id: string;
            cidade_destino_sigla: string;
          }>(
            "SELECT id,viagem_id,cidade_destino_sigla FROM palete_viagem WHERE palete_id=$1 AND status='ativa' FOR UPDATE",
            [input.paleteId],
          )
        ).rows[0];
        if (
          active &&
          (active.viagem_id !== input.viagemId ||
            active.cidade_destino_sigla !== input.cidadeDestinoSigla)
        )
          throw new BadRequestException(
            `${pallet.codigo} ja esta alocado a outra viagem ou destino`,
          );
        if (!active)
          await client.query(
            "INSERT INTO palete_viagem (palete_id,viagem_id,cidade_destino_sigla,client_uuid) VALUES ($1,$2,$3,$4)",
            [
              input.paleteId,
              input.viagemId,
              input.cidadeDestinoSigla,
              input.clientUuid ?? null,
            ],
          );
        await client.query(
          "UPDATE palete SET status=CASE WHEN $4='embarque' THEN 'em_transito'::status_palete ELSE 'alocado'::status_palete END, tipo_unitizacao=$2, local_operacional_id=$3 WHERE id=$1",
          [input.paleteId, type, input.localOperacionalId, modoOperacao],
        );
      }
      const row = await client.query(
        `INSERT INTO conferencia_recebimento (viagem_id,palete_id,local_operacional_id,tipo_unitizacao,modo_operacao,conferente_id,client_uuid)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          input.viagemId,
          input.paleteId ?? null,
          input.localOperacionalId,
          type,
          modoOperacao,
          userId,
          input.clientUuid ?? null,
        ],
      );
      await client.query(
        `INSERT INTO audit_evento (entidade,entidade_id,acao,usuario_id,dados_depois,client_uuid) VALUES ('conferencia_recebimento',$1,'criar',$2,$3::jsonb,$4)`,
        [
          row.rows[0].id,
          userId,
          JSON.stringify(input),
          input.clientUuid ?? null,
        ],
      );
      return String(row.rows[0].id);
    });
    return this.getConferencia(id);
  }

  async addConferenciaItem(
    conferenciaId: string,
    input: AddConferenciaItemInput,
    userId: string,
  ) {
    const quantity = Number(input.quantidadeInformada);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000)
      throw new BadRequestException("Quantidade informada invalida");
    if (input.clientUuid) {
      const existing = await this.db.one(
        "SELECT * FROM conferencia_recebimento_item WHERE client_uuid=$1",
        [input.clientUuid],
      );
      if (existing) return this.getConferencia(conferenciaId);
    }
    await this.db.tx(async (client) => {
      const conference = (
        await client.query<{
          id: string;
          viagem_id: string;
          palete_id: string | null;
          tipo_unitizacao: string;
          modo_operacao: "conferencia" | "embarque";
          status: string;
        }>(
          "SELECT id,viagem_id,palete_id,tipo_unitizacao,modo_operacao,status FROM conferencia_recebimento WHERE id=$1 FOR UPDATE",
          [conferenciaId],
        )
      ).rows[0];
      if (!conference)
        throw new NotFoundException("Conferencia nao encontrada");
      if (conference.status !== "aberta")
        throw new BadRequestException("A conferencia nao esta aberta");
      const document = (
        await client.query<{
          id: string;
          carga_id: string;
          viagem_id: string;
          cidade_destino_sigla: string;
          tipo_recebimento: "porto_balsa" | "direto";
        }>(
          `SELECT df.id,df.carga_id,c.viagem_id,c.cidade_destino_sigla,c.tipo_recebimento::text FROM documento_fiscal df JOIN carga c ON c.id=df.carga_id WHERE df.id=$1 FOR UPDATE OF df,c`,
          [input.documentoFiscalId],
        )
      ).rows[0];
      if (!document?.carga_id)
        throw new BadRequestException("Documento sem carga vinculada");
      if (document.viagem_id !== conference.viagem_id)
        throw new BadRequestException("Documento pertence a outra viagem");
      if (conference.modo_operacao === "conferencia" && document.tipo_recebimento === "direto")
        throw new BadRequestException("Carga de cross-docking deve ser bipada diretamente no embarque");
      const declared = Number(
        (
          await client.query<{ total: number }>(
            "SELECT count(*)::int AS total FROM volume WHERE carga_id=$1",
            [document.carga_id],
          )
        ).rows[0]?.total ?? 0,
      );
      const allocated = Number(
        (
          await client.query<{ total: number }>(
            `SELECT COALESCE(sum(cri.quantidade_informada),0)::int AS total FROM conferencia_recebimento_item cri JOIN conferencia_recebimento cr ON cr.id=cri.conferencia_id WHERE cri.documento_fiscal_id=$1 AND cr.status <> 'cancelada' AND cr.modo_operacao=$2`,
            [document.id, conference.modo_operacao],
          )
        ).rows[0]?.total ?? 0,
      );
      const overflow = Math.max(0, allocated + quantity - declared);
      if (overflow > 0 && !input.justificativa?.trim())
        throw new BadRequestException(
          `Quantidade excede os ${declared} volumes declarados; informe a justificativa da divergencia`,
        );
      if (["MP", "PD"].includes(conference.tipo_unitizacao)) {
        const other = await client.query(
          "SELECT 1 FROM conferencia_recebimento_item WHERE conferencia_id=$1 AND carga_id<>$2 LIMIT 1",
          [conferenciaId, document.carga_id],
        );
        if (other.rowCount)
          throw new BadRequestException(
            `${conference.tipo_unitizacao} nao permite misturar cargas no mesmo palete`,
          );
      }
      if (overflow > 0) {
        await client.query(
          `INSERT INTO volume (carga_id,indice_volume,total_volumes,peso,status)
           SELECT $1,$2+n-1,$3,NULL,'cadastrado'::status_volume FROM generate_series(1,$4) n`,
          [document.carga_id, declared + 1, declared + overflow, overflow],
        );
        await client.query(
          "UPDATE volume SET total_volumes=$2 WHERE carga_id=$1",
          [document.carga_id, declared + overflow],
        );
      }
      const item = await client.query(
        `INSERT INTO conferencia_recebimento_item (conferencia_id,documento_fiscal_id,carga_id,quantidade_declarada,quantidade_informada,quantidade_conferida,divergencia,justificativa,client_uuid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [
          conferenciaId,
          document.id,
          document.carga_id,
          declared,
          quantity,
          conference.tipo_unitizacao === "AVULSA" ? 0 : quantity,
          overflow > 0,
          input.justificativa?.trim() || null,
          input.clientUuid ?? null,
        ],
      );
      const volumes = await client.query<{ id: string }>(
        `SELECT vol.id FROM volume vol
         WHERE vol.carga_id=$1
           AND NOT EXISTS (
             SELECT 1 FROM conferencia_recebimento_volume crv
             JOIN conferencia_recebimento cr ON cr.id=crv.conferencia_id
             WHERE crv.volume_id=vol.id AND cr.modo_operacao=$3 AND cr.status <> 'cancelada'
           )
           AND (
             ($3='conferencia' AND vol.status='cadastrado') OR
             ($3='embarque' AND (($4='direto' AND vol.status='cadastrado') OR ($4='porto_balsa' AND vol.status='conferido')))
           )
         ORDER BY vol.indice_volume LIMIT $2 FOR UPDATE OF vol`,
        [document.carga_id, quantity, conference.modo_operacao, document.tipo_recebimento],
      );
      if (volumes.rowCount !== quantity)
        throw new BadRequestException(
          "Nao ha volumes disponiveis suficientes para a conferencia",
        );
      for (const volume of volumes.rows) {
        const processed = conference.tipo_unitizacao !== "AVULSA";
        const targetStatus = operationTarget(conference.modo_operacao);
        await client.query(
          `INSERT INTO conferencia_recebimento_volume (conferencia_id,item_id,volume_id,status,conferido_em,conferido_por)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            conferenciaId,
            item.rows[0].id,
            volume.id,
            processed ? targetStatus : "alocado",
            processed ? new Date() : null,
            processed ? userId : null,
          ],
        );
        if (processed) {
          await client.query(
            "UPDATE volume SET palete_id=$2,status=$3::status_volume WHERE id=$1",
            [volume.id, conference.palete_id, targetStatus],
          );
          await client.query(
            "INSERT INTO evento_volume (volume_id,tipo,usuario_id,obs) VALUES ($1,$2::tipo_evento_volume,$3,$4)",
            [volume.id, targetStatus, userId, `${targetStatus === "embarcado" ? "Embarcado" : "Conferido"} na operacao ${conferenciaId}`],
          );
        }
      }
      if (overflow > 0)
        await client.query(
          "UPDATE conferencia_recebimento SET status='divergente' WHERE id=$1",
          [conferenciaId],
        );
      await client.query(
        `INSERT INTO audit_evento (entidade,entidade_id,acao,usuario_id,dados_depois,client_uuid) VALUES ('conferencia_recebimento_item',$1,'conferir',$2,$3::jsonb,$4)`,
        [
          item.rows[0].id,
          userId,
          JSON.stringify({
            documentoFiscalId: document.id,
            quantidadeDeclarada: declared,
            quantidadeInformada: quantity,
            divergencia: overflow > 0,
          }),
          input.clientUuid ?? null,
        ],
      );
    });
    return this.getConferencia(conferenciaId);
  }

  async scanVolume(
    conferenciaId: string,
    input: ScanConferenciaVolumeInput,
    userId: string,
  ) {
    if (!input.volumeUuid?.trim())
      throw new BadRequestException("Leia o QR/UUID do volume");
    if (input.clientUuid) {
      const existing = await this.db.one(
        "SELECT * FROM conferencia_recebimento_volume WHERE client_uuid=$1",
        [input.clientUuid],
      );
      if (existing) return this.getConferencia(conferenciaId);
    }
    await this.db.tx(async (client) => {
      const row = (
        await client.query<{
          id: string;
          item_id: string;
          volume_id: string;
          status: string;
          tipo_unitizacao: string;
          modo_operacao: "conferencia" | "embarque";
          tipo_recebimento: "porto_balsa" | "direto";
          volume_status: string;
        }>(
          `SELECT crv.id,crv.item_id,crv.volume_id,crv.status,cr.tipo_unitizacao,cr.modo_operacao,c.tipo_recebimento::text,vol.status::text AS volume_status
           FROM conferencia_recebimento_volume crv JOIN conferencia_recebimento cr ON cr.id=crv.conferencia_id
           JOIN volume vol ON vol.id=crv.volume_id JOIN carga c ON c.id=vol.carga_id
         WHERE crv.conferencia_id=$1 AND crv.volume_id=$2::uuid FOR UPDATE OF crv,vol`,
          [conferenciaId, input.volumeUuid.trim()],
        )
      ).rows[0];
      if (!row)
        throw new BadRequestException("Volume nao pertence a esta conferencia");
      if (row.tipo_unitizacao !== "AVULSA")
        throw new BadRequestException(
          "O bipe individual desta etapa e exclusivo da mercadoria avulsa",
        );
      const targetStatus = operationTarget(row.modo_operacao);
      if (row.status === targetStatus) return;
      const validSource = canScanVolume(
        row.volume_status,
        row.tipo_recebimento,
        row.modo_operacao,
      );
      if (!validSource)
        throw new BadRequestException(`Volume em estado ${row.volume_status} nao pode receber o bipe de ${targetStatus}`);
      const label = await client.query(
        "SELECT 1 FROM etiqueta_impressao WHERE volume_id=$1 AND tipo='impressao' AND status='concluida' LIMIT 1",
        [row.volume_id],
      );
      if (!label.rowCount)
        throw new BadRequestException(
          "Confirme a saida legivel da etiqueta antes de bipar o volume",
        );
      await client.query(
        "UPDATE conferencia_recebimento_volume SET status=$2,conferido_em=now(),conferido_por=$3,client_uuid=$4 WHERE id=$1",
        [row.id, targetStatus, userId, input.clientUuid ?? null],
      );
      await client.query(
        "UPDATE conferencia_recebimento_item SET quantidade_conferida=quantidade_conferida+1 WHERE id=$1",
        [row.item_id],
      );
      await client.query("UPDATE volume SET status=$2::status_volume WHERE id=$1", [row.volume_id, targetStatus]);
      await client.query(
        "INSERT INTO evento_volume (volume_id,tipo,usuario_id,obs,client_uuid) VALUES ($1,$2::tipo_evento_volume,$3,$4,$5)",
        [
          row.volume_id,
          targetStatus,
          userId,
          `${targetStatus === "embarcado" ? "Embarque" : "Conferencia"} avulsa na operacao ${conferenciaId}`,
          input.clientUuid ?? null,
        ],
      );
    });
    return this.getConferencia(conferenciaId);
  }

  async closeConferencia(
    id: string,
    input: CloseConferenciaInput,
    userId: string,
  ) {
    if (input.clientUuid) {
      const alreadyClosed = await this.db.one(
        `SELECT 1 FROM audit_evento
         WHERE entidade = 'conferencia_recebimento' AND entidade_id = $1
           AND client_uuid = $2 AND acao = 'conferir'
         LIMIT 1`,
        [id, input.clientUuid],
      );
      if (alreadyClosed) return this.getConferencia(id);
    }
    const config = await this.config();
    const evidences = Array.isArray(input.evidencias)
      ? input.evidencias.filter((item) => item?.url && item?.hash)
      : [];
    if (
      config.recebimento.exigirEvidencia &&
      evidences.length < config.recebimento.minimoEvidencias
    )
      throw new BadRequestException(
        `Anexe ao menos ${config.recebimento.minimoEvidencias} evidencia(s) real(is)`,
      );
    await this.db.tx(async (client) => {
      const conf = (
        await client.query<{
          id: string;
          palete_id: string | null;
          tipo_unitizacao: string;
          modo_operacao: "conferencia" | "embarque";
          status: string;
        }>(
          "SELECT id,palete_id,tipo_unitizacao,modo_operacao,status FROM conferencia_recebimento WHERE id=$1 FOR UPDATE",
          [id],
        )
      ).rows[0];
      if (!conf) throw new NotFoundException("Conferencia nao encontrada");
      if (!["aberta", "divergente"].includes(conf.status))
        throw new BadRequestException("Conferencia ja encerrada");
      const items = await client.query<{
        id: string;
        carga_id: string;
        quantidade_informada: number;
        quantidade_conferida: number;
        divergencia: boolean;
      }>(
        "SELECT id,carga_id,quantidade_informada,quantidade_conferida,divergencia FROM conferencia_recebimento_item WHERE conferencia_id=$1",
        [id],
      );
      if (!items.rowCount)
        throw new BadRequestException(
          "Inclua ao menos uma NF/DC antes de fechar",
        );
      if (conf.tipo_unitizacao === "AVULSA") {
        const pending = items.rows.find(
          (item) => item.quantidade_conferida !== item.quantidade_informada,
        );
        if (pending)
          throw new BadRequestException(
            "Todos os volumes avulsos precisam de etiqueta e bipe individual",
          );
      } else {
        if (!input.estadoComposicao)
          throw new BadRequestException(
            "Informe se o palete ficou parcial ou completo",
          );
        const label = await client.query(
          "SELECT 1 FROM etiqueta_impressao WHERE palete_id=$1 AND tipo='impressao' AND status='concluida' LIMIT 1",
          [conf.palete_id],
        );
        if (!label.rowCount)
          throw new BadRequestException(
            "Confirme a saida legivel da etiqueta do palete antes de fechar a conferencia",
          );
        if (
          conf.tipo_unitizacao === "PD" &&
          input.estadoComposicao !== "completo"
        )
          throw new BadRequestException(
            "Palete dedicado deve ser fechado como completo",
          );
      }
      const hasDivergence = items.rows.some((item) => item.divergencia);
      await client.query(
        `UPDATE conferencia_recebimento SET status=$2,estado_composicao=$3,evidencias=$4::jsonb,observacao=$5,fechada_em=now() WHERE id=$1`,
        [
          id,
          hasDivergence ? "divergente" : "fechada",
          conf.tipo_unitizacao === "AVULSA" ? null : input.estadoComposicao,
          JSON.stringify(evidences),
          input.observacao?.trim() || null,
        ],
      );
      if (conf.palete_id)
        await client.query(
          "UPDATE palete SET estado_composicao=$2,status=CASE WHEN $3='embarque' THEN 'em_transito'::status_palete ELSE status END WHERE id=$1",
          [conf.palete_id, input.estadoComposicao, conf.modo_operacao],
        );
      const loads = [...new Set(items.rows.map((item) => item.carga_id))];
      await client.query(
        `UPDATE carga SET tipo_unitizacao=$2,status=CASE
           WHEN $3 THEN 'divergente'::status_carga
           WHEN $4='embarque' THEN 'embarcada'::status_carga
           ELSE 'conferida'::status_carga END
         WHERE id=ANY($1::uuid[])`,
        [loads, conf.tipo_unitizacao, hasDivergence, conf.modo_operacao],
      );
      await client.query(
        "UPDATE documento_fiscal SET status=CASE WHEN $2 THEN 'divergente'::status_documento_fiscal ELSE 'conferida'::status_documento_fiscal END WHERE carga_id=ANY($1::uuid[])",
        [loads, hasDivergence],
      );
      await client.query(
        `INSERT INTO audit_evento (entidade,entidade_id,acao,usuario_id,dados_depois,client_uuid) VALUES ('conferencia_recebimento',$1,'conferir',$2,$3::jsonb,$4)`,
        [
          id,
          userId,
          JSON.stringify({
            status: hasDivergence ? "divergente" : "fechada",
            modoOperacao: conf.modo_operacao,
            estadoComposicao: input.estadoComposicao,
            evidencias: evidences.length,
          }),
          input.clientUuid ?? null,
        ],
      );
    });
    return this.getConferencia(id);
  }

  async getConferencia(id: string) {
    const row = await this.db.one(
      `SELECT cr.*,v.codigo AS viagem_codigo,p.codigo AS palete_codigo,lo.nome AS local_nome,u.nome AS conferente_nome,
              COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id',cri.id,'documentoFiscalId',cri.documento_fiscal_id,'tipo',df.tipo::text,'numero',df.numero,
                'cargaId',cri.carga_id,'cargaCodigo',c.codigo,'clienteNome',cli.nome,'destino',c.cidade_destino_sigla,
                'quantidadeDeclarada',cri.quantidade_declarada,'quantidadeInformada',cri.quantidade_informada,
                'quantidadeConferida',cri.quantidade_conferida,'divergencia',cri.divergencia,'justificativa',cri.justificativa,
                'volumes',(SELECT jsonb_agg(jsonb_build_object('uuid',crv.volume_id,'status',crv.status,'indice',vol.indice_volume,'total',vol.total_volumes) ORDER BY vol.indice_volume)
                           FROM conferencia_recebimento_volume crv JOIN volume vol ON vol.id=crv.volume_id WHERE crv.item_id=cri.id)
              ) ORDER BY cri.criado_em) FROM conferencia_recebimento_item cri JOIN documento_fiscal df ON df.id=cri.documento_fiscal_id JOIN carga c ON c.id=cri.carga_id JOIN cliente cli ON cli.id=c.cliente_remetente_id WHERE cri.conferencia_id=cr.id),'[]'::jsonb) AS itens
       FROM conferencia_recebimento cr JOIN viagem v ON v.id=cr.viagem_id LEFT JOIN palete p ON p.id=cr.palete_id
       JOIN local_operacional lo ON lo.id=cr.local_operacional_id JOIN usuario u ON u.id=cr.conferente_id WHERE cr.id=$1`,
      [id],
    );
    if (!row) throw new NotFoundException("Conferencia nao encontrada");
    return row;
  }

  async listConferencias(
    viagemId?: string,
    status?: string,
    paleteId?: string,
  ) {
    const result = await this.db.query(
      `SELECT cr.id,cr.viagem_id,v.codigo AS viagem_codigo,cr.palete_id,p.codigo AS palete_codigo,cr.tipo_unitizacao,cr.status,
              cr.estado_composicao,cr.aberta_em,cr.fechada_em,lo.nome AS local_nome,u.nome AS conferente_nome,
              count(DISTINCT cri.documento_fiscal_id)::int AS documentos,sum(cri.quantidade_informada)::int AS volumes_informados,
              sum(cri.quantidade_conferida)::int AS volumes_conferidos
       FROM conferencia_recebimento cr JOIN viagem v ON v.id=cr.viagem_id LEFT JOIN palete p ON p.id=cr.palete_id
       JOIN local_operacional lo ON lo.id=cr.local_operacional_id JOIN usuario u ON u.id=cr.conferente_id
       LEFT JOIN conferencia_recebimento_item cri ON cri.conferencia_id=cr.id
       WHERE ($1::uuid IS NULL OR cr.viagem_id=$1::uuid) AND ($2::text IS NULL OR cr.status=$2)
         AND ($3::uuid IS NULL OR cr.palete_id=$3::uuid)
       GROUP BY cr.id,v.codigo,p.codigo,lo.nome,u.nome ORDER BY cr.aberta_em DESC LIMIT 200`,
      [normalize(viagemId, 50), normalize(status, 20), normalize(paleteId, 50)],
    );
    return result.rows;
  }

  async releasePalete(id: string, input: ReleasePaleteInput, userId: string) {
    if (!input.motivo?.trim() || input.motivo.trim().length < 5)
      throw new BadRequestException(
        "Informe o motivo operacional da liberacao",
      );
    const location = await this.requireActiveLocation(input.localOperacionalId);
    if (location.tipo !== "porto")
      throw new BadRequestException(
        "Palete livre precisa estar fisicamente em um local do tipo porto",
      );
    await this.db.tx(async (client) => {
      const pallet = (
        await client.query<{ id: string; codigo: string; status: string }>(
          "SELECT id,codigo,status::text FROM palete WHERE id=$1 AND excluido_em IS NULL FOR UPDATE",
          [id],
        )
      ).rows[0];
      if (!pallet) throw new NotFoundException("Palete nao encontrado");
      if (pallet.status === "livre")
        throw new BadRequestException(`${pallet.codigo} ja esta livre`);
      const pending = await client.query(
        `SELECT vol.id FROM volume vol WHERE vol.palete_id=$1 AND vol.status <> 'entregue' LIMIT 1`,
        [id],
      );
      if (pending.rowCount)
        throw new BadRequestException(
          "O palete ainda possui volume sem entrega registrada",
        );
      await client.query(
        "UPDATE palete_viagem SET status='encerrada',encerrado_em=now(),encerrado_por=$2,motivo_encerramento=$3 WHERE palete_id=$1 AND status='ativa'",
        [id, userId, input.motivo.trim()],
      );
      await client.query(
        "UPDATE volume SET palete_id=NULL WHERE palete_id=$1",
        [id],
      );
      await client.query(
        "UPDATE palete SET status='livre',tipo_unitizacao=NULL,estado_composicao='vazio',local_operacional_id=$2 WHERE id=$1",
        [id, input.localOperacionalId],
      );
      await client.query(
        `INSERT INTO audit_evento (entidade,entidade_id,acao,usuario_id,dados_depois,client_uuid) VALUES ('palete',$1,'transicao_status',$2,$3::jsonb,$4)`,
        [
          id,
          userId,
          JSON.stringify({
            status: "livre",
            localOperacionalId: input.localOperacionalId,
            motivo: input.motivo.trim(),
          }),
          input.clientUuid ?? null,
        ],
      );
    });
    return this.listPaletes({ busca: id, pagina: "1", porPagina: "10" });
  }

  async listEtiquetas(data?: string) {
    const config = await this.config();
    const targetDate =
      data?.trim() ||
      new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone }).format(
        new Date(),
      );
    const result = await this.db.query(
      `SELECT ei.*,COALESCE(p.codigo,vol.id::text) AS alvo_codigo,CASE WHEN ei.palete_id IS NOT NULL THEN 'palete' ELSE 'volume' END AS alvo_tipo,
              c.codigo AS carga_codigo,c.cidade_destino_sigla,cr.viagem_id,v.codigo AS viagem_codigo,cr.aberta_em AS conferencia_aberta_em,
              u.nome AS solicitado_por_nome
       FROM etiqueta_impressao ei LEFT JOIN palete p ON p.id=ei.palete_id LEFT JOIN volume vol ON vol.id=ei.volume_id
       LEFT JOIN carga c ON c.id=vol.carga_id LEFT JOIN conferencia_recebimento cr ON cr.id=ei.conferencia_id
       LEFT JOIN viagem v ON v.id=cr.viagem_id LEFT JOIN usuario u ON u.id=ei.solicitado_por
       WHERE (ei.criado_em AT TIME ZONE $1)::date=$2::date ORDER BY ei.criado_em DESC LIMIT 500`,
      [config.timezone, targetDate],
    );
    return { data: targetDate, timezone: config.timezone, items: result.rows };
  }

  async listEtiquetaTargets(tipo: "palete" | "volume", busca?: string) {
    const search = normalize(busca, 120);
    if (tipo === "palete") {
      return (
        await this.db.query(
          `SELECT p.id,p.codigo,p.tipo_unitizacao,p.estado_composicao,p.status::text,lo.nome AS local_nome,
                pv.cidade_destino_sigla,v.codigo AS viagem_codigo,
                count(DISTINCT cri.documento_fiscal_id)::int AS documentos,count(DISTINCT crv.volume_id)::int AS volumes,
                (array_agg(cr.id ORDER BY cr.aberta_em DESC) FILTER (WHERE cr.id IS NOT NULL))[1]::text AS conferencia_id,
                EXISTS(SELECT 1 FROM etiqueta_impressao ei WHERE ei.palete_id=p.id AND ei.tipo='impressao') AS possui_etiqueta
         FROM palete p JOIN local_operacional lo ON lo.id=p.local_operacional_id
         LEFT JOIN palete_viagem pv ON pv.palete_id=p.id AND pv.status='ativa' LEFT JOIN viagem v ON v.id=pv.viagem_id
         LEFT JOIN conferencia_recebimento cr ON cr.palete_id=p.id AND cr.status<>'cancelada'
         LEFT JOIN conferencia_recebimento_item cri ON cri.conferencia_id=cr.id
         LEFT JOIN conferencia_recebimento_volume crv ON crv.conferencia_id=cr.id
         WHERE p.excluido_em IS NULL AND p.ativo=true AND p.tipo_unitizacao IS NOT NULL
           AND ($1::text IS NULL OR unaccent(lower(p.codigo||' '||COALESCE(v.codigo,'')||' '||COALESCE(lo.nome,''))) LIKE '%'||unaccent(lower($1))||'%')
         GROUP BY p.id,lo.nome,pv.cidade_destino_sigla,v.codigo ORDER BY p.codigo LIMIT 60`,
          [search],
        )
      ).rows;
    }
    return (
      await this.db.query(
        `SELECT vol.id,vol.id::text AS codigo,vol.indice_volume,vol.total_volumes,vol.status::text,c.codigo AS carga_codigo,
              c.cidade_destino_sigla,cli.nome AS cliente_nome,cr.id AS conferencia_id,cr.viagem_id,v.codigo AS viagem_codigo,
              EXISTS(SELECT 1 FROM etiqueta_impressao ei WHERE ei.volume_id=vol.id AND ei.tipo='impressao') AS possui_etiqueta
       FROM conferencia_recebimento_volume crv JOIN conferencia_recebimento cr ON cr.id=crv.conferencia_id
       JOIN volume vol ON vol.id=crv.volume_id JOIN carga c ON c.id=vol.carga_id JOIN cliente cli ON cli.id=c.cliente_remetente_id
       JOIN viagem v ON v.id=cr.viagem_id
       WHERE cr.tipo_unitizacao='AVULSA' AND cr.status IN ('aberta','divergente')
         AND ($1::text IS NULL OR unaccent(lower(vol.id::text||' '||c.codigo||' '||cli.nome||' '||v.codigo)) LIKE '%'||unaccent(lower($1))||'%')
       ORDER BY cr.aberta_em DESC,cli.nome,vol.indice_volume LIMIT 100`,
        [search],
      )
    ).rows;
  }

  async printEtiqueta(input: PrintTargetEtiquetaInput, userId: string) {
    const config = await this.config();
    const tipo = input.tipo ?? "impressao";
    if (!["impressao", "reimpressao"].includes(tipo))
      throw new BadRequestException("Tipo de impressao invalido");
    if (input.clientUuid) {
      const existing = await this.db.one(
        "SELECT * FROM etiqueta_impressao WHERE client_uuid=$1",
        [input.clientUuid],
      );
      if (existing) return existing;
    }
    if (tipo === "reimpressao") {
      if (
        config.reimpressao.exigirJustificativa &&
        !input.justificativa?.trim()
      )
        throw new BadRequestException(
          "Justificativa obrigatoria para reimpressao",
        );
      if (!input.etiquetaOriginalId)
        throw new BadRequestException("Selecione a etiqueta original");
      const original = await this.db.one<{
        id: string;
        volume_id: string | null;
        palete_id: string | null;
        mesmo_dia_operacional: boolean;
      }>(
        `SELECT id,volume_id,palete_id,
                (criado_em AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date AS mesmo_dia_operacional
         FROM etiqueta_impressao WHERE id=$1`,
        [input.etiquetaOriginalId, config.timezone],
      );
      if (!original)
        throw new NotFoundException("Etiqueta original nao encontrada");
      if (
        config.reimpressao.somenteDiaOperacional &&
        !original.mesmo_dia_operacional
      )
        throw new BadRequestException(
          "A configuracao permite reimpressao somente no mesmo dia operacional",
        );
      if (
        (input.alvoTipo === "volume"
          ? original.volume_id
          : original.palete_id) !== input.alvoId
      )
        throw new BadRequestException("Alvo difere da etiqueta original");
    }
    const target =
      input.alvoTipo === "palete"
        ? await this.db.one<{
            id: string;
            codigo: string;
            tipo_unitizacao: string | null;
            cidade_destino_sigla: string | null;
          }>(
            `SELECT p.id,p.codigo,p.tipo_unitizacao,pv.cidade_destino_sigla FROM palete p LEFT JOIN palete_viagem pv ON pv.palete_id=p.id AND pv.status='ativa' WHERE p.id=$1`,
            [input.alvoId],
          )
        : await this.db.one<{
            id: string;
            codigo: string;
            tipo_unitizacao: string | null;
            cidade_destino_sigla: string | null;
          }>(
            `SELECT vol.id,vol.id::text AS codigo,c.tipo_unitizacao,c.cidade_destino_sigla FROM volume vol JOIN carga c ON c.id=vol.carga_id WHERE vol.id=$1`,
            [input.alvoId],
          );
    if (!target)
      throw new NotFoundException(
        input.alvoTipo === "palete"
          ? "Palete nao encontrado"
          : "Volume nao encontrado",
      );
    if (input.alvoTipo === "palete" && !target.tipo_unitizacao)
      throw new BadRequestException(
        "Palete ainda nao foi classificado no recebimento",
      );
    const already = await this.db.one<{ id: string }>(
      `SELECT id FROM etiqueta_impressao WHERE ${input.alvoTipo === "palete" ? "palete_id" : "volume_id"}=$1 AND tipo='impressao' LIMIT 1`,
      [input.alvoId],
    );
    if (tipo === "impressao" && already)
      throw new BadRequestException("Alvo ja possui etiqueta; use reimpressao");
    const protocol = await this.nextProtocol(
      tipo === "reimpressao" ? "RETIQ" : "ETIQ",
    );
    const configured = Boolean(
      config.etiqueta.perfilImpressora &&
      config.etiqueta.protocolo &&
      config.etiqueta.larguraMm &&
      config.etiqueta.alturaMm,
    );
    const payload = {
      protocolo: protocol,
      alvoTipo: input.alvoTipo,
      alvoUuid: input.alvoId,
      codigo: target.codigo,
      cidadeDestinoSigla: target.cidade_destino_sigla,
      tipoOperacional: target.tipo_unitizacao ?? "AVULSA",
      layout: {
        larguraMm: config.etiqueta.larguraMm,
        alturaMm: config.etiqueta.alturaMm,
        copias: config.etiqueta.copiasPadrao,
      },
      impressora: {
        perfil: config.etiqueta.perfilImpressora,
        protocolo: config.etiqueta.protocolo,
      },
    };
    const row = await this.db.one(
      `INSERT INTO etiqueta_impressao (volume_id,palete_id,conferencia_id,tipo,status,protocolo,printer_model,payload,solicitado_por,client_uuid,etiqueta_original_id,justificativa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12) RETURNING *`,
      [
        input.alvoTipo === "volume" ? input.alvoId : null,
        input.alvoTipo === "palete" ? input.alvoId : null,
        input.conferenciaId ?? null,
        tipo,
        configured ? "aguardando_dispositivo" : "pendente_configuracao",
        protocol,
        config.etiqueta.perfilImpressora,
        JSON.stringify(payload),
        userId,
        input.clientUuid ?? null,
        input.etiquetaOriginalId ?? null,
        input.justificativa?.trim() || null,
      ],
    );
    await this.audit(
      "etiqueta_impressao",
      String(row!.id),
      "conferir",
      userId,
      null,
      { ...row, payload },
    );
    return row;
  }

  async confirmEtiqueta(
    id: string,
    success: boolean,
    error: string | undefined,
    userId: string,
  ) {
    const before = await this.db.one(
      "SELECT * FROM etiqueta_impressao WHERE id=$1",
      [id],
    );
    if (!before) throw new NotFoundException("Etiqueta nao encontrada");
    const row = await this.db.one(
      "UPDATE etiqueta_impressao SET status=$2,concluido_em=CASE WHEN $2='concluida' THEN now() ELSE concluido_em END,erro=$3 WHERE id=$1 RETURNING *",
      [
        id,
        success ? "concluida" : "erro",
        success ? null : error?.trim() || "Falha informada pelo operador",
      ],
    );
    await this.audit(
      "etiqueta_impressao",
      id,
      "atualizar",
      userId,
      before,
      row,
    );
    return row;
  }

  private async config(): Promise<TmsUnitizacaoConfig> {
    const row = await this.db.one<{ valor: unknown }>(
      `SELECT cv.valor FROM config_chave cc JOIN config_versao cv ON cv.chave_id=cc.id AND cv.ativo=true WHERE cc.chave='tms_paletizacao_etiquetas' LIMIT 1`,
    );
    if (!row)
      throw new BadRequestException(
        "Configuracao tms_paletizacao_etiquetas nao publicada",
      );
    validateTmsUnitizacaoConfig(row.valor);
    return row.valor;
  }

  private async validateTripDestination(viagemId: string, city: string) {
    const row = await this.db.one(
      `SELECT 1 FROM viagem v WHERE v.id=$1 AND (v.origem_sigla=$2 OR v.destino_sigla=$2 OR EXISTS (SELECT 1 FROM viagem_escala ve WHERE ve.viagem_id=v.id AND ve.cidade_sigla=$2))`,
      [viagemId, city.trim().toUpperCase()],
    );
    if (!row)
      throw new BadRequestException("Destino nao pertence a viagem informada");
  }

  private async requireActiveLocation(id: string) {
    const row = await this.db.one<{ id: string; tipo: string; nome: string }>(
      "SELECT id,tipo,nome FROM local_operacional WHERE id=$1 AND ativo=true AND excluido_em IS NULL",
      [id],
    );
    if (!row)
      throw new BadRequestException("Local operacional inexistente ou inativo");
    return row;
  }

  private validateLocal(input: SaveLocalOperacionalInput) {
    if (!input.codigo?.trim() || !input.nome?.trim())
      throw new BadRequestException("Codigo e nome do local sao obrigatorios");
    if (!["porto", "patio", "embarcacao", "outro"].includes(input.tipo))
      throw new BadRequestException("Tipo de local invalido");
    if (input.tipo === "embarcacao" && !input.embarcacaoId)
      throw new BadRequestException("Selecione a embarcacao para este local");
  }

  private async validatePalete(input: SavePaleteInput) {
    if (!["AJC", "terceiro"].includes(input.proprietario))
      throw new BadRequestException("Proprietario invalido");
    const refs =
      Number(Boolean(input.clienteProprietarioId)) +
      Number(Boolean(input.fornecedorProprietarioId));
    if (
      (input.proprietario === "AJC" && refs) ||
      (input.proprietario === "terceiro" && refs !== 1)
    )
      throw new BadRequestException(
        "Palete de terceiro exige exatamente um cliente ou fornecedor proprietario",
      );
    if (
      input.clienteProprietarioId &&
      !(await this.db.one("SELECT 1 FROM cliente WHERE id=$1", [
        input.clienteProprietarioId,
      ]))
    )
      throw new BadRequestException("Cliente proprietario nao encontrado");
    if (
      input.fornecedorProprietarioId &&
      !(await this.db.one(
        "SELECT 1 FROM fornecedor WHERE id=$1 AND ativo=true AND excluido_em IS NULL",
        [input.fornecedorProprietarioId],
      ))
    )
      throw new BadRequestException(
        "Fornecedor proprietario nao encontrado ou inativo",
      );
    await this.requireActiveLocation(input.localOperacionalId);
  }

  private async nextProtocol(prefix: string) {
    const row = await this.db.one<{ suffix: string }>(
      "SELECT upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)) AS suffix",
    );
    return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${row?.suffix}`;
  }

  private async audit(
    entity: string,
    id: string,
    action: "criar" | "atualizar" | "conferir",
    userId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.db.query(
      `INSERT INTO audit_evento (entidade,entidade_id,acao,usuario_id,dados_antes,dados_depois) VALUES ($1,$2,$3::acao_audit,$4,$5::jsonb,$6::jsonb)`,
      [
        entity,
        id,
        action,
        userId,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
      ],
    );
  }
}

function normalize(value: unknown, max: number) {
  const text = typeof value === "string" ? value.trim().slice(0, max) : "";
  return text || null;
}
function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function boundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = positiveInteger(value, fallback);
  return Math.min(max, Math.max(min, parsed));
}
