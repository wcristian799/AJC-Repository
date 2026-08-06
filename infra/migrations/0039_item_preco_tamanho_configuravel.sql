-- O cadastro aceita códigos de tamanho configuráveis; o legado char(1) causava erro 500
-- quando a operação publicava códigos descritivos como PEQ/MED/GRD.
BEGIN;
ALTER TABLE item_preco ALTER COLUMN tamanho TYPE varchar(24) USING btrim(tamanho::text);
COMMIT;
