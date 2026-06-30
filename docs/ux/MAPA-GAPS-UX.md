# Mapa de Gaps de UX — telas do MVP (front `apps/web-console`)

> Revisão tela por tela do que o designer entregou (referência) versus o que os SPECs em `docs/modulos/` pedem. Objetivo: o dono priorizar o que construir antes de pôr a mão. **Análise, não implementação.**
>
> Legenda de estado: ✅ existe e fiel · 🟡 existe parcial · 🔴 previsto no SPEC e NÃO existe ainda.
> Base de comparação: rotas atuais em `src/routes/` × seções B/C de cada `docs/modulos/*.md`.
>
> **Nota de continuidade (29/jun/2026):** este mapa é histórico da auditoria inicial do front. O estado ativo fica em `docs/STATUS.md` e `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md`; após a validação do cliente, o core interno foi implementado e a pendência atual é o refinamento de `PrestacaoTab` pelo modelo real recebido.

---

## Visão de cima (o essencial)

O designer entregou **uma rota por módulo** (visão web de gestão) + 5 superfícies (`portal`, `pos`, `totem`, `embarque`, `cliente`). Isso cobre muito bem a **camada de gestão/dashboard**, mas os SPECs preveem **telas operacionais e apps de campo** que ainda não existem como tela. Os maiores buracos:

1. **TMS/Carga** — SPEC tem 11 telas (B.1–B.11) + veículos; a rota atual tem 1 página com 2 abas (controle + simulador de coletor). Falta o grosso do fluxo de campo.
2. **Encomendas** — módulo inteiro (6 telas) sem rota própria. Hoje só aparece como aba no PDV.
3. **Veículos/Máquinas** — módulo inteiro agora entra no MVP pela validação do cliente e ainda precisa virar telas/fluxos.
4. **Telas operacionais de Vendas** — faltam B.6 (gerador de cortesias), B.8 (relatório de passageiros por viagem), B.10 (NPS) como telas dedicadas.

As telas de **gestão** (Início, Navegação, Vendas-visão, CRM, Financeiro, Cadastros) estão **boas e fiéis ao SPEC** — ali o trabalho é refino, não criação.

---

## Tela por tela

### 1. Início / Dashboard (`/app/inicio`) — ✅ bom
- **Tem:** saudação, KPIs com CountUp, radar, VoyageTrack das viagens, feed ao vivo, alertas, viagens em curso.
- **SPEC:** não há módulo "início" formal; é a cabine de comando da diretoria.
- **Gap:** nenhum crítico. Refino: tornar os botões ("Nova viagem", "Relatório do dia") funcionais ou ocultá-los enquanto mock; ligar alertas reais.

### 2. Navegação (`/app/navegacao`) — ✅ bom (cobre B.1, B.2, B.4, B.5, B.6)
- **Tem:** painel operacional (status×situação), cronograma, capacidade/ocupação por classe, escala de colaboradores, embarcações.
- **SPEC 09:** B.1 embarcações ✅ · B.2 cronograma ✅ · B.4 status ✅ · B.5 escala ✅ · B.6 painel operacional ✅ · **B.3 rastreamento tempo real 🔴 (é Fase 3 / pós-MVP — ok não ter).**
- **Gap:** só falta o que é fora do MVP (mapa GPS). Refino: capacidade por classe hoje é estimada do % geral (ressalva conhecida).

### 3. Vendas — visão gestão (`/app/vendas`) — 🟡 bom, com telas operacionais faltando
- **Tem:** passagens (lista+QR+status), canais de venda (portal destacado), ocupação por classe, cortesias & gratuidades, relatório regulatório MP.
- **SPEC 02 parte B:** B.9 encomenda no PDV (existe no /pos) · cortesias/gratuidades ✅ visão.
- **Gap 🔴:** **B.6 gerador de cortesias** (gerar código com limite/contador por viagem) não existe como tela de ação. **B.8 relatório de passageiros por viagem** (manifesto de embarque) não existe. **B.10 pesquisa NPS** não existe.

