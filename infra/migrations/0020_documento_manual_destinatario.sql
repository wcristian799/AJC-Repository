-- Dados completos do destinatario no lancamento manual de NF/DC avulsa.

BEGIN;

ALTER TABLE documento_fiscal
  ADD COLUMN IF NOT EXISTS destinatario_documento varchar(20),
  ADD COLUMN IF NOT EXISTS destinatario_telefone varchar(20);

COMMIT;
