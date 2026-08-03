-- =============================================================================
-- 0029_tms_paletizacao_etiquetas.sql
-- Etapa 04: paletizacao, recebimento fisico e etiquetas de palete/volume.
-- =============================================================================

BEGIN;

ALTER TABLE volume ALTER COLUMN status SET DEFAULT 'cadastrado';

UPDATE volume vol
SET status = 'cadastrado'
WHERE vol.status = 'recebido'
  AND NOT EXISTS (
    SELECT 1 FROM evento_volume ev
    WHERE ev.volume_id = vol.id AND ev.tipo IN ('recebido','conferido','embarcado','reconferido','desembarcado','entregue')
  );

CREATE TABLE IF NOT EXISTS local_operacional (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo         varchar(40) NOT NULL,
  nome           varchar(160) NOT NULL,
  tipo           varchar(24) NOT NULL CHECK (tipo IN ('porto','patio','embarcacao','outro')),
  cidade_sigla   varchar(4) REFERENCES cidade(sigla),
  embarcacao_id  uuid REFERENCES embarcacao(id),
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  excluido_em    timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_local_operacional_codigo ON local_operacional (codigo) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS ix_local_operacional_nome ON local_operacional (nome) WHERE excluido_em IS NULL;

DROP TRIGGER IF EXISTS trg_local_operacional_atualizado_em ON local_operacional;
CREATE TRIGGER trg_local_operacional_atualizado_em BEFORE UPDATE ON local_operacional
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

INSERT INTO local_operacional (codigo, nome, tipo, cidade_sigla)
SELECT
  'PORTO-' || c.sigla,
  CASE
    WHEN lower(c.nome) LIKE 'porto de %' THEN c.nome
    ELSE 'Porto de ' || c.nome
  END,
  'porto',
  c.sigla
FROM cidade c
WHERE c.ativo = true
ON CONFLICT DO NOTHING;

ALTER TABLE palete
  ADD COLUMN IF NOT EXISTS cliente_proprietario_id uuid REFERENCES cliente(id),
  ADD COLUMN IF NOT EXISTS fornecedor_proprietario_id uuid REFERENCES fornecedor(id),
  ADD COLUMN IF NOT EXISTS local_operacional_id uuid REFERENCES local_operacional(id),
  ADD COLUMN IF NOT EXISTS tipo_unitizacao varchar(12),
  ADD COLUMN IF NOT EXISTS estado_composicao varchar(20) NOT NULL DEFAULT 'vazio',
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE palete ADD CONSTRAINT ck_palete_tipo_unitizacao
    CHECK (tipo_unitizacao IS NULL OR tipo_unitizacao IN ('MP','PD','PC'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE palete ADD CONSTRAINT ck_palete_estado_composicao
    CHECK (estado_composicao IN ('vazio','parcial','completo'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE palete p
SET cliente_proprietario_id = c.id
FROM cliente c
WHERE p.proprietario = 'terceiro' AND p.terceiro_id = c.id
  AND p.cliente_proprietario_id IS NULL AND p.fornecedor_proprietario_id IS NULL;

UPDATE palete p
SET fornecedor_proprietario_id = f.id
FROM fornecedor f
WHERE p.proprietario = 'terceiro' AND p.terceiro_id = f.id
  AND p.cliente_proprietario_id IS NULL AND p.fornecedor_proprietario_id IS NULL;

DO $$ BEGIN
  ALTER TABLE palete ADD CONSTRAINT ck_palete_proprietario_referencia
    CHECK (
      (proprietario = 'AJC' AND cliente_proprietario_id IS NULL AND fornecedor_proprietario_id IS NULL)
      OR
      (proprietario = 'terceiro' AND num_nonnulls(cliente_proprietario_id, fornecedor_proprietario_id) = 1)
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE palete_viagem
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS encerrado_em timestamptz,
  ADD COLUMN IF NOT EXISTS encerrado_por uuid REFERENCES usuario(id),
  ADD COLUMN IF NOT EXISTS motivo_encerramento text,
  ADD COLUMN IF NOT EXISTS client_uuid uuid;

DO $$ BEGIN
  ALTER TABLE palete_viagem ADD CONSTRAINT ck_palete_viagem_status
    CHECK (status IN ('ativa','encerrada','cancelada'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- O modelo legado permitia mais de uma alocacao sem ciclo de encerramento.
-- Preserva a mais recente como ativa e encerra as anteriores antes de impor
-- a unicidade operacional, evitando que dados historicos quebrem o deploy.
WITH alocacoes_ordenadas AS (
  SELECT id,
         row_number() OVER (PARTITION BY palete_id ORDER BY alocado_em DESC, id DESC) AS ordem
  FROM palete_viagem
  WHERE status = 'ativa'
)
UPDATE palete_viagem pv
SET status = 'encerrada',
    encerrado_em = COALESCE(pv.encerrado_em, pv.alocado_em),
    motivo_encerramento = COALESCE(pv.motivo_encerramento, 'Migracao do historico legado')
FROM alocacoes_ordenadas ao
WHERE ao.id = pv.id AND ao.ordem > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_palete_viagem_ativa ON palete_viagem (palete_id) WHERE status = 'ativa';
CREATE UNIQUE INDEX IF NOT EXISTS ux_palete_viagem_client_uuid ON palete_viagem (client_uuid) WHERE client_uuid IS NOT NULL;

CREATE TABLE IF NOT EXISTS conferencia_recebimento (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id             uuid NOT NULL REFERENCES viagem(id),
  palete_id              uuid REFERENCES palete(id),
  local_operacional_id   uuid NOT NULL REFERENCES local_operacional(id),
  tipo_unitizacao        varchar(12) NOT NULL CHECK (tipo_unitizacao IN ('AVULSA','MP','PD','PC')),
  status                 varchar(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada','divergente','cancelada')),
  estado_composicao      varchar(20) CHECK (estado_composicao IS NULL OR estado_composicao IN ('parcial','completo')),
  conferente_id          uuid NOT NULL REFERENCES usuario(id),
  evidencias             jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacao             text,
  client_uuid            uuid,
  aberta_em              timestamptz NOT NULL DEFAULT now(),
  fechada_em             timestamptz,
  criado_em              timestamptz NOT NULL DEFAULT now(),
  atualizado_em          timestamptz NOT NULL DEFAULT now(),
  CHECK ((tipo_unitizacao = 'AVULSA' AND palete_id IS NULL) OR (tipo_unitizacao <> 'AVULSA' AND palete_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_conferencia_recebimento_client_uuid ON conferencia_recebimento (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_conferencia_palete_aberta ON conferencia_recebimento (palete_id) WHERE status = 'aberta' AND palete_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_conferencia_viagem_status ON conferencia_recebimento (viagem_id, status, aberta_em DESC);

DROP TRIGGER IF EXISTS trg_conferencia_recebimento_atualizado_em ON conferencia_recebimento;
CREATE TRIGGER trg_conferencia_recebimento_atualizado_em BEFORE UPDATE ON conferencia_recebimento
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS conferencia_recebimento_item (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conferencia_id        uuid NOT NULL REFERENCES conferencia_recebimento(id) ON DELETE CASCADE,
  documento_fiscal_id   uuid NOT NULL REFERENCES documento_fiscal(id),
  carga_id              uuid NOT NULL REFERENCES carga(id),
  quantidade_declarada  integer NOT NULL CHECK (quantidade_declarada > 0),
  quantidade_informada  integer NOT NULL CHECK (quantidade_informada > 0),
  quantidade_conferida  integer NOT NULL DEFAULT 0 CHECK (quantidade_conferida >= 0),
  divergencia            boolean NOT NULL DEFAULT false,
  justificativa          text,
  client_uuid            uuid,
  criado_em              timestamptz NOT NULL DEFAULT now(),
  atualizado_em          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conferencia_id, documento_fiscal_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_conferencia_item_client_uuid ON conferencia_recebimento_item (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_conferencia_item_carga ON conferencia_recebimento_item (carga_id);

DROP TRIGGER IF EXISTS trg_conferencia_item_atualizado_em ON conferencia_recebimento_item;
CREATE TRIGGER trg_conferencia_item_atualizado_em BEFORE UPDATE ON conferencia_recebimento_item
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS conferencia_recebimento_volume (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conferencia_id   uuid NOT NULL REFERENCES conferencia_recebimento(id) ON DELETE CASCADE,
  item_id           uuid NOT NULL REFERENCES conferencia_recebimento_item(id) ON DELETE CASCADE,
  volume_id         uuid NOT NULL REFERENCES volume(id),
  status            varchar(20) NOT NULL DEFAULT 'alocado' CHECK (status IN ('alocado','recebido')),
  recebido_em       timestamptz,
  recebido_por      uuid REFERENCES usuario(id),
  client_uuid       uuid,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conferencia_id, volume_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_conferencia_volume_client_uuid ON conferencia_recebimento_volume (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_conferencia_volume_item ON conferencia_recebimento_volume (item_id, status);

ALTER TABLE etiqueta_impressao
  ALTER COLUMN volume_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS palete_id uuid REFERENCES palete(id),
  ADD COLUMN IF NOT EXISTS conferencia_id uuid REFERENCES conferencia_recebimento(id),
  ADD COLUMN IF NOT EXISTS etiqueta_original_id uuid REFERENCES etiqueta_impressao(id),
  ADD COLUMN IF NOT EXISTS justificativa text,
  ADD COLUMN IF NOT EXISTS concluido_em timestamptz,
  ADD COLUMN IF NOT EXISTS erro text;

DO $$ BEGIN
  ALTER TABLE etiqueta_impressao ADD CONSTRAINT ck_etiqueta_alvo_unico
    CHECK (num_nonnulls(volume_id, palete_id) = 1) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS ix_etiqueta_impressao_palete ON etiqueta_impressao (palete_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_etiqueta_impressao_conferencia ON etiqueta_impressao (conferencia_id, criado_em DESC);

INSERT INTO config_chave (chave, categoria, descricao, schema_json)
VALUES (
  'tms_paletizacao_etiquetas',
  'tms',
  'Regras versionadas de recebimento, paletizacao, reimpressao e perfis de impressora.',
  '{"type":"object","required":["schemaVersion","timezone","unitizacoes","recebimento","reimpressao","etiqueta","offline"]}'::jsonb
)
ON CONFLICT (chave) DO UPDATE SET
  categoria = EXCLUDED.categoria,
  descricao = EXCLUDED.descricao,
  schema_json = EXCLUDED.schema_json,
  atualizado_em = now();

WITH chave AS (
  SELECT id FROM config_chave WHERE chave = 'tms_paletizacao_etiquetas'
), autor AS (
  SELECT id FROM usuario ORDER BY criado_em LIMIT 1
)
INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
SELECT chave.id, 1,
  '{
    "schemaVersion": 1,
    "timezone": "America/Sao_Paulo",
    "unitizacoes": [
      {"codigo":"MP","nome":"Multi-palete","descricao":"Uma carga distribuida em mais de um palete exclusivo.","ativo":true},
      {"codigo":"PD","nome":"Palete dedicado","descricao":"Uma carga inteira em um unico palete exclusivo.","ativo":true},
      {"codigo":"PC","nome":"Palete compartilhado","descricao":"Cargas ou NF/DC diferentes compartilham o mesmo palete.","ativo":true}
    ],
    "recebimento": {"exigirEvidencia":true,"minimoEvidencias":1,"permitirAvulsa":true},
    "reimpressao": {"somenteDiaOperacional":true,"exigirJustificativa":true},
    "etiqueta": {"copiasPadrao":1,"larguraMm":null,"alturaMm":null,"perfilImpressora":null,"protocolo":null},
    "offline": {"habilitado":true,"maximoPendencias":500}
  }'::jsonb,
  true, autor.id
FROM chave, autor
WHERE autor.id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM config_versao cv WHERE cv.chave_id = chave.id);

COMMIT;
