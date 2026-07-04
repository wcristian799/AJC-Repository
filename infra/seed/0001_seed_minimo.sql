-- ===========================================================================
-- Seed mínimo do MVP — idempotente (rodar 2x não duplica).
-- Apenas dados de FUNDAÇÃO: cidades, perfis, catálogo de permissões,
-- usuário admin de dev, e chaves de config (placeholder/vazias).
-- NENHUM valor de negócio real (preços, termos, tolerâncias) — só estrutura.
-- Aplicar DEPOIS das migrations 0001..0007.
-- ===========================================================================
BEGIN;

-- ── Cidades (8 conhecidas; conjunto pode crescer) ─────────────────────────
INSERT INTO cidade (sigla, nome, uf, is_base, ativo) VALUES
  ('BEL', 'Belém',         'PA', true,  true),
  ('BRV', 'Breves',        'PA', false, true),
  ('GUR', 'Gurupá',        'PA', false, true),
  ('ALM', 'Almeirim',      'PA', false, true),
  ('PMZ', 'Porto de Moz',  'PA', false, true),
  ('PRA', 'Prainha',       'PA', false, true),
  ('MTA', 'Monte Alegre',  'PA', false, true),
  ('STM', 'Santarém',      'PA', false, true)
ON CONFLICT (sigla) DO NOTHING;

-- ── Perfis básicos (matriz de permissões real é regra de Fase 1+) ─────────
INSERT INTO perfil (nome, descricao) VALUES
  ('Administrador', 'Acesso total ao sistema'),
  ('Financeiro',    'Caixa, contas, faturamento'),
  ('Comercial',     'CRM, clientes, cotações'),
  ('Price',         'Tabelas de preço e reajustes'),
  ('Conferente',    'Conferência de carga (porto/balsa)'),
  ('Bilheteiro',    'Validação de embarque'),
  ('Porteiro',      'Portaria de veículos'),
  ('Gerente',       'Gerente da embarcação / prestação de contas')
ON CONFLICT (nome) DO NOTHING;

-- ── Catálogo de permissões (modulo.acao) — placeholder estrutural ─────────
-- A POLÍTICA (quais perfis têm o quê) NÃO é definida aqui: é regra de Fase 1+.
INSERT INTO permissao (modulo, acao, descricao) VALUES
  ('cadastros', 'ver',       'Visualizar cadastros'),
  ('cadastros', 'criar',     'Criar cadastros'),
  ('cadastros', 'editar',    'Editar cadastros'),
  ('navegacao', 'ver',       'Visualizar viagens/embarcações'),
  ('navegacao', 'criar',     'Criar viagem/embarcação'),
  ('navegacao', 'editar',    'Editar viagens, escalas e notificações'),
  ('precos',    'ver',       'Visualizar preços'),
  ('precos',    'reajustar', 'Reajustar preços em massa'),
  ('tms',       'ver',       'Visualizar TMS/cargas'),
  ('tms',       'criar',     'Criar cargas, paletes, portaria e recebimentos'),
  ('tms',       'conferir',  'Conferir volumes'),
  ('tms',       'entregar',  'Registrar entrega'),
  ('veiculos',  'ver',       'Visualizar veículos e máquinas'),
  ('veiculos',  'criar',     'Criar e movimentar veículos e máquinas'),
  ('encomendas','ver',       'Visualizar encomendas'),
  ('encomendas','criar',     'Criar encomendas e declarações'),
  ('vendas',    'ver',       'Visualizar vendas, bilhetes e manifesto'),
  ('vendas',    'vender',    'Emitir bilhete'),
  ('vendas',    'validar',   'Validar embarque'),
  ('vendas',    'cortesia',  'Emitir e gerenciar cortesias'),
  ('crm',       'ver',       'Visualizar CRM'),
  ('crm',       'criar',     'Criar clientes/cotações no CRM'),
  ('crm',       'editar',    'Editar clientes e alocações do CRM'),
  ('caixa',     'ver',       'Visualizar caixas e movimentos'),
  ('caixa',     'operar',    'Operar caixa'),
  ('operacao',  'ver',       'Visualizar alertas operacionais'),
  ('operacao',  'criar',     'Criar alertas operacionais'),
  ('operacao',  'editar',    'Editar e resolver alertas operacionais')
ON CONFLICT (modulo, acao) DO NOTHING;

-- ── Usuário admin de desenvolvimento ──────────────────────────────────────
-- senha_hash é placeholder; o hash real (argon2/bcrypt) é gravado pelo seed
-- programático do back (lê SEED_ADMIN_PASSWORD do ambiente). Nunca texto puro.
INSERT INTO usuario (nome, login, email, senha_hash, perfil_id, ativo)
SELECT 'Administrador AJC', 'admin', 'admin@ajc.local',
       '$placeholder$trocar_no_seed_do_back', p.id, true
FROM perfil p WHERE p.nome = 'Administrador'
ON CONFLICT (login) DO NOTHING;

-- ── Chaves de configuração (motor de config) — VAZIAS/placeholder ─────────
-- O valor real é publicado depois (Fase 1+). Aqui só registramos a existência
-- da chave para o motor de config conseguir lê-la sem erro. 🔶 = pendente cliente.
INSERT INTO config_chave (chave, categoria, descricao) VALUES
  ('termo_embarque',     'termos',      '🔶 Texto do termo de aceite de embarque'),
  ('declaracao_conteudo','termos',      '🔶 Modelo de declaração de conteúdo'),
  ('tolerancia_atraso',  'tolerancias', 'Minutos para atenção/atrasado na viagem'),
  ('cores_pulseira',     'vendas',      '🔶 Cor de pulseira por classe de passagem'),
  ('limite_cortesia',    'vendas',      'Limite de cortesias por viagem'),
  ('tamanhos_encomenda', 'encomendas',  '🔶 P/M/G e pesos máximos'),
  ('comissao_agente',    'comercial',   '🔶 Regras de comissão de agentes')
ON CONFLICT (chave) DO NOTHING;

-- Versão inicial vazia (v1) para cada chave, atribuída ao admin, marcada ativa.
INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
SELECT c.id, 1, '{}'::jsonb, true, u.id
FROM config_chave c
CROSS JOIN (SELECT id FROM usuario WHERE login = 'admin' LIMIT 1) u
WHERE NOT EXISTS (
  SELECT 1 FROM config_versao v WHERE v.chave_id = c.id
);

COMMIT;
