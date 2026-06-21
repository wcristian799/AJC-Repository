# Módulo Financeiro — SPEC + Detalhamento de Telas

> Espinha dorsal do ERP. Núcleo: **contas a pagar/receber**, **tesouraria com caixas em tempo real**, **conciliação bancária**, **cruzamento da prestação de contas das embarcações** com o contas a receber, **compras/estoque** e **pagamento de comissão de agentes**. É onde o controle antifraude vira número.

---

## Parte A — SPEC técnica

### A.1 Submódulos
1. Contas a Pagar (AP)
2. Contas a Receber (AR) — incl. rastreio de NF/boleto no CNPJ
3. Tesouraria — caixas em tempo real
4. Faturamento — NF-e / NFS-e / boletos
5. Conciliação bancária
6. Contas-corrente
7. Cruzamento de prestação de contas (embarcação ↔ AR)
8. Controle de estoque (paiol e rancho)
9. Compras (solicitação → aprovação → status → prazo)
10. Pagamento de agentes comerciais (comissão)

### A.2 Caixas mapeados (Tesouraria)
Visão em tempo real de múltiplos caixas:
- Caixa do porto
- Caixa de encomendas
- Caixa da lanchonete/restaurante
- Caixa de cada balsa (1, 2, 3…)
- Caixa de cada agente (por cidade)

Cada caixa registra entradas/saídas e consolida na tesouraria. Vendas de passagem/encomenda lançam direto no caixa correspondente.

### A.3 Cruzamento de prestação de contas
- Gerente da embarcação envia a prestação de contas da viagem (módulo TMS B.10).
- Sistema compara **declarado pelo gerente** × **registrado pelo sistema** (passagens, encomendas, cargas, veículos da viagem) × **contas a receber**.
- Divergência sinalizada para tratamento.

### A.4 Rastreio de NF/boleto no CNPJ 🔶
- Requisito: quando alguém emite NF/boleto contra o CNPJ da AJC, aparecer no sistema (recurso elogiado no sistema atual).
- Depende de integração/API a investigar (possível serviço de "contas a receber" de mercado). Tratar como Fase 2.

### A.5 Entidades
```
ContaPagar (id, fornecedor_id, descricao, valor, vencimento, status[a_vencer|vence_semana|vencida|pago],
            categoria, anexo_nf?, pago_em)
ContaReceber (id, cliente_id, origem[passagem|encomenda|carga|veiculo|contrato], valor, vencimento,
              status[a_vencer|vence_semana|vencida|recebido], viagem_id?, nf_id?)
Caixa (id, tipo[porto|encomenda|lanchonete|balsa|agente], referencia, saldo_atual)
  └─ MovimentoCaixa (caixa_id, tipo[entrada|saida], valor, origem, timestamp, usuario_id)
ContaCorrente (id, banco, agencia, conta, saldo)
  └─ MovimentoBancario (conta_id, valor, tipo, data, conciliado[bool], conta_receber_id?/conta_pagar_id?)
Fatura (id, cliente_id, itens[], valor, tipo_doc[NFe|NFSe|boleto], status, emitido_em)
SolicitacaoCompra (id, solicitante_id, itens[], justificativa, status[solicitada|em_cotacao|aprovada|reprovada|comprada|entregue],
                   aprovador_id?, prazo_entrega)
ItemEstoque (id, local[paiol|rancho], nome, unidade, saldo, minimo)
  └─ MovimentoEstoque (item_id, tipo[entrada|baixa], qtd, origem, timestamp)
ComissaoAgente (id, agente_id, periodo, lancamentos[], valor_total, status[aberta|paga])
```

### A.6 Integrações
- Banco (extrato para conciliação), NF-e/NFS-e (SEFAZ/prefeitura), boletos, rastreio CNPJ (🔶).

---

## Parte B — Telas

> Estados padrão: **Vazio · Carregando · Erro · Sucesso**. Filtros de período flexíveis em todas as listas financeiras (hoje, amanhã, semana, mês, intervalo).

