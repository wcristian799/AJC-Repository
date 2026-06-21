# STATUS — Diário vivo do projeto AJC

> Atualize ao fim de cada bloco de trabalho. Topo = mais recente. Uma sessão nova lê o `CLAUDE.md` e depois este arquivo para saber exatamente onde retomar.

## Onde estamos agora
**Fase atual:** Fase 0 — fundação técnica (repo + docker + banco + esqueletos).
**Status:** planejamento da Fase 0 completo (épicos + modelo de dados). Construção do repositório em andamento — fundação do monorepo, tipos, migrations e docker do banco prontos; falta esqueleto back/front/Capacitor e o teste de fogo do banco.

### Já construído (verificável)
- Monorepo: `package.json`, `nx.json`, `tsconfig.base.json` (paths `@ajc/*`), `.gitignore`, `.env.example`, `README.md`.
- `libs/shared/domain-types`: enums do MVP em TS espelhando o banco — **compila limpo no tsc** (exit 0).
- `infra/migrations/0001..0007`: schema completo do MVP (**41 tabelas, 27 enums**, FKs circulares adiadas) — validado no parser oficial do Postgres. Ainda NÃO aplicado em banco vivo.
- `infra/seed/0001_seed_minimo.sql`: 8 cidades, 8 perfis, catálogo de permissões, admin placeholder, chaves de config vazias. Idempotente.
- `infra/docker/docker-compose.yml`: Postgres+PostGIS + serviço `migrate` que aplica os SQL em ordem.

### Bloqueio nesta máquina
- **Docker Desktop não inicializa** sem aceite de licença/setup interativo (daemon não responde a `docker info`). Por isso o **teste de fogo do banco** (aplicar migrations num Postgres vivo) ficou pendente. Não é problema do código — é setup da máquina.

## Próximo passo imediato (retomada)
1. **Subir o Docker Desktop manualmente** uma vez (aceitar licença) e rodar o teste de fogo do banco conforme o `README.md` (seção "Subir o banco"). Conferir: 41 tabelas, `postgis_version()`, seed (8 cidades), índices únicos parciais de `client_uuid`, FKs adiadas. Corrigir migration se algo quebrar no banco real.
2. **E4 — Esqueleto NestJS** (`apps/api`): subir, conectar via `DATABASE_URL`, `GET /health` (processo + DB), módulos vazios, fundação RBAC (guard) e do motor de config (leitura+cache), worker pg-boss. 
3. **E5 — Front** (`apps/web-console`): `libs/ui` (tokens da Fundação UX) + shell de navegação.
4. **E6 — App Capacitor PoC** (`field-conferente`): abre e lê QR (`@capacitor-mlkit/barcode-scanning`).
5. **E7 — CI**: lint/build/test + `migrate` do zero no CI; Husky/commitlint.
6. **E8 — Spike offline-sync** (PowerSync vs fila própria) após E4+E6.

> Decisão técnica pendente registrada no E3-H1: **Prisma vs TypeORM** para o runner de migrations do back. As migrations atuais são SQL puro (não dependem dessa escolha). Decidir ao iniciar o E4.

## Linha do tempo (resumo)
- **Etapa 1 — Discovery/Produto:** PRD + SPEC global + 9 módulos documentados (`docs/`, `docs/modulos/`).
- **Etapa 2 — UX:** Fundação (design system/shell/acesso) + UX detalhada de TMS, Vendas, CRM, Cadastros, Navegação-core (`docs/ux/`). Telas com wireframes ASCII.
- **Etapa 3 — Roadmap:** recorte do MVP e backlog pós-MVP (`docs/ROADMAP-Pos-MVP.md`).
- **Etapa 4 — Arquitetura:** stack e repo definidos (ADR 00); spikes técnicos pesquisados — offline-sync (PowerSync), hardware (celular + impressão PC/USB), hospedagem (VPS Hostinger) (ADR 01).
- **Etapa 5 — Fase 0 (em curso):** regra de continuidade criada (`CLAUDE.md` + este arquivo). Construção do repo a seguir.

## Decisões recentes
- Hardware simplificado: celular comum (não coletor industrial) + impressão térmica no PC via USB (não Bluetooth). Reduziu os riscos altos de 2 para 1 (só GPS background, que é fase posterior).
- Sequência confirmada com o cliente: Fase 0 → telas mockadas para aprovação comercial → MVP funcional → avançados.
- Telas de aprovação serão front real mockado (reaproveitável), não protótipo descartável.

## Pendências do cliente (🔶) — não bloqueiam a Fase 0
- Tabela de preço de encomendas (Lucas).
- Textos: termo de aceite de embarque, declaração de conteúdo, termo de veículos.
- Cores de pulseira por classe.
- Modelo da impressora de etiqueta (define ESC-POS vs ZPL).
- Regras de comissão de agentes (diretoria).
- Provedores: pagamento, WhatsApp/SMS.

## Spikes técnicos a executar (ver ADR 01)
- Offline-sync: PowerSync self-hosted vs fila própria (1º spike, antes do TMS).
- GPS background em celular real (paralelo; afeta só rastreamento).
- Impressão PC/USB com a impressora definida.
