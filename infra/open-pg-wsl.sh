#!/usr/bin/env bash
# Abre o Postgres do WSL para conexões do Windows (host). Rodar como root.
set -e
CONF=/etc/postgresql/16/main/postgresql.conf
HBA=/etc/postgresql/16/main/pg_hba.conf
sed -i "s/^#\?listen_addresses.*/listen_addresses = '*'/" "$CONF"
if ! grep -q 'AJC WSL' "$HBA"; then
  echo 'host all all 0.0.0.0/0 scram-sha-256  # AJC WSL' >> "$HBA"
fi
pg_ctlcluster 16 main restart
sleep 2
echo "=== listen_addresses ==="
su - postgres -c "psql -d ajc -tAc \"SHOW listen_addresses;\""
echo "=== socket ==="
ss -ltn | grep 5432 || echo "sem 5432"
echo "=== OK ==="