### B.1 Contas a pagar — lista e cadastro
- Lista: fornecedor, descrição, valor, vencimento, **status** (vencida / vence essa semana / a vencer / pago).
- Visualização por período flexível; totais por status.
- Cadastro: fornecedor, valor, vencimento, categoria, anexo de NF, recorrência.
- Ações: marcar pago, anexar comprovante, agendar.
- *Estados:* vencida em vermelho; vazio "Sem contas no período".

### B.2 Contas a receber — lista e cadastro
- Lista: cliente, origem (passagem/encomenda/carga/veículo/contrato), valor, vencimento, status (a entrar hoje/amanhã/semana, atrasado, recebido).
- **Passagens contrato** entram aqui para faturamento no fim do mês.
- Cadastro manual + geração automática a partir de vendas/cargas.
- *Estados:* atrasado destacado; vínculo com viagem.

### B.3 Rastreio de NF/boleto emitidos no CNPJ 🔶
- Lista de documentos emitidos contra o CNPJ da AJC (NF e boletos), com origem e valor.
- Conciliação com contas a pagar.
- *Estado:* dependente de integração; placeholder até API definida.

### B.4 Tesouraria — caixas em tempo real
**Persona:** Tesouraria/diretoria.
- Painel com todos os caixas (porto, encomenda, lanchonete, balsas 1/2/3, agentes por cidade) e saldo atual de cada.
- Entradas/saídas em tempo real; faturado do dia.
- Drill-down por caixa → movimentos.
- *Estados:* atualização near-real-time; alerta de caixa negativo/divergente.

### B.5 Detalhe de caixa
- Movimentos (entrada/saída), origem (venda de passagem/encomenda/F&B), operador, horário.
- Fechamento de caixa por turno/dia.

### B.6 Faturamento (NF-e / NFS-e / boletos)
- Emissão de notas e boletos; vínculo a contas a receber.
- Lista de documentos emitidos, status (emitida, cancelada, paga).
- Lançamento de NF-e e NFS-e.

### B.7 Conciliação bancária
- Importa/lê extrato; concilia movimento bancário ↔ contas a pagar/receber.
- Marca conciliado/divergente; sugestão automática de match.
- *Estados:* não conciliado · conciliado · divergência.

### B.8 Contas-corrente
- Cadastro de contas bancárias com saldo.
- Acompanhamento de entradas/saídas; base para conciliação (B.7).

### B.9 Cruzamento de prestação de contas (embarcação ↔ AR)
**Persona:** Financeiro.
- Seleciona viagem → mostra prestação do gerente × registros do sistema × contas a receber.
- Divergências destacadas (ex.: 2 carros lançados pelo agente que não bateram com o AR).
- Ações: aprovar, sinalizar divergência, ajustar.

### B.10 Controle de estoque (paiol e rancho)
- Itens por local (paiol/rancho), saldo, mínimo.
- Entradas (compras) e baixas (consumo); alerta de estoque mínimo.
- Ligado a Compras (B.11) e ao PDV F&B (consumo de insumos).

### B.11 Compras — solicitação, aprovação, status
**Persona:** Comprador + aprovador.
- **Solicitação:** item, quantidade, justificativa, local.
- **Aprovação:** fila para o usuário aprovador (aprovar/reprovar com motivo).
- **Status:** solicitada → em cotação → aprovada/reprovada → comprada → entregue.
- **Prazo de entrega** visível ao solicitante (ex.: porto sabe quando chega a caneta pedida).
- *Estados:* aguardando aprovação; atrasada vs. prazo.

### B.12 Pagamento de agentes comerciais (comissão)
**Persona:** Financeiro.
- Gera **relatório de comissão** a partir dos lançamentos do CRM (carga/encomenda/passagem captada por agente).
- Aplica regras de comissão (🔶 a definir pela diretoria).
- Fechamento por período; status (aberta/paga); geração de conta a pagar.

---

## Pendências deste módulo
- 🔶 Viabilidade/API do rastreio de NF/boleto no CNPJ.
- 🔶 Regras de comissão de agentes.
- Definir layout de prestação de contas (vem do TMS/gerente) para o cruzamento.
- Bancos e formato de extrato para conciliação.
- Regime tributário/modelo fiscal para NF-e/NFS-e.
