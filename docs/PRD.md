# PRD — Sistema ERP/TMS AJC

> Documento de requisitos de produto. Base: reunião de levantamento + escopo enviado pelo cliente.
> Status: **aprovado como base**. Pendências marcadas com 🔶.

## 1. Visão do produto

Plataforma única (ERP + TMS) para operar transporte fluvial de **passageiros, encomendas, carga e veículos**, substituindo o controle em papel por um fluxo digital rastreável de ponta a ponta — da venda/captação até a entrega e a prestação de contas financeira.

O objetivo não é só digitalizar: é **fechar as brechas de receita e blindar a empresa juridicamente**, transformando confiabilidade operacional em vantagem competitiva mensurável.

### Contexto do negócio
- Transporte fluvial/marítimo no Pará: **Belém ↔ 7 cidades** (Breves, Gurupá, Almeirim, Porto de Moz, Prainha, Monte Alegre, Santarém), além de trechos entre cidades.
- Faturamento atual: **~R$ 25 M/ano** (só AJC).
- Mix de faturamento aproximado: **60% carga, 20% passageiros, 20% veículos + encomendas**.
- Frota: 7 barcos no total (6 de passeio+carga, 1 só de carga). **3 ativos** hoje; 1 em manutenção (motor); 2 alugados. Modelar para crescer de 3 → 6–7.
- Sazonalidade forte: em férias escolares a demanda **dobra** (~150–200 → ~300–400 passageiros/viagem).
- Diferencial competitivo declarado: **confiança/confiabilidade** (concorrente é mais barato mas já perdeu/extraviou carga). O sistema é a ferramenta que sustenta esse diferencial.

## 2. Problema

- **Receita vaza no manual.** Venda de passagem em papel; carga conferida "na caneta". Declara-se 5 caixas, entram 10 — ninguém audita. Estimativa interna: controle rígido pode elevar o faturamento em dois dígitos já no 1º mês ("como se entrasse uma balsa nova").
- **Risco legal grave.** Sem declaração de conteúdo nem termo de exclusão de responsabilidade, a empresa fica exposta a tráfico (caso real: 18 kg de cocaína), contrabando (saca de celulares do Paraguai) e extravios sem cobertura definida.
- **Risco regulatório.** Gratuidades (idoso, PCD) e cortesias controladas no papel; o Ministério Público já exigiu a relação, levantada manualmente.
- **Sem rastreabilidade física.** Não há registro de entrada de veículos/caminhões no porto, nem conferência bipada de NF na entrada do barco.
- **Sem inteligência operacional.** Impossível medir rentabilidade por viagem, embarcação ou cidade — trava decisões (incluir viagem extra? reorganizar saídas?).

## 3. Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta inicial |
|---|---|---|
| Eliminar vazamento de receita | Δ faturamento mês 1 vs. baseline papel | +10–20% |
| Rastreabilidade de carga | % de volumes com QR/bip na entrada e na entrega | 100% |
| Blindagem jurídica | % de encomendas/cargas com declaração de conteúdo + aceite | 100% |
| Conformidade regulatória | Tempo para emitir relatório de gratuidades/cortesias por viagem | < 1 min, sob demanda |
| Inteligência por viagem | Margem por viagem/embarcação/cidade disponível | até D+1 |
| Conciliação financeira | % de prestações de contas de embarcação cruzadas com o contas a receber | 100% |
| Satisfação | Resposta NPS pós-viagem | baseline + acompanhamento |

## 4. Personas

