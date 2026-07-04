-- 0016 - Fila/auditoria de impressao de etiquetas TMS

CREATE TABLE IF NOT EXISTS etiqueta_impressao (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id      uuid        NOT NULL REFERENCES volume(id),
  tipo           varchar(20) NOT NULL CHECK (tipo IN ('impressao','reimpressao')),
  status         varchar(30) NOT NULL DEFAULT 'stub_enfileirado',
  protocolo      varchar(40) NOT NULL,
  printer_model  varchar(120),
  printer_mac    varchar(60),
  payload        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  solicitado_por uuid        REFERENCES usuario(id),
  client_uuid    uuid,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_etiqueta_impressao_protocolo ON etiqueta_impressao (protocolo);
CREATE UNIQUE INDEX IF NOT EXISTS ux_etiqueta_impressao_client_uuid ON etiqueta_impressao (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_etiqueta_impressao_volume ON etiqueta_impressao (volume_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_etiqueta_impressao_criado ON etiqueta_impressao (criado_em DESC);
