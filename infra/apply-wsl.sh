#!/usr/bin/env bash
# Aplica migrations + seed no Postgres do WSL (db ajc). Idempotente.
set -e
SRC="/mnt/c/Users/Administrador/Desktop/Trabalho/AJC"
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGDATABASE="${PGDATABASE:-ajc}"
export PGUSER="${PGUSER:-ajc}"
export PGPASSWORD="${PGPASSWORD:-ajc_dev}"
echo "=== aplicando migrations ==="
for f in "$SRC"/infra/migrations/0*.sql; do
  echo ">> $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -f "$f" >/tmp/mig.log 2>&1 || { echo "ERRO:"; tail -8 /tmp/mig.log; exit 1; }
done
echo "=== aplicando seed ==="
for f in "$SRC"/infra/seed/0*.sql; do
  echo ">> $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -f "$f" >/tmp/seed.log 2>&1 || { echo "ERRO:"; tail -8 /tmp/seed.log; exit 1; }
done
echo "=== OK ==="
