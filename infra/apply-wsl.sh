#!/usr/bin/env bash
# Aplica migrations + seed no Postgres do WSL (db ajc). Idempotente.
set -e
SRC="/mnt/c/Users/Administrador/Desktop/Trabalho/AJC"
export DATABASE_URL="${DATABASE_URL:-postgresql://ajc:ajc_dev@localhost:5432/ajc}"
echo "=== aplicando migrations ==="
node "$SRC/infra/migrations/run.mjs"
echo "=== aplicando seed ==="
node "$SRC/infra/seed/run.mjs"
echo "=== OK ==="
