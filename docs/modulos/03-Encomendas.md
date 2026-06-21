# Módulo Encomendas — SPEC + Detalhamento de Telas

> Conecta Vendas (PDV) e TMS (conferência/etiqueta/entrega). Núcleo: **precificação por tamanho/valor** e **Declaração de Conteúdo com cláusula de exclusão de responsabilidade** — item crítico jurídico (casos reais: saca de celulares, 18 kg de cocaína).

---

## Parte A — SPEC técnica

### A.1 Regra de precificação

> Tabela de valores 🔶 pendente (Lucas). Mecânica abaixo já definida na reunião; valores entram como configuração.

**Até R$ 1.000 de valor declarado → preço FIXO por tamanho:**

| Tamanho | Peso máximo | Preço |
|---|---|---|
| P | até 10 kg | 🔶 por trecho |
| M | até 20 kg | 🔶 por trecho |
| G | até 30 kg | 🔶 por trecho |

**Acima de R$ 1.000 de valor declarado → preço PERCENTUAL sobre o valor da nota/declaração**, independente do tamanho (P/M/G). Motivo: caixa pequena pode conter alto valor (ex.: iPhones).

- Preço também varia por **trecho** (cidade origem → destino).
- Reajuste em massa ± X% disponível no módulo Cadastros.

```
preço = (valor_declarado <= 1000)
        ? tabela_fixa[tamanho][trecho]
        : valor_declarado * percentual[trecho]
```

### A.2 Declaração de Conteúdo (DC)
- Toda encomenda exige DC quando não há NF.
- Campos: descrição informada pelo cliente, **valor declarado**, trecho, remetente, destinatário.
- **Cláusula de exclusão de responsabilidade** (🔶 texto a definir — Lucas), com pontos confirmados na reunião:
  - Reembolso **limitado ao valor declarado**.
  - A transportadora **não abre** o volume para verificar conteúdo.
  - Se órgão de controle/força policial abrir e o conteúdo divergir do declarado, **a responsabilidade é totalmente do remetente**.
- **Assinatura do cliente em tela** (mesmo padrão de assinatura digital da entrega).
- DC fica anexada à carga e disponível para auditoria/PF.

### A.3 Relação com outros módulos
- **PDV (Vendas B.9):** ponto de venda do despacho com balança.
- **TMS:** gera volumes, etiqueta (UUID/QR), conferência, 2º bipe, entrega.
- **CRM:** histórico de envios e preços do cliente.
- **Financeiro:** valor cobrado entra no caixa de encomendas; controle por viagem.

### A.4 Entidades
```
Encomenda (id, carga_id, remetente_id, destinatario_id, trecho_origem, trecho_destino,
           tamanho[P|M|G]?, peso, valor_declarado, valor_cobrado, quem_paga[rem|dest],
           dc_id, status, viagem_id, criado_por, criado_em)
DeclaracaoConteudo (id, encomenda_id, descricao, valor_declarado, texto_termo_versao,
                    assinatura_id, aceite_em, dispositivo)
```
*(Volume/etiqueta/eventos: ver TMS.)*

---

## Parte B — Telas

> Estados padrão: **Vazio · Carregando · Erro · Sucesso · Offline**.

### B.1 Despacho de encomenda (PDV / balcão do porto)
**Persona:** Operador de caixa (balança ao lado). **Plataforma:** Web/PDV.

**Fluxo:**
1. **Remetente:** CPF → busca cadastro; se não existir, cadastro rápido (nome, contato).
2. **Destinatário:** CPF + contato (para notificação de entrega).
3. **Trecho:** cidade origem → destino (siglas).
4. **Dimensionamento:** seleciona tamanho (P/M/G) **ou** lê peso da balança; informa **valor declarado**.
5. **Preço automático** conforme regra A.1 (mostra se entrou na regra fixa ou percentual).
6. **Quem paga:** remetente ou destinatário.
7. **Declaração de Conteúdo:** abre tela B.2.
8. Confirma → gera encomenda + volumes, **imprime etiqueta** (TMS) e recibo; lança no **caixa**.

**Componentes:** janela suspensa para cidade/tamanho (seleção rápida); leitura de balança; resumo de preço em destaque.

**Estados:**
- *Acima de R$ 1.000:* destaque "Cobrança por percentual da nota/declaração".
- *Erro:* valor declarado vazio quando exigido; peso acima do tamanho selecionado → sugere tamanho maior.
- *Offline:* salva e enfileira; etiqueta impressa localmente.

### B.2 Declaração de Conteúdo + assinatura
**Persona:** Cliente (assina) / operador (conduz).
- Exibe descrição informada, valor declarado, trecho.
- Texto integral do termo (🔶) com a cláusula de exclusão.
- **Assinatura em tela** + aceite (carimbo de data/hora, dispositivo).
- Botão confirmar só habilita após assinatura.
- Gera PDF da DC anexado à encomenda.

**Estados:** sem assinatura (bloqueado) · sucesso (DC gerada) · erro de captura de assinatura.

### B.3 Cotação de encomenda (atendimento / CRM / cliente)
**Objetivo:** simular preço sem efetivar o envio.
- Entrada: trecho + tamanho/peso + valor declarado.
- Saída: preço estimado (fixo ou percentual), prazo previsto pela próxima viagem.
- Botão "Converter em despacho" leva ao B.1.

### B.4 Controle de encomendas por viagem
**Persona:** Operação/financeiro/diretoria.
- Por viagem, em tempo real: **quantidade** de encomendas, **valor declarado** total, **valor cobrado** total.
- Lista filtrável (remetente, destinatário, cidade, status, tamanho).
- Divergências (valor declarado x cobrado) e pendências de DC sinalizadas.
- Exportável; alimenta o BI e o cruzamento financeiro.

### B.5 Rastreamento da encomenda (cliente / atendimento)
- Linha do tempo do(s) volume(s): recebido → conferido → embarcado → em viagem → desembarcado → entregue.
- Reaproveita os eventos do TMS e o protocolo de entrega (2 fotos + assinatura).
- Notificações automáticas via WhatsApp/SMS em recebimento e entrega.

### B.6 Histórico de envios do cliente
*(Compartilhado com o CRM — ver módulo CRM.)*
- Mostra ao menos os **2 últimos envios**: data, nº de volumes, conteúdo, preço praticado, trecho.

---

## Pendências deste módulo
- 🔶 Tabela de preços de encomendas (valores fixos P/M/G por trecho + percentual) — Lucas.
- 🔶 Texto da Declaração de Conteúdo + cláusula de exclusão de responsabilidade — Lucas.
- Definir limite de reembolso e política de extravio formalmente.
- Confirmar modelo de balança e integração com o PDV.
