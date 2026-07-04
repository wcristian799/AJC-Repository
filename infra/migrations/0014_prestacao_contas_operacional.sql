-- 0014_prestacao_contas_operacional.sql
-- Prestacao de contas operacional: uma prestacao ativa por viagem/gerente.
-- O formulario real recebido do cliente permanece versionado em prestacao_contas.itens (jsonb).

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS ux_prestacao_contas_viagem_gerente
  ON prestacao_contas (viagem_id, gerente_id);

COMMIT;
