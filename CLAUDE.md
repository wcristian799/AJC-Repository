# CLAUDE.md â€” Projeto AJC (ERP/TMS de transporte fluvial)

> **LEIA ISTO PRIMEIRO em toda sessÃ£o.** Este arquivo Ã© a memÃ³ria do projeto. Se vocÃª Ã© uma sessÃ£o nova sem contexto, este documento + os links abaixo te recolocam no jogo. **Mantenha-o atualizado** ao fim de cada bloco de trabalho.

## Regra de continuidade (obrigatÃ³ria)
1. **No inÃ­cio de toda sessÃ£o:** leia este arquivo e depois `docs/STATUS.md` (o diÃ¡rio vivo: onde paramos, prÃ³ximo passo).
2. **Ao terminar um bloco de trabalho:** atualize `docs/STATUS.md` (o que foi feito, o que vem agora) e, se mudou algo estrutural, atualize este arquivo.
3. **Nunca tome decisÃ£o de arquitetura jÃ¡ fechada de novo** â€” elas estÃ£o na seÃ§Ã£o "DecisÃµes fechadas". Se for mudar uma, registre o porquÃª em `docs/STATUS.md` e no ADR correspondente.
4. **Toda decisÃ£o nova relevante vira registro** em `docs/arquitetura/` (ADR) ou no doc do mÃ³dulo. Documentar Ã© parte da tarefa, nÃ£o um extra.
5. O papel do assistente aqui Ã© de **CTO/engenharia**: recomendar com posiÃ§Ã£o, contestar quando o usuÃ¡rio estiver errado, e nÃ£o terceirizar decisÃµes Ã³bvias.
6. **Fonte mais recente manda:** a reuniÃ£o/transcriÃ§Ã£o de validaÃ§Ã£o do cliente em `docs/feedback/2026-06-25-validacao-core-telas.md` Ã© a referÃªncia vigente para a rodada atual. Se ela divergir de docs antigos, atualize os docs antigos; nÃ£o trate como conflito a rediscutir.

## O que Ã© o projeto
Sistema de gestÃ£o (ERP + TMS) para a **AJC**, empresa de transporte fluvial no ParÃ¡: passageiros, carga, encomendas e veÃ­culos em balsas/barcos entre BelÃ©m e 7 cidades. Dores centrais: vazamento de receita na carga, risco jurÃ­dico em encomendas, e operaÃ§Ã£o offline (internet ruim no rio).

