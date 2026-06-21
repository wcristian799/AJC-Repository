# Fase 0 — Épicos, Histórias e Tarefas

> **Planejamento de execução da Fase 0 do projeto AJC.** Quebra a fundação técnica em épicos → histórias → tarefas com critérios de aceite verificáveis. Alinhado às decisões fechadas (`CLAUDE.md`), ao ADR 00 (stack/arquitetura), ao ADR 01 (spikes) e ao Modelo de Dados MVP (`docs/fase-0/01-Modelo-de-Dados-MVP.md`).
>
> **Este documento não implementa regra de negócio.** Telas de negócio, lógica de domínio e funções entram nas Fases 1/2/3.

---

## 1. Visão e objetivo da Fase 0

**Objetivo:** entregar a **fundação técnica** sobre a qual as fases seguintes constroem valor de negócio — repositório, infraestrutura local, banco com o schema do MVP, esqueletos do back e dos fronts, app de campo prova-de-conceito, CI e convenções — **sem nenhuma tela de negócio nem regra de domínio**.

**Critério de sucesso da fase:** um desenvolvedor novo clona o repositório, roda **um comando** para subir o ambiente (Docker), e tem: API NestJS de pé conectada ao Postgres+PostGIS com health-check verde, migrations do MVP aplicadas, fronts web servindo o shell de navegação com o design system, app Capacitor que abre e lê um QR, e CI que valida lint/format/build/testes em cada PR. A fundação de RBAC e do motor de config existe como **estrutura** (tabelas, módulos, guards, leitura tipada), pronta para receber regra nas fases seguintes.

### 1.1 O que ENTRA na Fase 0
- (a) Repositório git + monorepo Nx com a estrutura de pastas do ADR 00.
- (b) `docker-compose` com Postgres+PostGIS, api (NestJS), worker (pg-boss), nginx.
- (c) Migrations versionadas de **todas** as tabelas do MVP (modelo de dados) + seed mínimo.
- (d) Esqueleto do back NestJS: sobe, conecta no banco, health-check, módulos vazios com fronteiras, **fundação** de RBAC (guard + tabelas) e do **motor de config** (leitura tipada).
- (e) Esqueleto do front React: shell de navegação + design system (tokens/tema) da Fundação UX.
- (f) App Capacitor mínimo (1 app de campo) que abre e lê QR como PoC.
- (g) CI básico + convenções (lint, format, commits).
- (h) Spike de offline-sync (PowerSync vs fila própria) — primeira investigação técnica.

### 1.2 O que NÃO ENTRA na Fase 0 (fases seguintes)
- ❌ Telas de negócio (cadastros, vendas, TMS, CRM, PDV) — **Fase 1** (telas reais mockadas) e **Fase 2** (funcional).
- ❌ Lógica de domínio: regras de conferência, validação de bilhete, preço, comissão, reajuste, máquina de estados de volume.
- ❌ Endpoints de negócio (CRUD real dos módulos). Só health-check e o esqueleto.
- ❌ Matriz real de permissões por perfil (regra) — só a **estrutura** RBAC e um seed placeholder.
- ❌ Valores de config de negócio (preços, termos, tolerâncias) — só o **motor** que os lê.
- ❌ Integrações externas reais: Firebase/GPS, WhatsApp/SMS, pagamento, impressora.
- ❌ Spike de GPS background e spike de impressão PC/USB (rodam em paralelo, fora do caminho crítico do MVP; ver ADR 01).
- ❌ Deploy em produção no VPS Hostinger (a Fase 0 valida o compose **localmente**; provisionamento de produção e backup/PITR são pré-produção).

---

## 2. Definition of Done geral (vale para toda história)

Uma história só está **pronta** quando:
1. O código está na branch, com PR aberto e **revisado** (não direto na main).
2. `nx lint` e `nx build` do(s) projeto(s) afetado(s) passam **sem erros**.
3. Os testes relevantes passam no CI (se a história adiciona código testável).
4. Commits seguem a convenção (Conventional Commits) e passam pelos hooks.
5. Nada de valor de negócio foi hard-coded (o que for configurável passa pelo motor de config — mesmo vazio).
6. A documentação tocada foi atualizada (README do pacote, `docs/STATUS.md`, ADR se houver decisão nova).
7. Os critérios de aceite específicos da história foram verificados manualmente ou por teste.
8. Não há segredos commitados (`.env` no `.gitignore`; `.env.example` documentando as chaves).

---

## 3. Mapa dos épicos

| Épico | Título | Foco | Tamanho |
|---|---|---|---|
| **E1** | Monorepo & Tooling | Repo git, Nx, libs/shared, convenções de workspace | M |
| **E2** | Infra Docker | docker-compose: postgres+postgis, api, worker, nginx | M |
| **E3** | Banco & Migrations | Schema MVP completo + seed mínimo | G |
| **E4** | Esqueleto Back (NestJS) | Sobe, conecta, health-check, módulos vazios, RBAC + config (fundação) | G |
| **E5** | Esqueleto Front & Design System | Shell de navegação + libs/ui (tokens/tema) | G |
| **E6** | App Capacitor PoC | 1 app de campo que abre e lê QR | M |
| **E7** | CI & Convenções | Pipeline lint/format/build/test, commits, PR template | M |
| **E8** | Spike Offline-Sync | PowerSync self-hosted vs fila própria (timeboxed) | G |

