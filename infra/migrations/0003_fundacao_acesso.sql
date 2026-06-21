-- =============================================================================
-- 0003_fundacao_acesso.sql
-- Bloco: §2.1 cidade · §3 Fundação/Acesso
-- Tabelas (ordem §15): cidade(2), perfil(3), permissao(4), perfil_permissao(5),
--                      colaborador(6), usuario(7), sessao(8), fornecedor(9)
-- Convenções §1.1: PK uuid gen_random_uuid(); criado_em/atualizado_em timestamptz;
--                  soft-delete (excluido_em) em mestres; auditoria criado_por/atualizado_por.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Função de trigger compartilhada: mantém atualizado_em = now() em UPDATE.
-- Usada por todas as tabelas que possuem a coluna atualizado_em (§1.1).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- cidade  (§2.1) — domínio editável (tabela, não enum)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cidade (
  sigla   varchar(4)  PRIMARY KEY,
  nome    varchar(120) NOT NULL,
  uf      char(2)      NOT NULL DEFAULT 'PA',
  is_base boolean      NOT NULL DEFAULT false,  -- Belém = base/origem
  ativo   boolean      NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------------
-- perfil  (§3.1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfil (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          varchar(60) NOT NULL,
  descricao     text,
  ativo         boolean     NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_perfil_nome ON perfil (nome);

DROP TRIGGER IF EXISTS trg_perfil_atualizado_em ON perfil;
CREATE TRIGGER trg_perfil_atualizado_em BEFORE UPDATE ON perfil
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- permissao  (§3.2) — catálogo de ações RBAC (modulo.acao)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissao (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo    varchar(40) NOT NULL,  -- tms, vendas, crm, precos, cadastros, navegacao, caixa…
  acao      varchar(40) NOT NULL,  -- criar, editar, validar, conferir, entregar, reajustar…
  descricao text
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_permissao_modulo_acao ON permissao (modulo, acao);

-- ---------------------------------------------------------------------------
-- perfil_permissao  (§3.3) — matriz N:N perfil × permissão
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfil_permissao (
  perfil_id    uuid NOT NULL REFERENCES perfil(id)    ON DELETE CASCADE,
  permissao_id uuid NOT NULL REFERENCES permissao(id) ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, permissao_id)
);

-- ---------------------------------------------------------------------------
-- colaborador  (§3.7)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS colaborador (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              varchar(160) NOT NULL,
  funcao            varchar(60),                          -- conferente, porteiro, bilheteiro, gerente…
  cidade_sigla      varchar(4) REFERENCES cidade(sigla),
  contato_whatsapp  varchar(20),                          -- usado na notificação de escala
  ativo             boolean     NOT NULL DEFAULT true,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  excluido_em       timestamptz NULL                      -- soft-delete
);

DROP TRIGGER IF EXISTS trg_colaborador_atualizado_em ON colaborador;
CREATE TRIGGER trg_colaborador_atualizado_em BEFORE UPDATE ON colaborador
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- usuario  (§3.4) — auto-ref em criado_por/atualizado_por
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            varchar(160) NOT NULL,
  login           varchar(60)  NOT NULL,
  email           varchar(160),
  senha_hash      text         NOT NULL,                  -- argon2/bcrypt; nunca texto puro
  perfil_id       uuid         NOT NULL REFERENCES perfil(id),
  colaborador_id  uuid         REFERENCES colaborador(id),-- operador de campo ligado a colaborador
  ativo           boolean      NOT NULL DEFAULT true,
  ultimo_login_em timestamptz,
  criado_por      uuid         REFERENCES usuario(id),    -- auto-ref
  atualizado_por  uuid         REFERENCES usuario(id),    -- auto-ref
  criado_em       timestamptz  NOT NULL DEFAULT now(),
  atualizado_em   timestamptz  NOT NULL DEFAULT now(),
  excluido_em     timestamptz  NULL                       -- soft-delete
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_login ON usuario (login);
CREATE INDEX IF NOT EXISTS ix_usuario_perfil_id ON usuario (perfil_id);

DROP TRIGGER IF EXISTS trg_usuario_atualizado_em ON usuario;
CREATE TRIGGER trg_usuario_atualizado_em BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- sessao  (§3.5) — sessões/refresh; suporta login offline dos apps de campo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessao (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid        NOT NULL REFERENCES usuario(id),
  dispositivo  varchar(120),                              -- id do device de campo
  refresh_hash text        NOT NULL,
  expira_em    timestamptz NOT NULL,                      -- sessão longa + PIN no campo
  revogada_em  timestamptz,
  criado_em    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_sessao_usuario_id ON sessao (usuario_id);
CREATE INDEX IF NOT EXISTS ix_sessao_expira_em  ON sessao (expira_em);

-- ---------------------------------------------------------------------------
-- fornecedor  (§3.6) — gancho p/ Financeiro (fase posterior)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fornecedor (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            varchar(160) NOT NULL,
  cnpj            varchar(18),
  categoria       varchar(60),
  contatos        jsonb,                                  -- [{tipo,valor}]
  dados_bancarios jsonb,                                  -- 🔶 usado por contas a pagar — fase posterior
  ativo           boolean     NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  excluido_em     timestamptz NULL                        -- soft-delete
);

DROP TRIGGER IF EXISTS trg_fornecedor_atualizado_em ON fornecedor;
CREATE TRIGGER trg_fornecedor_atualizado_em BEFORE UPDATE ON fornecedor
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

COMMIT;
