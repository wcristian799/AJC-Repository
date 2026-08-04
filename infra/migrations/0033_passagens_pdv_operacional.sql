-- Etapa 07: venda presencial de passagens, multipagamento e manifesto por destino.
BEGIN;

INSERT INTO permissao (modulo, acao, descricao)
VALUES ('vendas', 'configurar', 'Publicar regras operacionais do PDV de passagens')
ON CONFLICT (modulo, acao) DO UPDATE SET descricao = EXCLUDED.descricao;

INSERT INTO perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pe.id
FROM perfil p
CROSS JOIN permissao pe
WHERE lower(p.nome) = 'administrador'
  AND pe.modulo = 'vendas'
  AND pe.acao = 'configurar'
ON CONFLICT DO NOTHING;

ALTER TABLE embarcacao ADD COLUMN IF NOT EXISTS foto_url text;

ALTER TABLE bilhete
  ADD COLUMN IF NOT EXISTS origem_sigla varchar(4) REFERENCES cidade(sigla),
  ADD COLUMN IF NOT EXISTS destino_sigla varchar(4) REFERENCES cidade(sigla);

UPDATE bilhete b
SET origem_sigla = COALESCE(b.origem_sigla, v.origem_sigla),
    destino_sigla = COALESCE(b.destino_sigla, v.destino_sigla)
FROM viagem v
WHERE v.id = b.viagem_id
  AND (b.origem_sigla IS NULL OR b.destino_sigla IS NULL);

CREATE INDEX IF NOT EXISTS ix_bilhete_viagem_destino
  ON bilhete (viagem_id, destino_sigla) WHERE status <> 'cancelado';