---

## 4. E1 — Monorepo & Tooling

> Fundação do repositório. Tudo o mais depende disto.

### E1-H1 — Inicializar repositório e workspace Nx
**Como** desenvolvedor da AJC, **quero** um monorepo Nx inicializado com a estrutura de pastas acordada, **para que** back, fronts e código compartilhado vivam num único repo com grafo de dependências gerenciado.

**Tarefas**
- Inicializar git; `main` protegida (sem push direto), branch padrão de trabalho via feature branches.
- Criar `.gitignore` (node_modules, dist, .env, .nx/cache, coverage, artefatos Capacitor).
- Inicializar workspace Nx (preset integrado/TS) usando **npm** (pnpm ausente no ambiente — ver `CLAUDE.md`).
- Criar a estrutura de diretórios do ADR 00 §3: `apps/`, `libs/`, `infra/`, `docs/` (alguns como placeholders com README).
- Definir Node engine no `package.json` (Node 24) e `.nvmrc`.
- README raiz com "como rodar" (pré-requisitos, comandos Nx principais).

**Critérios de aceite**
- `npm install` na raiz instala sem erro.
- `npx nx graph` abre e mostra o grafo (mesmo que mínimo).
- A árvore de pastas bate com o ADR 00 §3 (apps/, libs/shared, libs/ui, libs/ui-field, libs/offline-sync, libs/config-client, infra/docker, infra/migrations, infra/seed).
- `git log` mostra commit inicial seguindo a convenção.

**Estimativa:** M

### E1-H2 — Pacotes `libs/shared` (domain-types, api-contract, validation)
**Como** desenvolvedor, **quero** os pacotes compartilhados criados como libs Nx tipadas, **para que** enums, contratos e schemas de validação sejam fonte única consumida por back e fronts.

**Tarefas**
- Criar libs Nx: `shared/domain-types`, `shared/api-contract`, `shared/validation`.
- Em `domain-types`: declarar os **enums do MVP** como tipos TS espelhando a §2 do modelo de dados (tipo_pessoa, status_viagem, status_volume, classe_passagem, status_bilhete, etc.). Sem regra — só os tipos.
- Em `validation`: configurar **zod** e um schema de exemplo (ex.: um DTO trivial) para provar o pipeline.
- Em `api-contract`: estrutura base para contratos tipados de endpoint (começando pelo contrato do health-check).
- Configurar paths/aliases TS (`@ajc/shared/...`) para import limpo.

**Critérios de aceite**
- Os três pacotes aparecem em `nx graph` e fazem `nx build`.
- Um enum de `domain-types` é importável e compila tanto numa app de back quanto numa de front (provado por um import de fumaça).
- `zod` resolve e um schema de exemplo valida/rejeita um objeto em teste unitário.
- Nenhum valor de negócio (preço, tolerância) embutido — só formas/tipos.

**Estimativa:** M

### E1-H3 — Configuração base de TypeScript, paths e boundaries
**Como** tech lead, **quero** regras de fronteira de módulo no Nx, **para que** a regra de ouro "módulos se falam por interface, nunca por tabela/import direto alheio" seja imposta por ferramenta.

**Tarefas**
- Configurar `@nx/enforce-module-boundaries` com tags por tipo (`type:app`, `type:lib`, `scope:shared`, `scope:ui`, `scope:back`, `scope:front`).
- `tsconfig.base.json` com paths para todas as libs.
- Definir regra: apps de front não importam internals do back; libs `shared` são consumíveis por todos.

**Critérios de aceite**
- Uma violação de fronteira proposital faz o lint **falhar** (provado e revertido).
- `nx build` respeita os paths sem erro de resolução.

**Estimativa:** P

---

## 5. E2 — Infra Docker

> Topologia local que espelha o VPS (ADR 00 §8.1 / ADR 01 §3).

### E2-H1 — docker-compose base (postgres+postgis, api, worker, nginx)
**Como** desenvolvedor, **quero** um `docker-compose` que sobe toda a stack local com um comando, **para que** o ambiente seja reprodutível e espelhe a topologia do VPS.

**Tarefas**
- Em `infra/docker/`: `docker-compose.yml` com serviços `postgres`, `api`, `worker`, `nginx`.
- Imagem do Postgres com **PostGIS** (ex.: `postgis/postgis:16-*`).
- Dockerfiles para `api` e `worker` (mesmo código, comandos diferentes — web vs jobs, ADR 00 §8.1).
- Rede interna do compose; **porta 5432 não exposta à internet/host além do necessário** (ADR 01 §3 — só rede interna).
- Volumes nomeados para persistência do Postgres.
- `nginx` como reverse proxy roteando para api e servindo estáticos dos fronts (config inicial).
- `.env.example` com `DATABASE_URL` e variáveis necessárias; `.env` no `.gitignore`.

