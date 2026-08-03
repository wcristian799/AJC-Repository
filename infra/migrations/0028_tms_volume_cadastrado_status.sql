-- =============================================================================
-- 0028_tms_volume_cadastrado_status.sql
-- Separa volume apenas cadastrado por NF/DC de volume fisicamente recebido.
-- Mantido fora de BEGIN/COMMIT porque o novo valor do enum precisa estar
-- confirmado antes de ser usado pela migration seguinte.
-- =============================================================================

ALTER TYPE status_volume ADD VALUE IF NOT EXISTS 'cadastrado' BEFORE 'recebido';