CREATE TABLE IF NOT EXISTS venda_pos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                varchar(40) NOT NULL UNIQUE,
  caixa_id              uuid NOT NULL REFERENCES caixa(id),
  viagem_id             uuid NOT NULL REFERENCES viagem(id),
  origem_sigla          varchar(4) NOT NULL REFERENCES cidade(sigla),
  destino_sigla         varchar(4) NOT NULL REFERENCES cidade(sigla),
  cliente_id            uuid REFERENCES cliente(id),
  canal                 varchar(30) NOT NULL,
  total_bruto           numeric(12,2) NOT NULL CHECK (total_bruto >= 0),
  total_isencoes        numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_isencoes >= 0),
  total_pago            numeric(12,2) NOT NULL CHECK (total_pago >= 0),
  troco                 numeric(12,2) NOT NULL DEFAULT 0 CHECK (troco >= 0),
  emitir_bpe            boolean NOT NULL DEFAULT false,
  status                varchar(20) NOT NULL DEFAULT 'concluida'
    CHECK (status IN ('concluida', 'cancelada')),
  config_versao_id      uuid NOT NULL REFERENCES config_versao(id),
  tabela_preco_id       uuid REFERENCES tabela_preco(id),
  client_uuid           uuid,
  criado_por            uuid NOT NULL REFERENCES usuario(id),
  criado_em             timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_venda_pos_client_uuid
  ON venda_pos (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_venda_pos_caixa_data ON venda_pos (caixa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_venda_pos_viagem ON venda_pos (viagem_id, criado_em DESC);

ALTER TABLE bilhete ADD COLUMN IF NOT EXISTS venda_pos_id uuid REFERENCES venda_pos(id);
CREATE INDEX IF NOT EXISTS ix_bilhete_venda_pos ON bilhete (venda_pos_id);

CREATE TABLE IF NOT EXISTS venda_pos_item (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_pos_id          uuid NOT NULL REFERENCES venda_pos(id) ON DELETE CASCADE,
  bilhete_id            uuid NOT NULL UNIQUE REFERENCES bilhete(id),
  item_preco_id         uuid REFERENCES item_preco(id),
  valor_tabela          numeric(12,2) NOT NULL CHECK (valor_tabela >= 0),
  valor_cobrado         numeric(12,2) NOT NULL CHECK (valor_cobrado >= 0),
  tipo                  tipo_bilhete NOT NULL,
  observacoes           text
);
CREATE INDEX IF NOT EXISTS ix_venda_pos_item_venda ON venda_pos_item (venda_pos_id);

ALTER TABLE caixa_movimento ADD COLUMN IF NOT EXISTS venda_pos_id uuid REFERENCES venda_pos(id);
CREATE INDEX IF NOT EXISTS ix_caixa_movimento_venda_pos ON caixa_movimento (venda_pos_id);

CREATE TABLE IF NOT EXISTS venda_pos_pagamento (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_pos_id          uuid NOT NULL REFERENCES venda_pos(id) ON DELETE CASCADE,
  caixa_movimento_id    uuid NOT NULL UNIQUE REFERENCES caixa_movimento(id),
  forma_pagamento       forma_pagamento NOT NULL,
  valor_informado       numeric(12,2) NOT NULL CHECK (valor_informado > 0),
  valor_aplicado        numeric(12,2) NOT NULL CHECK (valor_aplicado > 0),
  troco                 numeric(12,2) NOT NULL DEFAULT 0 CHECK (troco >= 0),
  parcelas              smallint NOT NULL DEFAULT 1 CHECK (parcelas BETWEEN 1 AND 24),
  criado_em             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_venda_pos_pagamento_venda ON venda_pos_pagamento (venda_pos_id);

INSERT INTO config_chave (chave, categoria, descricao)
VALUES (
  'vendas_pdv_operacao',
  'vendas',
  'Caixa, classes, gratuidades, pagamentos, fiscal e impressao do PDV de passagens'
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
    "canalPadrao": "pdv",
    "caixa": {
      "tipo": "porto",
      "referenciaPadrao": "Bilheteria do porto",
      "exigirAbertura": true,
      "valorAberturaPadrao": null
    },
    "formasPagamento": [
      {"codigo":"dinheiro","nome":"Dinheiro","ativo":true,"permiteTroco":true,"parcelasMax":1,"acrescimoPercentual":0},
      {"codigo":"pix","nome":"Pix","ativo":true,"permiteTroco":false,"parcelasMax":1,"acrescimoPercentual":0},
      {"codigo":"cartao_credito","nome":"Cartao de credito","ativo":true,"permiteTroco":false,"parcelasMax":2,"acrescimoPercentual":null},
      {"codigo":"cartao_debito","nome":"Cartao de debito","ativo":true,"permiteTroco":false,"parcelasMax":1,"acrescimoPercentual":0}
    ],
    "classes": [
      {"codigo":"rede","nome":"Rede","descricao":"Convés","corPulseira":null,"ativo":true},
      {"codigo":"rede_sala_vip","nome":"Rede Sala VIP","descricao":"Sala climatizada","corPulseira":null,"ativo":true},
      {"codigo":"camarote","nome":"Camarote","descricao":"Acomodação privativa","corPulseira":null,"ativo":true},
      {"codigo":"suite_comum","nome":"Suíte Comum","descricao":"Acomodação privativa","corPulseira":null,"ativo":true},
      {"codigo":"suite_comum_vip","nome":"Suíte Comum VIP","descricao":"Acomodação privativa","corPulseira":null,"ativo":true},
      {"codigo":"suite_master","nome":"Suíte Master","descricao":"Acomodação privativa","corPulseira":null,"ativo":true},
      {"codigo":"suite_master_vip","nome":"Suíte Master VIP","descricao":"Acomodação privativa","corPulseira":null,"ativo":true},
      {"codigo":"mega_suite","nome":"Mega Suíte","descricao":"Acomodação privativa","corPulseira":null,"ativo":true}
    ],
    "gratuidades": [
      {"codigo":"idoso","nome":"Idoso","documentoExigido":"Documento com foto","ativo":true},
      {"codigo":"pcd","nome":"Pessoa com deficiência","documentoExigido":"Documento comprobatório","ativo":true},
      {"codigo":"crianca","nome":"Criança","documentoExigido":"Certidão ou documento","ativo":true},
      {"codigo":"outro","nome":"Outra hipótese legal","documentoExigido":"Documento comprobatório","ativo":true}
    ],
    "fiscal": {
      "pdvPermiteEscolha": true,
      "pdvPadraoEmitir": false,
      "portalObrigatorio": true,
      "agenteOpcional": true,
      "integracaoAtiva": false
    },
    "impressao": {
      "habilitada": false,
      "modeloHomologado": null
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
WHERE c.chave = 'vendas_pdv_operacao'
  AND NOT EXISTS (SELECT 1 FROM config_versao v WHERE v.chave_id = c.id);

COMMIT;