**Critérios de aceite**
- `docker compose up` sobe os 4 serviços sem erro de boot.
- `psql` (de dentro da rede) conecta ao Postgres e `SELECT postgis_version();` retorna versão.
- A api responde via nginx em `http://localhost/<rota-health>`.
- App desacoplado por `DATABASE_URL` (env) — trocar a string muda o alvo do banco (ADR 01 §3 / migração futura).
- Porta do Postgres **não** está publicamente acessível fora da rede do compose.

**Estimativa:** M

### E2-H2 — Extensões Postgres e parâmetros de inicialização
**Como** desenvolvedor, **quero** as extensões do MVP habilitadas no boot do banco, **para que** as migrations rodem sem falha de dependência.

**Tarefas**
- Script de init garantindo `CREATE EXTENSION IF NOT EXISTS pgcrypto/postgis/btree_gist` (modelo de dados §1.3) — ou via primeira migration (decidir e registrar).
- Documentar versão do Postgres alinhada a gerenciado futuro (15/16 — ADR 01 §3) e extensões para habilitar em Cloud SQL/RDS depois.

**Critérios de aceite**
- Após o boot, as três extensões aparecem em `\dx`.
- A versão do Postgres está fixada e documentada.

**Estimativa:** P

---

## 6. E3 — Banco & Migrations

> Materializa o Modelo de Dados MVP. Sem regra — só estrutura, índices e seed mínimo.

### E3-H1 — Escolher e configurar a ferramenta de migrations
**Como** tech lead, **quero** uma ferramenta de migrations versionadas integrada ao back, **para que** o schema seja recriável em qualquer ambiente (VPS hoje, Cloud SQL/RDS amanhã).

**Tarefas**
- Decidir **Prisma vs TypeORM** (ADR 00 cita ambos; registrar a escolha num ADR curto). Critério: suporte a Postgres padrão, migrations versionadas, sem dependência de superuser/filesystem (ADR 01 §3).
- Configurar a ferramenta apontando para `infra/migrations/` com `DATABASE_URL` por env.
- Pipeline de `migrate` rodável local e no CI.

**Critérios de aceite**
- A escolha está registrada (ADR ou nota em `docs/STATUS.md`) com o porquê.
- `migrate` aplica e reverte uma migration de teste contra o Postgres do compose.

**Estimativa:** M

### E3-H2 — Migrations: extensões, enums e tabelas de fundação/acesso
**Como** desenvolvedor, **quero** as migrations dos blocos 0–8 do modelo (extensões, enums, cidade, perfil/permissão, usuário, sessão, fornecedor, colaborador), **para que** a fundação de acesso exista no banco.

**Tarefas**
- Migration de extensões + **todos** os `CREATE TYPE` da §2 do modelo.
- Tabelas: `cidade`, `perfil`, `permissao`, `perfil_permissao`, `colaborador`, `usuario`, `sessao`, `fornecedor` com colunas, PKs, FKs, índices e convenções (timestamps, soft-delete, auditoria de linha) conforme §3 e §1.1.
- Respeitar a **ordem de criação** da §15 do modelo.

**Critérios de aceite**
- `migrate` aplica os blocos sem erro de FK/ordem.
- Conferência de 3 tabelas-amostra (`usuario`, `permissao`, `cidade`) bate coluna-a-coluna com o modelo (tipos, nullability, defaults, índices únicos).
- `usuario.senha_hash` é `text` (hash) — nunca coluna de senha em texto puro.

**Estimativa:** M

### E3-H3 — Migrations: clientes, config, preços, navegação
**Como** desenvolvedor, **quero** as migrations de clientes/agentes, motor de config, preços versionados e navegação-core, **para que** o núcleo de dados-mestre e o eixo de viagem existam.

**Tarefas**
- Tabelas §4 (`agente`, `cliente`, `cliente_agente_historico`), §5 (`config_chave`, `config_versao`), §6 (`tabela_preco`, `item_preco`), §7 (`embarcacao`, `viagem`, `viagem_escala`, `posicao_embarcacao`, `escala_colaborador`).
- Índices únicos parciais (ex.: `config_versao (chave_id) WHERE ativo`; `tabela_preco (tipo) WHERE ativo`; `cliente (cpf_cnpj) WHERE ...`).
- Índice GiST em `posicao_embarcacao.posicao`.
- Tratar a dependência circular `item_preco.embarcacao_id` (criar tabela sem a FK; `ALTER TABLE ADD CONSTRAINT` após `embarcacao` — §15 nota †).

**Critérios de aceite**
- `migrate` aplica respeitando a ordem e a FK adiada de `item_preco→embarcacao`.
- Índice único parcial de `config_versao` impede 2 versões ativas para a mesma chave (provado por insert que falha).
- Índice GiST existe em `posicao_embarcacao` (`\d+`).

