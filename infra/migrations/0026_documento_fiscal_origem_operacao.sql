-- =============================================================================
-- 0026_documento_fiscal_origem_operacao.sql
-- Permite identificar o lancamento unificado feito pela operacao interna sem
-- reutilizar a origem historica "manual", descontinuada na Etapa 03.
-- =============================================================================

BEGIN;

ALTER TABLE documento_fiscal
  DROP CONSTRAINT IF EXISTS ck_documento_fiscal_origem;

ALTER TABLE documento_fiscal
  ADD CONSTRAINT ck_documento_fiscal_origem
  CHECK (origem IN ('cliente', 'agente', 'manual', 'operacao'));

COMMENT ON COLUMN documento_fiscal.origem IS
  'Canal que originou o documento: cliente/agente legados, manual historico ou operacao no fluxo unificado.';

COMMIT;
