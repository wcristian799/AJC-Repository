import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { AuthTokenPayload } from "../auth/auth.types";
import {
  PortariaEntradaInput,
  PortariaQuery,
  PortariaSaidaInput,
  RegisterCampoDispositivoInput,
  SaveCampoAplicativoInput,
  SaveCampoContextoInput,
  VehicleChecklistInput,
} from "./campo.types";

type CampoConfig = {
  offline: { habilitado: boolean; maximoPendencias: number; janelaCacheHoras: number };
  dispositivos: { exigirIdentificacao: boolean; permitirRevogacao: boolean };
};

type PortariaConfig = {
  fotoEntrada: "obrigatoria" | "opcional";
  fotoSaida: "obrigatoria" | "opcional";
  pollingSegundos: number;
  bloquearPlacaDuplicada: boolean;
  tiposNovosPermitidos: string[];
  limiteExportacao: number;
};

@Injectable()
export class CampoRepository {
  constructor(private readonly db: DatabaseService) {}

  async listAplicativos(user: AuthTokenPayload, includeInactive = false) {
    const result = await this.db.query(
      `SELECT codigo,nome,descricao,rota_web,permissao_modulo,permissao_acao,ordem,ativo
       FROM campo_aplicativo
       WHERE ($1::boolean OR ativo=true)
       ORDER BY ordem,nome`,
      [includeInactive],
    );
    const granted = new Set(user.permissions);
    return result.rows
      .map((row) => ({
        codigo: row.codigo,
        nome: row.nome,
        descricao: row.descricao,
        rota: row.rota_web,
        ordem: Number(row.ordem),
        ativo: Boolean(row.ativo),
        permissoes:
          row.codigo === "bilheteria_digital"
            ? ["campo.bilheteiro", "campo.pdv"]
            : [`${row.permissao_modulo}.${row.permissao_acao}`],
      }))
      .filter((app) => includeInactive || app.permissoes.some((permission) => granted.has(permission)));
  }

  async updateAplicativo(codigo: string, input: SaveCampoAplicativoInput, userId: string) {
    const nome = requiredText(input.nome, "nome", 120);
    const descricao = requiredText(input.descricao, "descricao", 500);
    const ordem = boundedInteger(input.ordem, 1, 999);
    const before = await this.db.one("SELECT * FROM campo_aplicativo WHERE codigo=$1", [codigo]);
    if (!before) throw new NotFoundException("Aplicativo de campo nao encontrado");
    const row = await this.db.one(
      `UPDATE campo_aplicativo SET nome=$2,descricao=$3,ordem=$4,ativo=$5 WHERE codigo=$1 RETURNING *`,
      [codigo, nome, descricao, ordem, Boolean(input.ativo)],
    );
    await this.audit("campo_aplicativo", null, "atualizar", userId, { codigo, before, after: row });
    return row;
  }

  async listContextos(userId?: string, includeInactive = false) {
    const result = await this.db.query(
      `SELECT ccu.*,u.nome AS usuario_nome,ca.nome AS aplicativo_nome,lo.nome AS local_nome,
              lo.tipo AS local_tipo,v.codigo AS viagem_codigo,e.nome AS embarcacao_nome
       FROM campo_contexto_usuario ccu
       JOIN usuario u ON u.id=ccu.usuario_id
       LEFT JOIN campo_aplicativo ca ON ca.codigo=ccu.aplicativo_codigo
       LEFT JOIN local_operacional lo ON lo.id=ccu.local_operacional_id
       LEFT JOIN viagem v ON v.id=ccu.viagem_id
       LEFT JOIN embarcacao e ON e.id=v.embarcacao_id
       WHERE ($1::uuid IS NULL OR ccu.usuario_id=$1)
         AND ($2::boolean OR ccu.ativo=true)
       ORDER BY ccu.ativo DESC,ccu.inicio_em DESC`,
      [userId || null, includeInactive],
    );
    return result.rows;
  }

