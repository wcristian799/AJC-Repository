-- =============================================================================
-- 0009_veiculos_maquinas.sql
-- Bloco: §16 gancho "Veículos/Máquinas (RF-5)" — promovido a MVP pela validação
-- do cliente (docs/feedback/2026-06-25-validacao-core-telas.md) e detalhado no
-- front já aprovado (apps/web-console/src/components/ops/tms/VeiculosTab.tsx).
--
-- Modela o fluxo real: cadastro por PDV/Comercial/Gerente do Porto → vistoria
-- com fotos obrigatórias → etiqueta Bluetooth → bipe de subida → em trânsito →
-- bipe de descida → checklist de entrega + assinatura (termo de aceite).
--
-- Espelha os padrões do TMS (0005): soft-delete, triggers set_atualizado_em,
-- client_uuid para sync offline-first, prova fotográfica com hash, log de eventos
-- imutável (mesma ideia de evento_volume).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Enums do domínio
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE tipo_envio_veiculo   AS ENUM ('veiculo','maquina'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE origem_cadastro_envio AS ENUM ('pdv','comercial','gerente_porto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Estados observados no front: vistoria → embarque → (em_transito) → entrega → entregue.
-- rascunho e cancelada completam a máquina de estados.
DO $$ BEGIN CREATE TYPE status_envio_veiculo AS ENUM ('rascunho','vistoria','embarque','em_transito','entrega','entregue','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Etapa da prova fotográfica: no envio (origem) e na entrega (destino).
DO $$ BEGIN CREATE TYPE etapa_foto_envio     AS ENUM ('vistoria','entrega'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Log imutável de eventos (antifraude/auditoria), espelha tipo_evento_volume.
DO $$ BEGIN CREATE TYPE tipo_evento_envio_veiculo AS ENUM ('cadastrado','vistoriado','etiquetado','bipe_subida','bipe_descida','entregue','divergencia','cancelado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- envio_veiculo — a "carga" de um veículo/máquina · sync: client_uuid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS envio_veiculo (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo               varchar(40) NOT NULL,                    -- VEI-001 (impresso/etiqueta)
  tipo                 tipo_envio_veiculo NOT NULL,             -- veiculo / maquina
  viagem_id            uuid        REFERENCES viagem(id),       -- nullable: cadastro pode preceder a viagem
  origem_cadastro      origem_cadastro_envio NOT NULL,          -- pdv / comercial / gerente_porto
  status               status_envio_veiculo  NOT NULL DEFAULT 'rascunho',

  -- Identificação do bem. Placa obrigatória p/ veículo é regra de negócio
  -- (constraint abaixo); máquina usa identificação operacional livre.
  placa                varchar(10),
  modelo               varchar(120) NOT NULL,                   -- "Hilux SW4", "Retroescavadeira"

  -- Remetente/destinatário: cliente cadastrado OU dados avulsos (como carga).
  remetente_cliente_id     uuid    REFERENCES cliente(id),
  remetente_nome           varchar(160),
  remetente_documento      varchar(20),
  remetente_telefone       varchar(20),
  destinatario_cliente_id  uuid    REFERENCES cliente(id),
  destinatario_nome        varchar(160),
  destinatario_documento   varchar(20),
  destinatario_telefone    varchar(20),

  cidade_origem_sigla  varchar(4)  REFERENCES cidade(sigla),
  cidade_destino_sigla varchar(4)  REFERENCES cidade(sigla),

  -- Frete: snapshot do valor cobrado + gancho de preço/agente (comissão).
  valor_frete          numeric(12,2),
  item_preco_id        uuid        REFERENCES item_preco(id),
  agente_id            uuid        REFERENCES agente(id),

  -- Termo de aceite (entrega): texto versionado vive em config; aqui só a prova.
  termo_aceite_versao  varchar(40),
  termo_aceite_em      timestamptz,

  client_uuid          uuid,                                    -- sync offline
  criado_por           uuid        REFERENCES usuario(id),
  atualizado_por       uuid        REFERENCES usuario(id),
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now(),
  excluido_em          timestamptz NULL,                        -- soft-delete

  -- Regra: veículo exige placa; máquina não.
  CONSTRAINT ck_envio_veiculo_placa
    CHECK (tipo <> 'veiculo' OR (placa IS NOT NULL AND length(btrim(placa)) > 0))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_envio_veiculo_codigo       ON envio_veiculo (codigo);
CREATE INDEX        IF NOT EXISTS ix_envio_veiculo_viagem        ON envio_veiculo (viagem_id);
CREATE INDEX        IF NOT EXISTS ix_envio_veiculo_status        ON envio_veiculo (status);
CREATE INDEX        IF NOT EXISTS ix_envio_veiculo_remetente     ON envio_veiculo (remetente_cliente_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_envio_veiculo_client_uuid   ON envio_veiculo (client_uuid) WHERE client_uuid IS NOT NULL;

DROP TRIGGER IF EXISTS trg_envio_veiculo_atualizado_em ON envio_veiculo;
CREATE TRIGGER trg_envio_veiculo_atualizado_em BEFORE UPDATE ON envio_veiculo
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- envio_veiculo_foto — prova fotográfica obrigatória (vistoria e entrega)
-- Espelha carga_recebimento.foto_url/foto_hash.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS envio_veiculo_foto (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envio_id       uuid        NOT NULL REFERENCES envio_veiculo(id) ON DELETE CASCADE,
  etapa          etapa_foto_envio NOT NULL,                     -- vistoria / entrega
  angulo         varchar(40) NOT NULL,                          -- frente/traseira/lateral_esq/lateral_dir/teto/interior...
  foto_url       text        NOT NULL,                          -- storage
  foto_hash      varchar(64),
  registrado_por uuid        REFERENCES usuario(id),
  client_uuid    uuid,                                          -- sync
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX        IF NOT EXISTS ix_envio_veiculo_foto_envio      ON envio_veiculo_foto (envio_id, etapa);
CREATE UNIQUE INDEX IF NOT EXISTS ux_envio_veiculo_foto_client_uuid ON envio_veiculo_foto (client_uuid) WHERE client_uuid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- envio_veiculo_evento — log imutável (etiqueta, bipes, checklist).
-- Espelha evento_volume: append-only, base do antifraude e da linha do tempo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS envio_veiculo_evento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envio_id       uuid        NOT NULL REFERENCES envio_veiculo(id) ON DELETE CASCADE,
  tipo           tipo_evento_envio_veiculo NOT NULL,
  etiqueta_codigo varchar(40),                                  -- quando tipo=etiquetado
  local_sigla    varchar(4)  REFERENCES cidade(sigla),          -- onde ocorreu o bipe
  observacao     text,
  registrado_por uuid        REFERENCES usuario(id),
  client_uuid    uuid,                                          -- sync
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX        IF NOT EXISTS ix_envio_veiculo_evento_envio      ON envio_veiculo_evento (envio_id, criado_em);
CREATE UNIQUE INDEX IF NOT EXISTS ux_envio_veiculo_evento_client_uuid ON envio_veiculo_evento (client_uuid) WHERE client_uuid IS NOT NULL;

COMMIT;
