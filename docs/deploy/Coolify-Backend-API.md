# Deploy Coolify - Backend API AJC

Dominio da API: `https://apiajc.byteintelligence.com.br`
Front aprovado: `https://ajcmvp.vercel.app`

## Caminho recomendado no Coolify

Use **Docker Compose** apontando para:

```text
docker-compose.coolify.yml
```

Esse compose sobe:

- `postgres`: PostgreSQL 16 + PostGIS.
- `api`: NestJS em `:3000`.
- `worker`: processo separado `pg-boss`, usando a mesma imagem da API.

O `Dockerfile` da raiz continua sendo usado pelo compose para construir `api` e `worker`.

No dominio do Coolify, aponte `https://apiajc.byteintelligence.com.br` para o servico `api`, porta interna `3000`.

## Variaveis de ambiente

Baseie-se em `apps/api/.env.coolify.example`.

Obrigatorias:

- `NODE_ENV=production`
- `API_PORT=3000`
- `POSTGRES_USER=ajc`
- `POSTGRES_PASSWORD=...`
- `POSTGRES_DB=ajc`
- `DATABASE_URL=postgresql://ajc:SENHA@postgres:5432/ajc`
- `AUTH_TOKEN_SECRET=...`
- `AUTH_ACCESS_TTL_SECONDS=900`
- `AUTH_REFRESH_TTL_SECONDS=2592000`
- `CORS_ORIGINS=https://ajcmvp.vercel.app`

Enquanto nao houver fornecedor/credenciais reais:

- `PAYMENT_GATEWAY_MODE=stub`
- `BPE_MODE=stub`
- `WHATSAPP_MODE=stub`
- `BLUETOOTH_PRINT_MODE=stub`

## Banco

O backend usa SQL puro e runner `schema_migrations`, sem ORM.

No deploy com `docker-compose.coolify.yml`, o banco sobe no servico `postgres` com imagem `postgis/postgis:16-3.4` e volume persistente `ajc_postgres_data`.

Para aplicar migrations dentro do container:

```bash
node infra/migrations/run.mjs
```

Para aplicar seed minimo:

```bash
node infra/seed/run.mjs
```

Ambos usam `DATABASE_URL`.

## Fila pg-boss

O worker sobe como servico separado:

```text
worker
```

Comando:

```bash
node apps/api/dist/apps/api/src/worker.js
```

Ele usa a mesma `DATABASE_URL` e inicializa o schema `pgboss`. As integracoes externas reais ainda continuam em stub ate existirem fornecedores/credenciais.

## Healthcheck

Coolify pode verificar:

```text
GET /api/health
```

URL publica esperada:

```text
https://apiajc.byteintelligence.com.br/api/health
```

## CORS

O backend aceita apenas os origins configurados em `CORS_ORIGINS`.
Para producao, mantenha:

```text
CORS_ORIGINS=https://ajcmvp.vercel.app
```

Adicione origins locais apenas para smoke/debug temporario.
