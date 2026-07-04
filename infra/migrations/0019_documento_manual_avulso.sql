-- Documento fiscal manual avulso no TMS.
-- Permite lancamento de NF/DC sem viagem/carga vinculada, preservando dados
-- operacionais minimos para fila de back-office.

BEGIN;

ALTER TABLE documento_fiscal
  ADD COLUMN IF NOT EXISTS cidade_origem_sigla varchar(4) REFERENCES cidade(sigla),
  ADD COLUMN IF NOT EXISTS cidade_destino_sigla varchar(4) REFERENCES cidade(sigla),
  ADD COLUMN IF NOT EXISTS peso_total numeric(10,3),
  ADD COLUMN IF NOT EXISTS total_volumes smallint,
  ADD COLUMN IF NOT EXISTS destinatario_nome varchar(160);

CREATE INDEX IF NOT EXISTS ix_documento_fiscal_cidade_destino
  ON documento_fiscal (cidade_destino_sigla);

COMMIT;
