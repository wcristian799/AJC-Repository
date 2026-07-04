-- =============================================================================
-- 0008_schema_migrations_e_classes_8.sql
-- Dois blocos independentes desta migration:
--
--  (A) Tabela de controle de versão de migration (schema_migrations).
--      Até aqui as migrations eram idempotentes mas sem registro do que já
--      rodou. Esta tabela passa a ser a fonte da verdade do runner
--      (infra/migrations/run.mjs). Registra nome do arquivo, hash e quando aplicou.
--
--  (B) classe_passagem 3 → 8 classes reais (material do Lucas, 30/jun/2026,
--      docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md). O doc canônico
--      (docs/fase-0/01-Modelo-de-Dados-MVP.md §2 linha 71-72) já refletia as 8;
--      a migration 0002 e libs/shared ficaram para trás. Aqui alinhamos o banco.
--
-- ⚠️ ALTER TYPE ... ADD VALUE não pode rodar dentro de bloco de transação em
--    conjunto com o uso do valor. Por isso este arquivo NÃO abre BEGIN/COMMIT:
--    cada statement roda em autocommit. É seguro reaplicar (idempotente).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- (A) Controle de versão de migration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  versao      text        PRIMARY KEY,          -- nome do arquivo, ex.: 0008_...
  hash        text        NOT NULL,             -- sha256 do conteúdo aplicado
  aplicado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE schema_migrations IS
  'Controle de migrations aplicadas. Gerenciada pelo runner infra/migrations/run.mjs.';

-- ---------------------------------------------------------------------------
-- (B) classe_passagem: rede_vip → rede_sala_vip + 5 novas classes
-- ---------------------------------------------------------------------------

-- 1) Renomeia o valor antigo para o nome real da matriz do Lucas.
--    RENAME VALUE é no-op-safe: se já foi renomeado, o valor antigo não existe
--    mais e o bloco DO ignora o erro.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'classe_passagem' AND e.enumlabel = 'rede_vip'
  ) THEN
    ALTER TYPE classe_passagem RENAME VALUE 'rede_vip' TO 'rede_sala_vip';
  END IF;
END $$;

-- 2) Adiciona as 5 classes novas. IF NOT EXISTS torna idempotente (PG12+).
ALTER TYPE classe_passagem ADD VALUE IF NOT EXISTS 'suite_comum';
ALTER TYPE classe_passagem ADD VALUE IF NOT EXISTS 'suite_comum_vip';
ALTER TYPE classe_passagem ADD VALUE IF NOT EXISTS 'suite_master';
ALTER TYPE classe_passagem ADD VALUE IF NOT EXISTS 'suite_master_vip';
ALTER TYPE classe_passagem ADD VALUE IF NOT EXISTS 'mega_suite';

-- Resultado esperado (ordem de criação):
--   rede, camarote, rede_sala_vip, suite_comum, suite_comum_vip,
--   suite_master, suite_master_vip, mega_suite
-- A ordem física do enum não importa para a aplicação (comparação por valor).
