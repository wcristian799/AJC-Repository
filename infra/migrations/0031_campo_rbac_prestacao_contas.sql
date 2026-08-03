-- Etapa 05: acesso aos apps de campo e prestacao de contas auditavel.
BEGIN;

INSERT INTO permissao (modulo, acao, descricao) VALUES
  ('campo', 'porteiro', 'Acessar o aplicativo de campo Porteiro'),
  ('campo', 'conferente_porto', 'Acessar o aplicativo Conferente do Porto'),
  ('campo', 'conferente_navegacao', 'Acessar o aplicativo Conferente da Navegacao'),
  ('campo', 'entregas', 'Acessar o aplicativo de Entregas'),
  ('campo', 'bilheteiro', 'Acessar o aplicativo Bilheteiro'),
  ('campo', 'pdv', 'Acessar o PDV de campo'),
  ('campo', 'encomendas', 'Acessar o futuro aplicativo de Encomendas'),
  ('campo', 'gerente_embarcacao', 'Acessar o aplicativo Gerente da Embarcacao'),
  ('campo', 'crm_comercial', 'Acessar o futuro aplicativo CRM Comercial'),
  ('prestacao', 'ver', 'Visualizar prestacoes de contas'),
  ('prestacao', 'lancar', 'Criar, editar e enviar prestacao da embarcacao'),
  ('prestacao', 'conferir', 'Conferir prestacao de contas no TMS'),
  ('prestacao', 'configurar', 'Configurar categorias e regras da prestacao')
ON CONFLICT (modulo, acao) DO UPDATE SET descricao = EXCLUDED.descricao;

-- O administrador continua tendo acesso total inclusive depois da ampliacao do catalogo.
INSERT INTO perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pe.id
FROM perfil p CROSS JOIN permissao pe
WHERE p.nome = 'Administrador'
ON CONFLICT DO NOTHING;

ALTER TABLE prestacao_contas
  ADD COLUMN IF NOT EXISTS client_uuid uuid,
  ADD COLUMN IF NOT EXISTS config_versao_id uuid REFERENCES config_versao(id),
  ADD COLUMN IF NOT EXISTS enviada_em timestamptz,
  ADD COLUMN IF NOT EXISTS conferida_em timestamptz,
  ADD COLUMN IF NOT EXISTS conferida_por uuid REFERENCES usuario(id),
  ADD COLUMN IF NOT EXISTS observacao_conferencia text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_prestacao_contas_client_uuid
  ON prestacao_contas (client_uuid) WHERE client_uuid IS NOT NULL;

INSERT INTO config_chave (chave, categoria, descricao)
VALUES ('tms_prestacao_contas', 'tms', 'Categorias, formas de pagamento, intertrechos e regras da prestacao de contas')
ON CONFLICT (chave) DO UPDATE SET descricao = EXCLUDED.descricao;

-- Apenas taxonomia estrutural pedida pelo cliente. Percentuais, trechos e valores
-- ficam vazios ate serem publicados em Cadastros.
INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
SELECT c.id, 1, jsonb_build_object(
  'schemaVersion', 1,
  'timezone', 'America/Sao_Paulo',
  'formasPagamento', jsonb_build_array(
    jsonb_build_object('codigo','dinheiro','nome','Dinheiro','ativo',true),
    jsonb_build_object('codigo','pix','nome','PIX','ativo',true),
    jsonb_build_object('codigo','credito','nome','Cartao de credito','ativo',true),
    jsonb_build_object('codigo','debito','nome','Cartao de debito','ativo',true)
  ),
  'categoriasReceita', jsonb_build_array(
    jsonb_build_object('codigo','passagens','nome','Passagens','ativo',true),
    jsonb_build_object('codigo','encomendas','nome','Encomendas','ativo',true),
    jsonb_build_object('codigo','carga','nome','Carga','ativo',true),
    jsonb_build_object('codigo','veiculos','nome','Veiculos e maquinas','ativo',true),
    jsonb_build_object('codigo','frete_intertrecho','nome','Frete intertrecho','ativo',true),
    jsonb_build_object('codigo','internet','nome','Internet','ativo',true),
    jsonb_build_object('codigo','agencias','nome','Agencias','ativo',true)
  ),
  'categoriasDespesa', jsonb_build_array(
    jsonb_build_object('codigo','mao_obra','nome','Mao de obra','ativo',true),
    jsonb_build_object('codigo','despacho_embarcacao','nome','Despacho da embarcacao','ativo',true),
    jsonb_build_object('codigo','residuos','nome','Residuos','ativo',true),
    jsonb_build_object('codigo','gratificacoes','nome','Gratificacoes','ativo',true)
  ),
  'intertrechos', '[]'::jsonb,
  'comissoesAgencia', '[]'::jsonb,
  'exigirDescricaoDespesa', true,
  'exigirCidadeOuViagemDespesa', true
), true, u.id
FROM config_chave c
JOIN usuario u ON u.login = 'admin'
WHERE c.chave = 'tms_prestacao_contas'
  AND NOT EXISTS (SELECT 1 FROM config_versao cv WHERE cv.chave_id = c.id);

COMMIT;
