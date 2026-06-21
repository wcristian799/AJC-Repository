# AJC — ERP/TMS de transporte fluvial (monorepo)

Monorepo do sistema de gestão da AJC. Stack: **NestJS** (back) · **React** (web) · **Ionic/Capacitor** (apps de campo) · **PostgreSQL + PostGIS** · **pg-boss** (fila) · **Firebase** (GPS) · **Nx** (monorepo).

> **Comece por aqui:** leia `CLAUDE.md` (decisões e regra de continuidade) e `docs/STATUS.md` (onde paramos).

## Pré-requisitos
- Node ≥ 20 (testado em Node 24) · npm (pnpm não usado neste ambiente)
- Docker Desktop (para o Postgres local)

## Estrutura
```
apps/          back (api) + fronts (web-console, web-pdv) + apps de campo (Capacitor)
libs/          shared (tipos/contratos/validação), ui, ui-field, offline-sync, config-client
infra/         docker (compose), migrations (SQL), seed
docs/          PRD, SPEC, módulos, UX, arquitetura (ADRs), fase-0, STATUS
```

## Subir o banco e aplicar o schema (teste de fogo)
```bash
cp .env.example .env                       # ajuste se necessário
# sobe Postgres+PostGIS e aplica as migrations 0001..0007:
docker compose -f infra/docker/docker-compose.yml --profile tools up --build migrate
# (o serviço 'migrate' depende do 'postgres' saudável e roda os SQL em ordem)

# aplicar o seed mínimo depois das migrations:
docker compose -f infra/docker/docker-compose.yml exec -T postgres \
  psql -U ajc -d ajc < infra/seed/0001_seed_minimo.sql
```
Verificação rápida:
```bash
docker compose -f infra/docker/docker-compose.yml exec postgres \
  psql -U ajc -d ajc -c "SELECT postgis_version();"
docker compose -f infra/docker/docker-compose.yml exec postgres \
  psql -U ajc -d ajc -c "\dt"          # deve listar 41 tabelas
docker compose -f infra/docker/docker-compose.yml exec postgres \
  psql -U ajc -d ajc -c "SELECT count(*) FROM cidade;"   # 8
```

## Estado atual (Fase 0)
Em construção. Já existe: estrutura do monorepo, tipos de domínio (`libs/shared/domain-types`), migrations completas do MVP (41 tabelas), seed mínimo, docker-compose do banco. **Falta** (ver `docs/STATUS.md`): esqueleto NestJS (api/worker), front (web-console + design system), app Capacitor PoC, CI, e o teste de fogo do banco num Postgres vivo (Docker pendente de inicialização nesta máquina).

## Convenções
- PT-BR em docs; código em inglês com termos de negócio preservados.
- Sem valor de negócio hard-coded → motor de config.
- Branches via feature branch + PR (sem push direto na main).
- Commits: Conventional Commits.