**Estimativa:** M

### E3-H4 — Migrations: TMS, vendas/caixa, CRM e auditoria
**Como** desenvolvedor, **quero** as migrations do TMS, vendas/caixa, CRM e auditoria, **para que** todo o schema do MVP esteja criado.

**Tarefas**
- Tabelas §8 (carga, carga_recebimento, volume, evento_volume, palete, palete_viagem, documento_fiscal, declaracao_conteudo, registro_portaria, entrega_comprovante, entrega_volume, prestacao_contas).
- Tabelas §9 (caixa, caixa_movimento, bilhete, cortesia, gratuidade, termo_aceite, nps), §10 (cotacao), §11 (audit_evento).
- **Índices únicos parciais de `client_uuid`** em todas as tabelas da §12 (`carga, volume, evento_volume, carga_recebimento, registro_portaria, entrega_comprovante, bilhete, caixa_movimento, audit_evento`).
- Dependência circular `bilhete.caixa_movimento_id ↔ caixa_movimento.bilhete_id` resolvida via `ALTER TABLE` (§15 nota †).
- `audit_evento` **imutável**: sem trigger de update; documentar a estratégia de revogar UPDATE/DELETE por role do banco (§11).

**Critérios de aceite**
- `migrate` aplica o schema completo do zero contra um banco vazio, sem erro.
- O índice `ux_<tabela>_client_uuid` existe em cada uma das 9 tabelas da §12 (verificável por `\di`).
- Reenvio simulado (insert duplicado do mesmo `client_uuid`) é **rejeitado** pelo índice em pelo menos uma tabela testada.
- `audit_evento` não possui trigger/rota de UPDATE.

**Estimativa:** G

### E3-H5 — Seed mínimo
**Como** desenvolvedor, **quero** um seed mínimo idempotente, **para que** o ambiente suba com dados de fundação utilizáveis (sem dados de negócio).

**Tarefas**
- Seed em `infra/seed/`: as **8 cidades** (BEL base, BRV, GUR, ALM, PMZ, PRA, MTA, STM — §2.1).
- Perfis básicos (nomes da §3.1) e catálogo de `permissao` (`modulo.acao`) como **placeholder estrutural** — sem definir a matriz real (essa é regra de Fase 1+).
- 1 usuário admin de desenvolvimento (senha via env, hash argon2/bcrypt — nunca texto puro).
- Chaves de `config_chave` previstas (termo_embarque, tolerancia_atraso, cores_pulseira, etc.) criadas **vazias/placeholder** (§5 / §17 — não bloqueiam).
- Seed idempotente (rodar 2x não duplica).

**Critérios de aceite**
- Após o seed, `SELECT count(*) FROM cidade` = 8 e `is_base=true` só para BEL.
- Rodar o seed duas vezes não gera duplicatas nem erro.
- Existe 1 usuário admin com `senha_hash` preenchido (hash, não texto).
- As chaves de config existem com valor placeholder; nenhum valor de negócio real embutido.

**Estimativa:** M

---

## 7. E4 — Esqueleto Back (NestJS)

> O monolito modular sobe, conecta, responde health-check e tem a **estrutura** de RBAC e config. Sem regra de negócio.

### E4-H1 — App NestJS de pé + conexão ao banco + health-check
**Como** desenvolvedor, **quero** a app `apps/api` NestJS subindo e conectada ao Postgres com health-check, **para que** a fundação do back esteja verificável.

**Tarefas**
- Criar `apps/api` (Nest via Nx).
- Configuração por env (`DATABASE_URL`, porta) — sem segredos no código.
- Integrar o cliente de banco (Prisma/TypeORM da E3-H1).
- Endpoint `GET /health` (ex.: `@nestjs/terminus`) checando processo **e** conectividade do banco.
- Contrato do health-check tipado em `shared/api-contract`.

**Critérios de aceite**
- `GET /health` retorna 200 com status do DB **up** quando o Postgres está no ar.
- Com o Postgres derrubado, `/health` reporta DB **down** (não 200 cego).
- A api lê `DATABASE_URL` do ambiente; nenhum segredo commitado.
- Acessível via nginx (integra com E2-H1).

**Estimativa:** M

### E4-H2 — Esqueleto de módulos vazios com fronteiras
**Como** tech lead, **quero** os módulos do MVP criados como **shells vazios** com a estrutura em camadas, **para que** as fases seguintes preencham regra sem rediscutir estrutura.

**Tarefas**
- Criar módulos vazios em `apps/api/src/modules/` conforme ADR 00 §3.1: `auth, config, cadastros, clientes, navegacao, precos, tms, vendas, caixa, encomendas, crm, sync, notificacao, telemetria, audit`.
- Cada módulo com o padrão Controller→Service→Repository (ADR 00 §4) **sem endpoints de negócio** — só o esqueleto e, onde fizer sentido, um stub não-funcional documentado.
- Reservar lugar (módulo/pasta comentada) para os fora-de-MVP: `financeiro, veiculos, pdv-fnb, compras, estoque`.

