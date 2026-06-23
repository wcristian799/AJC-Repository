# CLAUDE.md — Projeto AJC (ERP/TMS de transporte fluvial)

> **LEIA ISTO PRIMEIRO em toda sessão.** Este arquivo é a memória do projeto. Se você é uma sessão nova sem contexto, este documento + os links abaixo te recolocam no jogo. **Mantenha-o atualizado** ao fim de cada bloco de trabalho.

## Regra de continuidade (obrigatória)
1. **No início de toda sessão:** leia este arquivo e depois `docs/STATUS.md` (o diário vivo: onde paramos, próximo passo).
2. **Ao terminar um bloco de trabalho:** atualize `docs/STATUS.md` (o que foi feito, o que vem agora) e, se mudou algo estrutural, atualize este arquivo.
3. **Nunca tome decisão de arquitetura já fechada de novo** — elas estão na seção "Decisões fechadas". Se for mudar uma, registre o porquê em `docs/STATUS.md` e no ADR correspondente.
4. **Toda decisão nova relevante vira registro** em `docs/arquitetura/` (ADR) ou no doc do módulo. Documentar é parte da tarefa, não um extra.
5. O papel do assistente aqui é de **CTO/engenharia**: recomendar com posição, contestar quando o usuário estiver errado, e não terceirizar decisões óbvias.

## O que é o projeto
Sistema de gestão (ERP + TMS) para a **AJC**, empresa de transporte fluvial no Pará: passageiros, carga, encomendas e veículos em balsas/barcos entre Belém e 7 cidades. Dores centrais: vazamento de receita na carga, risco jurídico em encomendas, e operação offline (internet ruim no rio).

## Decisões fechadas (NÃO reabrir sem motivo registrado)
- **Recorte MVP:** Fundação/Acesso + Navegação-core + Cadastros + TMS/Carga + Vendas/Passagens (incl. **portal público de venda online com pagamento** — ver abaixo) + CRM + caixa financeiro mínimo. (PDV F&B, Financeiro completo, Veículos, Encomenda-com-preço, rastreamento, integrações = fases posteriores.)
- **Portal de venda online = MVP** (decisão do dono, jun/2026): venda pública pela internet com pagamento integrado (gateway PIX/cartão) faz parte da Fase 1. Puxa para o caminho crítico: reserva de vaga com concorrência (sem overbooking), máquina de estados pedido→pagamento→bilhete, webhook de gateway, área do cliente. Detalhe em `docs/modulos/02-Vendas-Passagens.md` Parte C. **Emissão fiscal (BP-e) = 🔶 pendência** (confirmar com Lucas/contador se é obrigatória no MVP; arquitetura já prevê passo plugável).
- **Stack back:** NestJS (TypeScript) · PostgreSQL (+PostGIS/JSONB) · pg-boss (fila, sobre o Postgres) · Firebase (GPS tempo real, desacoplado).
- **Stack front web (`apps/web-console`):** **TanStack Start** (React 19 full-stack + SSR via Nitro) · **TypeScript** · **shadcn/ui** (new-york) + **Tailwind v4** · **motion** (animações) · **recharts** · gerenciado por **Bun**. Design system **"Crimson Prestige"** (vermelho AJC profundo sobre preto, platina/champagne, dark por padrão) — criado pelo designer do cliente; **é a base oficial, não refazer**. Apps de campo: Ionic + Capacitor (React) a definir na fase de campo.
- **Repo:** monorepo (atualmente apps/api + apps/web-console + libs/). Monolito modular no back (um processo NestJS com módulos de fronteira clara; microserviço só quando métrica pedir). NOTA: o front do designer NÃO usa Nx (é projeto Vite/TanStack standalone via Bun) — o "Nx" do ADR original vale para o back; o front roda por conta própria.
- **Hospedagem:** VPS Hostinger KVM 2 com Docker/compose → GCP/AWS no futuro (portável via Docker). Hostinger NÃO tem Postgres gerenciado; Postgres roda em container no VPS.
- **Offline-sync:** **PowerSync** (plano B: fila própria com SQLite local). Decidir no spike. Conflito resolvido por regra de negócio no back, idempotência por `client_uuid`.
- **Hardware:** apps de campo em **celular comum**; **impressão térmica pelo PC via USB** (não Bluetooth/mobile); embarcação usa celular para GPS. Modelo da impressora de etiqueta a confirmar (🔶, só define protocolo ESC-POS/ZPL).
- **Config:** "tudo configurável, zero hard-code" — preços, comissões, termos, tolerâncias vivem num **motor de configuração versionado** (JSONB), não em `if` no código.
- **Sequência de execução:** Fase 0 (repo+docker+banco+esqueletos) → Fase 1 (telas reais mockadas para aprovação do comercial — **EM ANDAMENTO: front adotado e telas dos módulos MVP construídas**) → Fase 2 (MVP funcional, liga back no front por ordem de dependência) → Fase 3 (avançados).
- **Telas de aprovação = front real mockado** (não protótipo descartável — nada é jogado fora).

## Único risco alto em aberto
- **GPS em background no celular** (rastreamento da embarcação) — não bloqueia o MVP; spike em paralelo. Pode exigir plugin pago ou serviço nativo Android.

