-- =============================================================================
-- 0036_documento_independente_viagem_gerente_origens_veiculos.sql
-- NF/DC nasce independente; gerente opera o ciclo da viagem; origens de
-- veiculos deixam de ser enum fixo e passam a configuracao versionada.
-- =============================================================================

BEGIN;

ALTER TABLE viagem
  ADD COLUMN IF NOT EXISTS iniciada_em timestamptz,
  ADD COLUMN IF NOT EXISTS iniciada_por uuid REFERENCES usuario(id),
  ADD COLUMN IF NOT EXISTS encerrada_em timestamptz,
  ADD COLUMN IF NOT EXISTS encerrada_por uuid REFERENCES usuario(id);

INSERT INTO permissao (modulo, acao, descricao)
VALUES ('navegacao', 'operar_viagem', 'Iniciar e encerrar viagem no aplicativo Gerente da Embarcacao')
ON CONFLICT (modulo, acao) DO UPDATE SET descricao = EXCLUDED.descricao;

INSERT INTO perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pe.id
FROM perfil p
JOIN permissao pe ON pe.modulo = 'navegacao' AND pe.acao = 'operar_viagem'
WHERE p.nome = 'Administrador'
ON CONFLICT DO NOTHING;

ALTER TABLE envio_veiculo
  ALTER COLUMN origem_cadastro TYPE varchar(60) USING origem_cadastro::text;

ALTER TABLE envio_veiculo DROP CONSTRAINT IF EXISTS ck_envio_veiculo_origem_cadastro;
ALTER TABLE envio_veiculo ADD CONSTRAINT ck_envio_veiculo_origem_cadastro
  CHECK (length(btrim(origem_cadastro)) BETWEEN 2 AND 60);

INSERT INTO config_chave (chave, categoria, descricao)
VALUES (
  'veiculos_origens_cadastro',
  'veiculos',
  'Origens disponiveis para o cadastro de veiculos e maquinas'
)
ON CONFLICT (chave) DO UPDATE SET descricao = EXCLUDED.descricao;

INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
SELECT c.id, 1, jsonb_build_object(
  'schemaVersion', 1,
  'origens', jsonb_build_array(
    jsonb_build_object('codigo', 'gerente_porto', 'nome', 'Gerente do Porto', 'ativo', true),
    jsonb_build_object('codigo', 'pdv', 'nome', 'PDV Porto', 'ativo', true),
    jsonb_build_object('codigo', 'comercial', 'nome', 'Comercial', 'ativo', true)
  ),
  'origemPadrao', 'gerente_porto'
), true, u.id
FROM config_chave c
JOIN usuario u ON u.login = 'admin'
WHERE c.chave = 'veiculos_origens_cadastro'
  AND NOT EXISTS (SELECT 1 FROM config_versao cv WHERE cv.chave_id = c.id);

COMMIT;
