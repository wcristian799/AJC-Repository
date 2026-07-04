-- Codigo unico de cadastro do cliente.
-- Usado como identificador operacional visivel e como base do numero de pedido TMS.

CREATE SEQUENCE IF NOT EXISTS cliente_codigo_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE cliente
  ADD COLUMN IF NOT EXISTS codigo varchar(24);

WITH numerados AS (
  SELECT
    id,
    row_number() OVER (ORDER BY criado_em, id) AS seq
  FROM cliente
  WHERE codigo IS NULL
)
UPDATE cliente c
SET codigo = 'CLI-' || EXTRACT(YEAR FROM c.criado_em)::int::text || '-' || lpad(numerados.seq::text, 4, '0')
FROM numerados
WHERE numerados.id = c.id;

SELECT setval(
  'cliente_codigo_seq',
  GREATEST(
    1,
    COALESCE((
      SELECT max((regexp_match(codigo, '([0-9]+)$'))[1]::bigint)
      FROM cliente
      WHERE codigo ~ '[0-9]+$'
    ), 0) + 1
  ),
  false
);

ALTER TABLE cliente
  ALTER COLUMN codigo SET DEFAULT (
    'CLI-' || EXTRACT(YEAR FROM now())::int::text || '-' || lpad(nextval('cliente_codigo_seq')::text, 4, '0')
  );

ALTER TABLE cliente
  ALTER COLUMN codigo SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_codigo
  ON cliente (codigo)
  WHERE excluido_em IS NULL;
