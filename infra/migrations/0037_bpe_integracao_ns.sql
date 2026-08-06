-- =============================================================================
-- 0037_bpe_integracao_ns.sql
-- Integracao real de BP-e via NS Tecnologia, numeracao segura, outbox fiscal,
-- webhook idempotente, documentos privados no MinIO e codigo IBGE de cidades.
-- =============================================================================

BEGIN;

ALTER TABLE cidade
  ADD COLUMN IF NOT EXISTS codigo_ibge varchar(7);

ALTER TABLE cidade DROP CONSTRAINT IF EXISTS ck_cidade_codigo_ibge;
ALTER TABLE cidade ADD CONSTRAINT ck_cidade_codigo_ibge
  CHECK (codigo_ibge IS NULL OR codigo_ibge ~ '^[0-9]{7}$');
CREATE UNIQUE INDEX IF NOT EXISTS ux_cidade_codigo_ibge
  ON cidade (codigo_ibge) WHERE codigo_ibge IS NOT NULL;

INSERT INTO permissao (modulo, acao, descricao)
VALUES
  ('fiscal', 'ver', 'Consultar situacao e documentos de BP-e'),
  ('fiscal', 'emitir', 'Reprocessar emissao de BP-e'),
  ('fiscal', 'cancelar', 'Solicitar cancelamento de BP-e autorizado'),
  ('fiscal', 'configurar', 'Publicar configuracao operacional de BP-e')
ON CONFLICT (modulo, acao) DO UPDATE SET descricao = EXCLUDED.descricao;

INSERT INTO perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pe.id
FROM perfil p
CROSS JOIN permissao pe
WHERE lower(p.nome) = 'administrador'
  AND pe.modulo = 'fiscal'
ON CONFLICT DO NOTHING;

ALTER TABLE bilhete_documento_fiscal
  ADD COLUMN IF NOT EXISTS ns_nrec varchar(120),
  ADD COLUMN IF NOT EXISTS ambiente smallint,
  ADD COLUMN IF NOT EXISTS serie integer,
  ADD COLUMN IF NOT EXISTS numero integer,
  ADD COLUMN IF NOT EXISTS config_versao_id uuid REFERENCES config_versao(id),
  ADD COLUMN IF NOT EXISTS tentativas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proxima_tentativa_em timestamptz,
  ADD COLUMN IF NOT EXISTS processado_em timestamptz,
  ADD COLUMN IF NOT EXISTS xml_bucket varchar(80),
  ADD COLUMN IF NOT EXISTS xml_objeto_chave text,
  ADD COLUMN IF NOT EXISTS xml_hash_sha256 char(64),
  ADD COLUMN IF NOT EXISTS pdf_bucket varchar(80),
  ADD COLUMN IF NOT EXISTS pdf_objeto_chave text,
  ADD COLUMN IF NOT EXISTS pdf_hash_sha256 char(64),
  ADD COLUMN IF NOT EXISTS cancelamento_protocolo varchar(120),
  ADD COLUMN IF NOT EXISTS cancelamento_xml_bucket varchar(80),
  ADD COLUMN IF NOT EXISTS cancelamento_xml_objeto_chave text,
  ADD COLUMN IF NOT EXISTS cancelamento_xml_hash_sha256 char(64),
  ADD COLUMN IF NOT EXISTS cancelado_em timestamptz;

ALTER TABLE bilhete_documento_fiscal DROP CONSTRAINT IF EXISTS ck_bilhete_documento_fiscal_status;
ALTER TABLE bilhete_documento_fiscal ADD CONSTRAINT ck_bilhete_documento_fiscal_status CHECK (status IN (
  'stub_pendente','stub_emitido',
  'pendente','processando','autorizado','rejeitado','contingencia','erro',
  'cancelamento_pendente','cancelado'
));

