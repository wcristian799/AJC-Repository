# STATUS — Diário vivo do projeto AJC

> Atualize ao fim de cada bloco de trabalho. Topo = mais recente. Uma sessão nova lê o `CLAUDE.md` e depois este arquivo para saber exatamente onde retomar.

## Trabalho 2026-06-30 — Nova Viagem, Nova Carga e Prestação refinados no front
- **O que foi feito:**
  - `apps/web-console/src/routes/app.navegacao.tsx`: painel **Nova viagem** reescrito com os campos do Lucas — número auto, FerryBoat em lista (frota oficial F/B Amazonas II–VI + Paru), saída, paradas com **preenchimento automático via templates do FAQ 2026** (Belém→Almeirim, Belém→Santarém quarta/sexta, retorno de sábado), passageiros em rede (manual) e camarotes/classes condicionais à embarcação (matriz do Lucas). Chips de atenção sinalizam horários do PDF a validar.
  - `apps/web-console/src/routes/app.tms.tsx`: painel **Nova carga** reescrito com os campos do Lucas — pedido = COD CLIENTE + NF/DC, UUID/QR e código de carga gerados pelo sistema, viagem/origem/destino, cliente da NF/DC ou manual, upload NF/DC, CIF/FOB, peso e valor, agendamento por janela. Adicionado helper `CargaField`.
  - `apps/web-console/src/components/ops/tms/PrestacaoTab.tsx`: já reescrito para espelhar o modelo real (cabeçalho/caixa, À bordo, Cozinha/Lanchonete/Internet, Passagens — Agências, Fretes — Agências, Despesas, Redondas/Gratificações, Fechamento, Local/Data/Responsável, PDF).
  - Portaria (`PortariaTab`): conferido — já possui tile "Foto (recomendada)" no registro de entrada de veículo de carga; obrigatoriedade segue pendente de confirmação do cliente.
- **Verificação:** `bun run build` exit 0; rotas `/app/tms`, `/app/navegacao`, `/campo/portaria` respondem 200 no dev server.
- **Checklist atualizado:** marcadas as tarefas de Nova Viagem (refino + templates FAQ), Nova Carga (refino) e Prestação (modelo real) e a conferência de foto na portaria em `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md`.
- **Próximo passo:** QA visual/navegação do core interno (abrir os painéis e validar leitura), depois atacar o Portal online (último item do MVP). Backend só depois do front aprovado. Validar com Lucas as divergências de horário do FAQ e as capacidades numéricas reais por classe/embarcação antes do cadastro definitivo.

## Material recebido 2026-06-30 — FAQ 2026 de paradas, preços e portos
- **Novo arquivo analisado:** `C:\Users\Administrador\Downloads\FAQ 2026.pdf`.
- **Registro criado:** `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`.
- **Pendências baixadas:** DOC FAQ das paradas automáticas; trechos/rotas públicas; preços de passagem por destino/classe; formas de pagamento atuais; regras públicas de meia/isento; endereços dos portos.
- **Atenção:** o PDF tem divergências internas de horário (ex.: 17h vs 18h em saídas, chegada em Santarém com horário cravado vs "início da tarde"). Para front mockado é suficiente; para backend/cadastro definitivo, validar com Lucas antes de publicar tabela oficial.
- **O que NÃO foi resolvido:** tabela de preço de encomendas, tabela/regra de preço de veículos/máquinas, capacidades numéricas reais por classe/embarcação, termo de embarque, cores de pulseira, gateway e BP-e.
- **Impacto no front:** próxima IA deve refinar `/app/navegacao` usando os templates de rota/paradas do FAQ e pode refinar Cadastros/Vendas com preços reais de passagem do FAQ 2026. Não ligar backend agora.

