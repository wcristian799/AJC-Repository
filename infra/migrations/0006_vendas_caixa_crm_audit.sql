-- =============================================================================
-- 0006_vendas_caixa_crm_audit.sql
-- Blocos: §9 Vendas/Passagens · §9.6-9.7 Caixa · §10 CRM · §11 Auditoria
-- Tabelas (ordem §15): caixa(34), bilhete(35), caixa_movimento(36), cortesia(37),
--   gratuidade(38), termo_aceite(39), nps(40), cotacao(41), audit_evento(42)
-- NOTA †: bilhete.caixa_movimento_id ↔ caixa_movimento.bilhete_id é circular.
--   bilhete é criado SEM a FK caixa_movimento_id (coluna uuid solta); a FK entra
--   em 0007_constraints_adiadas.sql. caixa_movimento.bilhete_id já recebe FK aqui
--   (bilhete existe neste ponto).
-- Sync (§12): client_uuid + único parcial em bilhete, caixa_movimento, audit_evento.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- caixa  (§9.6)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caixa (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id      uuid        NOT NULL REFERENCES usuario(id),
  aberto_em        timestamptz NOT NULL DEFAULT now(),
  fechado_em       timestamptz,
  valor_abertura   numeric(12,2) NOT NULL DEFAULT 0,
  valor_fechamento numeric(12,2),
  status           status_caixa  NOT NULL DEFAULT 'aberto'  -- aberto/fechado
);
CREATE INDEX IF NOT EXISTS ix_caixa_operador_status ON caixa (operador_id, status);