ALTER TABLE bilhete_documento_fiscal DROP CONSTRAINT IF EXISTS ck_bilhete_documento_fiscal_ambiente;
ALTER TABLE bilhete_documento_fiscal ADD CONSTRAINT ck_bilhete_documento_fiscal_ambiente
  CHECK (ambiente IS NULL OR ambiente IN (1, 2));

CREATE UNIQUE INDEX IF NOT EXISTS ux_bpe_ambiente_serie_numero
  ON bilhete_documento_fiscal (ambiente, serie, numero)
  WHERE ambiente IS NOT NULL AND serie IS NOT NULL AND numero IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_bpe_fila
  ON bilhete_documento_fiscal (status, proxima_tentativa_em, criado_em)
  WHERE status IN ('pendente','processando','contingencia','erro','cancelamento_pendente');
CREATE INDEX IF NOT EXISTS ix_bpe_ns_nrec
  ON bilhete_documento_fiscal (ns_nrec) WHERE ns_nrec IS NOT NULL;

CREATE TABLE IF NOT EXISTS bpe_numeracao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj_emitente   char(14) NOT NULL,
  ambiente        smallint NOT NULL CHECK (ambiente IN (1, 2)),
  serie           integer NOT NULL CHECK (serie BETWEEN 0 AND 999),
  proximo_numero  integer NOT NULL CHECK (proximo_numero BETWEEN 1 AND 999999999),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cnpj_emitente, ambiente, serie)
);

CREATE TABLE IF NOT EXISTS bpe_webhook_evento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        varchar(40) NOT NULL,
  event_id        varchar(180) NOT NULL,
  chave_bpe       varchar(44),
  status          varchar(30) NOT NULL DEFAULT 'recebido'
    CHECK (status IN ('recebido','processado','ignorado','erro')),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  recebido_em     timestamptz NOT NULL DEFAULT now(),
  processado_em   timestamptz,
  erro            text,
  UNIQUE (provider, event_id)
);

INSERT INTO config_chave (chave, categoria, descricao)
VALUES (
  'vendas_bpe_integracao',
  'fiscal',
  'Provedor, emitente, numeracao, mapeamentos e operacao da emissao de BP-e'
)
ON CONFLICT (chave) DO UPDATE
SET categoria = EXCLUDED.categoria,
    descricao = EXCLUDED.descricao,
    ativo = true,
    atualizado_em = now();

INSERT INTO config_versao (chave_id, versao, valor, ativo, publicado_em, autor_id)
SELECT c.id, 1,
  '{
    "schemaVersion": 1,
    "provider": "ns",
    "habilitada": false,
    "ambiente": "homologacao",
    "versaoLayout": "1.00",
    "serie": null,
    "numeroInicial": null,
    "modal": "1",
    "verProc": "AJC",
    "tpBPe": "0",
    "indPres": "1",
    "emitente": {
      "cnpj": "",
      "ie": "",
      "razaoSocial": "",
      "im": "",
      "cnae": "",
      "crt": "",
      "tar": "",
      "endereco": {
        "logradouro": "",
        "numero": "",
        "bairro": "",
        "codigoIbge": "",
        "municipio": "",
        "uf": "PA"
      }
    },
    "rotas": [],
    "classes": [],
    "pagamentos": [],
    "componenteTarifa": null,
    "tipoDocumentoPassageiroPadrao": null,
    "impostos": {},
    "operacao": {
      "pollingSegundos": 5,
      "tentativasConsulta": 8,
      "retryMinutos": 5,
      "maxTentativas": 5
    }
  }'::jsonb,
  true,
  now(),
  u.id
FROM config_chave c
CROSS JOIN LATERAL (
  SELECT id FROM usuario
  ORDER BY CASE WHEN login = 'admin' THEN 0 ELSE 1 END, criado_em
  LIMIT 1
) u
WHERE c.chave = 'vendas_bpe_integracao'
  AND NOT EXISTS (SELECT 1 FROM config_versao v WHERE v.chave_id = c.id);

COMMIT;