## Material recebido 2026-06-30 — campos de Nova Viagem e Nova Carga
- **Novo material recebido do Lucas:** campos para Botão Nova Viagem, lista/classes de embarcações e Botão Nova Carga.
- **Registro criado:** `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md`.
- **Pendências baixadas:** campos detalhados de Nova Viagem; lista de embarcações; matriz de classes por embarcação; campos detalhados de Nova Carga.
- **Atualização:** o DOC FAQ foi recebido depois e registrado em `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`; resta validar divergências internas de horário antes do backend definitivo.
- **Ainda pendente dentro desse assunto:** capacidades numéricas reais por classe/embarcação, caso existam em tabela separada.
- **Impacto no front:** próxima IA deve refinar `/app/navegacao` com Nova Viagem e matriz de embarcação/classes, e refinar `/app/tms`/Nova Carga com pedido/venda, UUID/QR, código de carga, viagem, origem/destino, cliente, upload NF/DC, peso e valor. Isso entra junto com os ajustes já pendentes de `PrestacaoTab` e foto na portaria.

## Auditoria 2026-06-29 — transcrição bruta conferida
- **Fonte auditada:** `C:\Users\Administrador\Desktop\texto.txrt.txt`.
- **Registro criado:** `docs/feedback/2026-06-29-auditoria-transcricao-bruta-e-pendencias.md`.
- **Resultado:** o consolidado `docs/feedback/2026-06-25-validacao-core-telas.md` cobre os pontos principais da reunião e do documento de pauta anexado ao fim da transcrição.
- **Nuances adicionadas a partir do bruto:** apps internos provavelmente por instalação direta/fora da Play Store; portaria cita foto no registro de veículo de carga; regra financeira futura de carga: toda carga tem valor declarado/cobrado, nenhuma carga sobe sem etiqueta/cobrança, etiquetas geram cobrança, e foi citada comissão de 2% com relatório separado por viagem.
- **Impacto:** nada disso bloqueia o front mockado. O próximo passo continua sendo `PrestacaoTab` pelo modelo real, QA visual e Portal por último.

## Material recebido 2026-06-29 — certificado digital PFX da AJC
- **Novo arquivo recebido:** `C:\Users\Administrador\Downloads\2866916_A__J__C__NAVEGACAO_LTDA_10736847000192 (1).pfx`.
- **Registro criado:** `docs/feedback/2026-06-29-certificado-digital-ajc-pfx.md`.
- **Pendência parcialmente resolvida:** o material de certificado digital para o fluxo fiscal/BP-e foi recebido. O nome do arquivo indica AJC Navegação LTDA / CNPJ `10.736.847/0001-92`.
- **Cuidados obrigatórios:** não copiar o PFX para o repo, não commitar e não registrar senha em docs/código/chat. `.gitignore` agora bloqueia `*.pfx`, `*.p12`, `*.jks` e `*.keystore`.
- **Ainda pendente:** senha do PFX, validade/cadeia/uso do certificado, confirmação de que serve para BP-e, credenciamento SEFAZ-PA, fornecedor/API fiscal, homologação/produção e desenho seguro de armazenamento em produção.
- **Impacto no trabalho atual:** não muda o próximo passo imediato de front. Primeiro refinar Prestação de Contas pelo modelo real; depois QA/Portal. Para o Portal/backend fiscal, considerar que o certificado foi recebido, mas o fluxo BP-e ainda exige spike fiscal.

## Material recebido 2026-06-29 — modelo real de prestação de contas
- **Novo arquivo analisado:** `C:\Users\Administrador\Downloads\PRESTAÇÃO DE CONTAS GERENTES AM VI 24 09 (2).docx`.
- **Registro criado:** `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`.
- **Pendência externa resolvida:** "modelo atual em papel da prestação de contas do gerente" agora foi recebido. Ele valida a estrutura real do formulário: cabeçalho com embarcação/viagem/período/caixa, receitas À bordo, cozinha por dia, lanchonete, internet, passagens por agências com comissão/saldo, fretes por agências, despesas, redondas/gratificações, fechamento com receita/despesa/saldo repassado e assinatura local/data/responsável.
- **Reabertura pontual do front:** antes de considerar o core interno 100% pronto para QA final, ajustar `apps/web-console/src/components/ops/tms/PrestacaoTab.tsx` para espelhar esse modelo real. O checklist foi atualizado em `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md`.
- **O que NÃO mudou:** BP-e/gateway, preços de encomendas, declaração de conteúdo, termos, impressora Bluetooth, regras definitivas de comissão e provedores continuam pendências externas. Observação: o PFX foi recebido depois, mas BP-e ainda depende de senha/validade/credenciamento/fornecedor.

