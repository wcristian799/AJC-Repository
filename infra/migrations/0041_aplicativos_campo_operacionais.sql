-- =============================================================================
-- 0041_aplicativos_campo_operacionais.sql
-- Etapas 14, 15, 16, 17 e 20: fundacao do AJC Campo, Portaria definitiva,
-- entrega multimodal, checklist de veiculos, pedidos comerciais e AR automatico
-- no primeiro bipe de embarque da carga.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Catalogo estrutural dos aplicativos e contexto operacional do usuario.
-- A rota e a permissao sao estrutura de seguranca; nome, descricao, ordem e
-- ativacao podem ser administrados pela API sem tornar rotas texto livre.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campo_aplicativo (
  codigo              varchar(40) PRIMARY KEY,
  nome                varchar(120) NOT NULL,
  descricao           text NOT NULL,
  rota_web             varchar(160) NOT NULL,
  permissao_modulo     varchar(40) NOT NULL DEFAULT 'campo',
  permissao_acao       varchar(40) NOT NULL,
  ordem                smallint NOT NULL,
  ativo                boolean NOT NULL DEFAULT true,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_campo_aplicativo_atualizado_em ON campo_aplicativo;
CREATE TRIGGER trg_campo_aplicativo_atualizado_em BEFORE UPDATE ON campo_aplicativo
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

INSERT INTO campo_aplicativo (codigo,nome,descricao,rota_web,permissao_acao,ordem) VALUES
  ('porteiro','Porteiro','Entrada, saida, patio e relatorio de veiculos','/campo/portaria','porteiro',10),
  ('encomendas','Encomendas','Cotacao, registro, acompanhamento e entrega de encomendas','/campo/encomendas','encomendas',20),
  ('conferente_porto','Conferente Porto','Conferencia fisica, paletes, avulsos e recebimento de veiculos','/campo/conferencia','conferente_porto',30),
  ('conferente_navegacao','Conferente Navegacao','Embarque, cross-docking, encomendas, veiculos e entregas','/campo/navegacao','conferente_navegacao',40),
  ('gerente_embarcacao','Gerente Embarcacao','Ciclo da viagem, operacoes autorizadas, entregas e prestacao','/campo/gerente','gerente_embarcacao',50),
  ('crm_comercial','CRM Comercial','Clientes, cotacoes e pedidos de envio','/campo/crm','crm_comercial',60),
  ('bilheteria_digital','Bilheteria Digital','Venda de passagem e validacao de QR','/campo/bilheteria','bilheteiro',70)
ON CONFLICT (codigo) DO UPDATE SET
  nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, rota_web=EXCLUDED.rota_web,
  permissao_modulo=EXCLUDED.permissao_modulo, permissao_acao=EXCLUDED.permissao_acao,
  ordem=EXCLUDED.ordem, atualizado_em=now();

CREATE TABLE IF NOT EXISTS campo_contexto_usuario (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  aplicativo_codigo     varchar(40) REFERENCES campo_aplicativo(codigo),
  local_operacional_id  uuid REFERENCES local_operacional(id),
  viagem_id             uuid REFERENCES viagem(id),
  inicio_em             timestamptz NOT NULL,
  fim_em                timestamptz,
  ativo                 boolean NOT NULL DEFAULT true,
  observacao            text,
  criado_por            uuid REFERENCES usuario(id),
  atualizado_por        uuid REFERENCES usuario(id),
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  client_uuid           uuid,
  CHECK (fim_em IS NULL OR fim_em > inicio_em)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_campo_contexto_client_uuid
  ON campo_contexto_usuario(client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_campo_contexto_usuario_periodo
  ON campo_contexto_usuario(usuario_id,inicio_em,fim_em) WHERE ativo=true;
DROP TRIGGER IF EXISTS trg_campo_contexto_atualizado_em ON campo_contexto_usuario;
CREATE TRIGGER trg_campo_contexto_atualizado_em BEFORE UPDATE ON campo_contexto_usuario
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS campo_dispositivo (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identificador         varchar(160) NOT NULL,
  usuario_id            uuid REFERENCES usuario(id),
  plataforma            varchar(30) NOT NULL,
  modelo                varchar(120),
  versao_sistema        varchar(60),
  versao_aplicativo     varchar(40),
  push_token_hash       varchar(128),
  ativo                 boolean NOT NULL DEFAULT true,
  ultimo_acesso_em      timestamptz,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identificador)
);
DROP TRIGGER IF EXISTS trg_campo_dispositivo_atualizado_em ON campo_dispositivo;
CREATE TRIGGER trg_campo_dispositivo_atualizado_em BEFORE UPDATE ON campo_dispositivo
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Portaria: local real, empresa referenciada, prova e saida idempotente.
-- ---------------------------------------------------------------------------
ALTER TABLE registro_portaria
  ADD COLUMN IF NOT EXISTS local_operacional_id uuid REFERENCES local_operacional(id),
  ADD COLUMN IF NOT EXISTS empresa_cliente_id uuid REFERENCES cliente(id),
  ADD COLUMN IF NOT EXISTS empresa_fornecedor_id uuid REFERENCES fornecedor(id),
  ADD COLUMN IF NOT EXISTS foto_hash varchar(64),
  ADD COLUMN IF NOT EXISTS saida_por uuid REFERENCES usuario(id),
  ADD COLUMN IF NOT EXISTS saida_client_uuid uuid,
  ADD COLUMN IF NOT EXISTS saida_foto_url text,
  ADD COLUMN IF NOT EXISTS saida_foto_hash varchar(64),
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE registro_portaria ADD CONSTRAINT ck_registro_portaria_empresa_referencia
    CHECK (num_nonnulls(empresa_cliente_id,empresa_fornecedor_id) <= 1) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_registro_portaria_saida_client_uuid
  ON registro_portaria(saida_client_uuid) WHERE saida_client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_registro_portaria_local_aberto
  ON registro_portaria(local_operacional_id,entrada_em DESC) WHERE saida_em IS NULL;
DROP TRIGGER IF EXISTS trg_registro_portaria_atualizado_em ON registro_portaria;
CREATE TRIGGER trg_registro_portaria_atualizado_em BEFORE UPDATE ON registro_portaria
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS registro_portaria_evento (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id           uuid NOT NULL REFERENCES registro_portaria(id) ON DELETE CASCADE,
  tipo                  varchar(12) NOT NULL CHECK (tipo IN ('entrada','saida')),
  usuario_id            uuid NOT NULL REFERENCES usuario(id),
  local_operacional_id  uuid REFERENCES local_operacional(id),
  foto_url              text,
  foto_hash             varchar(64),
  ocorrido_em           timestamptz NOT NULL DEFAULT now(),
  client_uuid           uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_registro_portaria_evento_client_uuid
  ON registro_portaria_evento(client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_registro_portaria_evento_registro
  ON registro_portaria_evento(registro_id,ocorrido_em);

-- ---------------------------------------------------------------------------
-- Checklist real de veiculo/maquina e entrega multimodal.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS envio_veiculo_checklist (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envio_id              uuid NOT NULL REFERENCES envio_veiculo(id) ON DELETE CASCADE,
  etapa                 varchar(20) NOT NULL CHECK (etapa IN ('recebimento','embarque','entrega')),
  config_versao_id      uuid NOT NULL REFERENCES config_versao(id),
  itens                 jsonb NOT NULL,
  avarias               jsonb NOT NULL DEFAULT '[]'::jsonb,
  quilometragem         numeric(12,1),
  horimetro             numeric(12,1),
  recebedor_nome        varchar(160),
  recebedor_documento   varchar(30),
  assinatura_url        text,
  assinatura_hash       varchar(64),
  status                varchar(20) NOT NULL DEFAULT 'concluido' CHECK (status IN ('rascunho','concluido','divergente','cancelado')),
  realizado_por         uuid NOT NULL REFERENCES usuario(id),
  realizado_em          timestamptz NOT NULL DEFAULT now(),
  client_uuid           uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_envio_veiculo_checklist_client_uuid
  ON envio_veiculo_checklist(client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_envio_veiculo_checklist_envio
  ON envio_veiculo_checklist(envio_id,etapa,realizado_em DESC);

ALTER TABLE entrega_comprovante
  ADD COLUMN IF NOT EXISTS tipo_operacao varchar(24) NOT NULL DEFAULT 'volume',
  ADD COLUMN IF NOT EXISTS checklist_veiculo_id uuid REFERENCES envio_veiculo_checklist(id),
  ADD COLUMN IF NOT EXISTS dispositivo varchar(160);

DO $$ BEGIN
  ALTER TABLE entrega_comprovante ADD CONSTRAINT ck_entrega_tipo_operacao
    CHECK (tipo_operacao IN ('volume','carga','encomenda','palete','veiculo_maquina')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS entrega_palete (
  entrega_id            uuid NOT NULL REFERENCES entrega_comprovante(id) ON DELETE CASCADE,
  palete_id             uuid NOT NULL REFERENCES palete(id),
  PRIMARY KEY (entrega_id,palete_id)
);

CREATE TABLE IF NOT EXISTS entrega_envio_veiculo (
  entrega_id            uuid NOT NULL REFERENCES entrega_comprovante(id) ON DELETE CASCADE,
  envio_veiculo_id      uuid NOT NULL REFERENCES envio_veiculo(id),
  PRIMARY KEY (entrega_id,envio_veiculo_id)
);

-- ---------------------------------------------------------------------------
-- Pedido comercial separado da carga fisica.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_envio (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                varchar(40) NOT NULL UNIQUE,
  tipo                  varchar(20) NOT NULL CHECK (tipo IN ('carga','encomenda','veiculo','maquina')),
  cliente_id            uuid NOT NULL REFERENCES cliente(id),
  agente_id             uuid REFERENCES agente(id),
  cotacao_id            uuid REFERENCES cotacao(id),
  origem_sigla          varchar(4) NOT NULL REFERENCES cidade(sigla),
  destino_sigla         varchar(4) NOT NULL REFERENCES cidade(sigla),
  status                varchar(24) NOT NULL DEFAULT 'registrado'
                        CHECK (status IN ('registrado','aguardando_documentos','pronto_operacao','convertido','cancelado')),
  parametros            jsonb NOT NULL DEFAULT '{}'::jsonb,
  valor_estimado        numeric(12,2),
  observacao            text,
  carga_id              uuid REFERENCES carga(id),
  envio_veiculo_id      uuid REFERENCES envio_veiculo(id),
  criado_por            uuid NOT NULL REFERENCES usuario(id),
  atualizado_por        uuid REFERENCES usuario(id),
  client_uuid           uuid,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  excluido_em           timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pedido_envio_client_uuid
  ON pedido_envio(client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_pedido_envio_cliente_status
  ON pedido_envio(cliente_id,status,criado_em DESC) WHERE excluido_em IS NULL;
DROP TRIGGER IF EXISTS trg_pedido_envio_atualizado_em ON pedido_envio;
CREATE TRIGGER trg_pedido_envio_atualizado_em BEFORE UPDATE ON pedido_envio
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- Conta a receber automatica no primeiro evento de embarque da carga.
-- Uma carga gera um titulo pelo frete total; todas as NF/DC ficam vinculadas.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financeiro_titulo_documento_fiscal (
  titulo_id             uuid NOT NULL REFERENCES financeiro_titulo(id) ON DELETE CASCADE,
  documento_fiscal_id   uuid NOT NULL REFERENCES documento_fiscal(id),
  PRIMARY KEY (titulo_id,documento_fiscal_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_titulo_embarque_carga
  ON financeiro_titulo(carga_id)
  WHERE tipo='receber' AND origem='embarque_carga' AND excluido_em IS NULL;

INSERT INTO config_chave (chave,categoria,descricao,schema_json) VALUES
  ('campo_operacao','campo','Aplicativos, dispositivos, contexto e sincronizacao da suite AJC Campo','{"type":"object","required":["schemaVersion","offline","dispositivos"]}'::jsonb),
  ('campo_portaria','campo','Regras de entrada, saida, evidencias e atualizacao da Portaria','{"type":"object","required":["schemaVersion","fotoEntrada","fotoSaida","pollingSegundos","bloquearPlacaDuplicada"]}'::jsonb),
  ('campo_entregas','campo','Provas, assinatura e operacao multimodal de entregas','{"type":"object","required":["schemaVersion","provas","offline"]}'::jsonb),
  ('veiculos_checklists','veiculos','Templates versionados de recebimento, embarque e entrega de veiculos e maquinas','{"type":"object","required":["schemaVersion","templates"]}'::jsonb),
  ('tms_contas_receber_embarque','financeiro','Geracao automatica de contas a receber no primeiro bipe de embarque da carga','{"type":"object","required":["schemaVersion","ativo","prazoDias","bloquearSemValor"]}'::jsonb)
ON CONFLICT (chave) DO UPDATE SET categoria=EXCLUDED.categoria,descricao=EXCLUDED.descricao,schema_json=EXCLUDED.schema_json,ativo=true,atualizado_em=now();

WITH autor AS (SELECT id FROM usuario WHERE ativo=true ORDER BY criado_em LIMIT 1), valores(chave,valor) AS (VALUES
  ('campo_operacao','{"schemaVersion":1,"offline":{"habilitado":true,"maximoPendencias":500,"janelaCacheHoras":72},"dispositivos":{"exigirIdentificacao":true,"permitirRevogacao":true}}'::jsonb),
  ('campo_portaria','{"schemaVersion":1,"fotoEntrada":"obrigatoria","fotoSaida":"opcional","pollingSegundos":20,"bloquearPlacaDuplicada":true,"tiposNovosPermitidos":["veiculo_carga"],"limiteExportacao":10000}'::jsonb),
  ('campo_entregas','{"schemaVersion":1,"provas":{"fotosMinimas":2,"assinaturaObrigatoria":true,"documentoRecebedorObrigatorio":true},"offline":{"habilitado":true,"maximoPendencias":500}}'::jsonb),
  ('veiculos_checklists','{"schemaVersion":1,"templates":[{"codigo":"recebimento_padrao","etapa":"recebimento","nome":"Recebimento","itens":["identificacao","estado_externo","avarias","documentos","chaves"],"fotos":["frente","traseira","lateral_esquerda","lateral_direita"],"ativo":true},{"codigo":"embarque_padrao","etapa":"embarque","nome":"Embarque","itens":["identificacao","etiqueta","fixacao","avarias"],"fotos":[],"ativo":true},{"codigo":"entrega_padrao","etapa":"entrega","nome":"Entrega","itens":["identificacao","estado_externo","avarias","documentos","chaves","aceite_recebedor"],"fotos":["frente","traseira","lateral_esquerda","lateral_direita"],"ativo":true}]}'::jsonb),
  ('tms_contas_receber_embarque','{"schemaVersion":1,"ativo":true,"prazoDias":0,"bloquearSemValor":true,"planoContaId":null,"centroCustoId":null}'::jsonb)
)
INSERT INTO config_versao(chave_id,versao,valor,ativo,autor_id)
SELECT cc.id,1,v.valor,true,a.id
FROM valores v JOIN config_chave cc ON cc.chave=v.chave CROSS JOIN autor a
WHERE NOT EXISTS (SELECT 1 FROM config_versao cv WHERE cv.chave_id=cc.id);

CREATE OR REPLACE FUNCTION gerar_conta_receber_embarque_carga()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cfg jsonb;
  carga_row record;
  titulo_id uuid;
  prazo_dias integer;
  bloquear_sem_valor boolean;
  plano_id uuid;
  centro_id uuid;
  documentos_texto text;
BEGIN
  IF NEW.tipo::text <> 'embarcado' THEN
    RETURN NEW;
  END IF;

  SELECT cv.valor INTO cfg
  FROM config_chave cc
  JOIN config_versao cv ON cv.chave_id=cc.id AND cv.ativo=true
  WHERE cc.chave='tms_contas_receber_embarque'
  ORDER BY cv.versao DESC LIMIT 1;

  IF cfg IS NULL OR COALESCE((cfg->>'ativo')::boolean,false)=false THEN
    RETURN NEW;
  END IF;

  SELECT c.id,c.codigo,c.valor_cobrado,c.cliente_remetente_id,c.viagem_id,
         cli.nome AS cliente_nome
  INTO carga_row
  FROM volume vol
  JOIN carga c ON c.id=vol.carga_id
  JOIN cliente cli ON cli.id=c.cliente_remetente_id
  WHERE vol.id=NEW.volume_id;

  IF carga_row.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO titulo_id
  FROM financeiro_titulo
  WHERE carga_id=carga_row.id AND tipo='receber' AND origem='embarque_carga' AND excluido_em IS NULL
  LIMIT 1;
  IF titulo_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  bloquear_sem_valor := COALESCE((cfg->>'bloquearSemValor')::boolean,true);
  IF carga_row.valor_cobrado IS NULL OR carga_row.valor_cobrado <= 0 THEN
    IF bloquear_sem_valor THEN
      RAISE EXCEPTION 'Carga % sem valor de frete: configure o valor antes do embarque', carga_row.codigo;
    END IF;
    RETURN NEW;
  END IF;

  prazo_dias := GREATEST(COALESCE((cfg->>'prazoDias')::integer,0),0);
  plano_id := NULLIF(cfg->>'planoContaId','')::uuid;
  centro_id := NULLIF(cfg->>'centroCustoId','')::uuid;
  SELECT string_agg(COALESCE(df.tipo::text,'Documento') || ' ' || COALESCE(df.numero,df.id::text),', ' ORDER BY df.criado_em)
    INTO documentos_texto FROM documento_fiscal df WHERE df.carga_id=carga_row.id;

  INSERT INTO financeiro_titulo(
    tipo,descricao,parte_nome,vencimento,competencia,valor,status,origem,observacao,
    cliente_id,carga_id,viagem_id,plano_conta_id,centro_custo_id,criado_por,atualizado_por
  ) VALUES (
    'receber','Frete da carga '||carga_row.codigo,carga_row.cliente_nome,
    (NEW.ocorrido_em AT TIME ZONE 'America/Sao_Paulo')::date + prazo_dias,
    (NEW.ocorrido_em AT TIME ZONE 'America/Sao_Paulo')::date,
    carga_row.valor_cobrado,'aberto','embarque_carga',
    'Gerado automaticamente no primeiro bipe de embarque. NF/DC: '||COALESCE(documentos_texto,'sem numero informado'),
    carga_row.cliente_remetente_id,carga_row.id,carga_row.viagem_id,plano_id,centro_id,NEW.usuario_id,NEW.usuario_id
  )
  ON CONFLICT (carga_id) WHERE tipo='receber' AND origem='embarque_carga' AND excluido_em IS NULL
  DO NOTHING RETURNING id INTO titulo_id;

  IF titulo_id IS NULL THEN
    SELECT id INTO titulo_id FROM financeiro_titulo
    WHERE carga_id=carga_row.id AND tipo='receber' AND origem='embarque_carga' AND excluido_em IS NULL;
  ELSE
    INSERT INTO audit_evento(entidade,entidade_id,acao,usuario_id,dados_depois)
    VALUES ('financeiro_titulo',titulo_id,'criar',NEW.usuario_id,
      jsonb_build_object('origem','embarque_carga','cargaId',carga_row.id,'valor',carga_row.valor_cobrado,'eventoVolumeId',NEW.id));
  END IF;

  INSERT INTO financeiro_titulo_documento_fiscal(titulo_id,documento_fiscal_id)
  SELECT titulo_id,df.id FROM documento_fiscal df WHERE df.carga_id=carga_row.id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_evento_volume_conta_receber_embarque ON evento_volume;
CREATE TRIGGER trg_evento_volume_conta_receber_embarque
AFTER INSERT ON evento_volume
FOR EACH ROW EXECUTE FUNCTION gerar_conta_receber_embarque_carga();

-- ---------------------------------------------------------------------------
-- Permissoes granulares. O administrador recebe o catalogo novo; os demais
-- perfis continuam configuraveis em Cadastros.
-- ---------------------------------------------------------------------------
INSERT INTO permissao(modulo,acao,descricao) VALUES
  ('campo','configurar','Configurar aplicativos e politicas da suite de campo'),
  ('campo','contexto_gerenciar','Gerenciar locais, viagens e turnos dos operadores'),
  ('portaria','ver','Visualizar patio e historico da Portaria'),
  ('portaria','registrar','Registrar entrada de veiculo no patio'),
  ('portaria','saida','Registrar saida de veiculo do patio'),
  ('portaria','relatorio','Exportar relatorio da Portaria'),
  ('entregas','ver','Visualizar itens elegiveis para entrega'),
  ('entregas','realizar','Concluir entrega multimodal com provas'),
  ('veiculos','vistoriar','Realizar vistoria e recebimento de veiculo ou maquina'),
  ('veiculos','embarcar','Registrar embarque de veiculo ou maquina'),
  ('veiculos','entregar','Realizar checklist e entrega de veiculo ou maquina'),
  ('crm','pedido_ver','Visualizar pedidos comerciais de envio'),
  ('crm','pedido_criar','Criar e atualizar pedidos comerciais de envio')
ON CONFLICT (modulo,acao) DO UPDATE SET descricao=EXCLUDED.descricao;

INSERT INTO perfil_permissao(perfil_id,permissao_id)
SELECT p.id,pe.id FROM perfil p CROSS JOIN permissao pe
WHERE lower(p.nome)='administrador'
  AND (pe.modulo IN ('campo','portaria','entregas','veiculos','crm'))
ON CONFLICT DO NOTHING;

COMMIT;