### 4. CRM (`/app/crm`) — ✅ bom (cobre B.1–B.5)
- **Tem:** base de clientes, ficha 360º (drawer), agentes, alocação cliente×agente, cotações.
- **SPEC 04:** B.1 lista ✅ · B.2 ficha 360º ✅ · B.3 alocação ✅ · B.4 histórico ✅ · B.5 cotação ✅ · **B.6 painel do agente 🟡** (existe aba agentes, mas não a visão "do ponto de vista do agente em campo").
- **Gap:** refino — painel do agente comercial como visão dedicada.

### 5. Financeiro (`/app/financeiro`) — 🟡 proposital (Fase 2)
- **Tem:** saldos, AP/AR com filtro de período, comissões de agentes.
- **SPEC 06:** prevê 12 telas (tesouraria, conciliação, faturamento, estoque, compras…). **Decisão de escopo: Financeiro completo é Fase 2** — só "caixa mínimo" é MVP.
- **Gap:** alinhado ao escopo. Não construir o resto agora de propósito. Confirmar com o dono se o "caixa mínimo" mostrado basta para o MVP.

### 6. Cadastros (`/app/cadastros`) — ✅ bom (cobre B.1, B.2, B.4, B.5, B.7, B.8, B.9)
- **Tem:** usuários, perfis/permissões (matriz RBAC), preços passagem, preços carga, fornecedores, colaboradores; reajuste em massa com preview.
- **SPEC 07:** **B.3 cadastro de clientes 🟡** (vive no CRM, ok) · **B.6 preços de encomenda 🔴** (depende da tabela do Lucas 🔶) · B.9 escalas ✅ (no Navegação).
- **Gap:** preço de encomenda (bloqueado por pendência do Lucas).

### 7. TMS / Carga (`/app/tms`) — 🔴 MAIOR GAP
- **Tem:** 1 página com controle de volumes por viagem + simulador de coletor (conferência/entrega).
- **SPEC 01:** prevê **11 telas B.1–B.11 + 2 de veículos**. Faltam como tela dedicada: **B.1 app portaria** (entrada/saída no porto), **B.2 upload NF/DC**, **B.3 lançamento NF ADM**, **B.5 etiqueta de carga** (modelo de impressão), **B.6 paletes**, **B.8 cross-docking/múltiplos recebimentos**, **B.9 comprovante de entrega**, **B.10 prestação de contas do gerente**, **B.11 controle de carga por viagem** (existe parcial).
- **Gap 🔴:** é o módulo "coração antifraude" e está o mais incompleto em telas. Prioridade alta para o MVP.

### 8. Encomendas — 🔴 sem rota própria
- **Tem:** só a venda de despacho como aba no `/pos`.
- **SPEC 03:** B.1 despacho ✅(parcial no PDV) · **B.2 declaração de conteúdo+assinatura 🔴** · **B.3 cotação 🔴** · **B.4 controle por viagem 🔴** · **B.5 rastreamento 🔴** · **B.6 histórico do cliente 🟡** (parte no CRM).
- **Gap 🔴:** módulo de MVP (encomendas com declaração de conteúdo é requisito de risco jurídico) sem telas próprias. Nota: precificação depende da tabela do Lucas 🔶.

### 9. Portal de venda online (`/portal`) — ✅ bom (cobre C.2, C.6, C.9)
- **Tem:** 7 passos busca→resultados→classe/assento→cadastro→termo→pagamento→QR; estados esgotado/expirado/falha.
- **SPEC 02 parte C:** fluxo ✅ · conta cliente ✅ · telas ✅. **C.7 emissão fiscal 🔶** (PFX recebido em 29/jun/2026; ainda falta senha/validade/credenciamento/fornecedor, arquitetura prevista).
- **Gap:** refino visual e fidelidade quando o gateway/fiscal forem decididos.

### 10. PDV porto (`/pos`) — ✅ bom (cobre Vendas B.3 + Encomendas B.1)
- **Tem:** venda de passagem por classe, gratuidade/cortesia, caixa do operador, formas de pagamento.
- **Gap:** refino — vincular despacho de encomenda com a declaração de conteúdo (cruza com gap 8).