## Mapa da documentação
- `docs/PRD.md` — requisitos de produto, personas, glossário.
- `docs/SPEC.md` — arquitetura global e modelo de dados compartilhado.
- `docs/modulos/01..09` — SPEC + telas de cada módulo (TMS, Vendas, Encomendas, CRM, Veículos, Financeiro, Cadastros, PDV-FeB, Navegação).
- `docs/ux/00-Fundacao...` — design system, shell, componentes, acesso/RBAC, setup inicial. **Contrato visual de tudo.**
- `docs/ux/01..05` — UX detalhada (telas, wireframes) de TMS, Vendas, CRM, Cadastros, Navegação-core.
- `docs/ROADMAP-Pos-MVP.md` — o que fica fora do MVP e quando entra.
- `docs/arquitetura/00-ADR-Stack-e-Arquitetura.md` — stack, repo, módulos, topologia, motor de config.
- `docs/arquitetura/01-ADR-Spikes-Tecnicos.md` — offline-sync, hardware, hospedagem (com spikes a fazer).
- `docs/fase-0/` — épicos/histórias e modelo de dados do MVP (execução da Fase 0).
- `docs/STATUS.md` — **diário vivo**: estado atual e próximo passo.

## Convenções técnicas
- Idioma: **PT-BR** em docs e na conversa. Código em inglês; termos de negócio preservados (rede, camarote, palete, balsa, trecho).
- Toda mutação de campo carrega `client_uuid` (idempotência/sync).
- Eventos críticos (conferência, validação, entrega, financeiro) geram **trilha de auditoria** imutável.
- Endpoints respeitam **RBAC** (perfil × módulo × ação).
- Nada de valor de negócio hard-coded — sempre via motor de config.

## Ambiente de desenvolvimento (verificado)
- Node v24, npm 11, git 2.54 disponíveis no Windows. pnpm ausente (usar npm).
- SO: Windows 10 (build 19045); shell do assistente é Git Bash (POSIX).
- **Docker Desktop NÃO funciona nesta máquina** (bug do Inference manager derruba o boot em 4.77 e 4.78; não-resolvível por config sem licença Business). **Não tentar usar Docker Desktop.**
- **Banco e back rodam no WSL2 (Ubuntu-22.04), não no Windows.** PostgreSQL 16.14 + PostGIS 3.6 nativos no WSL; Node 20.18 no WSL. O forward de rede WSL2↔Windows é instável (NAT, sem mirrored no Win10), então **execute o back DENTRO do WSL** onde `localhost:5432` é nativo — não tente conectar do Node no Windows ao Postgres do WSL.
- Padrão para rodar scripts no WSL: `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu-22.04 -u root -- bash /mnt/c/Users/Administrador/Desktop/Trabalho/AJC/infra/<script>.sh`. Scripts úteis em `infra/`: `apply-wsl.sh`, `verify-wsl.sh`, `open-pg-wsl.sh`, `run-api-wsl.sh`.
- Credenciais de dev do banco: db `ajc` / role `ajc` / senha `ajc_dev` / `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc` (a partir de dentro do WSL).

## Front web (`apps/web-console`) — como rodar e cuidados
- **Gerenciador: Bun** (instalado no Windows em `C:\Users\Administrador\.bun\bin\bun.exe`). NÃO usar npm/pnpm neste app. Deps já instaladas (`bun install` só se mudar package.json).
- **Rodar dev:** na pasta `apps/web-console`, `export PATH="$HOME/.bun/bin:$PATH" && bun run dev`. Porta fixa **8080** (sandbox detection do template Lovable). Preview via `.claude/launch.json` (config "web-console", usa caminho absoluto do bun.exe).
- **Build/verificar:** `bun run build` (roda `tsc` + vite + nitro). Deve dar exit 0. É a verificação obrigatória após mexer no front.
- **Login** (`src/routes/index.tsx`): cinematográfico, **deve ficar idêntico** — não alterar sem pedido explícito do dono.
- **Design system** em `src/styles.css` ("Crimson Prestige") — NÃO alterar tokens; todas as telas consomem dele. Primitives em `src/components/ops/primitives.tsx`, animações em `src/components/ops/motion-bits.tsx`, mocks em `src/mocks/data.ts`. Shell/menu em `src/components/ops/{AppShell,HelmDock}.tsx`. Padrão-ouro de página: `src/routes/app.tms.tsx`.
- **Rotas:** internas de gestão em `/app/*` (inicio, navegacao, tms, vendas, encomendas, crm, financeiro, cadastros — usam AppShell com HelmDock). **App de campo em `/campo/*`** (hub + portaria, conferencia, recebimento, entregas — usam **FieldShell**, sem o dock de gestão; é a visão real do operador no coletor). Superfícies públicas/venda: `/portal` (venda online, 7 passos), `/pos` (PDV porto), `/totem`, `/embarque` (validação bilheteiro offline-first), `/cliente` (minhas viagens).
- **Apps de campo separados do painel (decisão jun/2026):** as telas de operador (porteiro, conferente, balsa, entregas) NÃO ficam no painel web de gestão — vivem em `/campo` com shell próprio. O `PhoneFrame` tem prop `framed`: dentro de `/campo` usa-se `framed={false}` (tela cheia). Apps Capacitor nativos = fase de campo futura.
- **⚠️ Armadilha de SSR resolvida (não reintroduzir):** TanStack Start faz SSR. (1) `useInView` do motion pode ficar preso em `false` no SSR → não use para disparar contadores; o `CountUp` anima no mount com salvaguarda de `setTimeout` para abas em background. (2) Coordenadas com `Math.cos/sin` (ex.: RadarSweep) precisam ser **arredondadas** senão o constant-folding diverge entre bundle servidor e cliente, causando hydration mismatch que quebra os `useEffect` do subtree (sintoma: KPIs presos em 0). Mantenha conteúdo não-determinístico determinístico ou client-only.
- É projeto conectado ao **Lovable** (designer) — `AGENTS.md`/`.lovable/` presentes. Não reescrever histórico git publicado; manter a branch funcional.