  async meusContextos(userId: string) {
    const assigned = await this.listContextos(userId, false);
    const now = Date.now();
    const active = assigned.filter((row) => {
      const start = new Date(row.inicio_em).getTime();
      const end = row.fim_em ? new Date(row.fim_em).getTime() : Number.POSITIVE_INFINITY;
      return start <= now && end >= now;
    });
    if (active.length) return active;
    const inferred = await this.db.query(
      `SELECT NULL::uuid AS id,u.id AS usuario_id,u.nome AS usuario_nome,NULL::text AS aplicativo_codigo,
              lo.id AS local_operacional_id,lo.nome AS local_nome,lo.tipo AS local_tipo,
              ec.viagem_id,v.codigo AS viagem_codigo,e.nome AS embarcacao_nome,
              COALESCE(ec.periodo_inicio,v.data_hora_saida) AS inicio_em,
              COALESCE(ec.periodo_fim,v.data_hora_retorno) AS fim_em,true AS ativo,
              'Contexto inferido da escala vigente'::text AS observacao
       FROM usuario u
       JOIN colaborador col ON col.id=u.colaborador_id
       JOIN escala_colaborador ec ON ec.colaborador_id=col.id AND ec.status <> 'cancelada'
       LEFT JOIN viagem v ON v.id=ec.viagem_id
       LEFT JOIN embarcacao e ON e.id=v.embarcacao_id
       LEFT JOIN local_operacional lo ON
         (lo.embarcacao_id=e.id OR (lo.cidade_sigla=col.cidade_sigla AND lo.tipo IN ('porto','patio')))
         AND lo.ativo=true AND lo.excluido_em IS NULL
       WHERE u.id=$1
         AND now() BETWEEN COALESCE(ec.periodo_inicio,v.data_hora_saida,now()-interval '1 minute')
                       AND COALESCE(ec.periodo_fim,v.data_hora_retorno,now()+interval '1 day')
       ORDER BY ec.viagem_id NULLS LAST,lo.tipo,lo.nome`,
      [userId],
    );
    return inferred.rows;
  }

  async createContexto(input: SaveCampoContextoInput, actorId: string) {
    await this.validateContext(input);
    if (input.clientUuid) {
      const existing = await this.db.one("SELECT * FROM campo_contexto_usuario WHERE client_uuid=$1", [input.clientUuid]);
      if (existing) return existing;
    }
    const row = await this.db.one(
      `INSERT INTO campo_contexto_usuario(
         usuario_id,aplicativo_codigo,local_operacional_id,viagem_id,inicio_em,fim_em,ativo,
         observacao,criado_por,atualizado_por,client_uuid
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10) RETURNING *`,
      [
        input.usuarioId,
        input.aplicativoCodigo || null,
        input.localOperacionalId || null,
        input.viagemId || null,
        input.inicioEm,
        input.fimEm || null,
        input.ativo ?? true,
        input.observacao?.trim() || null,
        actorId,
        input.clientUuid || null,
      ],
    );
    await this.audit("campo_contexto_usuario", String(row!.id), "criar", actorId, row);
    return row;
  }

  async updateContexto(id: string, input: SaveCampoContextoInput, actorId: string) {
    await this.validateContext(input);
    const before = await this.db.one("SELECT * FROM campo_contexto_usuario WHERE id=$1", [id]);
    if (!before) throw new NotFoundException("Contexto operacional nao encontrado");
    const row = await this.db.one(
      `UPDATE campo_contexto_usuario SET usuario_id=$2,aplicativo_codigo=$3,local_operacional_id=$4,
       viagem_id=$5,inicio_em=$6,fim_em=$7,ativo=$8,observacao=$9,atualizado_por=$10 WHERE id=$1 RETURNING *`,
      [id,input.usuarioId,input.aplicativoCodigo||null,input.localOperacionalId||null,input.viagemId||null,
        input.inicioEm,input.fimEm||null,input.ativo??true,input.observacao?.trim()||null,actorId],
    );
    await this.audit("campo_contexto_usuario", id, "atualizar", actorId, { before, after: row });
    return row;
  }

