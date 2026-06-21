-- =============================================================================
-- 0001_extensions.sql
-- Bloco: §1.3 Extensões Postgres necessárias
-- Cobre o passo 0 da ordem de criação (§15).
-- Idempotente (CREATE EXTENSION IF NOT EXISTS).
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis;    -- geography(Point,4326)
CREATE EXTENSION IF NOT EXISTS btree_gist; -- exclusões/índices compostos (vigência)

COMMIT;