-- ---------------------------------------------------------------------------
-- bilhete  (§9.1) — QR único por passageiro/viagem · sync: client_uuid
-- NOTA †: caixa_movimento_id criado SEM FK; constraint em 0007.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bilhete (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id          uuid        NOT NULL REFERENCES viagem(id),
  cliente_id         uuid        REFERENCES cliente(id),  -- venda avulsa pode não ter
  passageiro_nome    varchar(160),                        -- quando avulso
  classe             classe_passagem NOT NULL,            -- rede/rede_vip/camarote
  subtipo            varchar(60),                          -- subtipo de camarote (Royal…) 🔶
  tipo               tipo_bilhete    NOT NULL,             -- online/pdv/totem/contrato/cortesia/gratuidade
  item_preco_id      uuid        REFERENCES item_preco(id),  -- tarifa aplicada
  preco_pago         numeric(12,2),                        -- snapshot; 0 em cortesia/gratuidade
  qr_token           varchar(120) NOT NULL,                -- token assinado, não sequencial, único
  status             status_bilhete NOT NULL DEFAULT 'emitido',  -- emitido→validado→usado; cancelado/reembolsado
  validado_em        timestamptz,                          -- embarque
  validado_por       uuid        REFERENCES usuario(id),   -- bilheteiro
  validado_gps       geography(Point,4326),                -- local da 1ª validação
  caixa_movimento_id uuid,                                 -- 🔶 FK p/ caixa_movimento(id) adicionada em 0007 (nota †)
  client_uuid        uuid,                                 -- sync (validação offline)
  criado_por         uuid        REFERENCES usuario(id),
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bilhete_qr_token ON bilhete (qr_token);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bilhete_client_uuid ON bilhete (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_bilhete_viagem_classe ON bilhete (viagem_id, classe);  -- contador embarcados/capacidade
CREATE INDEX IF NOT EXISTS ix_bilhete_cliente ON bilhete (cliente_id);
CREATE INDEX IF NOT EXISTS ix_bilhete_status  ON bilhete (status);

DROP TRIGGER IF EXISTS trg_bilhete_atualizado_em ON bilhete;
CREATE TRIGGER trg_bilhete_atualizado_em BEFORE UPDATE ON bilhete
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- caixa_movimento  (§9.7) — registra venda/despacho · sync: client_uuid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caixa_movimento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id        uuid        NOT NULL REFERENCES caixa(id),
  tipo            tipo_movimento_caixa NOT NULL,          -- venda_passagem/despacho_carga/sangria/suprimento/outro
  forma_pagamento forma_pagamento,                        -- dinheiro/pix/cartão/contrato/cortesia/gratuidade
  valor           numeric(12,2) NOT NULL,
  bilhete_id      uuid        REFERENCES bilhete(id),
  carga_id        uuid        REFERENCES carga(id),       -- despacho
  criado_por      uuid        NOT NULL REFERENCES usuario(id),
  client_uuid     uuid,                                   -- sync (PDV offline)
  criado_em       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_caixa_movimento_caixa ON caixa_movimento (caixa_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_caixa_movimento_client_uuid ON caixa_movimento (client_uuid) WHERE client_uuid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- cortesia  (§9.2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cortesia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        varchar(40) NOT NULL,                     -- gerado
  viagem_id     uuid        NOT NULL REFERENCES viagem(id),
  classe        classe_passagem,
  motivo        text,                                     -- influência/relacionamento
  concedido_por uuid        NOT NULL REFERENCES usuario(id),
  bilhete_id    uuid        REFERENCES bilhete(id),       -- quando consumida
  criado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cortesia_codigo ON cortesia (codigo);
CREATE INDEX IF NOT EXISTS ix_cortesia_viagem ON cortesia (viagem_id);

-- ---------------------------------------------------------------------------
-- gratuidade  (§9.3) — relatório regulatório
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gratuidade (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bilhete_id     uuid        NOT NULL REFERENCES bilhete(id),
  tipo_legal     tipo_gratuidade NOT NULL,                -- idoso/pcd/… 🔶 lista legal
  documento_url  text,                                    -- comprovante no storage
  documento_hash varchar(64),
  registrado_por uuid        NOT NULL REFERENCES usuario(id),
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- termo_aceite  (§9.4) — aceite de embarque
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS termo_aceite (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bilhete_id             uuid        NOT NULL REFERENCES bilhete(id),
  config_termo_versao_id uuid        REFERENCES config_versao(id),  -- versão do texto 🔶
  aceito_em              timestamptz NOT NULL,
  ip                     inet,
  dispositivo            varchar(120)
);

-- ---------------------------------------------------------------------------
-- nps  (§9.5) — pesquisa pós-viagem
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id     uuid        NOT NULL REFERENCES viagem(id),
  cliente_id    uuid        REFERENCES cliente(id),
  nota          smallint    CHECK (nota BETWEEN 0 AND 10),  -- 0–10
  comentario    text,
  respondido_em timestamptz,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- cotacao  (§10.1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cotacao (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                 tipo_cotacao NOT NULL,             -- encomenda/carga/veiculo
  cliente_id           uuid        NOT NULL REFERENCES cliente(id),
  agente_id            uuid        REFERENCES agente(id), -- comissão
  origem_sigla         varchar(4)  REFERENCES cidade(sigla),  -- trecho
  destino_sigla        varchar(4)  REFERENCES cidade(sigla),
  parametros           jsonb       DEFAULT '{}'::jsonb,   -- tamanho/peso/tier conforme tipo
  valor_estimado       numeric(12,2),                     -- carga/veículo tabela pronta; encomenda 🔶
  validade             timestamptz,
  status               status_cotacao NOT NULL DEFAULT 'aberta',  -- aberta/convertida/expirada
  convertida_carga_id  uuid        REFERENCES carga(id),  -- quando vira despacho
  criado_por           uuid        REFERENCES usuario(id),
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_cotacao_cliente ON cotacao (cliente_id);
CREATE INDEX IF NOT EXISTS ix_cotacao_agente  ON cotacao (agente_id);
CREATE INDEX IF NOT EXISTS ix_cotacao_status  ON cotacao (status);

DROP TRIGGER IF EXISTS trg_cotacao_atualizado_em ON cotacao;
CREATE TRIGGER trg_cotacao_atualizado_em BEFORE UPDATE ON cotacao
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- audit_evento  (§11.1) — append-only, transversal · sync: client_uuid
-- IMUTÁVEL: sem trigger de UPDATE e sem soft-delete (append-only).
--
--   >>> AÇÃO EM PRODUÇÃO (não automatizada aqui): revogar UPDATE/DELETE por role. <<<
--   Ex.: a aplicação conecta com um role que só pode INSERT/SELECT nesta tabela:
--       REVOKE UPDATE, DELETE ON audit_evento FROM <app_role>;
--       GRANT  INSERT, SELECT ON audit_evento TO <app_role>;
--   Imutabilidade reforçada por permissão de role do banco + ausência de trigger
--   de update (§11.1).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_evento (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade     varchar(60) NOT NULL,                      -- nome da tabela/agregado
  entidade_id  uuid,                                      -- id do registro afetado
  acao         acao_audit  NOT NULL,                      -- criar/atualizar/…/reajuste_preco
  usuario_id   uuid        REFERENCES usuario(id),        -- quem
  perfil       varchar(60),                               -- perfil no momento (snapshot)
  ocorrido_em  timestamptz NOT NULL DEFAULT now(),        -- quando
  dispositivo  varchar(120),                              -- onde (device de campo)
  gps          geography(Point,4326),                     -- onde (geo)
  dados_antes  jsonb,                                     -- estado anterior
  dados_depois jsonb,                                     -- estado novo
  client_uuid  uuid                                       -- sync (eventos offline)
);
CREATE INDEX IF NOT EXISTS ix_audit_evento_entidade ON audit_evento (entidade, entidade_id);
CREATE INDEX IF NOT EXISTS ix_audit_evento_usuario  ON audit_evento (usuario_id, ocorrido_em);
CREATE INDEX IF NOT EXISTS ix_audit_evento_acao     ON audit_evento (acao);
CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_evento_client_uuid ON audit_evento (client_uuid) WHERE client_uuid IS NOT NULL;

COMMIT;
