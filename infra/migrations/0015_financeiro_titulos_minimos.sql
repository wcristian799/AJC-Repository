-- =============================================================================
-- 0015_financeiro_titulos_minimos.sql
-- Bloco: Financeiro minimo do MVP.
--
-- Financeiro completo, Compras, conciliacao e DRE seguem fase posterior. Esta
-- camada cobre apenas AP/AR operacional para substituir mocks aprovados no front:
-- titulos simples a pagar/receber, com origem auditavel e vinculos opcionais
-- aos movimentos reais do MVP.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  CREATE TYPE tipo_titulo_financeiro AS ENUM ('receber', 'pagar');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE status_titulo_financeiro AS ENUM (
    'aberto',
    'vence_semana',
    'vencida',
    'pago',
    'recebido',
    'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS financeiro_titulo (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                tipo_titulo_financeiro NOT NULL,
  descricao           varchar(180) NOT NULL,
  parte_nome          varchar(160) NOT NULL,
  vencimento          date NOT NULL,
  valor               numeric(12,2) NOT NULL CHECK (valor >= 0),
  status              status_titulo_financeiro NOT NULL DEFAULT 'aberto',
  origem              varchar(40) NOT NULL DEFAULT 'manual',
  observacao          text,

  cliente_id          uuid REFERENCES cliente(id),
  fornecedor_id       uuid REFERENCES fornecedor(id),
  agente_id           uuid REFERENCES agente(id),
  caixa_movimento_id  uuid REFERENCES caixa_movimento(id),
  carga_id            uuid REFERENCES carga(id),
  bilhete_id          uuid REFERENCES bilhete(id),
  cotacao_id          uuid REFERENCES cotacao(id),

  criado_por          uuid REFERENCES usuario(id),
  atualizado_por      uuid REFERENCES usuario(id),
  client_uuid         uuid,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz,
  excluido_em         timestamptz
);

DROP TRIGGER IF EXISTS trg_financeiro_titulo_atualizado_em ON financeiro_titulo;
CREATE TRIGGER trg_financeiro_titulo_atualizado_em BEFORE UPDATE ON financeiro_titulo
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE INDEX IF NOT EXISTS ix_financeiro_titulo_tipo_status
  ON financeiro_titulo (tipo, status)
  WHERE excluido_em IS NULL;

CREATE INDEX IF NOT EXISTS ix_financeiro_titulo_vencimento
  ON financeiro_titulo (vencimento)
  WHERE excluido_em IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_financeiro_titulo_client_uuid
  ON financeiro_titulo (client_uuid)
  WHERE client_uuid IS NOT NULL;

COMMIT;
