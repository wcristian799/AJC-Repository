# Changelog de UX/Front — Sessão jun/2026

> Registro do que foi construído, o que estava faltando e o que ainda falta no front `apps/web-console`. Complementa `docs/STATUS.md` (diário) e `docs/ux/MAPA-GAPS-UX.md` (gaps tela a tela).

## Contexto da sessão
Partimos da entrega do designer do cliente (projeto Lovable, design system "Crimson Prestige"). Decisão: **adotar como base oficial** em `apps/web-console` (TanStack Start + Bun + shadcn + Tailwind v4 + motion). Login mantido idêntico. A partir daí: revisão de UX tela por tela e construção das telas operacionais que faltavam.

---

## 1. Adoção da base (fundação)
- `temp-front` → `apps/web-console`. Bun instalado, build validado, preview na porta 8080.
- Login (`src/routes/index.tsx`) preservado.
- Metadados de marca ajustados para AJC.

## 2. Telas internas de gestão (módulos MVP) — já vieram boas, refinadas
Início, Navegação, Vendas (visão), CRM, Financeiro (leve/Fase 2), Cadastros. Fiéis aos SPECs; trabalho foi refino e conteúdo mockado.

## 3. Superfícies de venda/campo (1ª leva)
Criadas: `/portal` (venda online pública, 7 passos), `/pos` (PDV porto), `/totem`, `/embarque` (validação bilheteiro), `/cliente` (minhas viagens).

## 4. Revisão de UX tela por tela
Mapa de gaps em `docs/ux/MAPA-GAPS-UX.md`. Conclusão: telas de gestão estavam boas; o que faltava eram **telas operacionais e de campo**. Priorização do dono: TMS → Encomendas → Vendas.

## 5. TMS/Carga — COMPLETADO (era o maior gap)
Rota `/app/tms` expandida. Telas adicionadas (mapeadas ao SPEC `docs/modulos/01-TMS-Carga.md`):
| Tela | SPEC | Observação |
|---|---|---|
| Portaria (entrada/saída pátio) | B.1 | app de campo |
| Notas & DC (upload + lançamento ADM) | B.2 / B.3 | web back-office |
| Etiqueta térmica (preview QR/UUID) | B.5 | modelo de impressão |
| Paletes (cadastro + alocação) | B.6 | web + coletor |
| Recebimento direto / cross-docking | B.8 | app de campo, múltiplos recebimentos |
| Entregas (desembarque + foto + assinatura) | B.9 | app de campo, prova legal |
| Prestação de contas do gerente | B.10 | web/app gerente |
| Controle por viagem | B.11 | visão gestão |
| Simulador App Conferente (2º bipe) | B.4 / B.7 | preservado, app de campo |
Componentes em `src/components/ops/tms/` (`PhoneFrame` compartilhado).

## 6. Encomendas — CRIADO do zero
Rota `/app/encomendas` (+ entrada no HelmDock). Telas (SPEC `docs/modulos/03-Encomendas.md`):
| Tela | SPEC | Observação |
|---|---|---|
| Despacho (PDV/balcão) | B.1 | preço automático fixo×percentual |
| Declaração de Conteúdo + assinatura | B.2 | **confirma bloqueado sem assinar**; cláusula de exclusão visível (risco jurídico) |
| Cotação | B.3 | simula preço sem efetivar |
| Controle por viagem | B.4 | declarado × cobrado, DC pendente |
| Rastreamento | B.5 | timeline reaproveita estados do TMS |
Precificação A.1 funcional com **valores placeholder** (🔶 tabela do Lucas). Componentes em `src/components/ops/encomendas/`.

## 7. Vendas operacional — REFINADO
- B.6 Gerador de cortesias (limite/contador por viagem; bloqueia ao atingir teto).
- B.8 Manifesto de passageiros por viagem (totais por classe/tarifa, status de embarque).

## 8. Separação do app de campo (`/campo`) — decisão executada
Os apps de campo estavam como ABAS dentro do painel web de gestão do TMS — visão irreal (o conferente do porto não usa o painel da diretoria). Separados numa área dedicada:
- **`FieldShell`** (`src/components/ops/field/FieldShell.tsx`): shell de operador, mobile-first, SEM o dock de gestão; barra com perfil do operador + indicador online/offline e fila de sync; botão sair → hub.
- **Hub `/campo`** (`campo.index.tsx`): seleção de posto do operador (Porteiro, Conferente do Porto, Recebimento/Balsa, Entregas, Bilheteiro, PDV). Cards grandes, tocáveis.
- **Rotas de campo** usam FieldShell, não AppShell: `/campo/portaria` (B.1), `/campo/conferencia` (B.4/B.7), `/campo/recebimento` (B.8), `/campo/entregas` (B.9). `/embarque` e `/pos` são linkados do hub.
- **TMS web limpo:** as abas de campo saíram; sobrou só "Operação web" (controle, notas, paletes, etiqueta, prestação) + link "Abrir app de campo".
- **Navegação:** gestão → campo (item "Campo" no dock + link no TMS); campo → gestão (link no hub) e FieldShell tem "sair/trocar posto".
- **PhoneFrame ganhou prop `framed`:** dentro de `/campo` o conteúdo renderiza em tela cheia (`framed={false}`) — eliminado o efeito "celular dentro de celular". A moldura de simulador segue só na DeclaracaoTab (contexto web de gestão). Removidos os painéis laterais "explicativos" das telas de campo (não existem num app real).

## 9. Correções técnicas
- Hydration mismatch do RadarSweep (coordenadas Math.cos/sin arredondadas).
- CountUp preso em 0 sob SSR (anima no mount + salvaguarda setTimeout).
- Bug de tipo pré-existente em `embarque.tsx` (style em ícone lucide). `tsc --noEmit` agora 0 erros em toda a base.

---

## O que AINDA falta (pós esta sessão)

### Separação do app de campo — FEITO
Concluída nesta sessão (ver seção 8). O `/campo` dá a visão real do app de operador, separado do painel de gestão. Apps Capacitor nativos seguem como entrega da fase de campo (arquitetura já decidida no CLAUDE.md).

### Telas de menor prioridade (mapa de gaps)
- Vendas B.10 — NPS pós-viagem.
- CRM B.6 — Painel do agente comercial (visão dedicada).
- TMS — última milha do agente ao destinatário (🔶 confirmar escopo com cliente).

### Fora do MVP (decisões fechadas)
- Navegação B.3 — rastreamento GPS tempo real (Fase 3).
- Financeiro completo B.6–B.12 (Fase 2).
- PDV Lanchonete/Restaurante (Fase 3).

### Correção pós-validação do cliente (25/jun/2026)
- Módulo Veículos/Máquinas não é mais fase posterior: entra agora no MVP conforme transcrição de validação.

### Pendências externas que destravam telas
- 🔶 Tabela de preços de encomenda/carga (Lucas).
- 🔶 Texto da Declaração de Conteúdo e termo de aceite de veículos (Lucas).
- 🔶 Gateway de pagamento + emissão fiscal BP-e do portal (PFX recebido em 29/jun/2026; ainda precisa senha/validade/credenciamento/fornecedor + spike).
- ✅ Modelo de prestação de contas em papel recebido em 29/jun/2026; refinamento do `PrestacaoTab` pendente.

---

## Estado de qualidade
- `bunx tsc --noEmit`: 0 erros.
- `bun run build`: exit 0.
- Verificação visual no preview (porta 8080) das telas novas.
- Tudo mockado/navegável; sem backend. Ressalvas conhecidas: filtros/botões visuais, QR fake, assinatura/foto simuladas.
