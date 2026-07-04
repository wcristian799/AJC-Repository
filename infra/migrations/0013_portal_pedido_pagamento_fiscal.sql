-- =============================================================================
-- 0013_portal_pedido_pagamento_fiscal.sql
-- Portal online MVP: Pedido, Reserva, Pagamento/Webhook e Fiscal stub.
--
-- O gateway e BP-e reais continuam externos/pendentes. Esta migration cria o
-- contrato persistente e plugavel para operar o portal sem fingir integracao.
-- Concorrencia sem overbooking fica na aplicacao via transacao + advisory lock
-- por viagem/classe/assento, validando capacidade contra bilhetes/reservas.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS portal_pedido (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                varchar(40) NOT NULL,
  cliente_id            uuid REFERENCES cliente(id),
  visitante_nome        varchar(160),
  visitante_documento   varchar(40),
  visitante_email       varchar(160),
  visitante_whatsapp    varchar(40),
  viagem_id             uuid NOT NULL REFERENCES viagem(id),
  status                varchar(40) NOT NULL DEFAULT 'iniciado',
  valor_total           numeric(12,2) NOT NULL DEFAULT 0,
  moeda                 varchar(3) NOT NULL DEFAULT 'BRL',
  canal                 varchar(30) NOT NULL DEFAULT 'portal',
  termo_aceito          boolean NOT NULL DEFAULT false,
  termo_aceito_em       timestamptz,
  termo_versao_id       uuid REFERENCES config_versao(id),
  expira_em             timestamptz,
  pago_em               timestamptz,
  emitido_em            timestamptz,
  client_uuid           uuid,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_portal_pedido_status CHECK (status IN (
    'iniciado','reservado','aguardando_pagamento','pago','emitido',
    'expirado','falha_pagamento','cancelado'
  ))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_pedido_codigo ON portal_pedido (codigo);
CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_pedido_client_uuid ON portal_pedido (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_portal_pedido_cliente ON portal_pedido (cliente_id);
CREATE INDEX IF NOT EXISTS ix_portal_pedido_status_expira ON portal_pedido (status, expira_em);

DROP TRIGGER IF EXISTS trg_portal_pedido_atualizado_em ON portal_pedido;
CREATE TRIGGER trg_portal_pedido_atualizado_em BEFORE UPDATE ON portal_pedido
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS portal_reserva (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id      uuid NOT NULL REFERENCES portal_pedido(id) ON DELETE CASCADE,
  viagem_id      uuid NOT NULL REFERENCES viagem(id),
  classe         classe_passagem NOT NULL,
  subtipo        varchar(60),
  assento        varchar(40),
  quantidade     integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_unitario numeric(12,2) NOT NULL,
  status         varchar(30) NOT NULL DEFAULT 'ativa',
  expira_em      timestamptz NOT NULL,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_portal_reserva_status CHECK (status IN ('ativa','confirmada','expirada','cancelada'))
);
CREATE INDEX IF NOT EXISTS ix_portal_reserva_viagem_classe ON portal_reserva (viagem_id, classe, status, expira_em);
CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_reserva_assento_ativo
  ON portal_reserva (viagem_id, classe, assento)
  WHERE assento IS NOT NULL AND status IN ('ativa','confirmada');

DROP TRIGGER IF EXISTS trg_portal_reserva_atualizado_em ON portal_reserva;
CREATE TRIGGER trg_portal_reserva_atualizado_em BEFORE UPDATE ON portal_reserva
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS portal_pagamento (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id             uuid NOT NULL REFERENCES portal_pedido(id) ON DELETE CASCADE,
  gateway               varchar(40) NOT NULL DEFAULT 'stub',
  gateway_payment_id    varchar(120),
  metodo                varchar(30) NOT NULL,
  status                varchar(30) NOT NULL DEFAULT 'pendente',
  valor                 numeric(12,2) NOT NULL,
  moeda                 varchar(3) NOT NULL DEFAULT 'BRL',
  payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmado_em         timestamptz,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_portal_pagamento_metodo CHECK (metodo IN ('pix','cartao_credito','cartao_debito')),
  CONSTRAINT ck_portal_pagamento_status CHECK (status IN ('pendente','aprovado','recusado','cancelado','estornado'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_pagamento_gateway_id ON portal_pagamento (gateway, gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_portal_pagamento_pedido ON portal_pagamento (pedido_id);

DROP TRIGGER IF EXISTS trg_portal_pagamento_atualizado_em ON portal_pagamento;
CREATE TRIGGER trg_portal_pagamento_atualizado_em BEFORE UPDATE ON portal_pagamento
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE IF NOT EXISTS portal_webhook_evento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway        varchar(40) NOT NULL,
  event_id       varchar(160) NOT NULL,
  status         varchar(30) NOT NULL DEFAULT 'recebido',
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  recebido_em    timestamptz NOT NULL DEFAULT now(),
  processado_em  timestamptz,
  erro           text,
  CONSTRAINT ck_portal_webhook_status CHECK (status IN ('recebido','processado','ignorado','erro'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_webhook_gateway_event ON portal_webhook_evento (gateway, event_id);

CREATE TABLE IF NOT EXISTS bilhete_documento_fiscal (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bilhete_id     uuid NOT NULL REFERENCES bilhete(id) ON DELETE CASCADE,
  tipo           varchar(20) NOT NULL DEFAULT 'BPe',
  status         varchar(30) NOT NULL DEFAULT 'stub_pendente',
  provider       varchar(60) NOT NULL DEFAULT 'stub',
  chave          varchar(120),
  protocolo      varchar(120),
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  emitido_em     timestamptz,
  erro           text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_bilhete_documento_fiscal_status CHECK (status IN (
    'stub_pendente','stub_emitido','pendente','emitido','erro','cancelado'
  ))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bilhete_documento_fiscal_bilhete ON bilhete_documento_fiscal (bilhete_id);

DROP TRIGGER IF EXISTS trg_bilhete_documento_fiscal_atualizado_em ON bilhete_documento_fiscal;
CREATE TRIGGER trg_bilhete_documento_fiscal_atualizado_em BEFORE UPDATE ON bilhete_documento_fiscal
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

COMMIT;
