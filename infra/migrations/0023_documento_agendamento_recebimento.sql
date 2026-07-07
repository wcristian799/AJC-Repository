-- Agenda de recebimento no documento fiscal / NF/DC.
-- Regra operacional MVP: janelas de 30 minutos, maximo 5 caminhoes por janela.

BEGIN;

ALTER TABLE documento_fiscal
  ADD COLUMN IF NOT EXISTS agendado_para timestamptz;

CREATE INDEX IF NOT EXISTS ix_documento_fiscal_agendado_para ON documento_fiscal (agendado_para);
CREATE INDEX IF NOT EXISTS ix_documento_fiscal_cliente_agendado_para ON documento_fiscal (cliente_id, agendado_para);

COMMIT;
