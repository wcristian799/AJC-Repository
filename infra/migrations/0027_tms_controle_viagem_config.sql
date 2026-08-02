-- =============================================================================
-- 0027_tms_controle_viagem_config.sql
-- Parametros versionados da visao operacional Controle por viagem.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

INSERT INTO config_chave (chave, categoria, descricao, schema_json)
VALUES (
  'tms_controle_viagem',
  'tms',
  'Atualizacao, periodo padrao, paginacao e limites do controle de carga por viagem.',
  '{"type":"object","required":["schemaVersion","timezone","atualizacaoSegundos","diasPassadosPadrao","diasFuturosPadrao","itensPorPagina","maximoPorPagina","limiteExportacao","limiteEventosPorVolume","limiteDivergenciasPainel"]}'::jsonb
)
ON CONFLICT (chave) DO UPDATE SET
  categoria = EXCLUDED.categoria,
  descricao = EXCLUDED.descricao,
  schema_json = EXCLUDED.schema_json,
  atualizado_em = now();

WITH chave AS (
  SELECT id FROM config_chave WHERE chave = 'tms_controle_viagem'
), autor AS (
  SELECT id FROM usuario ORDER BY criado_em LIMIT 1
)
INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
SELECT chave.id, 1,
  '{
    "schemaVersion": 1,
    "timezone": "America/Sao_Paulo",
    "atualizacaoSegundos": 30,
    "diasPassadosPadrao": 30,
    "diasFuturosPadrao": 60,
    "itensPorPagina": 20,
    "maximoPorPagina": 100,
    "limiteExportacao": 5000,
    "limiteEventosPorVolume": 100,
    "limiteDivergenciasPainel": 20
  }'::jsonb,
  true, autor.id
FROM chave, autor
WHERE autor.id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM config_versao cv WHERE cv.chave_id = chave.id);

COMMIT;
