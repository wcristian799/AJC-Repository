-- =============================================================================
-- 0035_tms_fluxo_volume_simplificado.sql
-- Fluxo aprovado: cadastrado -> conferido -> embarcado -> entregue.
-- Cross-docking: cadastrado -> embarcado. Divergente e estado de excecao.
-- Os tipos antigos do enum permanecem apenas para leitura do historico imutavel.
-- =============================================================================

BEGIN;

-- Normaliza o estado atual sem apagar a trilha append-only de evento_volume.
UPDATE volume SET status = 'conferido' WHERE status::text = 'recebido';
UPDATE volume SET status = 'embarcado' WHERE status::text IN ('reconferido', 'desembarcado');

ALTER TABLE volume DROP CONSTRAINT IF EXISTS ck_volume_status_fluxo_atual;
ALTER TABLE volume ADD CONSTRAINT ck_volume_status_fluxo_atual
  CHECK (status::text IN ('cadastrado', 'conferido', 'embarcado', 'entregue', 'divergente'));

-- Eventos antigos continuam consultaveis para auditoria, mas novos eventos so
-- podem usar os quatro bipes/estados vigentes e a excecao de divergencia.
ALTER TABLE evento_volume DROP CONSTRAINT IF EXISTS ck_evento_volume_tipo_fluxo_atual;
ALTER TABLE evento_volume ADD CONSTRAINT ck_evento_volume_tipo_fluxo_atual
  CHECK (tipo::text IN ('conferido', 'embarcado', 'entregue', 'divergencia')) NOT VALID;

-- A mesma estrutura auditavel atende a conferencia no porto e o embarque na
-- embarcacao. O modo define o estado produzido pelo bipe.
ALTER TABLE conferencia_recebimento
  ADD COLUMN IF NOT EXISTS modo_operacao varchar(24) NOT NULL DEFAULT 'conferencia';

ALTER TABLE conferencia_recebimento DROP CONSTRAINT IF EXISTS ck_conferencia_modo_operacao;
ALTER TABLE conferencia_recebimento ADD CONSTRAINT ck_conferencia_modo_operacao
  CHECK (modo_operacao IN ('conferencia', 'embarque'));

ALTER TABLE conferencia_recebimento_volume
  DROP CONSTRAINT IF EXISTS conferencia_recebimento_volume_status_check;

UPDATE conferencia_recebimento_volume SET status = 'conferido' WHERE status = 'recebido';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conferencia_recebimento_volume' AND column_name = 'recebido_em'
  ) THEN
    ALTER TABLE conferencia_recebimento_volume RENAME COLUMN recebido_em TO conferido_em;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conferencia_recebimento_volume' AND column_name = 'recebido_por'
  ) THEN
    ALTER TABLE conferencia_recebimento_volume RENAME COLUMN recebido_por TO conferido_por;
  END IF;
END $$;

ALTER TABLE conferencia_recebimento_volume ADD CONSTRAINT conferencia_recebimento_volume_status_check
  CHECK (status IN ('alocado', 'conferido', 'embarcado'));

CREATE INDEX IF NOT EXISTS ix_conferencia_viagem_modo_status
  ON conferencia_recebimento (viagem_id, modo_operacao, status, aberta_em DESC);

COMMIT;