**Critérios de aceite**
- A api inicializa registrando todos os módulos do MVP sem erro.
- Cada módulo expõe sua interface de service (mesmo vazia); **nenhum** módulo lê tabela de outro (regra de ouro ADR 00 §2.2 — verificado por revisão e boundaries).
- Não há endpoint de negócio implementado (só health/infra).

**Estimativa:** M

### E4-H3 — Fundação de RBAC (guard + tabelas), sem matriz real
**Como** tech lead, **quero** o esqueleto de RBAC (decorator de permissão + guard global + leitura das tabelas perfil/permissão), **para que** os endpoints futuros já nasçam protegidos por `perfil × módulo × ação`.

**Tarefas**
- Decorator `@RequirePermission('modulo.acao')` e `Guard` global que lê a permissão exigida.
- Mecanismo que consulta `perfil_permissao` (estrutura da E3) — porém **sem** definir a política real (matriz é regra de fase posterior; usar o seed placeholder).
- Esqueleto de autenticação (`auth/`): validação de token/sessão estruturada — login real e login offline são Fase 2.
- Documentar que **todos** os endpoints de negócio futuros devem declarar permissão (ADR 00 §9).

**Critérios de aceite**
- Um endpoint de teste protegido por `@RequirePermission` retorna 403 sem permissão e 200 com permissão (provado com o seed placeholder).
- O guard está registrado globalmente (endpoints sem decorator têm política default documentada).
- Nenhuma matriz de negócio real foi codificada — só a mecânica.

**Estimativa:** G

### E4-H4 — Fundação do motor de config (leitura tipada + cache)
**Como** desenvolvedor, **quero** o módulo `config/` lendo chaves versionadas do banco com cache, e a lib `config-client` tipada, **para que** "tudo configurável, zero hard-code" seja viável desde o início.

**Tarefas**
- `config/` lê a versão **ativa** de uma chave (`config_chave`/`config_versao`) e entrega o valor (JSONB) tipado.
- Cache em memória com invalidação ao publicar nova versão (ADR 00 §6) — a **publicação** real (escrita versionada) é regra de fase posterior; aqui só leitura + cache.
- `libs/config-client`: leitura tipada para back e fronts.
- Prova: ler uma chave placeholder do seed e devolver o valor (vazio) sem erro.

**Critérios de aceite**
- `config.get('<chave-placeholder>')` retorna o valor da versão ativa (ou default vazio) sem erro.
- Cache serve a 2ª leitura sem ir ao banco (verificável por log/teste).
- A lib `config-client` é importável e tipada nos dois lados.
- Nenhum valor de negócio embutido — só o mecanismo de leitura.

**Estimativa:** M

### E4-H5 — Worker pg-boss de pé
**Como** desenvolvedor, **quero** o processo `worker` (pg-boss) conectado ao mesmo Postgres, **para que** a separação web/jobs do ADR 00 §8.1 esteja provada.

**Tarefas**
- Configurar pg-boss apontando para o mesmo Postgres (schema `pgboss` — ADR 01 §3), sem Redis/broker separado.
- Um job "hello" de fumaça enfileirado pela api e consumido pelo worker.
- Worker como **processo separado** (mesmo código, comando diferente).

**Critérios de aceite**
- O worker conecta e cria/usa o schema `pgboss`.
- Um job enfileirado pela api é processado pelo worker (log comprova ponta a ponta).
- Derrubar o worker não derruba a api (processos independentes).

**Estimativa:** M

---

## 8. E5 — Esqueleto Front & Design System

> Shell de navegação + design system da Fundação UX. Sem telas de negócio.

### E5-H1 — Design system base `libs/ui` (tokens, tema)
**Como** desenvolvedor de front, **quero** a lib `ui` com tokens (cores, tipografia, espaçamento) e tema da Fundação UX, **para que** todos os fronts compartilhem o mesmo contrato visual.

**Tarefas**
- Criar `libs/ui` (React) com tokens de design conforme `docs/ux/00-Fundacao...` (cores, tipografia, espaçamentos, raios, sombras).
- Provider de tema e 3–5 componentes-base de fumaça (Button, Input, Card, Banner) ligados aos tokens.
- Acessibilidade básica (contraste, foco visível, roles) nos componentes-base.
- Catálogo simples (Storybook ou página de showcase) — opcional mas recomendado.

**Critérios de aceite**
- `libs/ui` faz `nx build` e é consumível por uma app de front.
- Os tokens batem com a Fundação UX (amostra de cores/tipografia conferida).
- Os componentes-base renderizam com foco visível e contraste adequado.

**Estimativa:** G

### E5-H2 — Shell de navegação `web-console`
**Como** usuário interno, **quero** o `web-console` servindo o shell de navegação (layout, menu, header, área de conteúdo), **para que** as telas de negócio das fases seguintes encaixem num casco pronto.

