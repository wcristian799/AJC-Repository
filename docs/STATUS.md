# STATUS — Diário vivo do projeto AJC

> Atualize ao fim de cada bloco de trabalho. Topo = mais recente. Uma sessão nova lê o `CLAUDE.md` e depois este arquivo para saber exatamente onde retomar.

## Onde estamos agora
**Fase atual:** Fase 1 — telas reais mockadas para aprovação comercial. **Front adotado e telas dos módulos MVP construídas.** (Fase 0/banco já validada no WSL — ver mais abaixo.)
**Status:** o designer do cliente entregou um front completo (Lovable) que **adotamos como base oficial** em `apps/web-console` — design system "Crimson Prestige", TanStack Start + Bun + shadcn + Tailwind v4 + motion. Login cinematográfico mantido idêntico. Telas internas (início, navegação, tms, vendas, crm, financeiro, cadastros) e superfícies (portal de venda online, pos, totem, embarque, cliente) com usabilidade real e mockada. Build verde, navegação verificada no preview.

### Front web — construído e VERIFICADO (sessão jun/2026)
- **Revisão de UX tela por tela:** mapa de gaps em `docs/ux/MAPA-GAPS-UX.md` (referência × SPEC × gap por tela). Telas de gestão estavam boas; faltavam telas operacionais/de campo.
- **TMS/Carga COMPLETADO** (era o maior gap): rota `/app/tms` expandida com B.1 Portaria, B.2/B.3 Notas & DC, B.5 Etiqueta térmica, B.6 Paletes, B.8 Recebimento direto/cross-docking, B.9 Entregas (foto+assinatura+protocolo), B.10 Prestação de contas, B.11 Controle por viagem. Componentes em `src/components/ops/tms/` (PhoneFrame compartilhado). B.4/B.7 (simulador coletor) preservados.
- **Encomendas CRIADO do zero:** rota `/app/encomendas` (+ entrada no HelmDock, ícone Package). Abas B.1 Despacho, B.2 Declaração de conteúdo (assinatura obrigatória — botão confirma bloqueado sem assinar; cláusula de exclusão visível), B.3 Cotação, B.4 Controle por viagem, B.5 Rastreamento. Componentes em `src/components/ops/encomendas/`. Precificação A.1 funcional com valores placeholder (🔶 tabela do Lucas).
- **Vendas operacional REFINADO:** B.6 Gerador de cortesias (limite/contador por viagem, bloqueia ao atingir teto) e B.8 Manifesto de passageiros por viagem (totais por classe/tarifa, status de embarque).
- **Bug de tipo pré-existente corrigido:** `embarque.tsx` passava `style` a um ícone lucide (tsc acusava). Agora `tsc --noEmit` = 0 erros em toda a base.
- **Adoção:** `temp-front` (entrega do designer) movido para `apps/web-console`. Stack: TanStack Start (React 19 SSR/Nitro) + Bun + shadcn/ui (new-york) + Tailwind v4 + motion + recharts. Design system "Crimson Prestige" em `src/styles.css` (vermelho AJC/preto/platina, dark padrão) — base oficial, não refazer.
- **Login** (`src/routes/index.tsx`): cinematográfico (tinta carmim, balsa percorrendo rota fluvial, headline kinetic, botão magnético). Mantido IDÊNTICO por decisão do dono.
- **Telas internas** (`/app/*`, via 2 subagents): inicio (dashboard diretoria com radar, VoyageTrack, feed ao vivo, KPIs), navegacao (embarcações + cronograma + escalas), vendas (canais incl. portal, ocupação por classe, cortesias/gratuidades), crm (ficha 360º, cotações), financeiro (caixas, AP/AR, comissões — leve, Fase 2), cadastros (RBAC matriz, preços com reajuste em massa, fornecedores/colaboradores).
- **Superfícies de venda/campo:** `/portal` (venda online pública, mobile-first, 7 passos busca→pagamento→QR — é MVP), `/pos` (PDV porto, gratuidade/cortesia/caixa), `/totem` (autoatendimento), `/embarque` (validação bilheteiro offline-first, QR válido/já-validado/inválido), `/cliente` (minhas viagens).
- **Bugs de SSR resolvidos:** hydration mismatch no RadarSweep (coordenadas Math.cos/sin arredondadas) e CountUp preso em 0 (animação no mount + salvaguarda setTimeout). Documentado no CLAUDE.md (seção Front) para não reintroduzir.
- **Como rodar:** pasta `apps/web-console`, `export PATH="$HOME/.bun/bin:$PATH" && bun run dev`, porta **8080**. Build: `bun run build` (exit 0 verificado).
- **Ressalvas (mock):** filtros/busca/botões são visuais (sem backend); QR é fake (grid SVG); falha de pagamento do portal é simulada (1ª tentativa falha p/ demo). Componente FakeQR duplicado em 4 telas (extrair p/ `components/ops/` num passo futuro).