## DecisÃµes fechadas (NÃƒO reabrir sem motivo registrado)
- **Recorte MVP:** FundaÃ§Ã£o/Acesso + NavegaÃ§Ã£o-core + Cadastros + TMS/Carga + **VeÃ­culos/MÃ¡quinas** + Vendas/Passagens (incl. **portal pÃºblico de venda online com pagamento** â€” ver abaixo) + CRM + caixa financeiro mÃ­nimo. (PDV F&B, Financeiro completo, Compras/DRE, Encomenda-com-preÃ§o, rastreamento, integraÃ§Ãµes avanÃ§adas = fases posteriores.)
- **Portal de venda online = MVP** (decisÃ£o do dono, jun/2026): venda pÃºblica pela internet com pagamento integrado (gateway PIX/cartÃ£o) faz parte da Fase 1. Puxa para o caminho crÃ­tico: reserva de vaga com concorrÃªncia (sem overbooking), mÃ¡quina de estados pedidoâ†’pagamentoâ†’bilhete, webhook de gateway, Ã¡rea do cliente. Detalhe em `docs/modulos/02-Vendas-Passagens.md` Parte C. **EmissÃ£o fiscal (BP-e) = ðŸ”¶ pendÃªncia parcial**: PFX da AJC recebido em 29/jun/2026, mas ainda faltam senha, validade/uso, credenciamento SEFAZ-PA e fornecedor/API fiscal.
- **Stack back:** NestJS (TypeScript) Â· PostgreSQL (+PostGIS/JSONB) Â· pg-boss (fila, sobre o Postgres) Â· Firebase (GPS tempo real, desacoplado).
- **Stack front web (`apps/web-console`):** **TanStack Start** (React 19 full-stack + SSR via Nitro) Â· **TypeScript** Â· **shadcn/ui** (new-york) + **Tailwind v4** Â· **motion** (animaÃ§Ãµes) Â· **recharts** Â· gerenciado por **Bun**. Design system **"Crimson Prestige"** (vermelho AJC profundo sobre preto, platina/champagne, dark por padrÃ£o) â€” criado pelo designer do cliente; **Ã© a base oficial, nÃ£o refazer**. Apps de campo: Ionic + Capacitor (React) a definir na fase de campo.
- **Repo:** monorepo (atualmente apps/api + apps/web-console + libs/). Monolito modular no back (um processo NestJS com mÃ³dulos de fronteira clara; microserviÃ§o sÃ³ quando mÃ©trica pedir). NOTA: o front do designer NÃƒO usa Nx (Ã© projeto Vite/TanStack standalone via Bun) â€” o "Nx" do ADR original vale para o back; o front roda por conta prÃ³pria.
- **Hospedagem:** VPS Hostinger KVM 2 com Docker/compose â†’ GCP/AWS no futuro (portÃ¡vel via Docker). Hostinger NÃƒO tem Postgres gerenciado; Postgres roda em container no VPS.
- **Offline-sync:** **PowerSync** (plano B: fila prÃ³pria com SQLite local). Decidir no spike. Conflito resolvido por regra de negÃ³cio no back, idempotÃªncia por `client_uuid`.
- **Hardware:** apps de campo em **celular comum**; **impressÃ£o tÃ©rmica via Bluetooth** conforme validaÃ§Ã£o do cliente; embarcaÃ§Ã£o usa celular para GPS. Modelo da impressora de etiqueta a confirmar (ðŸ”¶, define protocolo ESC-POS/ZPL e compatibilidade Bluetooth).
- **Config:** "tudo configurÃ¡vel, zero hard-code" â€” preÃ§os, comissÃµes, termos, tolerÃ¢ncias vivem num **motor de configuraÃ§Ã£o versionado** (JSONB), nÃ£o em `if` no cÃ³digo.
- **SequÃªncia de execuÃ§Ã£o:** Fase 0 (repo+docker+banco+esqueletos) â†’ Fase 1 (telas reais mockadas para aprovaÃ§Ã£o do comercial â€” **front adotado e refinado conforme cliente**) â†’ **Fase 2 (MVP funcional/backend real â€” EM ANDAMENTO)** â†’ Fase 3 (avanÃ§ados).
- **Telas de aprovaÃ§Ã£o = front real mockado** (nÃ£o protÃ³tipo descartÃ¡vel â€” nada Ã© jogado fora).
- **Rodada atual (02/jul/2026):** front mockado foi refinado com Nova Viagem/Nova Carga/PrestaÃ§Ã£o/FAQ e a base do **backend MVP funcional** jÃ¡ estÃ¡ implementada: migrations 0008/0009/0010/0011/0012/0013/0014/0015, runner SQL puro com `schema_migrations`, enum de 8 classes, schema de VeÃ­culos/MÃ¡quinas, harness Jest, Auth/RBAC/sessÃ£o, Config/Cadastros/PreÃ§os/NavegaÃ§Ã£o, TMS/Carga/VeÃ­culos/Encomendas/PrestaÃ§Ã£o de Contas, Vendas/Caixa/Bilhetes, CRM/cotaÃ§Ãµes/histÃ³rico 360, Financeiro leve AP/AR e Portal/Pedido/Reserva/Pagamento/Fiscal stub funcionais. `/portal`, `/cliente`, login/auth, `/app/inicio`, `/app/navegacao` incluindo escalas reais por `GET /api/navegacao/escalas-colaboradores`, `/app/tms` sem imports de mocks nos componentes operacionais, incluindo `ControleTab`, `EtiquetaTab`, `PaletesTab`, `NotasTab` via `GET /api/tms/documentos` e `PrestacaoTab` via `GET /api/tms/prestacoes`, `/campo/*`, `/app/vendas` incluindo agregados reais por `GET /api/vendas/resumo`, `/pos`, `/totem`, `/embarque`, `/app/cadastros` com criaÃ§Ã£o real de fornecedores/colaboradores, `/app/crm` mutÃ¡vel (cliente, realocaÃ§Ã£o e cotaÃ§Ã£o), `/app/encomendas` incluindo precificação real por `GET /api/precos?tipo=encomenda` e caixa/financeiro leve com AP/AR operacional em `/app/financeiro` jÃ¡ estÃ£o conectados ao backend real nas aÃ§Ãµes principais. Prompt/runbook de referÃªncia: `docs/fase-2/01-PROMPT-Backend-MVP-Completo.md`. **PrÃ³xima frente ativa:** revisar mocks remanescentes de componentes auxiliares e fechar lacunas funcionais restantes; AP/AR/DRE/Compras seguem fase posterior.

