# Roadmap & Backlog Pós-MVP — Sistema ERP/TMS AJC

> Este documento define **o que entra no MVP** e **o que fica para depois**, com a justificativa de cada adiamento e as dependências entre as fases. Serve para alinhar diretoria, operação e time de desenvolvimento sobre o sequenciamento.

---

## 1. Decisão de recorte do MVP

**Objetivo do MVP:** entregar o **corte vertical antifraude + receita** — o caminho completo de uma viagem real, da abertura ao fechamento, com rastreabilidade e prova. É o que ataca as duas dores nº 1 do negócio: vazamento de receita na carga e risco jurídico nas encomendas.

### 1.1 No MVP (escopo congelado)
| Módulo | O que entra | Por que é indispensável |
|---|---|---|
| **Fundação / Acesso** | Login, recuperação de senha, RBAC, setup inicial (empresa, admin, embarcações, usuários, preços) | Esqueleto onde tudo se pendura |
| **Navegação-core** | Embarcações + viagens/cronograma + status de viagem | Tudo é vinculado a uma viagem; dependência-raiz de TMS e Vendas |
| **Cadastros** | Usuários/perfis, clientes, agentes, preços (passagem/carga) | Dados-mestre de todo o sistema |
| **TMS / Carga** | Portaria, conferência bipada, etiqueta/UUID, paletes, 2º bipe, cross-docking, entrega com prova | 60% do faturamento e a maior brecha de controle |
| **Veículos / Máquinas** | Envio por PDV/Comercial/Gerente do Porto, vistoria/checklist com fotos, etiqueta, bipe de subida/descida e checklist de entrega | Pedido explícito da validação do cliente; evita deixar fora um fluxo operacional que passa pelo porto e pela balsa |
| **Vendas / Passagens** | Venda com QR, validação por pulseira, cortesia/gratuidade/contrato, relatório de passageiros, NPS básico | Receita de passageiros + conformidade regulatória (MP) |
| **CRM** | Base de clientes, alocação a agentes, histórico, cotações | Sustenta a operação comercial e a futura comissão |
| **Financeiro (mínimo)** | Apenas **caixa leve**: registrar a venda/despacho e o valor por caixa | Sem isso, a venda não "fecha" em lugar nenhum |

### 1.2 Fora do MVP (este documento detalha abaixo)
Encomendas com tabela de preço · Financeiro completo · Compras/DRE · PDV Lanchonete/Restaurante · Rastreamento em tempo real · Escalas avançadas · NPS analítico · Integrações externas.

---

## 2. Fast-follow (Fase 2) — logo após o MVP estabilizar

São itens de alto valor que dependem do MVP rodando ou de insumos pendentes do cliente.

### 2.1 Encomendas (precificação completa)
- **Por que ficou fora:** depende da **tabela de preços de encomendas (🔶 Lucas)** — mecânica P/M/G até R$1.000 e percentual acima disso, por trecho.
- **Já pronto no MVP:** o despacho no PDV e a Declaração de Conteúdo (prova jurídica) entram no MVP porque são risco legal; o que falta é só ligar a tabela de preço automática.
- **Entrega 2:** motor de preço de encomenda, cotação automática, controle financeiro por viagem de encomendas.
- **Depende de:** Cadastros (motor de preços), TMS (volumes/etiqueta).

### 2.2 Financeiro completo
- **Por que ficou fora:** é amplo e não bloqueia a operação física; no MVP basta o caixa leve.
- **Entrega 2:**
  - Contas a pagar / a receber (cadastro, status, período flexível)
  - Tesouraria — visão consolidada de todos os caixas em tempo real
  - Faturamento (NF-e / NFS-e / boletos)
  - Conciliação bancária e contas-corrente
  - **Cruzamento da prestação de contas da embarcação ↔ contas a receber** (alto valor antifraude)
  - Controle de estoque (paiol e rancho) + Compras (solicitação→aprovação→status→prazo)
  - **Pagamento de comissão de agentes** (depende das regras 🔶 da diretoria)
- **Depende de:** CRM (lançamentos do agente), TMS (prestação de contas), Cadastros (fornecedores).

### 2.3 Compras / DRE
- **Por que ficou fora:** foi reconhecido na validação como parte do ERP financeiro maior, não como bloqueio do core operacional.
- **Entrega 2:** solicitação de compras, pedido de compras, três cotações, upload de comprovantes, controle de recebimento e pré-nota para contas a pagar.
- **Depende de:** Financeiro completo, plano de contas/centro de custo e modelo de aprovação.

---

## 3. Fase 3 — experiência e periféricos

### 3.1 Rastreamento em tempo real das embarcações
- **Por que ficou fora:** depende de definir a fonte de posição (**GPS próprio vs. AIS — 🔶**) e provedor de mapa. No MVP, o status de viagem é apontado manualmente.
- **Entrega 3:** mapa ao vivo, ETA por escala, cálculo automático de "atenção/atrasado" por tolerância.

