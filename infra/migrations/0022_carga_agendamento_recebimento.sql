-- Agenda de recebimento da Nova Carga.
-- Regra operacional MVP: janelas de 30 minutos, maximo 5 caminhoes por janela.

BEGIN;

ALTER TABLE carga
  ADD COLUMN IF NOT EXISTS agendado_para timestamptz;

CREATE INDEX IF NOT EXISTS ix_carga_agendado_para ON carga (agendado_para);
CREATE INDEX IF NOT EXISTS ix_carga_viagem_agendado_para ON carga (viagem_id, agendado_para);

COMMIT;