  async registerDevice(input: RegisterCampoDispositivoInput, userId: string) {
    const identifier = requiredText(input.identificador, "identificador", 160);
    const platform = requiredText(input.plataforma, "plataforma", 30);
    return this.db.one(
      `INSERT INTO campo_dispositivo(identificador,usuario_id,plataforma,modelo,versao_sistema,versao_aplicativo,ultimo_acesso_em)
       VALUES ($1,$2,$3,$4,$5,$6,now())
       ON CONFLICT (identificador) DO UPDATE SET usuario_id=EXCLUDED.usuario_id,plataforma=EXCLUDED.plataforma,
         modelo=EXCLUDED.modelo,versao_sistema=EXCLUDED.versao_sistema,versao_aplicativo=EXCLUDED.versao_aplicativo,
         ultimo_acesso_em=now(),atualizado_em=now()
       RETURNING id,identificador,plataforma,modelo,versao_sistema,versao_aplicativo,ativo,ultimo_acesso_em`,
      [identifier,userId,platform,input.modelo?.trim()||null,input.versaoSistema?.trim()||null,input.versaoAplicativo?.trim()||null],
    );
  }

  async config() {
    return this.getConfig<CampoConfig>("campo_operacao");
  }

  async portariaConfig() {
    return this.getConfig<PortariaConfig>("campo_portaria");
  }

  async listEmpresas(busca?: string) {
    const term = searchTerm(busca);
    const result = await this.db.query(
      `SELECT * FROM (
         SELECT 'cliente'::text AS tipo,c.id,c.nome,c.cpf_cnpj AS documento,c.cidade_sigla
         FROM cliente c WHERE c.excluido_em IS NULL
         UNION ALL
         SELECT 'fornecedor',f.id,f.nome,f.cnpj,NULL::varchar(4)
         FROM fornecedor f WHERE f.ativo=true AND f.excluido_em IS NULL
       ) empresa
       WHERE ($1::text IS NULL OR unaccent(lower(nome||' '||COALESCE(documento,''))) LIKE '%'||unaccent(lower($1))||'%')
       ORDER BY lower(nome),tipo LIMIT 80`,
      [term],
    );
    return result.rows;
  }

