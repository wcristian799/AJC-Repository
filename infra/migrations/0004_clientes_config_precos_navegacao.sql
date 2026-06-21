-- =============================================================================
-- 0004_clientes_config_precos_navegacao.sql
-- Blocos: §4 Clientes/Agentes · §5 Config versionado · §6 Preços · §7 Navegação-core
-- Tabelas (ordem §15): agente(10), cliente(11), cliente_agente_historico(12),
--   config_chave(13), config_versao(14), tabela_preco(15), item_preco(16),
--   embarcacao(17), viagem(18), viagem_escala(19), posicao_embarcacao(20),
--   escala_colaborador(21)
-- NOTA: item_preco.embarcacao_id (§15 nota †) é dependência adiada: a coluna é
--       criada aqui SEM a FK; a constraint entra em 0007_constraints_adiadas.sql,
--       após embarcacao existir.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- agente  (§4.1) — 1 agente comercial por cidade
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agente (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                varchar(160) NOT NULL,
  cidade_sigla        varchar(4)   NOT NULL REFERENCES cidade(sigla),
  percentual_comissao numeric(5,2),                       -- 🔶 regras de comissão pendentes (diretoria)
  ativo               boolean     NOT NULL DEFAULT true,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now(),
  excluido_em         timestamptz NULL                    -- soft-delete
);
CREATE INDEX IF NOT EXISTS ix_agente_cidade_sigla ON agente (cidade_sigla);

DROP TRIGGER IF EXISTS trg_agente_atualizado_em ON agente;
CREATE TRIGGER trg_agente_atualizado_em BEFORE UPDATE ON agente
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- cliente  (§4.2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           tipo_pessoa  NOT NULL,                   -- PF/PJ
  nome           varchar(160) NOT NULL,
  cpf_cnpj       varchar(18),                             -- LGPD: acesso logado, mascarado em listas
  cidade_sigla   varchar(4)   REFERENCES cidade(sigla),
  agente_id      uuid         REFERENCES agente(id),      -- base da comissão/split
  contatos       jsonb        DEFAULT '[]'::jsonb,        -- [{tipo:whatsapp|email|tel, valor}]
  senha_hash     text,                                    -- autocadastro self-service (site/app)
  aceite_lgpd_em timestamptz,                             -- termos de uso/privacidade
  criado_por     uuid         REFERENCES usuario(id),
  atualizado_por uuid         REFERENCES usuario(id),
  criado_em      timestamptz  NOT NULL DEFAULT now(),
  atualizado_em  timestamptz  NOT NULL DEFAULT now(),
  excluido_em    timestamptz  NULL                        -- soft-delete
);
-- único parcial: CPF/CNPJ não duplica entre registros vivos
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_cpf_cnpj
  ON cliente (cpf_cnpj) WHERE cpf_cnpj IS NOT NULL AND excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS ix_cliente_agente_id    ON cliente (agente_id);
CREATE INDEX IF NOT EXISTS ix_cliente_cidade_sigla ON cliente (cidade_sigla);
CREATE INDEX IF NOT EXISTS ix_cliente_nome         ON cliente (nome);