## Ãšnico risco alto em aberto
- **GPS em background no celular** (rastreamento da embarcaÃ§Ã£o) â€” nÃ£o bloqueia o MVP; spike em paralelo. Pode exigir plugin pago ou serviÃ§o nativo Android.

## Mapa da documentaÃ§Ã£o
- `docs/PRD.md` â€” requisitos de produto, personas, glossÃ¡rio.
- `docs/SPEC.md` â€” arquitetura global e modelo de dados compartilhado.
- `docs/modulos/01..09` â€” SPEC + telas de cada mÃ³dulo (TMS, Vendas, Encomendas, CRM, VeÃ­culos, Financeiro, Cadastros, PDV-FeB, NavegaÃ§Ã£o).
- `docs/ux/00-Fundacao...` â€” design system, shell, componentes, acesso/RBAC, setup inicial. **Contrato visual de tudo.**
- `docs/ux/01..05` â€” UX detalhada (telas, wireframes) de TMS, Vendas, CRM, Cadastros, NavegaÃ§Ã£o-core.
- `docs/ROADMAP-Pos-MVP.md` â€” o que fica fora do MVP e quando entra.
- `docs/feedback/2026-06-25-validacao-core-telas.md` â€” consolidaÃ§Ã£o da reuniÃ£o de validaÃ§Ã£o do cliente sobre o front mockado; fonte mais recente e autoritativa da rodada atual; ler antes de mexer nas telas pÃ³s-mockup.
- `docs/feedback/2026-06-29-auditoria-transcricao-bruta-e-pendencias.md` â€” auditoria da transcriÃ§Ã£o bruta `C:\Users\Administrador\Desktop\texto.txrt.txt` contra a consolidaÃ§Ã£o; lista nuances e pendÃªncias ainda atribuÃ­das ao cliente/Lucas.
- `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md` â€” modelo real de prestaÃ§Ã£o de contas recebido do cliente; resolve a pendÃªncia do formulÃ¡rio em papel e guia o refinamento do `PrestacaoTab`.
- `docs/feedback/2026-06-29-certificado-digital-ajc-pfx.md` â€” registro do certificado digital PFX recebido; nÃ£o copiar/commitar o PFX; BP-e ainda depende de senha, validade, credenciamento e fornecedor/API.
- `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md` â€” campos recebidos do Lucas para Nova Viagem, lista/classes de embarcaÃ§Ãµes e Nova Carga.
- `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md` â€” FAQ 2026 recebido do cliente; resolve DOC FAQ/paradas automÃ¡ticas e traz rotas, horÃ¡rios, preÃ§os de passagem, formas de pagamento e endereÃ§os dos portos; validar divergÃªncias internas de horÃ¡rio antes do backend definitivo.
- `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md` â€” SPEC/checklist operacional da rodada atual de ajustes do front; core interno concluÃ­do com reabertura pontual em PrestaÃ§Ã£o de Contas, Portal online ainda pendente por decisÃ£o de ordem.
- `docs/fase-2/01-PROMPT-Backend-MVP-Completo.md` â€” prompt/runbook para agente implementar o backend MVP completo a partir do front aprovado, usando subagents, migrations SQL, seeds, mÃ³dulos NestJS, testes e integraÃ§Ã£o gradual com o front.
- `docs/arquitetura/00-ADR-Stack-e-Arquitetura.md` â€” stack, repo, mÃ³dulos, topologia, motor de config.
- `docs/arquitetura/01-ADR-Spikes-Tecnicos.md` â€” offline-sync, hardware, hospedagem (com spikes a fazer).
- `docs/fase-0/` â€” Ã©picos/histÃ³rias e modelo de dados do MVP (execuÃ§Ã£o da Fase 0).
- `docs/STATUS.md` â€” **diÃ¡rio vivo**: estado atual e prÃ³ximo passo.