  async listPortaria(query: PortariaQuery, exportMode = false) {
    const { valor: config } = await this.portariaConfig();
    const page = positiveInteger(query.pagina, 1);
    const pageSize = exportMode ? config.limiteExportacao : boundedInteger(query.porPagina, 20, 10, 100);
    const offset = exportMode ? 0 : (page - 1) * pageSize;
    const search = searchTerm(query.busca);
    const situation = query.situacao || "patio";
    if (!["patio", "saida", "todas"].includes(situation)) throw new BadRequestException("Situacao da Portaria invalida");
    const result = await this.db.query<{ total_registros: number; [key: string]: unknown }>(
      `SELECT rp.*,lo.nome AS local_nome,lo.tipo AS local_tipo,lo.cidade_sigla,
              COALESCE(cli.nome,forn.nome,rp.empresa) AS empresa_nome,
              CASE WHEN rp.empresa_cliente_id IS NOT NULL THEN 'cliente' WHEN rp.empresa_fornecedor_id IS NOT NULL THEN 'fornecedor' ELSE 'informada' END AS empresa_tipo,
              COALESCE(cli.cpf_cnpj,forn.cnpj) AS empresa_documento,
              ue.nome AS porteiro_entrada_nome,us.nome AS porteiro_saida_nome,
              count(*) OVER()::int AS total_registros
       FROM registro_portaria rp
       LEFT JOIN local_operacional lo ON lo.id=rp.local_operacional_id
       LEFT JOIN cliente cli ON cli.id=rp.empresa_cliente_id
       LEFT JOIN fornecedor forn ON forn.id=rp.empresa_fornecedor_id
       JOIN usuario ue ON ue.id=rp.porteiro_id
       LEFT JOIN usuario us ON us.id=rp.saida_por
       WHERE ($1::text IS NULL OR unaccent(lower(COALESCE(rp.placa,'')||' '||COALESCE(rp.empresa,'')||' '||COALESCE(cli.nome,'')||' '||COALESCE(forn.nome,'')||' '||COALESCE(rp.motorista_nome,''))) LIKE '%'||unaccent(lower($1))||'%')
         AND ($2='todas' OR ($2='patio' AND rp.saida_em IS NULL) OR ($2='saida' AND rp.saida_em IS NOT NULL))
         AND ($3::uuid IS NULL OR rp.local_operacional_id=$3)
         AND ($4::date IS NULL OR rp.entrada_em >= $4::date)
         AND ($5::date IS NULL OR rp.entrada_em < $5::date + interval '1 day')
       ORDER BY CASE WHEN rp.saida_em IS NULL THEN 0 ELSE 1 END,rp.entrada_em DESC
       LIMIT $6 OFFSET $7`,
      [search,situation,query.localId||null,query.dataInicio||null,query.dataFim||null,pageSize,offset],
    );
    const summary = await this.db.one<{ no_patio: number; entradas_periodo: number; saidas_periodo: number }>(
      `SELECT count(*) FILTER (WHERE saida_em IS NULL)::int AS no_patio,
              count(*) FILTER (WHERE ($1::date IS NULL OR entrada_em >= $1::date) AND ($2::date IS NULL OR entrada_em < $2::date+interval '1 day'))::int AS entradas_periodo,
              count(*) FILTER (WHERE saida_em IS NOT NULL AND ($1::date IS NULL OR saida_em >= $1::date) AND ($2::date IS NULL OR saida_em < $2::date+interval '1 day'))::int AS saidas_periodo
       FROM registro_portaria WHERE ($3::uuid IS NULL OR local_operacional_id=$3)`,
      [query.dataInicio||null,query.dataFim||null,query.localId||null],
    );
    const total = Number(result.rows[0]?.total_registros || 0);
    return {
      items: result.rows.map(({ total_registros: _total, ...row }) => row),
      resumo: summary,
      paginacao: { pagina: page, porPagina: pageSize, total, paginas: Math.max(1,Math.ceil(total/pageSize)) },
      config: { pollingSegundos: config.pollingSegundos, fotoEntrada: config.fotoEntrada, fotoSaida: config.fotoSaida },
    };
  }