## Implementação 2026-06-29 — core interno do front pós-validação aplicado
- **SPEC/checklist criado e atualizado:** `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md` agora quebra a rodada em SPEC, tarefas e detalhamento por tela/módulo.
- **Core interno ajustado no front mockado:** `/app/inicio`, `/app/navegacao`, `/app/tms`, apps de campo simulados dentro do TMS, `/app/encomendas`, `/app/vendas`, `/pos`, `/embarque`, `/app/crm`, `/app/cadastros` e `/app/financeiro` receberam os pontos da reunião/transcrição: caixas separados, alerta cadastrável, calendário/nova viagem, conflito de escala, CIF/FOB, agenda 30 min/5 caminhões, MP/PD/PC, palete completo/parcial, reimpressão de etiqueta, prestação de contas detalhada, Veículos/Máquinas, portaria/recebimento/entrega, multipagamento, agente comercial, cortesias, manifesto, BP-e, QR usado/vencido, remetente/destinatário completos, cidade/UF, intertrecho, preços por cliente/destino e financeiro mínimo sem prometer conciliação/Compras/DRE agora.
- **Verificação:** `bun run build` em `apps/web-console` passou com exit 0 depois das alterações.
- **Próximo passo para qualquer agente/IA nova:** fazer QA visual e de navegação do front ajustado no navegador, corrigir eventuais quebras visuais/responsivas, e só então partir para o **Portal online** (último bloco do MVP) ou para o desenho do backend funcional por ordem de dependência. Não reabrir escopo: reunião/transcrição continua mandando.

## Correção de escopo 2026-06-29 — reunião/transcrição manda
- **Hierarquia corrigida:** a reunião/transcrição de validação do cliente (`docs/feedback/2026-06-25-validacao-core-telas.md`) é a fonte vigente da rodada atual. Se divergir de documento antigo, corrigir o documento antigo; não tratar como conflito.
- **Veículos/Máquinas entram agora no MVP**, conforme pedido na reunião: envio por PDV/Comercial/Gerente do Porto, checklist/fotos, etiqueta, bipe de subida/descida e checklist de entrega.
- **Impressão térmica deve considerar Bluetooth**, conforme transcrição. A decisão antiga de PC/USB foi superada para esta rodada; atualizar UX/arquitetura/implementação nessa direção.
- **Permanece fora desta rodada:** Financeiro completo, Compras/DRE e ERP financeiro avançado. Portal online com pagamento continua no MVP, mas será trabalhado por último após o core interno.

## Execução ativa 2026-06-29 — ajustar front pós-validação
- **Status:** checklist do core interno estava concluído, mas o modelo real de prestação de contas recebido em 2026-06-29 reabriu um refinamento pontual em `PrestacaoTab`.
- **Próximo passo para qualquer agente/IA nova:** abrir `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md` e `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`; ajustar primeiro a aba de Prestação de Contas no front.
- **Ordem restante:** refinamento de Prestação de Contas pelo modelo real → QA visual/responsivo do core interno → Portal online por último → backend funcional por ordem de dependência.
- **Natureza do trabalho:** front real mockado para aprovação; não ligar backend agora. Usar mocks, cards, tabelas, formulários e estados visuais suficientes para o cliente validar regra.
- **Verificação:** ao final de cada bloco de front, rodar `bun run build` em `apps/web-console` e atualizar este STATUS + checklist da SPEC.

