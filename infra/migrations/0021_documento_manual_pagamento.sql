-- Modalidade de pagamento CIF/FOB no lancamento manual de NF/DC.

BEGIN;

ALTER TABLE documento_fiscal
  ADD COLUMN IF NOT EXISTS pagamento varchar(3);

UPDATE documento_fiscal
SET pagamento = CASE
  WHEN tipo = 'DC'::tipo_documento_fiscal THEN 'FOB'
  ELSE 'CIF'
END
WHERE pagamento IS NULL;

ALTER TABLE documento_fiscal
  DROP CONSTRAINT IF EXISTS ck_documento_fiscal_pagamento;

ALTER TABLE documento_fiscal
  ADD CONSTRAINT ck_documento_fiscal_pagamento
  CHECK (pagamento IN ('CIF', 'FOB'));

COMMIT;