## ConvenÃ§Ãµes tÃ©cnicas
- Idioma: **PT-BR** em docs e na conversa. CÃ³digo em inglÃªs; termos de negÃ³cio preservados (rede, camarote, palete, balsa, trecho).
- Toda mutaÃ§Ã£o de campo carrega `client_uuid` (idempotÃªncia/sync).
- Eventos crÃ­ticos (conferÃªncia, validaÃ§Ã£o, entrega, financeiro) geram **trilha de auditoria** imutÃ¡vel.
- Endpoints respeitam **RBAC** (perfil Ã— mÃ³dulo Ã— aÃ§Ã£o).
- Nada de valor de negÃ³cio hard-coded â€” sempre via motor de config.

## Ambiente de desenvolvimento (verificado)
- Node v24, npm 11, git 2.54 disponÃ­veis no Windows. pnpm ausente (usar npm).
- SO: Windows 10 (build 19045); shell do assistente Ã© Git Bash (POSIX).
- **Docker Desktop NÃƒO funciona nesta mÃ¡quina** (bug do Inference manager derruba o boot em 4.77 e 4.78; nÃ£o-resolvÃ­vel por config sem licenÃ§a Business). **NÃ£o tentar usar Docker Desktop.**
- **Banco e back rodam no WSL2 (Ubuntu-22.04), nÃ£o no Windows.** PostgreSQL 16.14 + PostGIS 3.6 nativos no WSL; Node 20.18 no WSL. O forward de rede WSL2â†”Windows Ã© instÃ¡vel (NAT, sem mirrored no Win10), entÃ£o **execute o back DENTRO do WSL** onde `localhost:5432` Ã© nativo â€” nÃ£o tente conectar do Node no Windows ao Postgres do WSL.
- PadrÃ£o para rodar scripts no WSL: `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu-22.04 -u root -- bash /mnt/c/Users/Administrador/Desktop/Trabalho/AJC/infra/<script>.sh`. Scripts Ãºteis em `infra/`: `apply-wsl.sh`, `verify-wsl.sh`, `open-pg-wsl.sh`, `run-api-wsl.sh`.
- Credenciais de dev do banco: db `ajc` / role `ajc` / senha `ajc_dev` / `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc` (a partir de dentro do WSL).

