# ÁRVORE DO PROJETO — AJC (ERP/TMS de transporte fluvial)

> **Para que serve este documento.** Este é o mapa de referência do projeto: uma foto detalhada de **onde estão as funções, como as telas estão definidas e o que existe hoje**. Não é diário (isso é o `docs/STATUS.md`) nem decisão de arquitetura (isso está em `docs/arquitetura/*`). É o guia para uma pessoa ou IA nova encontrar rapidamente qualquer peça do sistema antes de mexer nele.
>
> **Como usar.** Procure a camada (frontend / backend / dados) e o módulo. Cada seção diz o caminho do arquivo, o que ele faz e como se conecta com as outras camadas. Ao fim há um índice de "onde encontro X".
>
> **Data do levantamento:** 2026-07-25. **Fonte:** varredura direta do código em `apps/api`, `apps/web-console`, `infra/` e `libs/`.

---

## 0. Visão de 30 segundos

A AJC é uma empresa de transporte fluvial no Pará (passageiros, carga, encomendas e veículos em balsas/barcos entre Belém e 7 cidades). Este repositório é o ERP/TMS dela.

É um **monorepo** com três peças principais:

| Peça | Pasta | Stack | Papel |
|---|---|---|---|
| **Backend / API** | `apps/api` | NestJS 10 + PostgreSQL 16/PostGIS (driver `pg`, **sem ORM**) + pg-boss | Regras de negócio, RBAC, persistência. Prefixo global `/api`. |
| **Frontend / Console** | `apps/web-console` | TanStack Start (React 19 + SSR/Nitro) + Bun + Tailwind v4 + motion | Todas as telas: gestão, campo, portal público, PDV, totem, embarque. |
| **Dados / Infra** | `infra/` | SQL puro + runner próprio + Docker/Coolify + MinIO | Migrations, seed, scripts WSL, deploy. |
| **Tipos compartilhados** | `libs/shared/domain-types` | TypeScript | Enums do domínio (as 8 classes de passagem, etc.). |

**Fase atual:** MVP funcional (Fase 2) bastante avançado. Quase todas as telas já consomem a API real; os mocks foram removidos (o arquivo `src/mocks/data.ts` está **órfão** — nenhuma tela o importa mais).

**Integrações externas ainda em stub/adapter** (não bloqueiam o MVP): gateway de pagamento PIX/cartão, BP-e/SEFAZ, WhatsApp/SMS, impressora térmica Bluetooth, GPS em background, storage MinIO.

---

## 1. Raiz do monorepo

```
AJC/
├── apps/
│   ├── api/                 # backend NestJS
│   └── web-console/         # frontend TanStack Start
├── libs/
│   └── shared/domain-types/ # enums/tipos compartilhados
├── infra/
│   ├── migrations/          # 0001..0023 .sql + run.mjs
│   ├── seed/                # 0001_seed_minimo.sql + run.mjs
│   ├── docker/              # compose de dev
│   └── *.sh                 # scripts WSL (apply, verify, open-pg, run-api)
├── docs/                    # toda a documentação (PRD, SPEC, módulos, UX, ADRs, feedback, fases)
├── Dockerfile               # build multi-stage da API
├── docker-compose.coolify.yml
├── package.json             # workspaces + scripts nx
├── nx.json                  # config Nx (back)
└── tsconfig.base.json       # paths @ajc/*
```

**`package.json` (raiz)** — `@ajc/source`, private, Node ≥20. Workspaces `apps/*`, `libs/*`, `libs/shared/*`. Scripts: `build/lint/test` via `nx run-many`; `api:serve`, `console:serve`; `migrate` (`nx run api:migrate`); `db:up`/`stack:up`/`stack:down` (docker compose dev).

**`nx.json`** — `defaultBase: main`; cache em build/lint/test; `dependsOn ^build`. **Atenção:** o Nx governa o **back**; o **front** (`web-console`) é projeto Vite/TanStack standalone gerenciado por **Bun**, não usa Nx.

**`tsconfig.base.json`** — target es2021, commonjs, `strict`, decorators. Aliases: `@ajc/shared/domain-types`, `@ajc/shared/api-contract`, `@ajc/shared/validation`, `@ajc/ui`, `@ajc/ui-field`, `@ajc/config-client`, `@ajc/offline-sync` (alguns aliases apontam para libs ainda não materializadas).

---

## 2. FRONTEND — `apps/web-console`

Stack confirmada em `package.json`: React 19, TanStack Start/Router/Query, Vite 8, Tailwind v4, ~30 pacotes Radix, `react-hook-form` + `zod`, `recharts`, `qrcode`, `motion`, `lucide-react`, `sonner`. Gerenciado por **Bun**.

### 2.1. Como rodar (verificado)
- Pasta `apps/web-console`, `export PATH="$HOME/.bun/bin:$PATH" && bun run dev`. Porta fixa **8080**.
- Build/verificação obrigatória após mexer no front: `bun run build` (roda `tsc` + vite + nitro; deve dar exit 0).
- Deploy: Vercel (SSR via Nitro preset `vercel`). API apontada por `VITE_AJC_API_URL`.

### 2.2. Roteamento e shells

O TanStack Start usa **file-based routing**: o nome do arquivo vira a URL (`app.tms.tsx` → `/app/tms`, `campo.portaria.tsx` → `/campo/portaria`, `index.tsx` → `/`). A árvore é gerada em `src/routeTree.gen.ts`.

