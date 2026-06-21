-- =============================================================================
-- 0005_tms.sql
-- Bloco: §8 TMS / Carga (coração do antifraude, offline-first)
-- Tabelas (ordem §15): palete(22), carga(23), carga_recebimento(24), volume(25),
--   evento_volume(26), palete_viagem(27), documento_fiscal(28),
--   declaracao_conteudo(29), registro_portaria(30), entrega_comprovante(31),
--   entrega_volume(32), prestacao_contas(33)
-- Sync (§12): client_uuid + índice único parcial em carga, carga_recebimento,
--   volume, evento_volume, registro_portaria, entrega_comprovante.
-- 🔶 palete.terceiro_id: dono terceiro pode ser cliente OU fornecedor — decisão
--    técnica pendente; coluna fica SEM FK (uuid solto) por ser polimórfica. -- NOTA
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- palete  (§8.4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS palete (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        varchar(40) NOT NULL,                     -- impresso na etiqueta
  proprietario  proprietario_palete NOT NULL DEFAULT 'AJC',  -- AJC / terceiro
  terceiro_id   uuid,                                     -- 🔶 cliente(id) OU fornecedor(id) — polimórfico, sem FK -- NOTA
  status        status_palete NOT NULL DEFAULT 'livre',   -- livre/alocado/em_transito
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  excluido_em   timestamptz NULL                          -- soft-delete
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_palete_codigo ON palete (codigo);

DROP TRIGGER IF EXISTS trg_palete_atualizado_em ON palete;
CREATE TRIGGER trg_palete_atualizado_em BEFORE UPDATE ON palete
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- carga  (§8.1) — sync: client_uuid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carga (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id            uuid        NOT NULL REFERENCES viagem(id),
  cliente_remetente_id uuid        NOT NULL REFERENCES cliente(id),
  destinatario_id      uuid        REFERENCES cliente(id),
  destinatario_nome    varchar(160),                      -- quando não é cliente cadastrado
  cidade_destino_sigla varchar(4)  NOT NULL REFERENCES cidade(sigla),
  tipo_recebimento     tipo_recebimento_carga NOT NULL,   -- porto_balsa / direto (cross-docking)
  status               status_carga NOT NULL DEFAULT 'aberta',
  valor_declarado      numeric(12,2),
  valor_cobrado        numeric(12,2),                      -- preço aplicado (snapshot)
  item_preco_id        uuid        REFERENCES item_preco(id),  -- 🔶 preço de carga
  agente_id            uuid        REFERENCES agente(id),  -- quem agenciou (comissão)
  client_uuid          uuid,                               -- sync
  criado_por           uuid        REFERENCES usuario(id),
  atualizado_por       uuid        REFERENCES usuario(id),
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_carga_viagem            ON carga (viagem_id);
CREATE INDEX IF NOT EXISTS ix_carga_cliente_remetente ON carga (cliente_remetente_id);
CREATE INDEX IF NOT EXISTS ix_carga_cidade_destino    ON carga (cidade_destino_sigla);
CREATE INDEX IF NOT EXISTS ix_carga_status            ON carga (status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_carga_client_uuid ON carga (client_uuid) WHERE client_uuid IS NOT NULL;

DROP TRIGGER IF EXISTS trg_carga_atualizado_em ON carga;
CREATE TRIGGER trg_carga_atualizado_em BEFORE UPDATE ON carga
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- carga_recebimento  (§8.6) — lotes do cross-docking · sync: client_uuid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carga_recebimento (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id     uuid        NOT NULL REFERENCES viagem(id),
  carga_id      uuid        REFERENCES carga(id),
  ordem         smallint    NOT NULL,                     -- Recebimento 1, 2, 3…
  conferente_id uuid        NOT NULL REFERENCES usuario(id),  -- porto OU balsa (auditoria)
  foto_url      text,                                     -- foto obrigatória do lote (storage)
  foto_hash     varchar(64),
  client_uuid   uuid,                                     -- sync
  criado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_carga_recebimento_viagem_ordem ON carga_recebimento (viagem_id, ordem);
CREATE UNIQUE INDEX IF NOT EXISTS ux_carga_recebimento_client_uuid ON carga_recebimento (client_uuid) WHERE client_uuid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- volume  (§8.2) — UUID = identidade física (QR) · sync: client_uuid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS volume (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- é o UUID impresso no QR da etiqueta
  carga_id       uuid        NOT NULL REFERENCES carga(id) ON DELETE CASCADE,
  palete_id      uuid        REFERENCES palete(id),
  indice_volume  smallint    NOT NULL,                    -- ex.: 1 de "1/2"
  total_volumes  smallint    NOT NULL,                    -- ex.: 2 de "1/2"
  peso           numeric(10,3),                            -- kg
  status         status_volume NOT NULL DEFAULT 'recebido',
  recebimento_id uuid        REFERENCES carga_recebimento(id),  -- lote do cross-docking
  client_uuid    uuid,                                    -- sync
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_volume_carga  ON volume (carga_id);
CREATE INDEX IF NOT EXISTS ix_volume_palete ON volume (palete_id);
CREATE INDEX IF NOT EXISTS ix_volume_status ON volume (status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_volume_client_uuid ON volume (client_uuid) WHERE client_uuid IS NOT NULL;

DROP TRIGGER IF EXISTS trg_volume_atualizado_em ON volume;
CREATE TRIGGER trg_volume_atualizado_em BEFORE UPDATE ON volume
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- evento_volume  (§8.3) — append-only, trilha física · sync: client_uuid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evento_volume (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id   uuid        NOT NULL REFERENCES volume(id),
  tipo        tipo_evento_volume NOT NULL,
  usuario_id  uuid        NOT NULL REFERENCES usuario(id),  -- quem efetivou
  gps         geography(Point,4326),                      -- georreferência do evento
  foto_url    text,                                       -- referência ao storage (não o binário)
  foto_hash   varchar(64),
  obs         text,
  client_uuid uuid,                                        -- sync
  ocorrido_em timestamptz NOT NULL DEFAULT now(),          -- carimbo do dispositivo
  criado_em   timestamptz NOT NULL DEFAULT now()           -- recebido no servidor
);
CREATE INDEX IF NOT EXISTS ix_evento_volume_volume_ocorrido ON evento_volume (volume_id, ocorrido_em);
CREATE INDEX IF NOT EXISTS ix_evento_volume_tipo ON evento_volume (tipo);
CREATE UNIQUE INDEX IF NOT EXISTS ux_evento_volume_client_uuid ON evento_volume (client_uuid) WHERE client_uuid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- palete_viagem  (§8.5) — alocação palete↔viagem↔cidade
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS palete_viagem (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palete_id            uuid        NOT NULL REFERENCES palete(id),
  viagem_id            uuid        NOT NULL REFERENCES viagem(id),
  cidade_destino_sigla varchar(4)  NOT NULL REFERENCES cidade(sigla),
  alocado_em           timestamptz NOT NULL DEFAULT now()
);
-- NOTA: "um palete não pode estar em duas viagens ativas" é validado em serviço
-- (não há coluna de status de alocação na §8.5 p/ índice parcial determinístico).
CREATE INDEX IF NOT EXISTS ix_palete_viagem_palete ON palete_viagem (palete_id);
CREATE INDEX IF NOT EXISTS ix_palete_viagem_viagem ON palete_viagem (viagem_id);

-- ---------------------------------------------------------------------------
-- documento_fiscal  (§8.7) — NF-e/NFC-e/Declaração de Conteúdo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documento_fiscal (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          tipo_documento_fiscal NOT NULL,           -- NFe/NFCe/DC
  numero        varchar(60),                              -- número ou chave NF-e
  valor         numeric(12,2),
  cliente_id    uuid        REFERENCES cliente(id),
  carga_id      uuid        REFERENCES carga(id),
  arquivo_url   text,                                     -- PDF/foto no storage
  arquivo_hash  varchar(64),
  status        status_documento_fiscal NOT NULL DEFAULT 'pendente',  -- pendente/conferida/divergente
  lancado_por   uuid        REFERENCES usuario(id),       -- ADM Notas
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_documento_fiscal_carga  ON documento_fiscal (carga_id);
CREATE INDEX IF NOT EXISTS ix_documento_fiscal_status ON documento_fiscal (status);

DROP TRIGGER IF EXISTS trg_documento_fiscal_atualizado_em ON documento_fiscal;
CREATE TRIGGER trg_documento_fiscal_atualizado_em BEFORE UPDATE ON documento_fiscal
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- declaracao_conteudo  (§8.8) — termo + assinatura (carga 1──1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS declaracao_conteudo (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id                uuid        NOT NULL REFERENCES carga(id),
  valor_declarado         numeric(12,2),
  descricao_informada     text,                           -- conteúdo declarado
  config_termo_versao_id  uuid        REFERENCES config_versao(id),  -- versão do texto 🔶
  assinatura_url          text,                           -- imagem da assinatura no storage
  assinatura_hash         varchar(64),
  aceite_em               timestamptz,
  dispositivo             varchar(120),
  ip                      inet
);

-- ---------------------------------------------------------------------------
-- registro_portaria  (§8.9) — entrada/saída no porto · sync: client_uuid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registro_portaria (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa          varchar(10),                             -- veículos
  empresa        varchar(160),                            -- autocomplete
  motorista_nome varchar(160),
  tipo           tipo_registro_portaria NOT NULL,         -- veiculo_carga/veiculo_transporte/pessoa
  entrada_em     timestamptz NOT NULL DEFAULT now(),      -- carimbo do dispositivo
  saida_em       timestamptz,                             -- NULL = "no pátio"
  porteiro_id    uuid        NOT NULL REFERENCES usuario(id),
  foto_url       text,                                    -- storage
  client_uuid    uuid,                                    -- sync
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_registro_portaria_saida ON registro_portaria (saida_em);  -- lista "no pátio" = NULL
CREATE INDEX IF NOT EXISTS ix_registro_portaria_placa ON registro_portaria (placa);
CREATE UNIQUE INDEX IF NOT EXISTS ux_registro_portaria_client_uuid ON registro_portaria (client_uuid) WHERE client_uuid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- entrega_comprovante  (§8.10) — desembarque balsa→terra · sync: client_uuid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrega_comprovante (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id                   uuid        REFERENCES viagem(id),
  cidade_sigla                varchar(4)  NOT NULL REFERENCES cidade(sigla),
  recebedor_agente_id         uuid        REFERENCES agente(id),  -- agente de carga da cidade
  recebedor_nome              varchar(160),
  recebedor_doc               varchar(20),
  recebedor_avulso            boolean     NOT NULL DEFAULT false, -- true exige justificativa
  justificativa               text,                       -- quando não é o agente da cidade
  assinatura_url              text,                       -- assinatura em tela (storage)
  assinatura_hash             varchar(64),
  foto1_url                   text,                       -- 2 fotos obrigatórias (90°)
  foto2_url                   text,
  foto1_hash                  varchar(64),
  foto2_hash                  varchar(64),
  gps                         geography(Point,4326),
  protocolo                   varchar(40),                -- nº do protocolo digital gerado
  entregue_por_conferente_id  uuid        NOT NULL REFERENCES usuario(id),
  entregue_em                 timestamptz NOT NULL DEFAULT now(),
  client_uuid                 uuid                        -- sync
);
CREATE INDEX IF NOT EXISTS ix_entrega_comprovante_viagem ON entrega_comprovante (viagem_id);
CREATE INDEX IF NOT EXISTS ix_entrega_comprovante_cidade ON entrega_comprovante (cidade_sigla);
CREATE UNIQUE INDEX IF NOT EXISTS ux_entrega_comprovante_client_uuid ON entrega_comprovante (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_entrega_comprovante_protocolo ON entrega_comprovante (protocolo) WHERE protocolo IS NOT NULL;

-- ---------------------------------------------------------------------------
-- entrega_volume  (§8.11) — N:N comprovante↔volume
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrega_volume (
  entrega_id uuid NOT NULL REFERENCES entrega_comprovante(id) ON DELETE CASCADE,
  volume_id  uuid NOT NULL REFERENCES volume(id),
  PRIMARY KEY (entrega_id, volume_id)
);

-- ---------------------------------------------------------------------------
-- prestacao_contas  (§8.12) — gerente da embarcação
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prestacao_contas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id       uuid        NOT NULL REFERENCES viagem(id),
  gerente_id      uuid        NOT NULL REFERENCES usuario(id),
  total_declarado numeric(12,2),                          -- lançado pelo gerente
  total_sistema   numeric(12,2),                          -- calculado
  divergencia     numeric(12,2),                          -- declarado − sistema
  status          status_prestacao NOT NULL DEFAULT 'rascunho',  -- rascunho/enviada/conferida
  itens           jsonb       DEFAULT '[]'::jsonb,        -- receitas/despesas 🔶 modelo a digitalizar
  anexos          jsonb       DEFAULT '[]'::jsonb,        -- [{url,hash}] fotos/comprovantes
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_prestacao_contas_viagem ON prestacao_contas (viagem_id);
CREATE INDEX IF NOT EXISTS ix_prestacao_contas_status ON prestacao_contas (status);

DROP TRIGGER IF EXISTS trg_prestacao_contas_atualizado_em ON prestacao_contas;
CREATE TRIGGER trg_prestacao_contas_atualizado_em BEFORE UPDATE ON prestacao_contas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

COMMIT;
