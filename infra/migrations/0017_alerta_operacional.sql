-- 0017 - Alertas operacionais cadastraveis do dashboard

DO $$ BEGIN
  CREATE TYPE severidade_alerta_operacional AS ENUM ('info','warning','danger');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_alerta_operacional AS ENUM ('aberto','resolvido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS alerta_operacional (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        varchar(160) NOT NULL,
  detalhe       text NOT NULL,
  severidade    severidade_alerta_operacional NOT NULL DEFAULT 'warning',
  status        status_alerta_operacional NOT NULL DEFAULT 'aberto',
  origem        varchar(40) NOT NULL DEFAULT 'manual',
  modulo        varchar(60),
  entidade      varchar(60),
  entidade_id   uuid,
  client_uuid   uuid,
  criado_por    uuid REFERENCES usuario(id),
  resolvido_por uuid REFERENCES usuario(id),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  resolvido_em  timestamptz,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_alerta_operacional_client_uuid
  ON alerta_operacional (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_alerta_operacional_status
  ON alerta_operacional (status, criado_em DESC);

DROP TRIGGER IF EXISTS trg_alerta_operacional_atualizado_em ON alerta_operacional;
CREATE TRIGGER trg_alerta_operacional_atualizado_em BEFORE UPDATE ON alerta_operacional
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