**Tarefas**
- Criar `apps/web-console` (React) consumindo `libs/ui`.
- Shell: layout com navegação lateral/superior, rotas placeholder (sem conteúdo de negócio), estado de loading/erro genérico.
- Componentes de UX da Fundação previstos para campo/estado de rede (ex.: OfflineBanner, SyncIndicator) como **stubs visuais** em `libs/ui-field` (sem lógica de sync — isso é E8/Fase 2).
- Roteamento e tema aplicados.

**Critérios de aceite**
- `nx serve web-console` abre o shell com navegação funcional entre rotas placeholder.
- O shell usa exclusivamente componentes/tokens de `libs/ui`.
- Nenhuma tela de negócio (cadastro, venda, etc.) — só o casco navegável.
- `nx build web-console` gera estáticos servíveis pelo nginx.

**Estimativa:** G

### E5-H3 — Esqueleto `web-pdv` (placeholder)
**Como** time, **quero** a app `web-pdv` criada como casca consumindo o design system, **para que** o PDV tenha lugar reservado sem implementar caixa.

**Tarefas**
- Criar `apps/web-pdv` (React) com o shell mínimo e tema (sem fluxo de PDV).
- Rota inicial placeholder.

**Critérios de aceite**
- `nx build web-pdv` passa; app abre o shell vazio com o tema.
- Sem lógica de venda/caixa.

**Estimativa:** P

---

## 9. E6 — App Capacitor PoC

> Prova de conceito: 1 app de campo que abre e lê QR. Sem fluxo de negócio.

### E6-H1 — App Ionic+Capacitor mínimo (`field-conferente`)
**Como** operador de campo, **quero** um app que instala e abre num celular comum, **para que** a stack Ionic+Capacitor esteja provada como base dos apps de campo.

**Tarefas**
- Criar `apps/field-conferente` (Ionic + Capacitor, React) no Nx.
- Tela inicial usando tokens de `libs/ui`/`ui-field`.
- Build web e empacotamento Android (foco celular comum — ADR 01 §2).

**Critérios de aceite**
- `nx build` do app passa; roda no navegador (Capacitor web) e gera build Android.
- A tela inicial usa o design system.

**Estimativa:** M

### E6-H2 — Leitura de QR via câmera (PoC)
**Como** conferente, **quero** abrir a câmera e ler um QR, **para que** a prova de conceito do leitor (câmera, não coletor laser) seja validada.

**Tarefas**
- Integrar `@capacitor-mlkit/barcode-scanning` (ADR 01 §2 — risco baixo).
- Botão "ler QR" → abre câmera → exibe o conteúdo lido na tela.
- Tratar permissão de câmera negada e cancelamento.

**Critérios de aceite**
- Em celular real, ler um QR exibe seu conteúdo na tela.
- Permissão negada mostra mensagem clara (não crash).
- **Sem** lógica de negócio (não valida volume/bilhete — só lê e mostra o texto).

**Estimativa:** M

---

## 10. E7 — CI & Convenções

> Qualidade automatizada e padrões de colaboração.

### E7-H1 — Lint, format e Conventional Commits
**Como** time, **quero** lint, formatação e padrão de commits aplicados localmente, **para que** o código fique consistente antes mesmo do CI.

**Tarefas**
- ESLint (incl. `@nx/enforce-module-boundaries` da E1-H3) + Prettier configurados no workspace.
- Husky + lint-staged: rodar lint/format no `pre-commit`.
- Commitlint com **Conventional Commits** no `commit-msg`.
- Documentar a convenção no README/CONTRIBUTING.

**Critérios de aceite**
- Um commit fora do padrão é **rejeitado** pelo hook.
- `pre-commit` formata/linta apenas os arquivos staged.
- Hooks não são puláveis silenciosamente (uso de `--no-verify` é exceção documentada).

**Estimativa:** M

### E7-H2 — Pipeline de CI (lint/build/test) com `nx affected`
**Como** time, **quero** um pipeline de CI que valida cada PR, **para que** main permaneça sempre verde.

**Tarefas**
- Workflow de CI (ex.: GitHub Actions) com Node 24.
- Jobs: `nx affected -t lint build test` (só o que mudou) + cache do Nx.
- Subir um Postgres+PostGIS de serviço no CI para rodar migrations e testes que tocam o banco.
- Rodar `migrate` do zero no CI (prova de que o schema recria do nada — ADR 01 §3).

**Critérios de aceite**
- Abrir PR dispara o pipeline; ele falha se lint/build/test falharem.
- O CI aplica todas as migrations do zero contra um Postgres limpo, sem erro.
- O cache do Nx reduz o tempo em runs subsequentes (observável nos logs).

**Estimativa:** M

### E7-H3 — Convenções de PR e branch
**Como** time, **quero** template de PR e política de branch, **para que** a colaboração siga o git_safety (sem push direto na main).

