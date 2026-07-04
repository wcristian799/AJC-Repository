-- =============================================================================
-- 0010_navegacao_operacional.sql
-- Ajustes operacionais da Fase 2 para ligar o front aprovado ao backend.
-- Fonte: validação do cliente + material Lucas/FAQ 2026.
-- =============================================================================

-- status_viagem precisa aceitar cancelamento operacional exibido no front.
ALTER TYPE status_viagem ADD VALUE IF NOT EXISTS 'cancelada';

BEGIN;

-- Embarcação é cadastro mestre: nome não deve duplicar entre registros vivos.
CREATE UNIQUE INDEX IF NOT EXISTS ux_embarcacao_nome_viva
  ON embarcacao (nome)
  WHERE excluido_em IS NULL;

-- Viagem precisa expor código gerado, destino e capacidade operacional editável
-- para "Nova viagem" (redes/camarotes por classe).
ALTER TABLE viagem
  ADD COLUMN IF NOT EXISTS codigo varchar(30),
  ADD COLUMN IF NOT EXISTS destino_sigla varchar(4) REFERENCES cidade(sigla),
  ADD COLUMN IF NOT EXISTS capacidade_pax_disponivel jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS client_uuid uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS ux_viagem_codigo
  ON viagem (codigo)
  WHERE codigo IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_viagem_client_uuid
  ON viagem (client_uuid);

CREATE INDEX IF NOT EXISTS ix_viagem_destino_sigla ON viagem (destino_sigla);

ALTER TABLE viagem_escala
  ADD COLUMN IF NOT EXISTS observacao varchar(240);

COMMIT;
