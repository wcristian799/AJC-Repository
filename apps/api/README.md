# `apps/api` — Back NestJS (monolito modular)

Back do ERP/TMS AJC. Um único processo NestJS dividido em **módulos de fronteira clara** (ADR 00 §2.2). O processo `worker` (pg-boss) roda o mesmo código com comando diferente.

## Estado (Fase 0 / E4)
Esqueleto: a app sobe, conecta no Postgres via `DATABASE_URL` e expõe `GET /api/health` (processo + DB). Módulos de domínio são **shells vazios** — sem regra de negócio (isso é Fase 2).

## Rodar (local)
Pré-requisito: Postgres no ar (ver `infra/docker`) e `.env` na raiz com `DATABASE_URL`.
```bash
# da raiz do monorepo
npm install                      # instala deps do workspace
npm --workspace @ajc/api run build
npm --workspace @ajc/api run start          # api em http://localhost:3000/api
npm --workspace @ajc/api run worker         # worker pg-boss (processo separado)
```
Health-check:
```bash
curl http://localhost:3000/api/health
# { "status": "ok", "db": "up", ... }  quando o Postgres está no ar
```

## Estrutura
```
src/
  main.ts                 bootstrap HTTP (prefixo /api)
  worker.ts               processo pg-boss (jobs) — separado da api
  app.module.ts           raiz do monolito modular
  database/               Pool pg único, configurado por DATABASE_URL
  health/                 health-check (processo + conectividade do banco)
  modules/                domínios do MVP (shells vazios na Fase 0):
    auth config cadastros clientes navegacao precos
    tms vendas caixa encomendas crm sync notificacao telemetria audit
```
Cada módulo segue Controller→Service→Repository (ADR 00 §4). Fora-de-MVP (financeiro, veiculos, pdv-fnb, compras, estoque) ganham módulo só quando entrarem nas fases seguintes.

## Decisão pendente (E3-H1)
Runner de migrations no back: **Prisma vs TypeORM**. As migrations atuais são SQL puro em `infra/migrations` (não dependem dessa escolha). Decidir ao implementar o acesso a dados de domínio.