## Retomada 2026-06-29 — entendimento pós-validação do cliente
- **Contexto absorvido:** lidos `AGENTS.md`, `docs/STATUS.md`, PRD/SPEC, módulos 01..09, UX 00..05, roadmap pós-MVP, ADRs, Fase 0/modelo de dados, migrations/seed, estrutura do front `apps/web-console` e a reunião de feedback do cliente.
- **Feedback do cliente consolidado:** novo doc em `docs/feedback/2026-06-25-validacao-core-telas.md`. Fontes brutas estavam em Downloads: `VALIDAÇÃO DO CORE DE TODAS AS TELAS 2.0.docx`, `parte1.txt`..`parte4.txt` e transcrições timestampadas.
- **Direção atual:** antes de ligar backend, ajustar o front mockado com base na validação tela a tela do cliente. Sequência recomendada: TMS/Navegação → Veículos/Máquinas e apps de campo → Vendas/PDV/Passagens → Encomendas → CRM/Cadastros → deixar Financeiro/Compras/DRE como fase posterior.
- **Portal online:** continua MVP, mas fica por último dentro da rodada do MVP. Antes de backend definitivo do portal, atualizar o modelo canônico/migrations: a Parte C de Vendas exige `Pedido`, `Reserva`, `Pagamento`, webhook e fiscal plugável, mas as migrations atuais ainda estão em `bilhete` + `caixa_movimento`.
- **Atenção de escopo:** Veículos/Máquinas foram trazidos para agora pela reunião. Compras, DRE e Financeiro completo continuam posteriores.

## Deploy (Vercel)
- **Front `apps/web-console` → Vercel.** Root Directory: `apps/web-console`. Install/Build com **Bun** (`vercel.json`). SSR via Nitro com preset **vercel** forçado em `vite.config.ts` (`nitro: { preset: "vercel" }`) — sem isso o wrapper do Lovable pula o plugin de deploy fora do ambiente Lovable e a saída fica só estática (404 na raiz). Saída gerada em `.vercel/output/` (Build Output API v3, função `__server.func`).
- Autoria git do repo fixada localmente em `wcristian799 <wellington.cris799@gmail.com>` (antes ia como `dev@ajc.local`, não vinculado ao GitHub).

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
1. **Refinar Prestação de Contas no front** usando `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md` como referência do formulário real.
2. **Refinar Nova Viagem e Nova Carga no front** usando `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md` e os templates de paradas/preços em `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`.
3. **Conferir/ajustar Portaria** para exibir captura/anexo de foto no registro de veículo de carga.
4. **Fazer QA visual/navegação do front ajustado** usando `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md` como checklist de conferência.
5. **Manter o front no padrão Crimson Prestige**: não refazer design system, não alterar o login cinematográfico e respeitar a separação `/app/*` vs `/campo/*`.
6. **Portal online com pagamento = MVP, mas por último:** depois do QA do core interno, ajustar `/portal`; antes do backend definitivo, fazer spike de gateway + BP-e e atualizar modelo de dados (`Pedido`, `Reserva`, `Pagamento`, webhook, fiscal).
7. **Depois dos ajustes de tela**, revisar docs de módulo/UX impactados e só então iniciar backend funcional por ordem de dependência.
8. **Banco JÁ VALIDADO no WSL2.** Numa máquina nova: instalar PG16+PostGIS no WSL e rodar `infra/apply-wsl.sh`.
9. **Pendências paralelas:** App Capacitor PoC (E6, lê QR), CI (E7), spike offline-sync PowerSync (E8).

> Decisão técnica pendente registrada no E3-H1: **Prisma vs TypeORM** para o runner de migrations do back. As migrations atuais são SQL puro (não dependem dessa escolha). Decidir ao iniciar o E4.

## Linha do tempo (resumo)
- **Etapa 1 — Discovery/Produto:** PRD + SPEC global + 9 módulos documentados (`docs/`, `docs/modulos/`).
- **Etapa 2 — UX:** Fundação (design system/shell/acesso) + UX detalhada de TMS, Vendas, CRM, Cadastros, Navegação-core (`docs/ux/`). Telas com wireframes ASCII.
- **Etapa 3 — Roadmap:** recorte do MVP e backlog pós-MVP (`docs/ROADMAP-Pos-MVP.md`).
- **Etapa 4 — Arquitetura:** stack e repo definidos (ADR 00); spikes técnicos pesquisados — offline-sync (PowerSync), hardware (celular + impressão Bluetooth), hospedagem (VPS Hostinger) (ADR 01).
- **Etapa 5 — Fase 0 (em curso):** regra de continuidade criada (`CLAUDE.md` + este arquivo). Construção do repo a seguir.

