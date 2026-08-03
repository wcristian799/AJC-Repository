-- =============================================================================
-- 0030_corrige_nome_local_porto.sql
-- Corrige somente nomes gerados automaticamente como "Porto de Porto de Moz".
-- Cadastros editados manualmente permanecem intocados.
-- =============================================================================

BEGIN;

UPDATE local_operacional lo
SET nome = c.nome
FROM cidade c
WHERE lo.codigo = 'PORTO-' || c.sigla
  AND lo.tipo = 'porto'
  AND lower(c.nome) LIKE 'porto de %'
  AND lo.nome = 'Porto de ' || c.nome;

COMMIT;
