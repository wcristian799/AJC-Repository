# Documentação — Sistema ERP/TMS AJC

Documentação de produto e especificação do sistema de gestão de transporte fluvial da AJC (passageiros, encomendas, carga e veículos).

## Índice

| Documento | Conteúdo |
|---|---|
| [PRD.md](./PRD.md) | Requisitos de produto: visão, problema, objetivos, personas, escopo, requisitos, métricas, glossário |
| [SPEC.md](./SPEC.md) | Arquitetura global, modelo de dados compartilhado, integrações, perfis de acesso |
| [modulos/01-TMS-Carga.md](./modulos/01-TMS-Carga.md) | SPEC + telas do módulo TMS/Carga (prioritário) |
| [modulos/02-Vendas-Passagens.md](./modulos/02-Vendas-Passagens.md) | SPEC + telas do módulo Vendas/Passagens (prioritário) |
| [modulos/03-Encomendas.md](./modulos/03-Encomendas.md) | SPEC + telas: precificação, declaração de conteúdo, controle por viagem |
| [modulos/04-CRM.md](./modulos/04-CRM.md) | SPEC + telas: base de clientes, agentes, histórico, cotações |
| [modulos/05-Veiculos.md](./modulos/05-Veiculos.md) | SPEC + telas: checklist de embarque, termo de aceite, pátio |
| [modulos/06-Financeiro.md](./modulos/06-Financeiro.md) | SPEC + telas: AP/AR, tesouraria, conciliação, compras, comissão |
| [modulos/07-Cadastros.md](./modulos/07-Cadastros.md) | SPEC + telas: usuários/RBAC, preços, fornecedores, colaboradores |
| [modulos/08-PDV-FeB.md](./modulos/08-PDV-FeB.md) | SPEC + telas: comandas, insumos, caixa da lanchonete/restaurante |
| [modulos/09-Navegacao.md](./modulos/09-Navegacao.md) | SPEC + telas: embarcações, cronograma, rastreamento, escalas |

## Status dos módulos

| # | Módulo | PRD | SPEC | Telas |
|---|---|:--:|:--:|:--:|
| 1 | TMS / Carga | ✅ | ✅ | ✅ |
| 2 | Vendas / Passagens | ✅ | ✅ | ✅ |
| 3 | Encomendas | ✅ | ✅ | ✅ |
| 4 | CRM | ✅ | ✅ | ✅ |
| 5 | Veículos | ✅ | ✅ | ✅ |
| 6 | Financeiro | ✅ | ✅ | ✅ |
| 7 | Cadastros | ✅ | ✅ | ✅ |
| 8 | PDV Lanchonete/Restaurante | ✅ | ✅ | ✅ |
| 9 | Navegação | ✅ | ✅ | ✅ |

✅ pronto · ⏳ pendente · 🔶 depende de informação do cliente

## Pendências do cliente (🔶)
Lista consolidada em [SPEC.md §7](./SPEC.md). Principais:
- Tabela/mecânica de preços de **encomendas** (Lucas).
- Texto do **termo de aceite de embarque** (AJC).
- Modelo de **declaração de conteúdo** + cláusula de exclusão (Lucas).
- Modelo de **prestação de contas** em papel recebido em 29/jun/2026; ver `feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`.
- FAQ 2026 recebido em 30/jun/2026; resolve paradas automáticas/preços de passagem/endereços de portos; ver `feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`.
- Regras de **comissão de agentes** (diretoria).
- Viabilidade da **API de rastreio NF/boleto no CNPJ**.
- Especificação do **coletor/Palm** e da **impressora térmica**.
- **Gateway de pagamento** e provedor de **WhatsApp/SMS**.
- Fonte de **rastreamento** das embarcações (GPS/AIS).

## Como navegar
1. Leia o **PRD** para a visão geral e o escopo.
2. Leia a **SPEC** global para arquitetura e modelo de dados compartilhado.
3. Cada **módulo** em `modulos/` traz: Parte A (SPEC técnica do módulo) e Parte B (telas, com objetivo, campos, estados e ações). Telas compartilhadas entre módulos têm referência cruzada.
