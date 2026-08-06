-- 0040_financeiro_operacional_completo.sql
-- Etapa 11: AP/AR, plano de contas, centros de custo, comissoes e faturas.
-- Sem apagar o nucleo minimo da migration 0015; registros legados permanecem validos.
BEGIN;

CREATE TABLE IF NOT EXISTS financeiro_plano_conta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(30) NOT NULL,
  nome varchar(160) NOT NULL,
  natureza varchar(20) NOT NULL CHECK (natureza IN ('receita','despesa','ativo','passivo','patrimonio')),
  conta_pai_id uuid REFERENCES financeiro_plano_conta(id),
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES usuario(id),
  atualizado_por uuid REFERENCES usuario(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  excluido_em timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_plano_conta_codigo ON financeiro_plano_conta (codigo) WHERE excluido_em IS NULL;
DROP TRIGGER IF EXISTS trg_fin_plano_conta_atualizado_em ON financeiro_plano_conta;
CREATE TRIGGER trg_fin_plano_conta_atualizado_em BEFORE UPDATE ON financeiro_plano_conta FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS financeiro_centro_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(30) NOT NULL,
  nome varchar(160) NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES usuario(id),
  atualizado_por uuid REFERENCES usuario(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  excluido_em timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_centro_custo_codigo ON financeiro_centro_custo (codigo) WHERE excluido_em IS NULL;
DROP TRIGGER IF EXISTS trg_fin_centro_custo_atualizado_em ON financeiro_centro_custo;
CREATE TRIGGER trg_fin_centro_custo_atualizado_em BEFORE UPDATE ON financeiro_centro_custo FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

ALTER TABLE financeiro_titulo
  ADD COLUMN IF NOT EXISTS competencia date,
  ADD COLUMN IF NOT EXISTS pago_em timestamptz,
  ADD COLUMN IF NOT EXISTS liquidado_por uuid REFERENCES usuario(id),
  ADD COLUMN IF NOT EXISTS plano_conta_id uuid REFERENCES financeiro_plano_conta(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES financeiro_centro_custo(id),
  ADD COLUMN IF NOT EXISTS viagem_id uuid REFERENCES viagem(id),
  ADD COLUMN IF NOT EXISTS documento_nome varchar(240),
  ADD COLUMN IF NOT EXISTS documento_url text,
  ADD COLUMN IF NOT EXISTS documento_hash varchar(128),
  ADD COLUMN IF NOT EXISTS parcela_numero integer,
  ADD COLUMN IF NOT EXISTS parcelas_total integer,
  ADD COLUMN IF NOT EXISTS valor_liquidado numeric(12,2) NOT NULL DEFAULT 0;
UPDATE financeiro_titulo SET competencia = vencimento WHERE competencia IS NULL;
CREATE INDEX IF NOT EXISTS ix_fin_titulo_competencia ON financeiro_titulo (competencia) WHERE excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS ix_fin_titulo_liquidacao ON financeiro_titulo (pago_em) WHERE excluido_em IS NULL;

CREATE TABLE IF NOT EXISTS financeiro_titulo_liquidacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_id uuid NOT NULL REFERENCES financeiro_titulo(id),
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  data_liquidacao timestamptz NOT NULL DEFAULT now(),
  forma_pagamento forma_pagamento,
  caixa_movimento_id uuid REFERENCES caixa_movimento(id),
  observacao text,
  usuario_id uuid REFERENCES usuario(id),
  client_uuid uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_titulo_liquidacao_client_uuid ON financeiro_titulo_liquidacao (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_fin_titulo_liquidacao_titulo ON financeiro_titulo_liquidacao (titulo_id, data_liquidacao DESC);

CREATE TABLE IF NOT EXISTS financeiro_titulo_evento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_id uuid NOT NULL REFERENCES financeiro_titulo(id),
  status_anterior varchar(30),
  status_novo varchar(30) NOT NULL,
  valor_movimento numeric(12,2),
  observacao text,
  usuario_id uuid REFERENCES usuario(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_fin_titulo_evento_titulo ON financeiro_titulo_evento (titulo_id, criado_em DESC);

DO $$ BEGIN
  CREATE TYPE status_comissao_financeira AS ENUM ('em_aberto','liberada','pago','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS financeiro_comissao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id uuid NOT NULL REFERENCES agente(id),
  viagem_id uuid REFERENCES viagem(id),
  titulo_receber_id uuid REFERENCES financeiro_titulo(id),
  titulo_pagar_id uuid REFERENCES financeiro_titulo(id),
  base_valor numeric(12,2) NOT NULL CHECK (base_valor >= 0),
  percentual numeric(7,4) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  status status_comissao_financeira NOT NULL DEFAULT 'em_aberto',
  aberta_em timestamptz NOT NULL DEFAULT now(),
  liberada_em timestamptz,
  paga_em timestamptz,
  cancelada_em timestamptz,
  criado_por uuid REFERENCES usuario(id),
  atualizado_por uuid REFERENCES usuario(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  client_uuid uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_comissao_client_uuid ON financeiro_comissao (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_comissao_titulo ON financeiro_comissao (titulo_receber_id, agente_id) WHERE titulo_receber_id IS NOT NULL AND status <> 'cancelada';
DROP TRIGGER IF EXISTS trg_fin_comissao_atualizado_em ON financeiro_comissao;
CREATE TRIGGER trg_fin_comissao_atualizado_em BEFORE UPDATE ON financeiro_comissao FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS financeiro_fatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo varchar(20) NOT NULL CHECK (tipo IN ('emitida','recebida')),
  cnpj_emitente varchar(18),
  cnpj_destinatario varchar(18),
  numero varchar(80),
  chave_acesso varchar(80),
  emissao date,
  vencimento date,
  valor numeric(12,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  status varchar(30) NOT NULL DEFAULT 'pendente',
  titulo_id uuid REFERENCES financeiro_titulo(id),
  arquivo_url text,
  arquivo_hash varchar(128),
  observacao text,
  criado_por uuid REFERENCES usuario(id),
  atualizado_por uuid REFERENCES usuario(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  excluido_em timestamptz,
  client_uuid uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_fatura_client_uuid ON financeiro_fatura (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_fin_fatura_status ON financeiro_fatura (status) WHERE excluido_em IS NULL;
DROP TRIGGER IF EXISTS trg_fin_fatura_atualizado_em ON financeiro_fatura;
CREATE TRIGGER trg_fin_fatura_atualizado_em BEFORE UPDATE ON financeiro_fatura FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

INSERT INTO config_chave (chave, categoria, descricao)
VALUES ('financeiro_operacao', 'financeiro', 'Plano de contas, centros de custo, comissoes e regras financeiras')
ON CONFLICT (chave) DO NOTHING;
INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
SELECT c.id, 1, '{"schemaVersion":1,"comissoes":{"base":"recebido","status":["em_aberto","liberada","pago"],"permitirRepasseManual":true},"dre":{"modo":"caixa","periodicidade":"mensal"},"faturas":{"rastreamento":"interno","provedor":null},"categorias":[]}'::jsonb, true, (SELECT id FROM usuario WHERE ativo = true ORDER BY criado_em LIMIT 1)
FROM config_chave c
WHERE c.chave = 'financeiro_operacao'
  AND NOT EXISTS (SELECT 1 FROM config_versao v WHERE v.chave_id = c.id);

INSERT INTO permissao (modulo, acao, descricao) VALUES
  ('financeiro','ver','Visualizar o financeiro'),
  ('financeiro','lancar','Criar e editar titulos financeiros'),
  ('financeiro','baixar','Liquidar e estornar titulos'),
  ('financeiro','configurar','Configurar plano, centros e regras financeiras'),
  ('financeiro','comissao_liberar','Liberar comissoes apos recebimento'),
  ('financeiro','comissao_pagar','Registrar repasse de comissoes'),
  ('financeiro','dre_ver','Visualizar DRE'),
  ('financeiro','fatura_ver','Visualizar faturas'),
  ('financeiro','fatura_lancar','Registrar faturas')
ON CONFLICT (modulo, acao) DO NOTHING;

INSERT INTO perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pe.id
FROM perfil p CROSS JOIN permissao pe
WHERE lower(p.nome) = 'administrador' AND pe.modulo = 'financeiro'
ON CONFLICT DO NOTHING;

COMMIT;