| Arquivo | Papel |
|---|---|
| `src/router.tsx` | Cria `QueryClient` e o router a partir de `routeTree.gen.ts`. |
| `src/routes/__root.tsx` | Layout raiz: `<head>` SEO, Google Fonts, `QueryClientProvider` → `ThemeProvider` → `<Outlet/>`. Define 404 e ErrorBoundary. *(Obs.: o `<title>` ainda diz "RP Náutico Suite" — legado.)* |
| `src/routes/app.tsx` | **Guard de autenticação** de `/app/*`. Se não há sessão (`hasStoredAuth()`) → redireciona para `/`. Valida com `getMeAjc()`. |
| `src/components/ops/AppShell.tsx` | Casca visual das telas de gestão: topbar `HelmCrown` + `<main>` + dock `HelmDock`. |
| `src/components/ops/HelmDock.tsx` | Exporta `HelmDock` (navegação principal — dock flutuante que compacta ao rolar) e `HelmCrown` (topbar). Menu hardcoded: Início, Navegação, TMS, Encomendas, Vendas (grupo operação); CRM, Financeiro, Cadastros (grupo gestão). Link para `/campo`. |
| `src/components/ops/field/FieldShell.tsx` | Casca do **app de campo** (`/campo/*`) — mobile-first, alvos grandes, sem o dock de gestão, offline-first. |

**Fluxo:** `/` (login) → `/app/inicio`. Gestão em `/app/*` (guard + HelmDock). Campo em `/campo/*` (FieldShell). Telas de dispositivo/públicas fora dos dois shells: `/portal`, `/cliente`, `/pos`, `/totem`, `/embarque`.

### 2.3. Telas (rotas) — o que cada uma faz

#### Área pública / login
| Rota | Arquivo | O que faz | API real |
|---|---|---|---|
| `/` | `index.tsx` | Login cinematográfico (balsa animada Belém→Santarém, headline kinetic). **Não alterar sem pedido do dono.** Form → `loginAjc()` → `/app/inicio`. | ✅ |
| `/dashboard` | `dashboard.tsx` | Só `redirect` para `/app/inicio`. | — |

#### Gestão (`/app/*` — AppShell + HelmDock)
| Rota | Arquivo | O que faz | Abas/seções |
|---|---|---|---|
| `/app/inicio` | `app.inicio.tsx` | Centro de operações (dashboard diretoria): KPIs, radar de viagens, feed ao vivo, alertas cadastráveis, caixas em tempo real, relatório do dia (baixa JSON). | Viagens em curso · Alertas · Caixas |
| `/app/navegacao` | `app.navegacao.tsx` | Frota e cronograma. Nova/Editar viagem (templates de rota do FAQ 2026 preenchem paradas; capacidade por classe condicional à embarcação) e Nova/Editar embarcação, em modal. | operacao · viagens · capacidade · escalas · embarcacoes |
| `/app/tms` | `app.tms.tsx` | TMS/Carga. Nova carga (pedido = COD cliente + NF/DC, modal de seleção de NF/DC). **Página padrão-ouro.** | ctrl · notas · paletes · etiqueta · veiculos · prestacao |
| `/app/encomendas` | `app.encomendas.tsx` | Encomendas (despacho, DC, cotação, controle, rastreio). Precificação por tabela versionada + `limiteFixo` do config. | despacho · dc · cotacao · controle · rastreio |
| `/app/vendas` | `app.vendas.tsx` | Vendas multi-canal. Nova passagem, cortesias (com limite do config), manifesto, relatório regulatório (export CSV/PDF para MP). | passagens · canais · ocupacao · cortesias · manifesto · regulatorio |
| `/app/crm` | `app.crm.tsx` | Clientes, agentes, histórico 360º (drawer), cotações. Realocar agente, novo envio pelo histórico. Export CSV. | clientes · agentes · alocacao · cotacoes |
| `/app/financeiro` | `app.financeiro.tsx` | Financeiro leve MVP: caixas, AP/AR, comissões estimadas, lançamento mínimo de título. Plano de contas/DRE = fase posterior. | tesouraria · ar · ap · comissoes |
| `/app/cadastros` | `app.cadastros.tsx` | Dados-mestre + motor de preços: usuários, perfis (matriz RBAC), preços de passagem (reajuste em massa), preços de carga, fornecedores, colaboradores. | usuarios · perfis · precos_passagem · precos_carga · fornecedores · colaboradores |

#### Campo (`/campo/*` — FieldShell)
| Rota | Arquivo | Posto | Componente que carrega |
|---|---|---|---|
| `/campo` | `campo.index.tsx` | Hub "escolha seu posto" | (grid de links) |
| `/campo/portaria` | `campo.portaria.tsx` | Porteiro (B.1) | `PortariaTab` |
| `/campo/conferencia` | `campo.conferencia.tsx` | Conferente do Porto (B.4/B.7) | `ColetorTab` |
| `/campo/recebimento` | `campo.recebimento.tsx` | Recebimento/Balsa (B.8) | `CrossDockingTab` |
| `/campo/entregas` | `campo.entregas.tsx` | Entregas/desembarque (B.9) | `EntregasTab` |

