# Modelo Real — Prestação de Contas de Gerente

> Fonte recebida em 2026-06-29:
> `C:\Users\Administrador\Downloads\PRESTAÇÃO DE CONTAS GERENTES AM VI 24 09 (2).docx`
>
> Este arquivo resolve a pendência externa "modelo atual em papel da prestação de contas do gerente". Ele não resolve pendências de BP-e/gateway, tabela de encomendas, declaração de conteúdo, termos, impressora ou comissão de agentes.

## Leitura Executiva

O documento é um modelo real de prestação de contas de viagem. Ele confirma que a tela B.10 não deve ser apenas uma comparação genérica "declarado x sistema"; ela precisa espelhar o formulário operacional usado pelo gerente da embarcação, com blocos de receitas a bordo, cozinha, lanchonete, internet, agências, fretes, despesas, redondas/gratificações e fechamento com saldo repassado.

O `PrestacaoTab` atual já cobre a ideia geral, mas precisa de refinamento visual para seguir a estrutura deste documento.

## Estrutura Confirmada do Formulário

### Cabeçalho

- Título: Prestação de contas.
- Embarcação.
- Número da viagem.
- Período da viagem.
- Caixa inicial ou caixa declarado no início do formulário.

### Receitas À Bordo

Tabela com colunas:

- Espécie.
- PIX.
- Total.

Linhas do modelo:

- Passagens.
- Fretes por trecho, por exemplo STM/Almeirim, STM/Gurupá, STM/Porto de Moz.
- Fretes inter-trechos.
- Encomendas.
- Veículos.
- Total.

### Cozinha, Lanchonete e Internet

O modelo traz um bloco de cozinha por dia da viagem:

- Café.
- Almoço.
- Jantar.
- Total por dia e total geral.

Também traz linhas separadas para:

- Lanchonete, com Espécie, PIX e Total.
- Internet, com Espécie, PIX e Total.

Observação de escopo: PDV completo de F&B continua fase posterior, mas a prestação de contas precisa mostrar esses totais porque o formulário real já consolida a operação de bordo.

### Passagens — Agências

Tabela por cidade/agência, com colunas:

- Espécie.
- PIX/Conta.
- Total geral.
- Comissão.
- Saldo.

Cidades presentes no modelo:

- Breves.
- Gurupá.
- Almeirim.
- Prainha.
- Monte Alegre.
- Santarém.

### Fretes — Agências

Tabela por cidade/agência, com colunas:

- Espécie.
- PIX/Conta.
- Total.
- Saldo.

O modelo também usa cidades/agências como Gurupá, Almeirim, Prainha, Monte Alegre e Santarém.

### Despesas

Tabela com:

- Descrição.
- Valor.
- Total.

Exemplos reais de despesas encontradas no modelo:

- Pagamento de carregador.
- Pagamento de despacho.
- Recolhimento de lixo/resíduos.
- Pagamento de empilhador.
- Compras de alimentação/material para refeitório.
- Diária no porto.
- Gratificação.

### Redondas e Gratificações

Bloco separado com:

- Nome.
- Função.
- Valor.
- Total.

### Fechamento

Resumo final com colunas de Espécie, PIX e Total:

- Receita total.
- Despesa total.
- Saldo repassado.

O formulário termina com campos de assinatura:

- Local e data.
- Responsável.

## Impacto no Front

Atualizar `apps/web-console/src/components/ops/tms/PrestacaoTab.tsx` para:

- Manter o botão "Emitir PDF".
- Manter divergência "declarado x sistema", mas colocar o formulário real como corpo principal.
- Adicionar cabeçalho com embarcação, número da viagem, período e caixa.
- Separar receitas em "À bordo", "Cozinha/Lanchonete/Internet", "Passagens — Agências" e "Fretes — Agências".
- Mostrar comissão e saldo das agências.
- Mostrar despesas e bloco de redondas/gratificações.
- Mostrar fechamento com Receita total, Despesa total e Saldo repassado.
- Mostrar Local/Data e Responsável como área de assinatura/fechamento.

## Pendências Que Continuam

- BP-e/gateway/fiscal do portal.
- Tabela de preços de encomendas.
- Modelo final de declaração de conteúdo.
- Termo de aceite de embarque.
- Termo de veículos.
- Modelo/protocolo da impressora Bluetooth.
- Regra definitiva de comissão de agentes.
- Provedores de pagamento e WhatsApp/SMS.
