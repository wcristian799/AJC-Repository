-- =============================================================================
-- 0042_app_agente_e_bipagem_palete.sql
-- Aplicativo do agente comercial, vinculo seguro de conta e catalogo de campo.
-- =============================================================================

BEGIN;

ALTER TABLE agente
  ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES usuario(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_agente_usuario
  ON agente(usuario_id)
  WHERE usuario_id IS NOT NULL AND excluido_em IS NULL;

INSERT INTO permissao (modulo, acao, descricao)
VALUES
  ('campo', 'agente', 'Acessar aplicativo do agente comercial')
ON CONFLICT (modulo, acao) DO UPDATE SET descricao = EXCLUDED.descricao;

INSERT INTO perfil_permissao (perfil_id,permissao_id)
SELECT perfil.id,permissao.id FROM perfil CROSS JOIN permissao
WHERE perfil.nome='Administrador' AND permissao.modulo='campo' AND permissao.acao='agente'
ON CONFLICT DO NOTHING;

INSERT INTO campo_aplicativo (codigo,nome,descricao,rota_web,permissao_acao,ordem)
VALUES
  ('agente_comercial','Agente Comercial','Carteira, captacao e pedidos da propria agencia','/campo/agente','agente',60)
ON CONFLICT (codigo) DO UPDATE SET
  nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, rota_web=EXCLUDED.rota_web,
  permissao_modulo='campo', permissao_acao=EXCLUDED.permissao_acao,
  ordem=EXCLUDED.ordem, atualizado_em=now();

UPDATE campo_aplicativo SET ordem=70 WHERE codigo='crm_comercial' AND ordem < 70;
UPDATE campo_aplicativo SET ordem=80 WHERE codigo='bilheteria_digital' AND ordem < 80;

COMMIT;
