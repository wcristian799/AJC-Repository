#!/usr/bin/env bash
# Builda e testa a API dentro do WSL (localhost:5432 nativo para o Postgres).
set -e
export PATH=/usr/local/bin:$PATH
APP=/mnt/c/Users/Administrador/Desktop/Trabalho/AJC/apps/api
# Trabalhar numa cópia em filesystem Linux (evita lentidão/locks do /mnt e node_modules Windows)
WORK=/root/ajc-api
rm -rf "$WORK"
mkdir -p "$WORK"
cp -r "$APP"/dist "$WORK"/ 2>/dev/null || true
cp "$APP"/package.json "$WORK"/
cd "$WORK"
echo "=== npm install (prod) ==="
npm install --omit=dev --no-audit --no-fund >/tmp/wsl-npm.log 2>&1 || { tail -10 /tmp/wsl-npm.log; exit 1; }
echo "=== subindo API ==="
DATABASE_URL="postgresql://ajc:ajc_dev@localhost:5432/ajc" API_PORT=3010 node dist/apps/api/src/main.js >/tmp/wsl-api.log 2>&1 &
APIPID=$!
sleep 6
echo "=== health (de dentro do WSL) ==="
curl -s http://localhost:3010/api/health
echo ""
kill $APIPID 2>/dev/null || true
echo "=== log ==="
sed 's/\x1b\[[0-9;]*m//g' /tmp/wsl-api.log | tail -4
