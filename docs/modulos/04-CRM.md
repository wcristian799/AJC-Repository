# Módulo CRM — SPEC + Detalhamento de Telas

> Base de relacionamento e inteligência comercial. Núcleo: **clientes alocados a agentes** (7 cidades + Belém), **histórico de envios/preços** e **cotações** (encomenda/carga/veículo). Alimenta a comissão de agentes (Financeiro).

---

## Parte A — SPEC técnica

### A.1 Estrutura comercial
- Belém: equipe comercial central.
- 7 cidades (Breves, Gurupá, Almeirim, Porto de Moz, Prainha, Monte Alegre, Santarém): **1 agente comercial por cidade**.
- Cada agente capta carga/encomenda e vende passagem; ganha **percentual** sobre o que agencia.
- Cada **cliente é alocado a um agente** → base do cálculo de comissão e do split.

### A.2 Cotações
- **Carga:** tabela pronta (tier = % de preço).
- **Veículos:** tabela pronta.
- **Encomendas:** 🔶 pendente (Lucas) — mecânica no módulo Encomendas.
- Cotação não compromete vaga; pode ser convertida em pedido/despacho.

### A.3 Entidades
```
Cliente (id, tipo[PF|PJ], nome, cpf_cnpj, contatos[], cidade, agente_id, criado_em)
Agente (id, nome, cidade_sigla, percentual_comissao, ativo)
Cotacao (id, tipo[encomenda|carga|veiculo], cliente_id, agente_id, trecho, parametros{},
         valor_estimado, status[aberta|convertida|expirada], criado_em)
HistoricoEnvio (deriva de Encomenda/Carga: cliente_id, data, volumes, conteudo, preco, trecho)
```

### A.4 Relações
- **Vendas/Encomendas:** origem dos envios e cotações.
- **Financeiro:** lançamentos do agente geram relatório de comissão.
- **Cadastros:** cadastro de clientes e agentes (permissão do perfil Comercial).

---

## Parte B — Telas

> Estados padrão: **Vazio · Carregando · Erro · Sucesso**.

### B.1 Base de clientes (lista)
- Tabela: nome, CPF/CNPJ, cidade, **agente responsável**, último envio, total movimentado.
- Filtros: cidade, agente, tipo (PF/PJ), período.
- Ações: novo cliente, abrir ficha, exportar.
- *Vazio:* "Nenhum cliente cadastrado."

### B.2 Ficha do cliente (360º)
- Dados cadastrais e contatos.
- **Agente alocado** (com opção de realocar — permissão).
- **Histórico de envios** (ver B.4) com pelo menos os 2 últimos em destaque.
- Cotações abertas e passagens compradas.
- Resumo financeiro (faturado, em aberto).

### B.3 Alocação de clientes a agentes
- Visão por agente: quantos clientes, volume captado, comissão estimada.
- Realocar cliente entre agentes (registra histórico de mudança).
- *Erro:* cliente sem agente em cidade que exige agente → alerta.

### B.4 Histórico de envios e precificações
**Persona:** Comercial/agente.
- Por cliente: lista de envios (data, trecho, nº de volumes, conteúdo, **preço praticado**).
- Mostra ao menos os **2 últimos** envios em destaque (segurança de precificação).
- Usado para repetir/precificar novo envio com base no histórico.

### B.5 Cotação (encomenda / carga / veículo)
- Seleciona tipo (encomenda/carga/veículo).
- Carga/veículo usam tabela pronta; encomenda usa mecânica do módulo Encomendas (🔶 valores).
- Saída: valor estimado + validade da cotação.
- Ação: converter em despacho/pedido; registra agente para comissão.
- *Estados:* aberta · convertida · expirada.

### B.6 Painel do agente comercial
**Persona:** Agente (cidade).
- Seus clientes, cotações, envios captados no período.
- Comissão acumulada estimada (detalhe e fechamento no Financeiro).
- Lançamento de captação de carga/encomenda (entra no controle operacional).

---

## Pendências deste módulo
- 🔶 Tabela/mecânica de preços de encomendas (afeta cotação).
- 🔶 Regras de comissão de agentes (diretoria, após relatório base).
