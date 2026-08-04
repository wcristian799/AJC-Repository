-- Etapa 06: encomendas com dominio proprio, configuracao versionada e prova documental.
BEGIN;

INSERT INTO permissao (modulo, acao, descricao)
VALUES
  ('encomendas', 'editar', 'Editar despachos de encomendas antes do embarque'),
  ('encomendas', 'configurar', 'Publicar regras, termo e tabela operacional de encomendas')
ON CONFLICT (modulo, acao) DO UPDATE SET descricao = EXCLUDED.descricao;

INSERT INTO perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pe.id
FROM perfil p
CROSS JOIN permissao pe
WHERE lower(p.nome) = 'administrador'
  AND pe.modulo = 'encomendas'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS encomenda_detalhe (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id                   uuid NOT NULL UNIQUE REFERENCES carga(id) ON DELETE CASCADE,
  cotacao_id                 uuid REFERENCES cotacao(id),
  remetente_nome             varchar(160) NOT NULL,
  remetente_documento        varchar(20) NOT NULL,
  remetente_telefone         varchar(20) NOT NULL,
  destinatario_nome          varchar(160) NOT NULL,
  destinatario_documento     varchar(20) NOT NULL,
  destinatario_telefone      varchar(20) NOT NULL,
  tamanho_codigo             varchar(24) NOT NULL,
  conteudo_declarado         text NOT NULL,
  quem_paga                  varchar(20) NOT NULL CHECK (quem_paga IN ('remetente', 'destinatario')),
  forma_pagamento            varchar(40),
  documento_tipo             varchar(8) NOT NULL CHECK (documento_tipo IN ('NF', 'DC')),
  documento_fiscal_id        uuid REFERENCES documento_fiscal(id),
  foto_encomenda_url         text NOT NULL,
  foto_encomenda_hash        varchar(64) NOT NULL,
  valor_tabela               numeric(12,2) NOT NULL CHECK (valor_tabela >= 0),
  valor_cobrado              numeric(12,2) NOT NULL CHECK (valor_cobrado >= 0),
  motivo_ajuste_valor        text,
  config_versao_id           uuid NOT NULL REFERENCES config_versao(id),
  tabela_preco_id            uuid REFERENCES tabela_preco(id),
  status_documental          varchar(32) NOT NULL DEFAULT 'aguardando_documento'
    CHECK (status_documental IN ('aguardando_documento', 'pronta', 'divergente')),
  criado_por                 uuid NOT NULL REFERENCES usuario(id),
  atualizado_por             uuid NOT NULL REFERENCES usuario(id),
  criado_em                  timestamptz NOT NULL DEFAULT now(),
  atualizado_em              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_encomenda_detalhe_status ON encomenda_detalhe (status_documental);
CREATE INDEX IF NOT EXISTS ix_encomenda_detalhe_documentos ON encomenda_detalhe (remetente_documento, destinatario_documento);
CREATE UNIQUE INDEX IF NOT EXISTS ux_declaracao_conteudo_carga ON declaracao_conteudo (carga_id);

DROP TRIGGER IF EXISTS trg_encomenda_detalhe_atualizado_em ON encomenda_detalhe;
CREATE TRIGGER trg_encomenda_detalhe_atualizado_em BEFORE UPDATE ON encomenda_detalhe
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS encomenda_evidencia (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id       uuid REFERENCES carga(id) ON DELETE CASCADE,
  tipo           varchar(24) NOT NULL CHECK (tipo IN ('foto_encomenda', 'documento_nf', 'documento_dc', 'assinatura_dc')),
  arquivo_url    text NOT NULL,
  arquivo_hash   varchar(64) NOT NULL,
  arquivo_nome   varchar(255) NOT NULL,
  arquivo_mime   varchar(120) NOT NULL,
  arquivo_bytes  integer NOT NULL CHECK (arquivo_bytes > 0),
  client_uuid    uuid,
  criado_por     uuid NOT NULL REFERENCES usuario(id),
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_encomenda_evidencia_client_uuid
  ON encomenda_evidencia (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_encomenda_evidencia_carga ON encomenda_evidencia (carga_id, criado_em);

ALTER TABLE cotacao ADD COLUMN IF NOT EXISTS client_uuid uuid;
CREATE UNIQUE INDEX IF NOT EXISTS ux_cotacao_client_uuid ON cotacao (client_uuid) WHERE client_uuid IS NOT NULL;

INSERT INTO config_chave (chave, categoria, descricao)
VALUES (
  'encomendas_operacao',
  'encomendas',
  'Tamanhos, limites, pagamentos, prazo financeiro, documentos e termo da Declaracao de Conteudo'
)
ON CONFLICT (chave) DO UPDATE
SET categoria = EXCLUDED.categoria,
    descricao = EXCLUDED.descricao,
    ativo = true,
    atualizado_em = now();

INSERT INTO config_versao (chave_id, versao, valor, ativo, publicado_em, autor_id)
SELECT c.id, 1,
  '{
    "limiteValorFixo": 1000,
    "tamanhos": [
      {"codigo":"P","nome":"Pequena","pesoMaxKg":10,"ativo":true},
      {"codigo":"M","nome":"Media","pesoMaxKg":20,"ativo":true},
      {"codigo":"G","nome":"Grande","pesoMaxKg":30,"ativo":true}
    ],
    "formasPagamento": [
      {"codigo":"dinheiro","nome":"Dinheiro","ativo":true},
      {"codigo":"pix","nome":"Pix","ativo":true},
      {"codigo":"cartao_credito","nome":"Cartao de credito","ativo":true},
      {"codigo":"cartao_debito","nome":"Cartao de debito","ativo":true}
    ],
    "prazoRecebimentoDias": 0,
    "exigeFotoEncomenda": true,
    "exigeDocumento": true,
    "termo": {
      "publicado": false,
      "titulo": "Declaracao de Conteudo",
      "texto": "",
      "clausulas": []
    }
  }'::jsonb,
  true,
  now(),
  u.id
FROM config_chave c
JOIN usuario u ON u.login = 'admin'
WHERE c.chave = 'encomendas_operacao'
  AND NOT EXISTS (SELECT 1 FROM config_versao v WHERE v.chave_id = c.id);

COMMIT;
