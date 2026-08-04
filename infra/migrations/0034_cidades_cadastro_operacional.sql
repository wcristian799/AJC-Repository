-- 0034_cidades_cadastro_operacional.sql
-- Cadastro mutavel e auditavel de cidades. A sigla permanece a chave operacional imutavel.

BEGIN;

ALTER TABLE cidade
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

UPDATE cidade
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE cidade
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cidade_id ON cidade (id);

COMMIT;