| Persona | Necessidade central | Canal |
|---|---|---|
| Cliente/Passageiro | Autocadastro, comprar passagem, despachar encomenda | Site / App |
| Agente comercial (7 cidades + Belém) | Captar carga/encomenda, vender passagem, lançar p/ comissão | Web / App |
| Bilheteiro (validação) | Ler QR no embarque, indicar cor de pulseira por classe | App mobile |
| Operador de caixa (encomenda/passagem) | Vender e despachar com balança ao lado | PDV (web/totem) |
| Porteiro | Registrar entrada/saída de veículos e pessoas no porto | App mobile |
| Conferente (porto) | Receber NF/DC no coletor, conferir por volume/palete, etiquetar, foto | App/coletor |
| Conferente da balsa (2º bipe) | Reconferência no embarque | App/coletor |
| Gerente da embarcação | Prestação de contas da viagem | Web / App |
| Financeiro / Tesouraria | AP/AR, caixas em tempo real, conciliação, faturamento | Web |
| Comprador | Solicitação, aprovação, status de compras | Web |
| Diretoria | BI: rentabilidade por viagem/embarcação/cidade | Web |
| Administrador | Usuários, permissões, preços, configurações | Web |

## 5. Escopo

### 5.1 Módulos no escopo
1. **Vendas (Site/App/PDV/Totem)** — passagens com QR, app de validação, venda de encomendas, termo de aceite de embarque, autocadastro, NPS.
2. **CRM** — base de clientes, alocação por agente, histórico de envios/preços, cotações (encomenda/carga/veículo).
3. **Encomendas** — despacho (remetente/destinatário), declaração de conteúdo + assinatura, controle por viagem.
4. **TMS (Carga)** — registro de entrada de veículos no porto, upload de NF/DC, conferência com coletor, etiquetagem/paletes, duplo bipe, comprovante de entrega, prestação de contas do gerente.
5. **Veículos** — checklist digital de embarque, termo de aceite.
6. **Financeiro** — AP, AR (incl. rastreio de NF/boleto no CNPJ), tesouraria, faturamento, conciliação bancária, cruzamento de prestação de contas, contas-corrente, caixas, estoque (paiol/rancho), compras, pagamento de agentes.
7. **Cadastros** — fornecedores, usuários/permissões, clientes, agentes, preços (passagem/encomenda/carga), colaboradores, escalas.
8. **PDV Lanchonete/Restaurante** — insumos, caixa integrado, comandas.
9. **Navegação** — embarcações, cronograma de saída/chegada/retorno, rastreamento em tempo real, status de viagem, escala de colaboradores com notificação.

### 5.2 Pendências (não bloqueiam o MVP; modelar como configurável)
- 🔶 Tabela de preços de **encomendas** (mecânica + valores) — *Lucas envia.*
- 🔶 Regras de **preço/tamanho/trechos** de encomenda no PDV — *Lucas.*
- 🔶 Texto do **termo de aceite de embarque** — *AJC revisar.*
- 🔶 Modelo de **declaração de conteúdo** + cláusula de exclusão de responsabilidade — *Lucas enviar.*
- 🔶 Modelo atual em papel da **prestação de contas** do gerente — *digitalizar/melhorar.*
- 🔶 Integração de **rastreio de NF/boleto no CNPJ** — *depende de API (a investigar).*
- 🔶 Regras de **comissão de agentes** — diretoria define após o sistema gerar o relatório base.

## 6. Requisitos funcionais por módulo

### RF-1 Vendas (Site/App/PDV/Totem)
- Venda de passagem com **emissão de QR Code** (online, app, PDV, totem).
- Classes: **Rede, Rede VIP, Camarote** (múltiplos tipos, ex. Royal), **Cortesia**, **Gratuidade**, **Contrato**.
- **Cortesia**: gerador de código, com limite/contagem por viagem.
- **Gratuidade**: marcação por tipo legal (idoso, PCD, etc.) com relatório dedicado para órgãos.
- **Contrato**: consumida na viagem, **faturada no fim do mês** (órgãos públicos, concessionárias).
- **App de validação** (bilheteiro): lê QR, valida, indica **cor de pulseira** por classe; bloqueia QR usado/inválido.
- **Relatório de passageiros por viagem**: nome completo, classe/assento, tipo de tarifa.
- **Venda de despacho de encomendas** no PDV (com balança): cidade destino + tamanho → preço automático.
- **Termo de aceite de embarque** exibido e aceito na compra (online/app/presencial).
- **Autocadastro de clientes** (self-service).
- **Pesquisa NPS** pós-viagem.