#### Dispositivo / públicas (fora dos shells)
| Rota | Arquivo | O que faz | API real |
|---|---|---|---|
| `/pos` | `pos.tsx` | PDV do porto: catálogo de classes, ticket, multipagamento, gratuidade/cortesia, toggle BP-e. Emite N bilhetes via `createBilhete` (abre caixa se preciso). | ✅ |
| `/totem` | `totem.tsx` | Autoatendimento: destino → viagem → classe → pagamento (stub maquininha) → bilhete com QR real. | ✅ |
| `/embarque` | `embarque.tsx` | Validação de embarque pelo bilheteiro. **Offline-first**: valida via API, enfileira em `localStorage` quando offline e sincroniza ao voltar. | ✅ |
| `/portal` | `portal.tsx` | Compra pública online (wizard 7 passos: busca → classe → conta → termo → pagamento → QR). Checkout é **stub** (`approvePortalPagamentoStub`). | ✅ |
| `/cliente` | `cliente.tsx` | Área do cliente ("Minhas viagens"): busca bilhetes por documento/email, QR grande, baixar/compartilhar comprovante. | ✅ |

### 2.4. Componentes de UI — `src/components/ops/*`

- **`primitives.tsx`** — biblioteca de UI das telas: `StatusChip`, `ViagemStatusChip`, `ViagemSituacaoChip`, `KPIStat`, `FilterBar`, `FilterChip`, `DataTable<T>` (genérico), `SectionHeader`, `PrimaryButton`, `GhostButton`, `SyncIndicator`, `OfflineBanner`, `CounterBadge`, `brl` (formatador BRL), `Tag`, `BentoGrid`/`BentoCell`.
- **`motion-bits.tsx`** — animações: `CountUp`, `RadialDial`, `LiveDot`, `Ticker`, `ShimmerBar`, `RadarSweep`, `VoyageTrack`, `AuroraMesh`. *(Ver armadilhas de SSR na seção 5.)*
- **`BrandMark.tsx`** — logo/brasão AJC.
- **`RealQR.tsx`** — QR SVG real via lib `qrcode`. **`FakeQR.tsx`** é só um wrapper legado que re-exporta `RealQR` (usado em `EtiquetaTab`).
- **`tms/PhoneFrame.tsx`** — moldura de celular para simuladores no painel; `framed=false` = tela cheia dentro do FieldShell. Inclui `CaptureTile` (foto/assinatura).