### 3.2 Escalas avançadas + notificação WhatsApp
- **Por que ficou fora:** o cadastro de colaboradores/escala entra no MVP, mas a **notificação automática via WhatsApp** depende de provedor (🔶).
- **Entrega 3:** disparo automático de escala, confirmação de recebimento, gestão de conflitos.

### 3.3 PDV Lanchonete / Restaurante
- **Por que ficou fora:** receita acessória; independente do núcleo.
- **Entrega 3:** comandas, controle de insumos (ligado ao estoque do Financeiro), caixa integrado.

### 3.4 NPS analítico
- **Por que ficou fora:** no MVP captura-se a resposta; o painel analítico vem depois.
- **Entrega 3:** painel de evolução, segmentação por viagem/embarcação/rota, alertas.

### 3.5 Cotações avançadas no CRM
- **Entrega 3:** simulação rica multi-trecho, propostas formais, conversão assistida.

---

## 4. Integrações (transversais, conforme dependências externas)

| Integração | Usada em | Bloqueio | Fase sugerida |
|---|---|---|---|
| Gateway de pagamento | Vendas online/PDV/totem | Definir provedor + meios (PIX/cartão) 🔶 | MVP (online) / Fase 2 |
| WhatsApp / SMS | Entrega, escala, NPS, QR | Definir provedor 🔶 | Fase 2 |
| Impressora térmica | Etiqueta de carga, QR | Confirmar hardware 🔶 | MVP (é essencial ao TMS) |
| Balança | PDV de encomendas | Confirmar modelo 🔶 | Fase 2 (com Encomendas) |
| GPS / AIS | Rastreamento | Definir fonte 🔶 | Fase 3 |
| NF-e / NFS-e | Faturamento | Regime fiscal 🔶 | Fase 2 |
| Banco (extrato) | Conciliação | Por banco 🔶 | Fase 2 |
| **Rastreio de NF/boleto no CNPJ** | Financeiro | **Investigar se existe API 🔶** | Fase 2/3 (a confirmar viabilidade) |

> A impressora térmica é a única integração de hardware que o MVP **exige** (sem etiqueta com UUID não há rastreabilidade de carga). As demais são desbloqueadas conforme o cliente define provedores.

---

## 5. Grafo de dependências (resumido)

```
Fundação/Acesso ─┬─► Cadastros ─┬─► CRM
                 │              ├─► Vendas ──┐
                 └─► Navegação ─┤            ├─► (Financeiro completo)
                    (core)      └─► TMS ─────┘
                                     │
                                     └─► Encomendas(preço)
                                     └─► Veículos/Máquinas (MVP)

Tudo de Fase 2/3 pendura no que o MVP já entregou.
```
- **Nada da Fase 2/3 pode começar antes** de Fundação + Cadastros + Navegação-core estarem de pé.
- **Encomendas-preço, Financeiro-comissão e Compras/DRE** são os primeiros a destravar assim que chegam os insumos 🔶.

---

## 6. Pendências do cliente que destravam cada fase

| Pendência (🔶) | Responsável | Destrava |
|---|---|---|
| Tabela de preços de encomendas | Lucas | Encomendas (Fase 2) |
| Texto do termo de aceite de embarque | AJC | Refinamento do MVP (Vendas) |
| Modelo de Declaração de Conteúdo + cláusula de exclusão | Lucas | Refinamento do MVP (Encomendas/TMS) |
| Modelo de prestação de contas (papel) | ✅ Recebido em 29/jun/2026 | Refinamento do front B.10 e cruzamento financeiro (Fase 2) |
| Regras de comissão de agentes | Diretoria | Pagamento de agentes (Fase 2) |
| Viabilidade da API de NF/boleto no CNPJ | Dev/AJC | Rastreio fiscal (Fase 2/3) |
| Cores de pulseira por classe | AJC | Refinamento do MVP (Validação) |
| Provedores: pagamento, WhatsApp/SMS, mapa/GPS | AJC/Dev | Integrações (Fase 2/3) |
| Especificação do coletor/Palm e impressora | AJC/Dev | Apps de campo do MVP (decide nativo vs. PWA) |

---

## 7. Princípio que guia o adiamento

Tudo que foi adiado obedece a uma regra simples: **não atrasar a operação física rastreável**. O MVP existe para que cada caixa que entra no barco seja bipada, etiquetada, fotografada e entregue com prova — e para que cada passagem vendida tenha QR e controle. O resto (relatórios financeiros ricos, periféricos, integrações que dependem de terceiros) entra em ondas, sem nunca bloquear o que já está rodando no porto e na balsa.