### RF-2 CRM
- Base de clientes; **alocação de cada cliente a um agente**.
- **Histórico de envios e precificações** (mostrar ao menos os 2 últimos: o quê, nº de volumes, preço, data).
- **Cotação** de encomendas, carga e veículos (tabelas de carga e veículo prontas; encomenda 🔶).

### RF-3 Encomendas
- Tela de **despacho**: cadastro de remetente/destinatário (CPF) + dados de envio (cidade, quem paga).
- **Precificação**: por **tamanho** (P ≤ 10 kg, M ≤ 20 kg, G ≤ 30 kg) até R$ 1.000 de valor declarado; **acima de R$ 1.000**, percentual sobre o valor da nota/declaração — independente do tamanho.
- **Declaração de conteúdo** com valor declarado + **cláusula de exclusão de responsabilidade** (reembolso limitado ao valor declarado; sem abertura de volume) e **assinatura em tela**.
- **Controle por viagem** em tempo real: quantidade, valor declarado, valor cobrado.

### RF-4 TMS (Carga)
- **App de registro de entrada de veículos no porto**: placa, empresa, data/hora (entrada e saída).
- Upload de **NF / Declaração de Conteúdo** por cliente/agente; **lançamento de NF/DC pelo ADM Notas**; recebimento no coletor pelo conferente.
- **Etiquetagem por volume** e **por palete**; geração de etiqueta com **QR/UUID**.
- **Modelo de etiqueta**: CIDADE (siglas) · PALETE (código) · VOLUME (ex. 1/2, 2/2 ou 1/3…).
- **Dois modelos de recebimento**: (a) Porto + Balsa; (b) Carregamento direto (múltiplos recebimentos) — **foto obrigatória**.
- **Segundo bipe** (conferente da balsa) para reconferência.
- **Comprovante de entrega**: 2 fotos obrigatórias + assinatura do recebedor; protocolo digital em tela.
- **Notificação de entrega** via WhatsApp/SMS a destinatário e remetente.
- **Prestação de contas** da viagem para o gerente da embarcação (digitalizar modelo atual).
- **Cadastro de paletes de terceiros** e **alocação de paletes** para conferência/transporte.

### RF-5 Veículos
- **Checklist digital de embarque** (vistoria com fotos/avarias).
- **Termo de aceite de envio de veículos**.

### RF-6 Financeiro
- **Contas a pagar / a receber**: cadastro, acompanhamento, status (vencida, a vencer, vence na semana), visualização por período flexível.
- **Rastreio de NF/boleto emitidos no CNPJ** (integração a investigar 🔶).
- **Tesouraria**: visão de caixas em tempo real (porto, encomenda, lanchonete, balsas 1/2/3, agentes por cidade).
- **Faturamento**: notas, boletos.
- **Lançamento NF-e / NFS-e**; **conciliação bancária**; **contas-corrente** (saldos, entradas/saídas).
- **Cruzamento da prestação de contas** da embarcação com o contas a receber.
- **Controle de estoque** (paiol e rancho), ligado a **compras**.
- **Compras**: solicitação → aprovação → status → prazo de entrega.
- **Pagamento de agentes comerciais**: relatório de comissão a partir dos lançamentos do CRM.

### RF-7 Cadastros
- Fornecedores, usuários (com **permissões por perfil**), clientes, agentes comerciais, colaboradores, escalas.
- Preços de passagem/encomenda/carga, com **reajuste em massa de ± X%** em todas as categorias. Carga usa **tier = % de preço**.

### RF-8 PDV Lanchonete/Restaurante
- Controle de insumos, caixa integrado ao financeiro, fechamento de comandas (lanchonete e restaurante de bordo).

### RF-9 Navegação
- Cadastro/lista de embarcações; cronograma **dia/hora de saída, chegada por cidade, retorno**.
- **Rastreamento em tempo real** das embarcações.
- **Status de viagem**: no prazo / atenção / atrasado.
- **Escala de colaboradores** com **notificação via WhatsApp**.

