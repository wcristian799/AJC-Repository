-- =============================================================================
-- 0011_tms_operacional.sql
-- Ajustes da Fase 2 para ligar TMS/Carga/Encomendas ao front aprovado.
-- Fonte: Nova Carga do Lucas, apps de campo e Encomendas aprovadas no front.
-- =============================================================================

BEGIN;

ALTER TABLE carga
  ADD COLUMN IF NOT EXISTS codigo varchar(40),
  ADD COLUMN IF NOT EXISTS numero_pedido varchar(120),
  ADD COLUMN IF NOT EXISTS categoria varchar(20) NOT NULL DEFAULT 'carga',
  ADD COLUMN IF NOT EXISTS cidade_origem_sigla varchar(4) REFERENCES cidade(sigla),
  ADD COLUMN IF NOT EXISTS peso_total numeric(10,3),
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE carga
  DROP CONSTRAINT IF EXISTS ck_carga_categoria;

ALTER TABLE carga
  ADD CONSTRAINT ck_carga_categoria CHECK (categoria IN ('carga', 'encomenda'));

CREATE UNIQUE INDEX IF NOT EXISTS ux_carga_codigo
  ON carga (codigo)
  WHERE codigo IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_carga_categoria ON carga (categoria);
CREATE INDEX IF NOT EXISTS ix_carga_cidade_origem ON carga (cidade_origem_sigla);

ALTER TABLE documento_fiscal
  ADD COLUMN IF NOT EXISTS origem varchar(20) NOT NULL DEFAULT 'manual';

ALTER TABLE documento_fiscal
  DROP CONSTRAINT IF EXISTS ck_documento_fiscal_origem;

ALTER TABLE documento_fiscal
  ADD CONSTRAINT ck_documento_fiscal_origem CHECK (origem IN ('cliente', 'agente', 'manual'));

COMMIT;
