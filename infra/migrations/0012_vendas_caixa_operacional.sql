-- =============================================================================
-- 0012_vendas_caixa_operacional.sql
-- Bloco: Vendas/Caixa/Bilhetes operacional para ligar o front aprovado.
--
-- A migration 0006 criou o nucleo fiscal/financeiro. Esta camada adiciona os
-- snapshots que o PDV, manifesto, area do cliente e app de embarque precisam:
-- codigo legivel do bilhete, documento do passageiro, assento/camarote,
-- canal de venda, referencia/tipo do caixa e observacao no movimento.
-- =============================================================================

BEGIN;

ALTER TABLE bilhete
  ADD COLUMN IF NOT EXISTS codigo varchar(40),
  ADD COLUMN IF NOT EXISTS passageiro_documento varchar(40),
  ADD COLUMN IF NOT EXISTS assento varchar(40),
  ADD COLUMN IF NOT EXISTS canal varchar(30),
  ADD COLUMN IF NOT EXISTS observacoes text;

UPDATE bilhete
SET codigo = 'BIL-' || upper(substr(replace(id::text, '-', ''), 1, 10))
WHERE codigo IS NULL;

DO $$
BEGIN
  ALTER TABLE bilhete
    ADD CONSTRAINT uq_bilhete_codigo UNIQUE (codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE bilhete
  ALTER COLUMN codigo SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_bilhete_codigo ON bilhete (codigo);
CREATE INDEX IF NOT EXISTS ix_bilhete_canal ON bilhete (canal);

ALTER TABLE caixa
  ADD COLUMN IF NOT EXISTS tipo varchar(30) NOT NULL DEFAULT 'porto',
  ADD COLUMN IF NOT EXISTS referencia varchar(120) NOT NULL DEFAULT 'Caixa operacional';

CREATE INDEX IF NOT EXISTS ix_caixa_tipo_status ON caixa (tipo, status);

ALTER TABLE caixa_movimento
  ADD COLUMN IF NOT EXISTS observacao text;

ALTER TABLE cortesia
  ADD COLUMN IF NOT EXISTS client_uuid uuid,
  ADD COLUMN IF NOT EXISTS observacoes text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cortesia_client_uuid ON cortesia (client_uuid) WHERE client_uuid IS NOT NULL;

COMMIT;