### 11. Totem (`/totem`) — ✅ bom (cobre Vendas B.4)
- **Tem:** fluxo de toque destino→viagem→classe→pagamento→bilhete; estados ocioso/em uso/fora de serviço.
- **Gap:** nenhum crítico.

### 12. App de embarque / bilheteiro (`/embarque`) — ✅ bom (cobre Vendas B.5)
- **Tem:** seleção de viagem, leitura de QR, resultado válido/já-validado/inválido com cor de pulseira, contador, busca manual, offline-first.
- **Gap:** nenhum crítico. É web simulando o app; o app real (Capacitor) é outra entrega.

### 13. Área do cliente (`/cliente`) — ✅ bom (cobre Vendas C.6 + Encomendas B.5/B.6 parcial)
- **Tem:** minhas viagens (próximas/passadas), QR, comprovantes, 2ª via.
- **Gap:** rastreamento de encomenda do ponto de vista do cliente (cruza com gap 8).

---

## Telas previstas no SPEC que NÃO existem (lista de criação)

| Prioridade | Módulo | Tela (SPEC) | Por que importa no MVP |
|---|---|---|---|
| 🔴 Alta | TMS | B.1 App Portaria (entrada/saída) | Início do fluxo antifraude da carga |
| 🔴 Alta | TMS | B.5 Etiqueta de carga (modelo impressão) | Operação não roda sem etiqueta |
| 🔴 Alta | TMS | B.9 Comprovante de entrega | Prova legal de entrega |
| 🔴 Alta | Encomendas | B.2 Declaração de conteúdo + assinatura | Risco jurídico (requisito central) |
| 🔴 Alta | Encomendas | B.4 Controle de encomendas por viagem | Visão operacional do despacho |
| 🟡 Média | TMS | B.2/B.3 Upload e lançamento de NF/DC | Entrada documental da carga |
| 🟡 Média | TMS | B.6 Paletes · B.8 Cross-docking · B.10 Prestação de contas | Operação completa de carga |
| 🟡 Média | Vendas | B.6 Gerador de cortesias · B.8 Relatório de passageiros | Controle e manifesto de embarque |
| 🟡 Média | Encomendas | B.3 Cotação · B.5 Rastreamento | Atendimento e cliente |
| 🟢 Baixa | Vendas | B.10 NPS pós-viagem | Pós-MVP friendly |
| 🟢 Baixa | CRM | B.6 Painel do agente | Refino |
| ⚪ Fora MVP | Navegação | B.3 Rastreamento GPS tempo real | Fase 3 |
| ⚪ Fora MVP | Financeiro | B.6–B.12 (faturamento, conciliação, estoque, compras) | Fase 2 |
| 🔴 Alta | Veículos/Máquinas | envio/checklist/fotos/etiqueta/bipe subida-descida/entrega | Entrou no MVP pela validação do cliente |
| ⚪ Fora MVP | PDV F&B | módulo inteiro | Fase 3 |

---

## Recomendação de sequência (minha leitura como CTO)

1. **Fechar TMS/Carga** (telas B.1, B.5, B.9 primeiro) — é o coração antifraude e o mais incompleto.
2. **Criar/ajustar fluxos de Veículos/Máquinas e apps de campo** — pedido da validação, integrado a portaria/conferência/entrega.
3. **Criar módulo Encomendas** (B.2 declaração de conteúdo é risco jurídico; B.4 controle por viagem).
4. **Completar telas operacionais de Vendas** (B.6 cortesias, B.8 manifesto de passageiros).
5. **Refinos** nas telas de gestão já boas (botões funcionais, painel do agente).
6. **Pendências externas** seguem destravando o resto: tabela de preços de encomenda (Lucas) e gateway+BP-e (portal; PFX recebido, fiscal ainda pendente).

> Observação honesta: as telas de gestão já entregues são fiéis e bonitas; o trabalho de UX que falta é majoritariamente **criar as telas operacionais/de campo** que o designer não cobriu, não refazer as existentes.