## Onde estamos agora (Fase 0 — base técnica, já validada)
**Banco + API validados rodando no WSL.** Monorepo, tipos, migrations (42 tabelas) e seed prontos e APLICADOS em Postgres vivo; esqueleto NestJS sobe e o health-check confirma `db:up`.

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
1. **Front (`apps/web-console`) JÁ ADOTADO e telas mockadas prontas** — ver seção "Front web". Para rodar: `cd apps/web-console && export PATH="$HOME/.bun/bin:$PATH" && bun run dev` (porta 8080). Para mostrar ao dono/comercial: navegar por `/app/inicio` e `/portal`.
2. **Revisão do dono nas telas** — coletar feedback do comercial sobre as telas mockadas antes de ligar backend. Ajustar conteúdo/fluxo conforme retorno.
3. **Spike de pagamento + fiscal do portal** (pendência crítica do MVP): escolher gateway (Mercado Pago/Pagar.me/etc.) e mapear caminho do BP-e com Lucas/contador. Derriscar ANTES de implementar o portal funcional.
4. **Banco JÁ VALIDADO no WSL2.** Numa máquina nova: instalar PG16+PostGIS no WSL e rodar `infra/apply-wsl.sh`.
5. **Fase 2 (ligar back no front):** decidir Prisma vs TypeORM (E3-H1) ao iniciar dados de domínio; ligar módulos por ordem de dependência (cadastros→navegação→vendas→tms).
6. **Pendências paralelas:** App Capacitor PoC (E6, lê QR), CI (E7), spike offline-sync PowerSync (E8).

> Decisão técnica pendente registrada no E3-H1: **Prisma vs TypeORM** para o runner de migrations do back. As migrations atuais são SQL puro (não dependem dessa escolha). Decidir ao iniciar o E4.

## Linha do tempo (resumo)
- **Etapa 1 — Discovery/Produto:** PRD + SPEC global + 9 módulos documentados (`docs/`, `docs/modulos/`).
- **Etapa 2 — UX:** Fundação (design system/shell/acesso) + UX detalhada de TMS, Vendas, CRM, Cadastros, Navegação-core (`docs/ux/`). Telas com wireframes ASCII.
- **Etapa 3 — Roadmap:** recorte do MVP e backlog pós-MVP (`docs/ROADMAP-Pos-MVP.md`).
- **Etapa 4 — Arquitetura:** stack e repo definidos (ADR 00); spikes técnicos pesquisados — offline-sync (PowerSync), hardware (celular + impressão PC/USB), hospedagem (VPS Hostinger) (ADR 01).
- **Etapa 5 — Fase 0 (em curso):** regra de continuidade criada (`CLAUDE.md` + este arquivo). Construção do repo a seguir.

## Decisões recentes
- **Escopo MVP atualizado (cliente):** o **portal público de venda de passagem online com pagamento integrado** ENTRA no MVP (Fase 1). Detalhado na Parte C do módulo Vendas/Passagens (`docs/modulos/02-Vendas-Passagens.md`). Isso adiciona ao caminho crítico: reserva de vaga com concorrência (sem overbooking), máquina de estados pedido/pagamento, gateway (webhook), área do cliente e gancho de emissão fiscal.
- **Front anterior descartado:** todo o front da sessão (web-console + conceito IGARAPÉ + libs/ui) foi removido a pedido do cliente; o **UX vai enviar um design system** para nos basearmos. Decisões técnicas de stack (React+TS+Vite, rodar no WSL) seguem válidas; só o visual será refeito sobre o DS do UX.
- Hardware simplificado: celular comum (não coletor industrial) + impressão térmica no PC via USB (não Bluetooth). Reduziu os riscos altos de 2 para 1 (só GPS background, que é fase posterior).
- Sequência confirmada com o cliente: Fase 0 → telas mockadas para aprovação comercial → MVP funcional → avançados.
- Telas de aprovação serão front real mockado (reaproveitável), não protótipo descartável.

## Pendências do cliente (🔶) — não bloqueiam a Fase 0
- **Emissão fiscal do bilhete (BP-e):** confirmar com Lucas/contador se é obrigatória no MVP do portal e qual o caminho (SEFAZ-PA, certificado, credenciamento, API/fornecedor). Ver §C.7.
- **Gateway de pagamento:** definir fornecedor (Mercado Pago / Pagar.me / Stripe / PagBank), meios (cartão/PIX), taxas e exigências — **spike antes de construir o portal**.
- Tabela de preço de encomendas (Lucas).
- Textos: termo de aceite de embarque, declaração de conteúdo, termo de veículos.
- Cores de pulseira por classe.
- Modelo da impressora de etiqueta (define ESC-POS vs ZPL).
- Regras de comissão de agentes (diretoria).
- Provedores: pagamento, WhatsApp/SMS.

## Spikes técnicos a executar (ver ADR 01)
- Offline-sync: PowerSync self-hosted vs fila própria (1º spike, antes do TMS).
- **Pagamento + fiscal do portal:** escolher gateway e mapear o caminho do BP-e (depende da confirmação do Lucas/contador). Derriscar antes de construir o portal.
- GPS background em celular real (paralelo; afeta só rastreamento).
- Impressão PC/USB com a impressora definida.
