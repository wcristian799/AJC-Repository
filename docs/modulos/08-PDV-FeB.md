# Módulo PDV Lanchonete / Restaurante — SPEC + Detalhamento de Telas

> PDV de alimentação a bordo (lanchonete e restaurante). Reaproveita o que já existe ("nada mais do que aquilo"). Núcleo: **comandas**, **controle de insumos** e **caixa integrado ao Financeiro**. Usado tanto na lanchonete quanto no restaurante do barco.

---

## Parte A — SPEC técnica

### A.1 Princípios
- **Offline-first:** opera a bordo, sem internet garantida; sincroniza ao atracar/conectar.
- **Caixa integrado:** vendas lançam no caixa da lanchonete/restaurante (Tesouraria — Financeiro B.4/B.5).
- **Baixa de insumos:** venda de item baixa insumos do estoque (paiol/rancho).

### A.2 Entidades
```
ProdutoFeB (id, nome, categoria, preco, ficha_tecnica[insumo_id, qtd])
Comanda (id, identificacao[mesa|cliente|pulseira], itens[], status[aberta|fechada|paga], abertura, fechamento)
  └─ ItemComanda (comanda_id, produto_id, qtd, preco)
MovimentoCaixaFeB → Caixa(lanchonete/restaurante)  (ver Financeiro)
BaixaInsumo → MovimentoEstoque                       (ver Financeiro/Estoque)
```

### A.3 Relações
- **Financeiro:** caixa e estoque (insumos paiol/rancho).
- **Cadastros:** produtos e preços.

---

## Parte B — Telas

> Estados padrão: **Vazio · Carregando · Erro · Sucesso · Offline**.

### B.1 Abertura/seleção de comanda
- Abrir comanda por mesa, cliente ou pulseira.
- Lista de comandas abertas com total parcial.
- *Estados:* nenhuma comanda aberta; comanda já existente.

### B.2 Lançamento de itens na comanda
- Grade de produtos por categoria; toque adiciona; ajusta quantidade.
- Total em tempo real.
- *Offline:* lançamentos salvos localmente.

### B.3 Fechamento de comanda
- Resumo dos itens, total, divisão de conta (opcional).
- Formas de pagamento; lança no **caixa** (Financeiro).
- Gera comprovante.
- *Estados:* comanda vazia (não fecha); erro de pagamento.

### B.4 Controle de insumos
- Saldo de insumos (paiol/rancho); baixa automática por ficha técnica do produto vendido.
- Alerta de estoque mínimo; entrada por compras.
- *(Compartilha base com Financeiro B.10.)*

### B.5 Caixa do PDV F&B
- Movimentos do turno; fechamento; integra Tesouraria.
- *(Ver Financeiro B.5.)*

---

## Pendências deste módulo
- Confirmar cardápio/produtos e fichas técnicas (insumos por produto).
- Confirmar formas de pagamento a bordo.