**Tarefas**
- `PULL_REQUEST_TEMPLATE.md` (resumo, o que foi testado, riscos).
- Proteção de branch `main` (PR obrigatório, CI verde para merge).
- CONTRIBUTING com o fluxo (branch → PR → review → merge).

**Critérios de aceite**
- Não é possível push direto na `main` (bloqueado).
- PR sem CI verde não pode ser mergeado.
- Template aparece ao abrir PR.

**Estimativa:** P

---

## 11. E8 — Spike Offline-Sync

> Primeira investigação técnica do projeto (ADR 01 §1). **Timeboxed 1–2 semanas.** Decide a implementação de `libs/offline-sync`. **Não** implementa sync de produção — só prova e decide.

### E8-H1 — Spike PowerSync self-hosted (Plano A)
**Como** CTO, **quero** provar o PowerSync self-hosted ponta a ponta, **para que** a decisão de offline-sync seja por esforço real, não achismo.

**Tarefas**
- Subir PowerSync self-hosted via Docker + Postgres de teste + replicação lógica.
- SDK no app Capacitor (E6) com SQLite local; escrever offline → enfileirar → `uploadData()` chamando um endpoint NestJS de teste.
- Provar **idempotência**: reenviar a mesma mutação (`client_uuid` repetido), cortando a rede no meio — back não duplica.
- Provar **conflito por regra**: dois devices na mesma entidade → regra no back decide.
- Estratégia de **blobs** (foto/assinatura por upload separado, referência no SQLite).
- Validação de **QR offline** (token assinado embarcado, sem rede).
- Conferir a **licença** do `powersync-ja/powersync-service`.

**Critérios de aceite**
- Demonstração: escrita offline sincroniza ao voltar a rede.
- Reenvio do mesmo `client_uuid` **não** duplica no Postgres.
- Conflito resolvido pela regra no back (não last-write-wins).
- Esforço de operar o serviço documentado (replicação lógica, Docker, ausência de dashboard no self-hosted).
- Licença registrada.

**Estimativa:** G

### E8-H2 — Spike fila própria (Plano B) e decisão
**Como** CTO, **quero** um protótipo mínimo da fila própria para comparar, **para que** a escolha de `libs/offline-sync` seja fundamentada.

**Tarefas**
- Protótipo com `@capacitor-community/sqlite` + endpoints NestJS idempotentes por `client_uuid` (append-only, baixo conflito — ADR 01 §1).
- Comparar esforço de construção/operação vs PowerSync (mesmos cenários: idempotência, conflito, blobs, QR offline).
- **Registrar a decisão num ADR** (atualizar ADR 01 / `docs/STATUS.md`) e definir a interface de `libs/offline-sync`.

**Critérios de aceite**
- Protótipo da fila demonstra idempotência por `client_uuid`.
- Tabela comparativa (esforço/risco/operação) PowerSync vs fila própria documentada.
- **Decisão registrada** com justificativa; `libs/offline-sync` tem interface definida (mesmo que a implementação completa seja Fase 2).
- O schema do banco **não** mudou por causa da escolha (ADR confirma — modelo §12).

**Estimativa:** G

---

## 12. Dependências entre épicos

```
E1 (Monorepo & Tooling)
 ├─► E2 (Infra Docker)
 │     └─► E3 (Banco & Migrations) ──► precisa de E2 (Postgres) e E1 (workspace)
 ├─► E4 (Esqueleto Back) ── precisa de E1 (libs/shared) + E2 (compose) + E3 (schema/cliente DB)
 ├─► E5 (Front & Design System) ── precisa de E1 (libs/shared, ui)
 ├─► E6 (Capacitor PoC) ── precisa de E1 + E5 (ui/ui-field)
 ├─► E7 (CI & Convenções) ── precisa de E1; integra E3 (migrate no CI) e E4/E5 (build/test)
 └─► E8 (Spike Offline-Sync) ── precisa de E4 (endpoint NestJS) + E6 (app Capacitor) + E2 (Docker)
```

- **E1 destrava tudo.** Nada começa antes do workspace.
- **E3 depende de E2** (precisa do Postgres+PostGIS de pé).
- **E4 depende de E2+E3** (conexão real e schema).
- **E5 e E6** podem correr em paralelo a E3/E4 (dependem só de E1, e E6 de E5).
- **E7** entra cedo (parte) e amadurece com as demais (precisa de algo para buildar/migrar).
- **E8** é o último a depender de quase tudo, mas é **timeboxed e paralelizável** assim que E4+E6 existirem.

---

## 13. Ordem de execução sugerida

1. **E1** — Monorepo & Tooling (destrava tudo).
2. **E7 (parcial)** — lint/format/commits + esqueleto do CI já no início (qualidade desde o commit 1).
3. **E2** — Infra Docker (Postgres+PostGIS no ar).
4. **E3** — Banco & Migrations (schema completo + seed) — pode começar H1/H2 assim que E2 sobe.
5. **E4** — Esqueleto Back (health-check → módulos → RBAC → config → worker).
6. **E5** — Front & Design System **em paralelo** a E4 (times distintos; só dependem de E1).
7. **E6** — App Capacitor PoC (após E5 ter `ui/ui-field`).
8. **E7 (completo)** — fechar o CI com `migrate` do zero + `nx affected` + proteção de branch.
9. **E8** — Spike Offline-Sync (timeboxed, após E4+E6 existirem). Decisão registrada encerra a Fase 0.