  async createPortaria(input: PortariaEntradaInput, userId: string) {
    const { valor: config } = await this.portariaConfig();
    const plate = normalizePlate(input.placa);
    const company = requiredText(input.empresaNome, "empresa", 160);
    if (!input.clientUuid) throw new BadRequestException("clientUuid obrigatorio");
    if (!config.tiposNovosPermitidos.includes("veiculo_carga")) throw new BadRequestException("Entrada de veiculo de carga desativada na configuracao");
    if (config.fotoEntrada === "obrigatoria" && (!input.fotoUrl || !input.fotoHash)) throw new BadRequestException("Foto real da entrada obrigatoria");
    await this.requirePortariaLocation(input.localOperacionalId);
    const companyRefs = await this.resolveCompany(input.empresaTipo,input.empresaId);
    return this.db.tx(async (client) => {
      const existingByClient = await client.query("SELECT * FROM registro_portaria WHERE client_uuid=$1", [input.clientUuid]);
      if (existingByClient.rows[0]) return existingByClient.rows[0];
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`portaria:${plate}`]);
      if (config.bloquearPlacaDuplicada) {
        const open = await client.query("SELECT id FROM registro_portaria WHERE regexp_replace(upper(placa),'[^A-Z0-9]','','g')=$1 AND saida_em IS NULL LIMIT 1", [plate]);
        if (open.rowCount) throw new BadRequestException("A placa ja possui entrada aberta no patio");
      }
      const row = await client.query(
        `INSERT INTO registro_portaria(placa,empresa,motorista_nome,tipo,entrada_em,porteiro_id,foto_url,foto_hash,
           local_operacional_id,empresa_cliente_id,empresa_fornecedor_id,client_uuid)
         VALUES ($1,$2,$3,'veiculo_carga',$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [formatPlate(plate),company,input.motoristaNome?.trim()||null,input.ocorridoEm||new Date().toISOString(),userId,
          input.fotoUrl||null,input.fotoHash||null,input.localOperacionalId,companyRefs.clientId,companyRefs.supplierId,input.clientUuid],
      );
      await client.query(
        `INSERT INTO registro_portaria_evento(registro_id,tipo,usuario_id,local_operacional_id,foto_url,foto_hash,ocorrido_em,client_uuid)
         VALUES ($1,'entrada',$2,$3,$4,$5,$6,$7)`,
        [row.rows[0].id,userId,input.localOperacionalId,input.fotoUrl||null,input.fotoHash||null,input.ocorridoEm||new Date().toISOString(),input.clientUuid],
      );
      await client.query(
        `INSERT INTO audit_evento(entidade,entidade_id,acao,usuario_id,dados_depois,client_uuid)
         VALUES ('registro_portaria',$1,'criar',$2,$3::jsonb,$4)`,
        [row.rows[0].id,userId,JSON.stringify({placa:formatPlate(plate),empresa:company,localOperacionalId:input.localOperacionalId,situacao:"patio"}),input.clientUuid],
      );
      return row.rows[0];
    });
  }

  async registerPortariaExit(id: string, input: PortariaSaidaInput, userId: string) {
    const { valor: config } = await this.portariaConfig();
    if (!input.clientUuid) throw new BadRequestException("clientUuid obrigatorio");
    if (config.fotoSaida === "obrigatoria" && (!input.fotoUrl || !input.fotoHash)) throw new BadRequestException("Foto real da saida obrigatoria");
    return this.db.tx(async (client) => {
      const idempotent = await client.query("SELECT * FROM registro_portaria WHERE saida_client_uuid=$1", [input.clientUuid]);
      if (idempotent.rows[0]) return idempotent.rows[0];
      const current = (await client.query("SELECT * FROM registro_portaria WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!current) throw new NotFoundException("Registro de Portaria nao encontrado");
      if (current.saida_em) throw new BadRequestException("A saida deste veiculo ja foi registrada");
      const occurredAt = input.ocorridoEm || new Date().toISOString();
      const row = await client.query(
        `UPDATE registro_portaria SET saida_em=$2,saida_por=$3,saida_client_uuid=$4,saida_foto_url=$5,saida_foto_hash=$6
         WHERE id=$1 RETURNING *`,
        [id,occurredAt,userId,input.clientUuid,input.fotoUrl||null,input.fotoHash||null],
      );
      await client.query(
        `INSERT INTO registro_portaria_evento(registro_id,tipo,usuario_id,local_operacional_id,foto_url,foto_hash,ocorrido_em,client_uuid)
         VALUES ($1,'saida',$2,$3,$4,$5,$6,$7)`,
        [id,userId,current.local_operacional_id,input.fotoUrl||null,input.fotoHash||null,occurredAt,input.clientUuid],
      );
      await client.query(
        `INSERT INTO audit_evento(entidade,entidade_id,acao,usuario_id,dados_antes,dados_depois,client_uuid)
         VALUES ('registro_portaria',$1,'transicao_status',$2,$3::jsonb,$4::jsonb,$5)`,
        [id,userId,JSON.stringify({situacao:"patio"}),JSON.stringify({situacao:"saida",saidaEm:occurredAt}),input.clientUuid],
      );
      return row.rows[0];
    });
  }

  async resolveDeliveryTarget(code: string) {
    const term = requiredText(code,"codigo",160);
    const volume = await this.db.one(
      `SELECT 'volume'::text AS tipo,v.id,v.uuid::text AS codigo,c.codigo AS referencia,c.cidade_destino_sigla,
              c.viagem_id,v.status::text AS status,ARRAY[v.id]::uuid[] AS volume_ids
       FROM volume v JOIN carga c ON c.id=v.carga_id WHERE v.id::text=$1 OR lower(v.uuid::text)=lower($1) LIMIT 1`,[term]);
    if (volume) return volume;
    const load = await this.db.one(
      `SELECT CASE WHEN c.categoria='encomenda' THEN 'encomenda' ELSE 'carga' END AS tipo,c.id,c.codigo,
              c.codigo AS referencia,c.cidade_destino_sigla,c.viagem_id,c.status::text AS status,
              array_agg(v.id ORDER BY v.indice_volume)::uuid[] AS volume_ids
       FROM carga c JOIN volume v ON v.carga_id=c.id WHERE c.id::text=$1 OR lower(c.codigo)=lower($1)
       GROUP BY c.id LIMIT 1`,[term]);
    if (load) return load;
    const pallet = await this.db.one(
      `SELECT 'palete'::text AS tipo,p.id,p.codigo,p.codigo AS referencia,MAX(c.cidade_destino_sigla) AS cidade_destino_sigla,
              MAX(c.viagem_id::text)::uuid AS viagem_id,p.status::text AS status,array_agg(v.id ORDER BY c.codigo,v.indice_volume)::uuid[] AS volume_ids
       FROM palete p JOIN volume v ON v.palete_id=p.id JOIN carga c ON c.id=v.carga_id
       WHERE p.id::text=$1 OR lower(p.codigo)=lower($1) GROUP BY p.id LIMIT 1`,[term]);
    if (pallet) return pallet;
    const vehicle = await this.db.one(
      `SELECT 'veiculo_maquina'::text AS tipo,ev.id,ev.codigo,ev.codigo AS referencia,ev.cidade_destino_sigla,
              ev.viagem_id,ev.status::text AS status,ARRAY[]::uuid[] AS volume_ids,ev.placa,ev.modelo
       FROM envio_veiculo ev WHERE ev.excluido_em IS NULL AND (ev.id::text=$1 OR lower(ev.codigo)=lower($1) OR regexp_replace(upper(COALESCE(ev.placa,'')),'[^A-Z0-9]','','g')=regexp_replace(upper($1),'[^A-Z0-9]','','g')) LIMIT 1`,[term]);
    if (vehicle) return vehicle;
    throw new NotFoundException("Código não encontrado em volumes, cargas, encomendas, paletes ou veículos");
  }

  async getVehicleChecklistConfig() { return this.getConfig<Record<string,unknown>>("veiculos_checklists"); }

  async saveVehicleChecklist(envioId:string,input:VehicleChecklistInput,userId:string) {
    if (!input.clientUuid) throw new BadRequestException("clientUuid obrigatorio");
    if (!["recebimento","embarque","entrega"].includes(input.etapa)) throw new BadRequestException("Etapa de checklist invalida");
    const config = await this.db.one<{id:string;valor:{templates?:Array<{etapa:string;itens?:string[];fotos?:string[];ativo?:boolean}>}}>(`SELECT cv.id,cv.valor FROM config_chave cc JOIN config_versao cv ON cv.chave_id=cc.id AND cv.ativo=true WHERE cc.chave='veiculos_checklists' ORDER BY cv.versao DESC LIMIT 1`);
    if (!config) throw new BadRequestException("Publique o checklist de veiculos em Cadastros");
    const template=config.valor.templates?.find(item=>item.etapa===input.etapa&&item.ativo!==false);
    if(!template) throw new BadRequestException("Nao existe checklist ativo para esta etapa");
    const missing=(template.itens||[]).filter(item=>input.itens?.[item]!==true&&String(input.itens?.[item]??"").trim()==="");
    if(missing.length) throw new BadRequestException(`Itens obrigatorios pendentes: ${missing.join(", ")}`);
    const receivedAngles=new Set((input.fotos||[]).map(photo=>photo.angulo));
    const missingPhotos=(template.fotos||[]).filter(angle=>!receivedAngles.has(angle));
    if(missingPhotos.length) throw new BadRequestException(`Fotos obrigatorias pendentes: ${missingPhotos.join(", ")}`);
    return this.db.tx(async client=>{
      const existing=await client.query("SELECT * FROM envio_veiculo_checklist WHERE client_uuid=$1",[input.clientUuid]); if(existing.rows[0])return existing.rows[0];
      const envio=(await client.query("SELECT * FROM envio_veiculo WHERE id=$1 AND excluido_em IS NULL FOR UPDATE",[envioId])).rows[0]; if(!envio)throw new NotFoundException("Envio de veiculo ou maquina nao encontrado");
      if(input.etapa==="entrega"&&(!input.recebedorNome?.trim()||!input.recebedorDocumento?.trim()||!input.assinaturaUrl||!input.assinaturaHash))throw new BadRequestException("Recebedor, documento e assinatura real sao obrigatorios na entrega");
      const row=(await client.query(`INSERT INTO envio_veiculo_checklist(envio_id,etapa,config_versao_id,itens,avarias,quilometragem,horimetro,recebedor_nome,recebedor_documento,assinatura_url,assinatura_hash,status,realizado_por,client_uuid)
        VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[envioId,input.etapa,config.id,JSON.stringify(input.itens||{}),JSON.stringify(input.avarias||[]),input.quilometragem??null,input.horimetro??null,input.recebedorNome?.trim()||null,input.recebedorDocumento?.trim()||null,input.assinaturaUrl||null,input.assinaturaHash||null,(input.avarias?.length||0)>0?"divergente":"concluido",userId,input.clientUuid])).rows[0];
      for(const photo of input.fotos||[])await client.query(`INSERT INTO envio_veiculo_foto(envio_id,etapa,angulo,foto_url,foto_hash,registrado_por) VALUES ($1,$2::etapa_foto_envio,$3,$4,$5,$6)`,[envioId,input.etapa==="recebimento"?"vistoria":"entrega",photo.angulo,photo.url,photo.hash,userId]);
      const event=input.etapa==="recebimento"?"vistoriado":input.etapa==="embarque"?"bipe_subida":"entregue";
      await client.query(`INSERT INTO envio_veiculo_evento(envio_id,tipo,local_sigla,observacao,registrado_por,client_uuid) VALUES ($1,$2::tipo_evento_envio_veiculo,$3,$4,$5,gen_random_uuid())`,[envioId,event,input.cidadeSigla||envio.cidade_destino_sigla,`Checklist ${input.etapa} concluido`,userId]);
      const status=input.etapa==="recebimento"?"embarque":input.etapa==="embarque"?"em_transito":"entregue"; await client.query("UPDATE envio_veiculo SET status=$2::status_envio_veiculo,atualizado_por=$3 WHERE id=$1",[envioId,status,userId]);
      if(input.etapa==="entrega"){
        const protocol=`ENT-VEI-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
        const delivery=(await client.query(`INSERT INTO entrega_comprovante(viagem_id,cidade_sigla,recebedor_nome,recebedor_doc,assinatura_url,assinatura_hash,protocolo,entregue_por_conferente_id,client_uuid,tipo_operacao,checklist_veiculo_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,gen_random_uuid(),'veiculo_maquina',$9) RETURNING id`,[envio.viagem_id,input.cidadeSigla||envio.cidade_destino_sigla,input.recebedorNome,input.recebedorDocumento,input.assinaturaUrl,input.assinaturaHash,protocol,userId,row.id])).rows[0];
        await client.query("INSERT INTO entrega_envio_veiculo(entrega_id,envio_veiculo_id) VALUES ($1,$2)",[delivery.id,envioId]);
      }
      await client.query(`INSERT INTO audit_evento(entidade,entidade_id,acao,usuario_id,dados_depois,client_uuid) VALUES ('envio_veiculo_checklist',$1,'criar',$2,$3::jsonb,$4)`,[row.id,userId,JSON.stringify({envioId,etapa:input.etapa,status}),input.clientUuid]); return row;
    });
  }

  private async resolveCompany(type?: "cliente" | "fornecedor", id?: string) {
    if (!type || !id) return { clientId: null, supplierId: null };
    if (type === "cliente") {
      const found = await this.db.one("SELECT id FROM cliente WHERE id=$1 AND excluido_em IS NULL", [id]);
      if (!found) throw new BadRequestException("Cliente/empresa nao encontrado");
      return { clientId: id, supplierId: null };
    }
    const found = await this.db.one("SELECT id FROM fornecedor WHERE id=$1 AND ativo=true AND excluido_em IS NULL", [id]);
    if (!found) throw new BadRequestException("Fornecedor/empresa nao encontrado");
    return { clientId: null, supplierId: id };
  }

  private async requirePortariaLocation(id: string) {
    const row = await this.db.one("SELECT id FROM local_operacional WHERE id=$1 AND tipo IN ('porto','patio') AND ativo=true AND excluido_em IS NULL", [id]);
    if (!row) throw new BadRequestException("Selecione um porto ou patio ativo");
  }

  private async validateContext(input: SaveCampoContextoInput) {
    if (!input.usuarioId || !input.inicioEm) throw new BadRequestException("usuarioId e inicioEm obrigatorios");
    const user = await this.db.one("SELECT id FROM usuario WHERE id=$1 AND ativo=true AND excluido_em IS NULL", [input.usuarioId]);
    if (!user) throw new BadRequestException("Usuario operacional inexistente ou inativo");
    if (input.aplicativoCodigo && !(await this.db.one("SELECT codigo FROM campo_aplicativo WHERE codigo=$1", [input.aplicativoCodigo]))) throw new BadRequestException("Aplicativo de campo invalido");
    if (input.localOperacionalId && !(await this.db.one("SELECT id FROM local_operacional WHERE id=$1 AND ativo=true AND excluido_em IS NULL", [input.localOperacionalId]))) throw new BadRequestException("Local operacional invalido");
    if (input.viagemId && !(await this.db.one("SELECT id FROM viagem WHERE id=$1 AND status <> 'cancelada'", [input.viagemId]))) throw new BadRequestException("Viagem invalida");
    if (input.fimEm && new Date(input.fimEm) <= new Date(input.inicioEm)) throw new BadRequestException("fimEm deve ser posterior a inicioEm");
  }

  private async getConfig<T>(key: string): Promise<{ chave: string; versao: number; valor: T }> {
    const row = await this.db.one<{ chave: string; versao: number; valor: T }>(
      `SELECT cc.chave,cv.versao,cv.valor FROM config_chave cc JOIN config_versao cv ON cv.chave_id=cc.id AND cv.ativo=true WHERE cc.chave=$1 ORDER BY cv.versao DESC LIMIT 1`,
      [key],
    );
    if (!row) throw new BadRequestException(`Configuracao ${key} nao publicada`);
    return row;
  }

  private async audit(entity: string, id: string | null, action: "criar" | "atualizar", userId: string, data: unknown) {
    await this.db.query(
      `INSERT INTO audit_evento(entidade,entidade_id,acao,usuario_id,dados_depois) VALUES ($1,$2,$3::acao_audit,$4,$5::jsonb)`,
      [entity,id,action,userId,JSON.stringify(data)],
    );
  }
}

function requiredText(value: unknown, label: string, max: number) {
  const text = typeof value === "string" ? value.trim().slice(0,max) : "";
  if (!text) throw new BadRequestException(`${label} obrigatorio`);
  return text;
}

function searchTerm(value: unknown) {
  const text = typeof value === "string" ? value.trim().slice(0,120) : "";
  return text || null;
}

function positiveInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number;
function boundedInteger(value: unknown, min: number, max: number): number;
function boundedInteger(value: unknown, a: number, b: number, c?: number) {
  const fallback = a;
  const min = c === undefined ? a : b;
  const max = c === undefined ? b : c;
  const number = positiveInteger(value,fallback);
  return Math.min(max,Math.max(min,number));
}

function normalizePlate(value: string) {
  const plate = String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if (!/^[A-Z]{3}[0-9A-Z][0-9A-Z][0-9]{2}$/.test(plate)) throw new BadRequestException("Placa invalida");
  return plate;
}

function formatPlate(plate: string) {
  return `${plate.slice(0,3)}-${plate.slice(3)}`;
}