## Decisões recentes
- **Escopo MVP atualizado (cliente):** o **portal público de venda de passagem online com pagamento integrado** ENTRA no MVP (Fase 1). Detalhado na Parte C do módulo Vendas/Passagens (`docs/modulos/02-Vendas-Passagens.md`). Isso adiciona ao caminho crítico: reserva de vaga com concorrência (sem overbooking), máquina de estados pedido/pagamento, gateway (webhook), área do cliente e gancho de emissão fiscal.
- **Front anterior descartado:** todo o front da sessão (web-console + conceito IGARAPÉ + libs/ui) foi removido a pedido do cliente; o **UX vai enviar um design system** para nos basearmos. Decisões técnicas de stack (React+TS+Vite, rodar no WSL) seguem válidas; só o visual será refeito sobre o DS do UX.
- Hardware atualizado pela validação do cliente: celular comum (não coletor industrial) + impressão térmica via Bluetooth. GPS background segue como risco técnico paralelo.
- Sequência confirmada com o cliente: Fase 0 → telas mockadas para aprovação comercial → MVP funcional → avançados.
- Telas de aprovação serão front real mockado (reaproveitável), não protótipo descartável.

## Pendências do cliente (🔶) — não bloqueiam a Fase 0
- **Emissão fiscal do bilhete (BP-e):** certificado PFX recebido em 29/jun/2026, mas ainda falta confirmar senha, validade/uso, credenciamento SEFAZ-PA e API/fornecedor. Ver §C.7 e `docs/feedback/2026-06-29-certificado-digital-ajc-pfx.md`.
- **Gateway de pagamento:** definir fornecedor (Mercado Pago / Pagar.me / Stripe / PagBank), meios (cartão/PIX), taxas e exigências — **spike antes de construir o portal**.
- Tabela de preço de encomendas (Lucas).
- Textos: termo de aceite de embarque, declaração de conteúdo, termo de veículos.
- Cores de pulseira por classe.
- Modelo da impressora de etiqueta (define ESC-POS vs ZPL e compatibilidade Bluetooth).
- Regras de comissão de agentes (diretoria).
- Provedores: pagamento, WhatsApp/SMS.
- **Ainda pendente do Lucas/AJC após 30/jun/2026:** validar divergências de horário do FAQ antes do cadastro definitivo; capacidades numéricas reais por classe/embarcação se houver tabela; campos de lançamento manual NF/DC se divergirem de Nova Carga; regra final de Etiquetar por volume; campos de cadastro de palete; tabela de preço de encomendas; regra/tabela de preço de veículos/máquinas; dados de cliente/cotação; fornecedores; plano de contas/centro de custo; DRE; fotos das embarcações.
- **Resolvido em 2026-06-29:** modelo atual em papel da prestação de contas do gerente recebido e registrado em `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`.
- **Resolvido em 2026-06-30:** campos de Nova Viagem, lista/classes de embarcações e campos de Nova Carga recebidos e registrados em `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md`.
- **Resolvido em 2026-06-30:** FAQ 2026 recebido e registrado em `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`, baixando DOC FAQ/paradas automáticas, preços de passagem, formas de pagamento atuais e endereços dos portos.

## Spikes técnicos a executar (ver ADR 01)
- Offline-sync: PowerSync self-hosted vs fila própria (1º spike, antes do TMS).
- **Pagamento + fiscal do portal:** escolher gateway e mapear o caminho do BP-e. PFX recebido, mas ainda depende de senha/validade/credenciamento/fornecedor fiscal. Derriscar antes de construir o portal funcional.
- GPS background em celular real (paralelo; afeta só rastreamento).
- Impressão Bluetooth com a impressora definida.