> Back (E4) e Front (E5) caminham juntos guiados pelo `shared/api-contract` (ADR 00 §10), mesmo que na Fase 0 o único contrato real seja o health-check.

---

## 14. Estimativas relativas (resumo)

| História | Tam | | História | Tam |
|---|---|---|---|---|
| E1-H1 | M | | E4-H1 | M |
| E1-H2 | M | | E4-H2 | M |
| E1-H3 | P | | E4-H3 | G |
| E2-H1 | M | | E4-H4 | M |
| E2-H2 | P | | E4-H5 | M |
| E3-H1 | M | | E5-H1 | G |
| E3-H2 | M | | E5-H2 | G |
| E3-H3 | M | | E5-H3 | P |
| E3-H4 | G | | E6-H1 | M |
| E3-H5 | M | | E6-H2 | M |
| E7-H1 | M | | E8-H1 | G |
| E7-H2 | M | | E8-H2 | G |
| E7-H3 | P | | | |

Legenda: **P** ≈ até meio dia · **M** ≈ 1–2 dias · **G** ≈ 3–5 dias (relativo, 1 dev).

---

## 15. Riscos e o que validar

| # | Risco | Impacto | O que validar / mitigação |
|---|---|---|---|
| R1 | **Offline-sync** (escolha PowerSync vs fila) errada custa caro em dados financeiros | Alto | É o E8 (spike timeboxed). Idempotência por `client_uuid` e conflito por regra **provados** antes de adotar. Schema não muda com a escolha (modelo §12). |
| R2 | **PostGIS no Docker** com versão divergente do gerenciado futuro | Médio | Fixar Postgres 15/16, documentar extensões para Cloud SQL/RDS (ADR 01 §3). Rodar `migrate` do zero no CI. |
| R3 | **Dependências circulares de FK** (`bilhete↔caixa_movimento`, `item_preco↔embarcacao`) quebram a ordem de migration | Médio | Seguir §15 do modelo: criar tabela sem a FK, adicionar via `ALTER TABLE`. Teste de aplicação do zero no CI. |
| R4 | **GPS background** (risco alto conhecido) confundido com escopo da Fase 0 | Baixo (escopo) | **Fora da Fase 0** — spike paralelo, não bloqueia MVP (ADR 01 §2). Deixar explícito no planejamento. |
| R5 | **Boundaries de módulo** não impostos → acoplamento que impede extrair serviços depois | Médio | `@nx/enforce-module-boundaries` (E1-H3) falhando o lint em violação. Revisão de PR cobra a regra de ouro. |
| R6 | **Segredos** commitados (.env, senha admin) | Alto | `.env` no `.gitignore`, `.env.example` só com chaves, senha admin via env no seed. Checagem no CI/review. |
| R7 | **Escopo vazando** — implementar tela/regra de negócio na Fase 0 | Médio | DoD reforça "sem regra de negócio". Revisão rejeita endpoint/tela de domínio. |
| R8 | **pnpm ausente** no ambiente (só npm) | Baixo | Usar npm em todo o workspace (CLAUDE.md). Documentar no README. |
| R9 | **Imutabilidade de `audit_evento`** não garantida | Médio | Sem trigger de UPDATE; documentar revogação de UPDATE/DELETE por role do banco (modelo §11). |
| R10 | **Backup/PITR** assumido como Fase 0 | Baixo (escopo) | Fora da Fase 0 (é pré-produção). Registrar como pendência para antes de ir a produção (ADR 01 §3). |

---

## 16. Resumo (5 linhas)

1. A Fase 0 tem **8 épicos** (E1 Monorepo, E2 Docker, E3 Banco/Migrations, E4 Back, E5 Front/Design System, E6 Capacitor PoC, E7 CI/Convenções, E8 Spike Offline-Sync) e **25 histórias** com tarefas e critérios de aceite verificáveis.
2. Ordem recomendada: **E1 → E7(parcial) → E2 → E3 → E4 (com E5 em paralelo) → E6 → E7(completo) → E8**.
3. E1 destrava tudo; E3 depende de E2; E4 depende de E2+E3; E5/E6 só dependem de E1 (paralelizáveis); E8 fecha a fase após E4+E6.
4. Escopo é **só fundação técnica**: nenhuma tela de negócio nem regra de domínio — RBAC e motor de config entram como **estrutura**, não como política real.
5. Maior risco é o **offline-sync** (E8, spike timeboxed que decide `libs/offline-sync`); o GPS background fica **fora** da Fase 0 (spike paralelo, não bloqueia o MVP).