## 7. Requisitos não-funcionais
- **Conectividade intermitente**: porto, balsa e cidades têm internet ruim. Apps de conferente, validação e porteiro precisam funcionar **offline-first** com sincronização posterior.
- **Auditabilidade**: log imutável de quem lançou/conferiu/entregou o quê e quando (coração do controle antifraude).
- **Captura de mídia**: fotos obrigatórias com carimbo de data/hora e georreferência quando possível.
- **Segurança e LGPD**: dados de clientes, CPF, valores declarados; acesso por perfil; trilha de auditoria.
- **Performance**: relatórios por viagem em segundos; tesouraria near-real-time.
- **Disponibilidade**: venda online e validação no embarque são críticas (picos em férias).
- **Escalabilidade**: multi-embarcação e multi-cidade; preparado para 6–7 embarcações.

## 8. Riscos e mitigação
| Risco | Mitigação |
|---|---|
| Adoção em campo (papel → digital) | Apps simples, offline, treinamento; foto/assinatura como prova |
| Conectividade ruim | Offline-first obrigatório; fila de sincronização |
| Dependências pendentes (tabelas/termos) | Preços e termos configuráveis; não bloquear MVP |
| Integração NF/boleto no CNPJ pode não ter API | Tratar como Fase 2/3 |

## 9. Faseamento

> Decisão do cliente: começar o aprofundamento por **TMS/Carga** e **Vendas/Passagens**.

- **Fase 1 (núcleo antifraude + receita):** Cadastros essenciais + Navegação (embarcações/viagens) + Vendas de passagem com QR e validação + **Portal online público de venda de passagem com pagamento integrado (gateway + emissão fiscal)** + Encomendas com declaração de conteúdo + TMS (entrada de veículos, conferência bipada, etiqueta, entrega).
- **Fase 2 (financeiro e inteligência):** Financeiro completo, caixas/tesouraria, compras/estoque, pagamento de agentes, BI por viagem/embarcação/cidade.
- **Fase 3 (experiência e periféricos):** CRM avançado/cotações, PDV lanchonete/restaurante, rastreamento em tempo real, NPS, integração NF/boleto no CNPJ.

> **Decisão (atualização de escopo):** o cliente confirmou que o **portal público de venda online com pagamento integrado** É parte do MVP (Fase 1), não item posterior. Isso eleva ao caminho crítico do MVP: (a) integração de **gateway de pagamento** (cartão/PIX), (b) **emissão fiscal** do bilhete, (c) **reserva/locação de assento com concorrência** (evitar venda dupla), (d) conta/área do cliente e recuperação de bilhete. Os itens (a) e (b) dependem de fornecedores externos com risco de prazo já sinalizado no quadro de riscos — precisam de spike/decisão de fornecedor cedo.

## 10. Glossário

### Siglas de cidades (usadas na etiqueta de carga)
| Sigla | Cidade |
|---|---|
| BEL | Belém |
| BRV | Breves |
| GUR | Gurupá |
| ALM | Almeirim |
| PMZ | Porto de Moz |
| PRA | Prainha |
| MTA | Monte Alegre |
| STM | Santarém |

### Termos
- **NF/DC** — Nota Fiscal / Declaração de Conteúdo.
- **DC (Declaração de Conteúdo)** — documento com valor declarado e cláusula de exclusão de responsabilidade; assinado pelo cliente.
- **2º bipe** — reconferência feita pelo conferente da balsa no embarque.
- **Palete de terceiro** — palete que não é da AJC, cadastrado e alocado para conferência/transporte.
- **Passagem contrato** — consumida na viagem, faturada no fim do mês (clientes corporativos/órgãos).
- **Cortesia** — passagem concedida (influência/relacionamento), com código gerado e controle por viagem.
- **Gratuidade** — passagem legal gratuita (idoso, PCD, etc.), com relatório regulatório.
