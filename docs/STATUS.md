# STATUS — Diário vivo do projeto AJC

> Atualize ao fim de cada bloco de trabalho. Topo = mais recente. Uma sessão nova lê o `CLAUDE.md` e depois este arquivo para saber exatamente onde retomar.

## Onde estamos agora
**Fase atual:** Fase 0 — fundação técnica. **Banco + API validados rodando no WSL.**
**Status:** monorepo, tipos, migrations (42 tabelas) e seed prontos e APLICADOS em Postgres vivo; esqueleto NestJS sobe e o health-check confirma `db:up`. Falta: front + design system, app Capacitor PoC, CI, spike offline-sync.

### Já construído e VERIFICADO
- Monorepo: configs Nx, `tsconfig.base.json` (paths `@ajc/*`), `.gitignore`, `.env.example`, READMEs.
- `libs/shared/domain-types`: enums do MVP — tsc OK.
- `infra/migrations/0001..0007` + `infra/seed`: **aplicados em Postgres 16.14+PostGIS 3.6 no WSL** (teste de fogo verde — ver seção do banco).
- `apps/api` (NestJS): main + worker pg-boss + database pool + health + módulos vazios. **Build OK; `GET /api/health` → `db:up`** rodando no WSL.

### Banco — RESOLVIDO via WSL2 (Docker Desktop abandonado)
- **Docker Desktop (4.78 e 4.77) é inutilizável nesta máquina:** o "Inference manager" tenta criar o socket `unix://C:/...dockerInference` (caminho inválido no Windows) e derruba o app no boot, em ambas as versões, mesmo com `enableInference:false`. O lock via `admin-settings.json` exige licença Docker Business (não temos). **Decisão: não usar Docker Desktop.**
- **Solução adotada:** PostgreSQL **16.14 + PostGIS 3.6** instalados **nativos no WSL2 (Ubuntu-22.04)** via repositório PGDG. Cluster online na porta 5432. Role `ajc` / senha `ajc_dev` / db `ajc`.
- **TESTE DE FOGO PASSOU** (banco vivo): 42 tabelas, 27 enums, 9 índices únicos de `client_uuid`, índice GiST de geolocalização, FKs circulares adiadas OK, seed (8 cidades/8 perfis/13 permissões/7 configs), idempotência confirmada.

### Ambiente de execução = WSL (Linux), não Windows
- O forward de rede WSL2↔Windows (NAT, Win10 build 19045) é **instável**: `localhost`/`127.0.0.1` do Windows não alcança o Postgres do WSL de forma confiável (Node resolve `localhost`→IPv6 `::1`; NAT cobre só IPv4 e de forma intermitente; portproxy via IP do WSL também caiu porque o IP da VM muda a cada restart). `mirrored` não é suportado no Win10.
- **Decisão:** rodar o **back (Node/NestJS) DENTRO do WSL**, junto do Postgres, onde `localhost:5432` é nativo. É idêntico à produção (tudo Linux/Docker). Node 20.18 instalado no WSL.
- **API VALIDADA ponta a ponta:** `GET /api/health` → `{"status":"ok","db":"up"}` rodando no WSL contra o Postgres local. Build NestJS OK (precisou de `esModuleInterop` no tsconfig por causa do pg-boss).
- Scripts: `infra/apply-wsl.sh` (migrations+seed), `infra/verify-wsl.sh` (validação), `infra/open-pg-wsl.sh` (abre listen do PG), `infra/run-api-wsl.sh` (build+run da API no WSL). Rodar com `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu-22.04 -u root -- bash /mnt/c/.../infra/<script>.sh`.
- Para o FRONT (web-console): o Vite dev server roda no WSL e o navegador do Windows acessa — validar o forward nesse sentido (servidor no WSL→browser Windows costuma funcionar melhor que o inverso; testar no E5).

## Próximo passo imediato (retomada)
1. **Banco JÁ VALIDADO no WSL2** (ver seção abaixo). Para subir numa máquina nova: instalar PG16+PostGIS no WSL (ou Docker noutra máquina) e rodar `infra/apply-wsl.sh`.
2. **E4 — Esqueleto NestJS** (`apps/api`): JÁ ESCRITO (main, worker, database pool, health, módulos vazios). Falta: `npm install` das deps e `npm run build`/`start` apontando `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc`, confirmar `GET /api/health` retorna db:up. Decidir Prisma vs TypeORM (E3-H1) ao ligar dados de domínio.
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