DROP TRIGGER IF EXISTS trg_cliente_atualizado_em ON cliente;
CREATE TRIGGER trg_cliente_atualizado_em BEFORE UPDATE ON cliente
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- cliente_agente_historico  (§4.3) — append-only (sem atualizado_em/soft-delete)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente_agente_historico (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id         uuid        NOT NULL REFERENCES cliente(id),
  agente_anterior_id uuid        REFERENCES agente(id),
  agente_novo_id     uuid        NOT NULL REFERENCES agente(id),
  motivo             text,
  realocado_por      uuid        NOT NULL REFERENCES usuario(id),
  criado_em          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_cliente_agente_historico_cliente ON cliente_agente_historico (cliente_id);

-- ---------------------------------------------------------------------------
-- config_chave  (§5.1) — catálogo das chaves configuráveis
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config_chave (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave         varchar(120) NOT NULL,   -- ex.: termo_embarque, tolerancia_atraso, cores_pulseira…
  categoria     varchar(60),             -- termos, tolerancias, vendas, tms…
  descricao     text,
  schema_json   jsonb,                   -- JSON Schema de validação do valor
  ativo         boolean     NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_config_chave_chave ON config_chave (chave);

DROP TRIGGER IF EXISTS trg_config_chave_atualizado_em ON config_chave;
CREATE TRIGGER trg_config_chave_atualizado_em BEFORE UPDATE ON config_chave
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- config_versao  (§5.2) — valor versionado de cada chave
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config_versao (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_id      uuid        NOT NULL REFERENCES config_chave(id),
  versao        integer     NOT NULL,                     -- incremental por chave
  valor         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  vigente_desde timestamptz NOT NULL DEFAULT now(),
  vigente_ate   timestamptz,                              -- NULL = vigente
  ativo         boolean     NOT NULL DEFAULT true,
  autor_id      uuid        NOT NULL REFERENCES usuario(id),
  publicado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_config_versao_chave_versao ON config_versao (chave_id, versao);
-- exatamente uma versão ativa por chave
CREATE UNIQUE INDEX IF NOT EXISTS ux_config_versao_chave_ativo ON config_versao (chave_id) WHERE ativo;

-- ---------------------------------------------------------------------------
-- tabela_preco  (§6.1) — cabeçalho versionado; auto-ref origem_versao_id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tabela_preco (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                tipo_tabela_preco NOT NULL,         -- passagem / encomenda / carga
  versao              integer     NOT NULL,               -- incremental por tipo
  vigente_desde       timestamptz NOT NULL DEFAULT now(),
  vigente_ate         timestamptz,                        -- NULL = vigente
  ativo               boolean     NOT NULL DEFAULT true,
  motivo              varchar(160),                       -- "reajuste anual", "correção"
  percentual_reajuste numeric(5,2),                       -- preenchido em reajuste em massa (±X%)
  origem_versao_id    uuid        REFERENCES tabela_preco(id),  -- auto-ref: versão de origem
  criado_por          uuid        NOT NULL REFERENCES usuario(id),
  criado_em           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tabela_preco_tipo_versao ON tabela_preco (tipo, versao);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tabela_preco_tipo_ativo  ON tabela_preco (tipo) WHERE ativo;

-- ---------------------------------------------------------------------------
-- item_preco  (§6.2) — linhas da tabela
-- NOTA †: embarcacao_id criado SEM FK aqui; FK adicionada em 0007 (embarcacao só existe depois).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS item_preco (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_id     uuid        NOT NULL REFERENCES tabela_preco(id) ON DELETE CASCADE,
  classe        classe_passagem,                          -- só tipo=passagem
  subtipo       varchar(60),                              -- subtipo de camarote (ex.: Royal) 🔶
  tamanho       char(1),                                  -- P/M/G — só tipo=encomenda 🔶
  tier          varchar(40),                              -- tier de carga (= % de preço) — só tipo=carga
  origem_sigla  varchar(4)  REFERENCES cidade(sigla),     -- trecho origem
  destino_sigla varchar(4)  REFERENCES cidade(sigla),     -- trecho destino
  embarcacao_id uuid,                                     -- 🔶 FK p/ embarcacao(id) adicionada em 0007 (nota †)
  valor         numeric(12,2),                            -- preço absoluto
  percentual    numeric(5,2),                             -- quando o preço é % (carga tier; encomenda > R$1.000)
  criado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_item_preco_tabela ON item_preco (tabela_id);
CREATE INDEX IF NOT EXISTS ix_item_preco_tabela_classe_trecho ON item_preco (tabela_id, classe, origem_sigla, destino_sigla);

-- ---------------------------------------------------------------------------
-- embarcacao  (§7.1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embarcacao (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             varchar(120) NOT NULL,
  tipo             tipo_embarcacao   NOT NULL,            -- passeio_carga / carga
  capacidade_carga numeric(10,3),                         -- kg ou m³ (unidade no seed) 🔶
  capacidade_pax   jsonb        DEFAULT '{}'::jsonb,      -- {rede:N, rede_vip:N, camarote:N}
  status           status_embarcacao NOT NULL DEFAULT 'ativa',  -- ativa/manutencao/alugada
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),
  excluido_em      timestamptz NULL                       -- soft-delete
);

DROP TRIGGER IF EXISTS trg_embarcacao_atualizado_em ON embarcacao;
CREATE TRIGGER trg_embarcacao_atualizado_em BEFORE UPDATE ON embarcacao
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- viagem  (§7.2) — eixo central
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS viagem (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embarcacao_id    uuid        NOT NULL REFERENCES embarcacao(id),
  origem_sigla     varchar(4)  NOT NULL REFERENCES cidade(sigla),
  data_hora_saida  timestamptz NOT NULL,
  data_hora_retorno timestamptz,
  status           status_viagem   NOT NULL DEFAULT 'planejada',  -- planejada/em_curso/concluida
  situacao         situacao_viagem,                       -- no_prazo/atencao/atrasado (calculada)
  criado_por       uuid        REFERENCES usuario(id),
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_viagem_embarcacao_id   ON viagem (embarcacao_id);
CREATE INDEX IF NOT EXISTS ix_viagem_data_hora_saida ON viagem (data_hora_saida);
CREATE INDEX IF NOT EXISTS ix_viagem_status          ON viagem (status);

DROP TRIGGER IF EXISTS trg_viagem_atualizado_em ON viagem;
CREATE TRIGGER trg_viagem_atualizado_em BEFORE UPDATE ON viagem
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- viagem_escala  (§7.3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS viagem_escala (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id           uuid       NOT NULL REFERENCES viagem(id) ON DELETE CASCADE,
  cidade_sigla        varchar(4) NOT NULL REFERENCES cidade(sigla),
  ordem               smallint   NOT NULL,                -- sequência da escala
  data_hora_prevista  timestamptz,                        -- chegada prevista
  data_hora_real      timestamptz                         -- chegada real (alimenta situação)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_viagem_escala_viagem_ordem ON viagem_escala (viagem_id, ordem);
CREATE INDEX IF NOT EXISTS ix_viagem_escala_viagem ON viagem_escala (viagem_id);

-- ---------------------------------------------------------------------------
-- posicao_embarcacao  (§7.4) — resumo de GPS (não cada ping)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posicao_embarcacao (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embarcacao_id uuid        NOT NULL REFERENCES embarcacao(id),
  viagem_id     uuid        REFERENCES viagem(id),
  posicao       geography(Point,4326) NOT NULL,           -- PostGIS — lat/lng
  velocidade    numeric(6,2),                             -- nós/km/h
  capturado_em  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_posicao_embarcacao_posicao   ON posicao_embarcacao USING gist (posicao);
CREATE INDEX IF NOT EXISTS ix_posicao_embarcacao_emb_capt  ON posicao_embarcacao (embarcacao_id, capturado_em);

-- ---------------------------------------------------------------------------
-- escala_colaborador  (§7.5)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS escala_colaborador (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid        NOT NULL REFERENCES colaborador(id),
  viagem_id      uuid        REFERENCES viagem(id),       -- ou período
  periodo_inicio timestamptz,                             -- escala por período quando não há viagem fixa
  periodo_fim    timestamptz,
  funcao         varchar(60),                             -- função na viagem
  status         status_escala NOT NULL DEFAULT 'planejada',  -- planejada/notificada/confirmada/cancelada
  notificado_em  timestamptz,                             -- WhatsApp 🔶 provedor
  confirmado_em  timestamptz,                             -- confirmação de recebimento
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_escala_colaborador_colab_viagem ON escala_colaborador (colaborador_id, viagem_id);

DROP TRIGGER IF EXISTS trg_escala_colaborador_atualizado_em ON escala_colaborador;
CREATE TRIGGER trg_escala_colaborador_atualizado_em BEFORE UPDATE ON escala_colaborador
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

COMMIT;
