-- =============================================================================
-- 0024_navegacao_configuravel_calendario.sql
-- Etapa 02: rotas/horarios versionados, snapshot por viagem e ciclo ida/volta.
-- A carga inicial vem do FAQ 2026 recebido em 31/jul/2026. Depois da aplicacao,
-- toda alteracao e publicada pelo painel de Cadastros no motor de configuracao.
-- =============================================================================

BEGIN;

ALTER TABLE viagem
  ADD COLUMN IF NOT EXISTS rota_template_id varchar(80),
  ADD COLUMN IF NOT EXISTS config_versao_id uuid REFERENCES config_versao(id),
  ADD COLUMN IF NOT EXISTS ciclo_uuid uuid,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text;

CREATE INDEX IF NOT EXISTS ix_viagem_ciclo_uuid ON viagem (ciclo_uuid)
  WHERE ciclo_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_viagem_config_versao_id ON viagem (config_versao_id)
  WHERE config_versao_id IS NOT NULL;

INSERT INTO config_chave (chave, categoria, descricao, schema_json)
VALUES (
  'navegacao_rotas_horarios',
  'navegacao',
  'Rotas, frequencias, horarios e intertrechos usados no planejamento de viagens.',
  '{"type":"object","required":["schemaVersion","rotas"]}'::jsonb
)
ON CONFLICT (chave) DO UPDATE SET
  categoria = EXCLUDED.categoria,
  descricao = EXCLUDED.descricao,
  schema_json = EXCLUDED.schema_json,
  atualizado_em = now();

WITH chave AS (
  SELECT id FROM config_chave WHERE chave = 'navegacao_rotas_horarios'
), autor AS (
  SELECT COALESCE(
    (SELECT cv.autor_id
       FROM config_versao cv
       JOIN config_chave cc ON cc.id = cv.chave_id
      WHERE cc.chave = 'route_templates_faq_2026'
      ORDER BY cv.versao DESC LIMIT 1),
    (SELECT id FROM usuario ORDER BY criado_em LIMIT 1)
  ) AS id
)
INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
SELECT chave.id, 1,
  $$
  {
    "schemaVersion": 1,
    "fonte": "FAQ 2026 recebido em 31/07/2026",
    "rotas": [
      {
        "id": "bel-alm-ter-1700", "nome": "Belém → Almeirim", "origemSigla": "BEL", "destinoSigla": "ALM",
        "diaSemana": 2, "horaSaida": "17:00", "ativo": true,
        "observacao": "O FAQ também menciona 18h em uma resposta resumida; confirmar no painel antes da publicação operacional.",
        "requerRevisao": true,
        "paradas": [
          {"cidadeSigla":"BRV","offsetMinutos":960}, {"cidadeSigla":"GUR","offsetMinutos":1620},
          {"cidadeSigla":"PMZ","offsetMinutos":2340}, {"cidadeSigla":"ALM","offsetMinutos":2700}
        ]
      },
      {
        "id": "alm-bel-qui-1800", "nome": "Almeirim → Belém", "origemSigla": "ALM", "destinoSigla": "BEL",
        "diaSemana": 4, "horaSaida": "18:00", "ativo": true,
        "paradas": [
          {"cidadeSigla":"PMZ","offsetMinutos":300}, {"cidadeSigla":"GUR","offsetMinutos":720},
          {"cidadeSigla":"BRV","offsetMinutos":1320}, {"cidadeSigla":"BEL","offsetMinutos":2280}
        ]
      },
      {
        "id": "bel-stm-qua-1700", "nome": "Belém → Santarém · quarta", "origemSigla": "BEL", "destinoSigla": "STM",
        "diaSemana": 3, "horaSaida": "17:00", "ativo": true,
        "observacao": "O FAQ também menciona 18h em uma resposta resumida; confirmar no painel antes da publicação operacional.",
        "requerRevisao": true,
        "paradas": [
          {"cidadeSigla":"BRV","offsetMinutos":960}, {"cidadeSigla":"GUR","offsetMinutos":1620},
          {"cidadeSigla":"ALM","offsetMinutos":2400}, {"cidadeSigla":"PRA","offsetMinutos":2880},
          {"cidadeSigla":"MTA","offsetMinutos":3240}, {"cidadeSigla":"STM","offsetMinutos":3900}
        ]
      },
      {
        "id": "stm-bel-sab-1600", "nome": "Santarém → Belém · sábado", "origemSigla": "STM", "destinoSigla": "BEL",
        "diaSemana": 6, "horaSaida": "16:00", "ativo": true,
        "observacao": "O FAQ registra Prainha às 00h como sábado, embora a saída seja sábado às 16h; considerado domingo 00h e marcado para revisão.",
        "requerRevisao": true,
        "paradas": [
          {"cidadeSigla":"PRA","offsetMinutos":480}, {"cidadeSigla":"ALM","offsetMinutos":960},
          {"cidadeSigla":"GUR","offsetMinutos":1440}, {"cidadeSigla":"BRV","offsetMinutos":2040},
          {"cidadeSigla":"BEL","offsetMinutos":3060}
        ]
      },
      {
        "id": "bel-stm-sex-1700", "nome": "Belém → Santarém · sexta", "origemSigla": "BEL", "destinoSigla": "STM",
        "diaSemana": 5, "horaSaida": "17:00", "ativo": true,
        "observacao": "O FAQ também menciona 18h em uma resposta resumida; confirmar no painel antes da publicação operacional.",
        "requerRevisao": true,
        "paradas": [
          {"cidadeSigla":"BRV","offsetMinutos":960}, {"cidadeSigla":"GUR","offsetMinutos":1620},
          {"cidadeSigla":"ALM","offsetMinutos":2400}, {"cidadeSigla":"PRA","offsetMinutos":2880},
          {"cidadeSigla":"MTA","offsetMinutos":3240}, {"cidadeSigla":"STM","offsetMinutos":4440}
        ]
      },
      {
        "id": "stm-bel-seg-1800", "nome": "Santarém → Belém · segunda", "origemSigla": "STM", "destinoSigla": "BEL",
        "diaSemana": 1, "horaSaida": "18:00", "ativo": true,
        "paradas": [
          {"cidadeSigla":"MTA","offsetMinutos":300}, {"cidadeSigla":"PRA","offsetMinutos":720},
          {"cidadeSigla":"ALM","offsetMinutos":1020}, {"cidadeSigla":"GUR","offsetMinutos":1500},
          {"cidadeSigla":"BRV","offsetMinutos":2100}, {"cidadeSigla":"BEL","offsetMinutos":2940}
        ]
      }
    ]
  }
  $$::jsonb,
  true,
  autor.id
FROM chave, autor
WHERE autor.id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM config_versao cv WHERE cv.chave_id = chave.id);

COMMIT;
