# UX — Sistema ERP/TMS AJC (pacote do MVP)

Especificação de UX e telas do MVP, pronta para o time de front começar. Todos os documentos herdam a **Fundação** (design system, shell, componentes, estados, acesso).

## Como ler (ordem sugerida)
1. **[00-Fundação](./00-Fundacao-DesignSystem-Navegacao-Acesso.md)** — leia primeiro. Tokens, shell, componentes nomeados, estados universais, fluxo de acesso e setup inicial, RBAC. É o contrato visual de tudo.
2. Depois, cada módulo na ordem de dependência abaixo.

## Documentos
| # | Documento | Escopo | Dispositivos |
|---|---|---|---|
| 00 | [Fundação](./00-Fundacao-DesignSystem-Navegacao-Acesso.md) | Design system, shell, acesso, RBAC, onboarding | Todos |
| 01 | [TMS / Carga](./01-UX-TMS-Carga.md) | Conferência, portaria, etiqueta, 2º bipe, cross-docking, entrega | Apps de campo + 1 web |
| 02 | [Vendas / Passagens](./02-UX-Vendas-Passagens.md) | Compra, PDV passagem, PDV encomenda, totem, validação, cortesia/gratuidade, relatórios, NPS | Site/app, PDV, totem, app campo |
| 03 | [CRM](./03-UX-CRM.md) | Clientes, ficha 360º, agentes, histórico, cotações | Back-office |
| 04 | [Cadastros](./04-UX-Cadastros.md) | Usuários/RBAC, preços (reajuste em massa), fornecedores, colaboradores, escalas | Back-office |
| 05 | [Navegação-core](./05-UX-Navegacao-Core.md) | Embarcações, viagens/cronograma, status, painel operacional | Back-office |

## Ordem de dependência (o que construir primeiro)
```
Fundação/Acesso ─► Cadastros ─► CRM
                 └► Navegação-core ─► TMS
                                    └► Vendas
```
- **Fundação + Cadastros + Navegação-core** são a base: sem usuários/perfis, preços e viagens, nada opera.
- **TMS** e **Vendas** são os apps que geram receita/controle; dependem da viagem (Navegação) e dos preços/clientes (Cadastros/CRM).

## Escopo do MVP e o que ficou fora
- Recorte do MVP e backlog detalhado: **[../ROADMAP-Pos-MVP.md](../ROADMAP-Pos-MVP.md)**.
- No MVP: Fundação/Acesso, Navegação-core, Cadastros, TMS, Vendas/Passagens, CRM, e um caixa financeiro mínimo.
- Fora (fases seguintes): PDV Lanchonete/Restaurante (F&B), Financeiro completo, Encomendas com preço automático, Veículos, rastreamento em tempo real, escalas com WhatsApp, NPS analítico, integrações externas.

## Pendências do cliente que afetam o UX (🔶)
- Texto do **termo de aceite de embarque** (Vendas).
- **Cores de pulseira** por classe (Validação).
- **Tabela de preço de encomenda** (despacho no PDV usa preço manual até chegar).
- Modelo de **Declaração de Conteúdo** (Encomendas/TMS).
- **Gateway de pagamento** e provedor de **WhatsApp/SMS** (QR, NPS, notificações).
- Especificação do **coletor/Palm** e **impressora térmica** (decide app nativo vs. PWA no campo).

## Princípios que valem em todas as telas (resumo da Fundação)
1. Operação em pé, com pressa, no sol → toque grande, alto contraste, decisão em 1 olhada.
2. Offline é estado normal, não erro.
3. Toda ação crítica deixa rastro visível (auditoria).
4. O número que importa fica gigante.
5. Erro previne, não pune (validação inline).
6. Foto e assinatura são prova legal.
7. Consistência > criatividade.
