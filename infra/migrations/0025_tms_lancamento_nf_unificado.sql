-- =============================================================================
-- 0025_tms_lancamento_nf_unificado.sql
-- Etapa 03: upload fiscal real, lancamento NF/DC ligado a carga/viagem,
-- agenda configuravel e classificacao operacional de unitizacao.
-- =============================================================================

BEGIN;

ALTER TABLE documento_fiscal
  ADD COLUMN IF NOT EXISTS viagem_id uuid REFERENCES viagem(id),
  ADD COLUMN IF NOT EXISTS remetente_nome varchar(160),
  ADD COLUMN IF NOT EXISTS remetente_documento varchar(20),
  ADD COLUMN IF NOT EXISTS remetente_telefone varchar(30),
  ADD COLUMN IF NOT EXISTS chave_acesso varchar(60),
  ADD COLUMN IF NOT EXISTS arquivo_nome varchar(255),
  ADD COLUMN IF NOT EXISTS arquivo_mime varchar(120),
  ADD COLUMN IF NOT EXISTS dados_extraidos jsonb;

CREATE INDEX IF NOT EXISTS ix_documento_fiscal_viagem ON documento_fiscal (viagem_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_documento_fiscal_chave_acesso
  ON documento_fiscal (chave_acesso)
  WHERE chave_acesso IS NOT NULL;

ALTER TABLE carga
  ADD COLUMN IF NOT EXISTS tipo_unitizacao varchar(12) NOT NULL DEFAULT 'AVULSA';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_carga_tipo_unitizacao'
  ) THEN
    ALTER TABLE carga ADD CONSTRAINT ck_carga_tipo_unitizacao
      CHECK (tipo_unitizacao IN ('AVULSA', 'MP', 'PD', 'PC'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS documento_upload (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket         varchar(80) NOT NULL,
  objeto_chave   text NOT NULL,
  arquivo_nome   varchar(255) NOT NULL,
  arquivo_mime   varchar(120) NOT NULL,
  arquivo_hash   varchar(64) NOT NULL,
  arquivo_bytes  bigint NOT NULL,
  dados_extraidos jsonb,
  criado_por     uuid NOT NULL REFERENCES usuario(id),
  consumido_em   timestamptz,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  expira_em      timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_documento_upload_objeto ON documento_upload (bucket, objeto_chave);
CREATE INDEX IF NOT EXISTS ix_documento_upload_pendente ON documento_upload (expira_em)
  WHERE consumido_em IS NULL;

INSERT INTO config_chave (chave, categoria, descricao, schema_json)
VALUES (
  'tms_agendamento_recebimento',
  'tms',
  'Janelas e capacidade do agendamento de recebimento de NF/DC no porto.',
  '{"type":"object","required":["schemaVersion","horaInicio","horaFim","intervaloMinutos","capacidadePorJanela","atualizacaoSegundos"]}'::jsonb
)
ON CONFLICT (chave) DO UPDATE SET
  categoria = EXCLUDED.categoria,
  descricao = EXCLUDED.descricao,
  schema_json = EXCLUDED.schema_json,
  atualizado_em = now();

WITH chave AS (
  SELECT id FROM config_chave WHERE chave = 'tms_agendamento_recebimento'
), autor AS (
  SELECT id FROM usuario ORDER BY criado_em LIMIT 1
)
INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
SELECT chave.id, 1,
  '{"schemaVersion":1,"timezone":"America/Sao_Paulo","horaInicio":"06:00","horaFim":"18:00","intervaloMinutos":30,"capacidadePorJanela":5,"atualizacaoSegundos":30}'::jsonb,
  true, autor.id
FROM chave, autor
WHERE autor.id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM config_versao cv WHERE cv.chave_id = chave.id);

COMMIT;
