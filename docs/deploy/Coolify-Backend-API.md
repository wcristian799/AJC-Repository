# Deploy Coolify - Backend API AJC

Dominio da API: `https://apiajc.byteintelligence.com.br`
Front aprovado: `https://ajcmvp.vercel.app`

## Build

Use o `Dockerfile` da raiz do repositorio.

Porta interna do container: `3000`.

## Variaveis de ambiente

Baseie-se em `apps/api/.env.coolify.example`.

Obrigatorias:

- `NODE_ENV=production`
- `API_PORT=3000`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `CORS_ORIGINS=https://ajcmvp.vercel.app`

Enquanto nao houver fornecedor/credenciais reais:

- `PAYMENT_GATEWAY_MODE=stub`
- `BPE_MODE=stub`
- `WHATSAPP_MODE=stub`
- `BLUETOOTH_PRINT_MODE=stub`

## Banco

O backend usa SQL puro e runner `schema_migrations`, sem ORM.

Para aplicar migrations dentro do container:

```bash
node infra/migrations/run.mjs
```

Para aplicar seed minimo:

```bash
node infra/seed/run.mjs
```

Ambos usam `DATABASE_URL`.

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
