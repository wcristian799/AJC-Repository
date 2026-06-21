-- =============================================================================
-- 0007_constraints_adiadas.sql
-- Bloco: §15 nota † — FKs adiadas por dependência circular / ordem de criação.
--   1. item_preco.embarcacao_id  → embarcacao(id)   (tabela criada em 0004 sem FK;
--                                                     embarcacao só existe depois)
--   2. bilhete.caixa_movimento_id → caixa_movimento(id)  (par circular com
--                                                     caixa_movimento.bilhete_id)
-- Idempotente: cada ADD CONSTRAINT é envolvido em bloco DO que ignora duplicação.
-- =============================================================================

BEGIN;

-- 1. item_preco.embarcacao_id → embarcacao(id)
DO $$
BEGIN
  ALTER TABLE item_preco
    ADD CONSTRAINT fk_item_preco_embarcacao
    FOREIGN KEY (embarcacao_id) REFERENCES embarcacao(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. bilhete.caixa_movimento_id → caixa_movimento(id)
DO $$
BEGIN
  ALTER TABLE bilhete
    ADD CONSTRAINT fk_bilhete_caixa_movimento
    FOREIGN KEY (caixa_movimento_id) REFERENCES caixa_movimento(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