## Front web (`apps/web-console`) â€” como rodar e cuidados
- **Gerenciador: Bun** (instalado no Windows em `C:\Users\Administrador\.bun\bin\bun.exe`). NÃƒO usar npm/pnpm neste app. Deps jÃ¡ instaladas (`bun install` sÃ³ se mudar package.json).
- **Rodar dev:** na pasta `apps/web-console`, `export PATH="$HOME/.bun/bin:$PATH" && bun run dev`. Porta fixa **8080** (sandbox detection do template Lovable). Preview via `.claude/launch.json` (config "web-console", usa caminho absoluto do bun.exe).
- **Build/verificar:** `bun run build` (roda `tsc` + vite + nitro). Deve dar exit 0. Ã‰ a verificaÃ§Ã£o obrigatÃ³ria apÃ³s mexer no front.
- **Login** (`src/routes/index.tsx`): cinematogrÃ¡fico, **deve ficar idÃªntico** â€” nÃ£o alterar sem pedido explÃ­cito do dono.
- **Design system** em `src/styles.css` ("Crimson Prestige") â€” NÃƒO alterar tokens; todas as telas consomem dele. Primitives em `src/components/ops/primitives.tsx`, animaÃ§Ãµes em `src/components/ops/motion-bits.tsx`, mocks em `src/mocks/data.ts`. Shell/menu em `src/components/ops/{AppShell,HelmDock}.tsx`. PadrÃ£o-ouro de pÃ¡gina: `src/routes/app.tms.tsx`.
- **Rotas:** internas de gestÃ£o em `/app/*` (inicio, navegacao, tms, vendas, encomendas, crm, financeiro, cadastros â€” usam AppShell com HelmDock). **App de campo em `/campo/*`** (hub + portaria, conferencia, recebimento, entregas â€” usam **FieldShell**, sem o dock de gestÃ£o; Ã© a visÃ£o real do operador no coletor). SuperfÃ­cies pÃºblicas/venda: `/portal` (venda online, 7 passos), `/pos` (PDV porto), `/totem`, `/embarque` (validaÃ§Ã£o bilheteiro offline-first), `/cliente` (minhas viagens).
- **PrÃ³xima frente ativa:** integraÃ§Ã£o front/back e remoÃ§Ã£o gradual dos mocks nas rotas internas. Auth/RBAC, Config/Cadastros/PreÃ§os/NavegaÃ§Ã£o, TMS/Carga/VeÃ­culos/Encomendas/PrestaÃ§Ã£o de Contas, Vendas/Caixa/Bilhetes, CRM, Financeiro leve AP/AR e Portal/Pedido/Reserva/Pagamento/Fiscal stub jÃ¡ estÃ£o implementados; `/portal`, `/cliente`, login/auth, `/app/inicio`, `/app/navegacao` incluindo escalas reais por `GET /api/navegacao/escalas-colaboradores`, `/app/tms` sem imports de mocks nos componentes operacionais, incluindo `ControleTab`, `EtiquetaTab`, `PaletesTab`, `NotasTab` via `GET /api/tms/documentos` e `PrestacaoTab` via `GET /api/tms/prestacoes`, `/campo/*`, `/app/vendas` incluindo agregados reais por `GET /api/vendas/resumo`, `/pos`, `/totem`, `/embarque`, `/app/cadastros` com criaÃ§Ã£o real de fornecedores/colaboradores, `/app/crm` mutÃ¡vel (cliente, realocaÃ§Ã£o e cotaÃ§Ã£o), `/app/encomendas` incluindo precificação real por `GET /api/precos?tipo=encomenda` e caixa/financeiro leve com AP/AR operacional em `/app/financeiro` jÃ¡ consomem API real via `apps/web-console/src/lib/ajc-api.ts` nas aÃ§Ãµes principais. Front aprovado Ã© contrato de comportamento; nÃ£o redesenhar ao integrar API. PrÃ³xima ordem: mocks remanescentes de componentes auxiliares e lacunas funcionais restantes. Gateway/BP-e reais seguem bloqueados por credenciais/provedor, entÃ£o manter adaptadores/stubs auditÃ¡veis.
- **Apps de campo separados do painel (decisÃ£o jun/2026):** as telas de operador (porteiro, conferente, balsa, entregas) NÃƒO ficam no painel web de gestÃ£o â€” vivem em `/campo` com shell prÃ³prio. O `PhoneFrame` tem prop `framed`: dentro de `/campo` usa-se `framed={false}` (tela cheia). Apps Capacitor nativos = fase de campo futura.
- **âš ï¸ Armadilha de SSR resolvida (nÃ£o reintroduzir):** TanStack Start faz SSR. (1) `useInView` do motion pode ficar preso em `false` no SSR â†’ nÃ£o use para disparar contadores; o `CountUp` anima no mount com salvaguarda de `setTimeout` para abas em background. (2) Coordenadas com `Math.cos/sin` (ex.: RadarSweep) precisam ser **arredondadas** senÃ£o o constant-folding diverge entre bundle servidor e cliente, causando hydration mismatch que quebra os `useEffect` do subtree (sintoma: KPIs presos em 0). Mantenha conteÃºdo nÃ£o-determinÃ­stico determinÃ­stico ou client-only.
- Ã‰ projeto conectado ao **Lovable** (designer) â€” `AGENTS.md`/`.lovable/` presentes. NÃ£o reescrever histÃ³rico git publicado; manter a branch funcional.
- Migrations: SQL puro em infra/migrations/, controle via tabela schema_migrations + runner infra/migrations/run.mjs (node run.mjs [--status|--baseline]); pg ancorado em apps/api. Decisao Prisma-vs-TypeORM encerrada: sem ORM. Testes back: Jest+ts-jest+@nestjs/testing+Supertest em apps/api (npm test).