**Tabs do TMS — `src/components/ops/tms/*`** (todas com API real):
| Componente | Bloco | Papel |
|---|---|---|
| `ControleTab.tsx` | B.11 | Controle de carga por viagem (recebidos/embarcados/entregues/divergentes). Dados via props. |
| `NotasTab.tsx` | B.2/B.3 | NF/DC: upload, fila de lançamento ADM, conferência, agendamento (janela 30min, máx 5), impressão de etiqueta. |
| `PaletesTab.tsx` | B.6 | CRUD e alocação/liberação de paletes. Código gerado automático (AJC-###/TER-###). |
| `EtiquetaTab.tsx` | B.5 | Geração/reimpressão de etiquetas por volume (tipos MP/PC/PD). |
| `VeiculosTab.tsx` | RF-5 | Cadastro de envio de veículos/máquinas. *(lista inicial de exemplo hardcoded local.)* |
| `PrestacaoTab.tsx` | B.10 | Prestação de contas do gerente (leitura da API). |
| `PortariaTab.tsx` | B.1 (campo) | Registro de entrada no pátio. |
| `ColetorTab.tsx` | B.4/B.7 (campo) | Conferência / 2º bipe / entrega. |
| `CrossDockingTab.tsx` | B.8 (campo) | Recebimento direto na balsa. |
| `EntregasTab.tsx` | B.9 (campo) | Comprovante de entrega com prova legal (2 fotos + assinatura). |

**Encomendas — `src/components/ops/encomendas/*`**: `types.ts` (tipos UI), `pricing.ts` (`ENCOMENDA_TAMANHOS`, `buildPrecoEncomendaTabela`, `calcularPrecoEncomenda` fixo/percentual, `sugerirTamanhoPorPeso`), `shared.tsx` (`PrecoDestaque`, `TermoDC`), e as tabs `DespachoTab` (B.1), `DeclaracaoTab` (B.2 — assinatura em tela), `CotacaoTab` (B.3), `ControleViagemTab` (B.4), `RastreamentoTab` (B.5).

> ⚠️ **Dead code candidato:** `src/components/nautical/*` (AlertsPanel, BrandLogo, KpiCard, NavDock, OrdersTable, RadarPanel, etc.) é legado do template "Náutico" e **não é referenciado por nenhuma rota atual**.

### 2.5. Cliente de API — `src/lib/ajc-api.ts`

É a **única porta de entrada** do front para o backend. Config: `AJC_API_URL = VITE_AJC_API_URL ?? "https://apiajc.byteintelligence.com.br/api"`. Helper interno `request()` injeta `Authorization: Bearer` quando `{auth:true}`. Erros viram `AjcApiError`. Sessão em `localStorage` (`ajc.auth.v1`).

Funções exportadas, por área (nome → método/rota):

- **Auth/sessão:** `getStoredAuth`, `setStoredAuth`, `hasStoredAuth`, `loginAjc` (`POST /auth/login`), `refreshAjc` (`POST /auth/refresh`), `getMeAjc` (`GET /auth/me`), `logoutAjc` (`POST /auth/logout`).
- **Navegação:** `listNavegacaoViagens`, `listNavegacaoTemplatesRotas`, `listNavegacaoEscalasColaboradores`, `notifyNavegacaoEscalas`, `createNavegacaoViagem`, `updateNavegacaoViagem`.
- **Cadastros:** `listEmbarcacoes`, `createEmbarcacao`, `updateEmbarcacao`, `listCidades`, `listUsuariosCadastro`, `listPerfisCadastro`, `createUsuarioCadastro`, `updateUsuarioCadastro`, `createPerfilCadastro`, `updatePerfilCadastro`, `listFornecedores`, `createFornecedor`, `listColaboradores`, `createColaborador`, `listAgentes`, `listClientes`, `createCliente`, `updateCliente`.
- **CRM:** `listCrmCotacoes`, `createCrmCotacao`, `getCrmHistoricoCliente`.
- **Preços/Config:** `listPrecosPassagemMatriz`, `getConfigValue`, `listPrecos`, `reajustarTabelaPrecos`.
- **TMS/Carga/Encomendas/Veículos:** `listTmsCargas`, `listTmsAgendamentoDisponibilidade`, `createTmsCarga`, `listEncomendas`, `createEncomenda`, `listEncomendaDeclaracoes`, `saveEncomendaDeclaracao`, `listTmsVolumes`, `listTmsEtiquetas`, `printTmsEtiqueta`, `listTmsDocumentos`, `createTmsDocumentoManual`, `conferirTmsDocumento`, `listTmsPaletes`, `createTmsPalete`, `allocateTmsPalete`, `releaseTmsPalete`, `listTmsPortaria`, `listTmsEntregas`, `listTmsPrestacoes`, `saveTmsPrestacao`, `createTmsPortaria`, `addTmsVolumeEvent`, `createTmsEntrega`, `listVeiculosEnvios`, `createVeiculoEnvio`.
- **Vendas/Bilhetes:** `listBilhetes`, `getVendasResumo`, `createBilhete`, `validarBilhete`, `getManifesto`, `listCortesias`, `createCortesia`, `listGratuidades`.
- **Caixa/Financeiro:** `listCaixas`, `listCaixaMovimentos`, `abrirCaixa`, `listFinanceiroTitulos`, `createFinanceiroTitulo`.
- **Operação (dashboard):** `listOperacaoAlertas`, `getOperacaoRelatorioDia`, `createOperacaoAlerta`, `updateOperacaoAlerta`.
- **Portal público / cliente:** `listPortalViagens`, `createPortalPedido`, `createPortalPagamento`, `approvePortalPagamentoStub`, `listClienteBilhetes`.

Libs auxiliares: **`passagem-pricing.ts`** (`precoPassagemPorClasseApi`, `precoPassagemPorClasse`, `resumoPrecoPassagem`) e **`bilhete-comprovante.ts`** (`baixarComprovanteBilhete`, `compartilharComprovanteBilhete`).

### 2.6. Design system — `src/styles.css` ("Crimson Prestige")

Tailwind v4 + OKLCH, **dark por padrão** (`.light` = variante marfim). Vermelho carmim AJC (`--brand`) sobre preto (`--ink`), platina/champagne como acentos. Semânticos: **offline nunca é vermelho** (`--offline` azul-cinza; `--success/--warning/--danger/--info`). Fontes: Fraunces (display), Inter (sans), JetBrains Mono (números tabulares). Utilities customizadas (`surface-card`, `brand-text`, `big-numeric`, `glass-panel`, etc.) e keyframes (`shine-sweep`, `pulse-soft`). **Não alterar os tokens** — todas as telas consomem deles.

---

## 3. BACKEND — `apps/api` (NestJS)

Stack: NestJS 10 (`common`/`core`/`platform-express`/`terminus`), `pg` 8, `pg-boss` 10. **Sem ORM** — SQL puro via `DatabaseService`.

### 3.1. Bootstrap e infra

- **`src/main.ts`** — prefixo global **`/api`** (`app.setGlobalPrefix('api')`); CORS de `CORS_ORIGINS` (fallback: Vercel + apiajc + localhost); `trust proxy = 1`; porta `API_PORT` ou 3000.
- **`src/app.module.ts`** — carrega: `DatabaseModule` (global), `AuthModule`, `ConfigModule`, `CadastrosModule`, `PrecosModule`, `NavegacaoModule`, `TmsModule`, `VeiculosModule`, `EncomendasModule`, `VendasModule`, `CaixaModule`, `CrmModule`, `OperacaoModule`, `PortalModule` + `HealthController`.
- **`src/database/*`** — `DatabaseModule` (`@Global`) cria um `Pool` único (`DATABASE_URL`, max 10). `DatabaseService` expõe `query`, `one`, `tx` (transação BEGIN/COMMIT/ROLLBACK). É a única conexão Postgres.
- **`src/health/health.controller.ts`** — `GET /api/health` (público): checa `SELECT 1`, retorna `status/db/timestamp`.
- **`src/worker.ts`** — processo separado com pg-boss sobre o **mesmo** Postgres (schema `pgboss`, sem Redis). Hoje só a fila de fumaça `hello`.

### 3.2. Autenticação e RBAC — `src/modules/auth/*`

Padrão uniforme em todos os módulos: `@UseGuards(AuthGuard)` na classe + `@RequirePermissions('modulo.acao')` por rota. O guard exige **todas** as permissões listadas.

- **Tokens (`token.service.ts`):** esquema próprio `base64url(payload).HMAC-SHA256` (não é JWT completo). Segredo `AUTH_TOKEN_SECRET`/`AUTH_SECRET` (obrigatório em produção). TTLs: access 15min, refresh 30d.
- **Guard (`auth.guard.ts`):** extrai `Bearer`, valida assinatura/exp, lê metadata `PERMISSIONS_KEY`, injeta `request.user`.
- **Senha (`password.service.ts`):** PBKDF2-SHA256, 120k iterações. Formato `pbkdf2_sha256$<iter>$<salt>$<hash>`.
- **Sessão (`auth.repository.ts`):** tabela `sessao` com `refresh_hash` (sha256), rotação a cada refresh.
- **Endpoints:** `POST /api/auth/login` (público), `POST /api/auth/refresh` (público), `POST /api/auth/logout` (auth), `GET /api/auth/me` (auth).

**Permissões existentes (código `modulo.acao`):** `cadastros.{ver,criar,editar}`, `crm.{ver,criar,editar}`, `navegacao.{ver,criar,editar}`, `precos.{ver,reajustar}`, `tms.{ver,criar,conferir,entregar}`, `encomendas.{ver,criar}`, `veiculos.{ver,criar}`, `vendas.{ver,vender,validar,cortesia}`, `caixa.{ver,operar}`, `operacao.{ver,criar,editar}`.

### 3.3. Endpoints por módulo

Todas as rotas incluem o prefixo `/api`. Coluna "Perm" = permissão exigida.

#### `config` — motor de configuração versionada
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/config` | `cadastros.ver` |
| GET | `/api/config/:chave` | `cadastros.ver` |
| PUT | `/api/config/:chave` | `cadastros.editar` |

Repo publica nova versão em `tx` (desativa a vigente, insere nova como `jsonb`).

#### `cadastros` — dados-mestre + RBAC
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/cadastros/usuarios` | `cadastros.ver` |
| POST/PATCH | `/api/cadastros/usuarios[/:id]` | `cadastros.criar` / `.editar` |
| GET | `/api/cadastros/perfis` | `cadastros.ver` |
| POST/PATCH | `/api/cadastros/perfis[/:id]` | `cadastros.criar` / `.editar` |
| GET | `/api/cadastros/cidades` | `cadastros.ver` |
| GET | `/api/cadastros/embarcacoes` | `navegacao.ver` |
| POST/PATCH | `/api/cadastros/embarcacoes[/:id]` | `cadastros.criar` / `.editar` |
| GET | `/api/cadastros/agentes` | `crm.ver` |
| GET | `/api/cadastros/clientes` | `crm.ver` |
| POST/PATCH | `/api/cadastros/clientes[/:id]` | `crm.criar` / `.editar` |
| GET/POST | `/api/cadastros/fornecedores` | `cadastros.ver` / `.criar` |
| GET/POST | `/api/cadastros/colaboradores` | `cadastros.ver` / `.criar` |

Repo: CRUD com hash de senha, sync de `perfil_permissao`, histórico de realocação de agente (`cliente_agente_historico`), auditoria em `audit_evento`.

#### `precos`
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/precos` (`?tipo=`) | `precos.ver` |
| GET | `/api/precos/passagem/matriz` | `precos.ver` |
| POST | `/api/precos/:tipo/reajustes` | `precos.reajustar` |

Reajuste cria nova versão da tabela com percentual aplicado (versionamento).

#### `navegacao`
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/navegacao/viagens` | `navegacao.ver` |
| GET | `/api/navegacao/viagens/:id` | `navegacao.ver` |
| POST | `/api/navegacao/viagens` | `navegacao.criar` |
| PATCH | `/api/navegacao/viagens/:id` | `navegacao.editar` |
| GET | `/api/navegacao/templates-rotas` | `navegacao.ver` |
| GET | `/api/navegacao/escalas-colaboradores` | `navegacao.ver` |
| POST | `/api/navegacao/escalas-colaboradores/notificar` | `navegacao.editar` |

Regra: viagem nasce como saída + retorno; `PATCH` bloqueia mudar `status`/`situacao` manualmente. Escala deriva `conflito` quando o mesmo colaborador tem períodos sobrepostos.

#### `tms` — o módulo maior (~1290 linhas de repository; reusado por `encomendas`)
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/tms/cargas` (`?categoria=`) | `tms.ver` |
| GET | `/api/tms/cargas/:id` | `tms.ver` |
| POST | `/api/tms/cargas` | `tms.criar` |
| GET | `/api/tms/agendamentos/disponibilidade` (`?data=`) | `tms.ver` |
| GET | `/api/tms/documentos` | `tms.ver` |
| POST | `/api/tms/documentos/manual` | `tms.criar` |
| POST | `/api/tms/documentos/:id/conferencia` | `tms.conferir` |
| GET | `/api/tms/volumes` | `tms.ver` |
| GET | `/api/tms/etiquetas` | `tms.ver` |
| POST | `/api/tms/volumes/:id/etiquetas` | `tms.conferir` |
| POST | `/api/tms/volumes/:id/eventos` | `tms.conferir` |
| GET/POST | `/api/tms/paletes` | `tms.ver` / `.criar` |
| POST | `/api/tms/paletes/:id/alocacoes` | `tms.criar` |
| POST | `/api/tms/paletes/:id/liberar` | `tms.criar` |
| GET/POST | `/api/tms/portaria` | `tms.ver` / `.criar` |
| GET | `/api/tms/entregas` | `tms.ver` |
| POST | `/api/tms/entregas` | `tms.entregar` |
| GET | `/api/tms/prestacoes[/:id]` | `tms.ver` |
| POST | `/api/tms/prestacoes` | `tms.criar` |

Regras notáveis: agendamento em janela Belém 06–18h (min 0/30, máx 5 caminhões, advisory lock); prova de entrega/DC exige assinatura + hash sha256 de 64 chars (recusa `field://`/`stub:`); idempotência por `client_uuid`.

#### `encomendas` — delega ao `TmsRepository` (categoria fixa `encomenda`)
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/encomendas` | `encomendas.ver` |
| GET | `/api/encomendas/declaracoes` | `encomendas.ver` |
| POST | `/api/encomendas` | `encomendas.criar` |
| POST | `/api/encomendas/:id/declaracao-conteudo` | `encomendas.criar` |

#### `veiculos`
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/veiculos[/:id]` | `veiculos.ver` |
| POST | `/api/veiculos` | `veiculos.criar` |
| POST | `/api/veiculos/:id/fotos` | `veiculos.criar` |
| POST | `/api/veiculos/:id/eventos` | `veiculos.criar` |

Máquina de estados `rascunho→vistoria→embarque→em_transito→entrega→entregue/cancelada`; veículo exige placa.

#### `vendas`
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/vendas/bilhetes` (`?viagemId=`) | `vendas.ver` |
| GET | `/api/vendas/resumo` | `vendas.ver` |
| GET | `/api/vendas/bilhetes/:id` | `vendas.ver` |
| POST | `/api/vendas/bilhetes` | `vendas.vender` |
| POST | `/api/vendas/bilhetes/:id/validar` | `vendas.validar` |
| GET | `/api/vendas/manifesto/:viagemId` | `vendas.ver` |
| GET/POST | `/api/vendas/cortesias` | `vendas.ver` / `.cortesia` |
| GET | `/api/vendas/gratuidades` | `vendas.ver` |

Bloqueia overbooking por classe (capacidade em `viagem.capacidade_pax_disponivel`, `FOR UPDATE`); limite de cortesia vem do config `limite_cortesia`.

#### `caixa` — inclui títulos financeiros AP/AR
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/caixa` | `caixa.ver` |
| POST | `/api/caixa/abrir` | `caixa.operar` |
| GET/POST | `/api/caixa/titulos` (`?tipo=`) | `caixa.ver` / `.operar` |
| GET/POST | `/api/caixa/:id/movimentos` | `caixa.ver` / `.operar` |
| PATCH | `/api/caixa/:id/fechar` | `caixa.operar` |

#### `crm`
| Método | Rota | Perm |
|---|---|---|
| GET/POST | `/api/crm/cotacoes` | `crm.ver` / `.criar` |
| GET | `/api/crm/clientes/:id/historico` | `crm.ver` |

#### `operacao` — dashboard
| Método | Rota | Perm |
|---|---|---|
| GET | `/api/operacao/relatorio-dia` (`?data=`) | `operacao.ver` |
| GET | `/api/operacao/alertas` (`?status=`) | `operacao.ver` |
| POST | `/api/operacao/alertas` | `operacao.criar` |
| PATCH | `/api/operacao/alertas/:id` | `operacao.editar` |

#### `portal` — ⚠️ TOTALMENTE PÚBLICO (sem guard/permissão)
| Método | Rota |
|---|---|
| GET | `/api/portal/viagens` (`?origem=&destino=&data=`) |
| POST | `/api/portal/pedidos` |
| GET | `/api/portal/pedidos/:codigo` |
| POST | `/api/portal/pedidos/:codigo/pagamentos` |
| POST | `/api/portal/webhooks/stub` |
| GET | `/api/portal/cliente/bilhetes` (`?documento=&email=`) |

É o checkout público do cliente. Reserva com TTL, advisory lock por assento, sem overbooking, estados `reservado→aguardando_pagamento→emitido`. Gateway e BP-e em modo **stub**. **Nota de segurança:** por ser público, qualquer endurecimento futuro (rate-limit, captcha, validação de origem) recai aqui e em `/api/health`.

---

## 4. DADOS / INFRA — `infra/`

### 4.1. Migrations — `infra/migrations/*.sql` (0001..0023)

SQL puro, idempotente. Convenções: PK `uuid`, `criado_em`/`atualizado_em`, soft-delete via `excluido_em`, trigger `set_atualizado_em()`, `client_uuid` + índice único parcial para sync offline, provas com `*_url` + `*_hash`.

| # | Arquivo | Resumo |
|---|---|---|
| 0001 | `extensions.sql` | `pgcrypto`, `postgis`, `btree_gist`. |
| 0002 | `enums.sql` | Todos os `CREATE TYPE` (acesso, navegação, TMS, vendas, CRM, preços, caixa, audit). |
| 0003 | `fundacao_acesso.sql` | `set_atualizado_em()` + `cidade`, `perfil`, `permissao`, `perfil_permissao`, `colaborador`, `usuario`, `sessao`, `fornecedor`. |
| 0004 | `clientes_config_precos_navegacao.sql` | `agente`, `cliente`, `cliente_agente_historico`, `config_chave`, `config_versao`, `tabela_preco`, `item_preco`, `embarcacao`, `viagem`, `viagem_escala`, `posicao_embarcacao` (GiST), `escala_colaborador`. |
| 0005 | `tms.sql` | `palete`, `carga`, `carga_recebimento`, `volume`, `evento_volume`, `palete_viagem`, `documento_fiscal`, `declaracao_conteudo`, `registro_portaria`, `entrega_comprovante`, `entrega_volume`, `prestacao_contas`. |
| 0006 | `vendas_caixa_crm_audit.sql` | `caixa`, `bilhete`, `caixa_movimento`, `cortesia`, `gratuidade`, `termo_aceite`, `nps`, `cotacao`, `audit_evento` (append-only). |
| 0007 | `constraints_adiadas.sql` | FKs circulares: `item_preco.embarcacao_id` e `bilhete.caixa_movimento_id`. |
| 0008 | `schema_migrations_e_classes_8.sql` | Cria `schema_migrations`; `classe_passagem` 3→**8 classes**. |
| 0009 | `veiculos_maquinas.sql` | `envio_veiculo`, `envio_veiculo_foto`, `envio_veiculo_evento` + enums. |
| 0010 | `navegacao_operacional.sql` | `viagem += codigo, destino_sigla, capacidade_pax_disponivel(jsonb), client_uuid`; `status_viagem += cancelada`. |
| 0011 | `tms_operacional.sql` | `carga += codigo, numero_pedido, categoria, peso_total`; `documento_fiscal += origem`. |
| 0012 | `vendas_caixa_operacional.sql` | `bilhete += codigo, passageiro_documento, assento, canal`; `caixa += tipo, referencia`. |
| 0013 | `portal_pedido_pagamento_fiscal.sql` | `portal_pedido`, `portal_reserva`, `portal_pagamento`, `portal_webhook_evento`, `bilhete_documento_fiscal` (BP-e stub). |
| 0014 | `prestacao_contas_operacional.sql` | Unique `prestacao_contas (viagem_id, gerente_id)`. |
| 0015 | `financeiro_titulos_minimos.sql` | `financeiro_titulo` (AP/AR mínimo) + enums. |
| 0016 | `etiqueta_impressao.sql` | `etiqueta_impressao` (fila/auditoria de impressão Bluetooth). |
| 0017 | `alerta_operacional.sql` | `alerta_operacional` + enums de severidade/status. |
| 0018 | `cliente_codigo_cadastro.sql` | `cliente.codigo` (`CLI-AAAA-NNNN`, sequência). |
| 0019 | `documento_manual_avulso.sql` | `documento_fiscal += cidade origem/destino, peso, total_volumes, destinatário`. |
| 0020 | `documento_manual_destinatario.sql` | `documento_fiscal += destinatario_documento, destinatario_telefone`. |
| 0021 | `documento_manual_pagamento.sql` | `documento_fiscal += pagamento (CIF/FOB)`. |
| 0022 | `carga_agendamento_recebimento.sql` | `carga += agendado_para` (legado — regra migrada p/ 0023). |
| 0023 | `documento_agendamento_recebimento.sql` | `documento_fiscal += agendado_para` (agenda ativa). |

**Principais tabelas (colunas-chave):**
- **Acesso:** `usuario`(login uk, senha_hash, perfil_id), `perfil`, `permissao`(uk `modulo,acao`), `perfil_permissao` (N:N), `sessao`(refresh_hash), `colaborador`.
- **Base:** `cidade`(sigla PK), `config_chave`/`config_versao`(1 ativa por chave).
- **Preços:** `tabela_preco`(tipo, versao, ativo), `item_preco`(classe, tamanho, origem/destino, valor, percentual).
- **Navegação:** `embarcacao`(capacidade_pax jsonb), `viagem`(codigo uk, capacidade_pax_disponivel jsonb), `viagem_escala`, `posicao_embarcacao`(geography + GiST).
- **TMS:** `carga`, `volume`(id = UUID do QR), `evento_volume`(append-only), `palete`, `documento_fiscal`(pagamento CIF/FOB, agendado_para), `entrega_comprovante`(2 fotos+hash, protocolo), `registro_portaria`.
- **Vendas/Caixa:** `bilhete`(qr_token uk, canal, assento), `caixa`, `caixa_movimento`, `cortesia`, `gratuidade`, `cotacao`, `audit_evento` (imutável).
- **Veículos:** `envio_veiculo` + fotos/eventos.
- **Portal/Financeiro:** `portal_pedido/reserva/pagamento/webhook_evento`, `bilhete_documento_fiscal`, `financeiro_titulo`.

**Runner `infra/migrations/run.mjs`** — Node ESM, `pg` puro. Cria `schema_migrations` on-the-fly, calcula pendentes, aplica em ordem e grava `(versao, sha256)`. Flags: `--status` (só imprime), `--baseline` (registra sem executar — para banco já migrado à mão). Ancora `require('pg')` em `apps/api/package.json` (env `PG_REQUIRE_BASE` sobrescreve).

### 4.2. Seed — `infra/seed/`

- **`0001_seed_minimo.sql`** (só fundação, idempotente): 8 cidades (BEL base + 7), 8 perfis, ~28 permissões, usuário `admin`, 7 chaves de config vazias.
- **`run.mjs`** (dados de negócio): gera hash PBKDF2 da senha admin (`SEED_ADMIN_PASSWORD`, default `admin123`); dá todas as permissões ao Administrador; semeia 6 embarcações (F/B Amazonas II–VI + Paru), configs versionadas publicadas (`route_templates_faq_2026`, `limite_cortesia={porViagem:3}`, `tamanhos_encomenda={limiteFixo:1000,...}`), tabelas de preço (passagem + encomenda), agentes/clientes, 3 viagens exemplo, colaboradores/escalas (com conflito intencional), operações TMS, vendas/caixa, prestação e cotações.

### 4.3. Tipos compartilhados — `libs/shared/domain-types/src/`

`enums.ts` é a fonte da verdade TS espelhando os `CREATE TYPE`. Destaque: **`ClassePassagem` = 8 classes** (`rede`, `rede_sala_vip`, `camarote`, `suite_comum`, `suite_comum_vip`, `suite_master`, `suite_master_vip`, `mega_suite`) + `CLASSE_PASSAGEM_LABEL`. Também: enums de embarcação/viagem/escala, TMS (recebimento/carga/volume/palete/documento/portaria/prestação), bilhete/gratuidade, cotação, preço, caixa/pagamento, `AcaoAudit` e `CIDADES_SEED`.

### 4.4. Scripts WSL — `infra/*.sh`

O banco e o back rodam **dentro do WSL2 (Ubuntu)** — o forward de rede WSL↔Windows é instável. Padrão de execução: `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu-22.04 -u root -- bash /mnt/c/.../infra/<script>.sh`.
- **`apply-wsl.sh`** — aplica migrations + seed via psql.
- **`verify-wsl.sh`** — teste de fogo (conta tabelas/enums/índices, idempotência).
- **`open-pg-wsl.sh`** — expõe o Postgres do WSL ao host Windows.
- **`run-api-wsl.sh`** — build/run da API no WSL contra `localhost:5432`, curl `/api/health`.

Credenciais de dev: db `ajc` / role `ajc` / senha `ajc_dev` / `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc`.

### 4.5. Deploy — Docker / Coolify

- **`Dockerfile`** (multi-stage, Node 20 slim): `deps` → `builder` (`nest build`) → `runner` (prod deps + `dist` + migrations/seed, EXPOSE 3000, healthcheck `/api/health`).
- **`docker-compose.coolify.yml`** — rede `ajc_internal`: `postgres` (postgis 16-3.4), `minio` (S3), `api` (Dockerfile), `worker` (pg-boss).
- **`apps/api/.env.coolify.example`** — `DATABASE_URL`, `AUTH_TOKEN_SECRET`, `CORS_ORIGINS`, integrações em `stub`, storage MinIO. Front na Vercel (`ajcmvp.vercel.app`), API em `apiajc.byteintelligence.com.br`.
- **`infra/docker/docker-compose.yml`** — compose de dev (postgres em `127.0.0.1:5432` + serviço `migrate`).

---

## 5. Armadilhas conhecidas (não reintroduzir)

- **SSR (TanStack Start):** `useInView` do motion pode ficar preso em `false` no SSR → não usar para disparar contadores (o `CountUp` anima no mount). Coordenadas com `Math.cos/sin` (ex.: RadarSweep) precisam ser **arredondadas**, senão o constant-folding diverge entre servidor e cliente e quebra a hidratação (sintoma: KPIs presos em 0).
- **Rede WSL:** não conectar o Node do Windows ao Postgres do WSL. Rodar o back dentro do WSL.
- **Docker Desktop** não funciona nesta máquina (bug do Inference manager) — usar WSL nativo.
- **Login** (`index.tsx`) e **tokens do design system** (`styles.css`) são intocáveis sem pedido explícito.
- **Portal e Health são públicos** — cuidado ao assumir que todo endpoint exige auth.
- **`src/mocks/data.ts` está órfão** (~63 KB de dead code). Resíduos de mock inline ainda vivem em `pos.tsx`, `VeiculosTab.tsx` e fallbacks de `app.navegacao.tsx`.

---

## 6. Onde encontro X? (índice rápido)

| Preciso de... | Vá para... |
|---|---|
| Uma tela de gestão | `apps/web-console/src/routes/app.<nome>.tsx` |
| Uma tela de campo | `apps/web-console/src/routes/campo.<nome>.tsx` + `components/ops/tms/<Tab>.tsx` |
| Portal/PDV/totem/embarque | `apps/web-console/src/routes/{portal,pos,totem,embarque,cliente}.tsx` |
| Chamada ao backend (front) | `apps/web-console/src/lib/ajc-api.ts` |
| Um endpoint REST | `apps/api/src/modules/<módulo>/<módulo>.controller.ts` |
| Regra de negócio / SQL | `apps/api/src/modules/<módulo>/<módulo>.repository.ts` |
| Permissões RBAC | decorators nos controllers + seed `infra/seed/0001_seed_minimo.sql` |
| Estrutura de uma tabela | `infra/migrations/*.sql` (ver tabela na seção 4.1) |
| Enums do domínio | `libs/shared/domain-types/src/enums.ts` |
| Config versionada (preços/limites/termos) | `config_chave`/`config_versao` (motor) + seed `run.mjs` |
| Design tokens / cores | `apps/web-console/src/styles.css` |
| Componentes de UI reutilizáveis | `apps/web-console/src/components/ops/{primitives,motion-bits}.tsx` |
| Estado atual / próximo passo | `docs/STATUS.md` (diário vivo) |
| Decisões de arquitetura | `docs/arquitetura/*` (ADRs) |
| Feedback/validação do cliente | `docs/feedback/*` |

---

*Documento gerado por varredura completa do repositório. Ao alterar estrutura (novo módulo, nova rota, nova migration), atualize a seção correspondente aqui e registre no `docs/STATUS.md`.*
