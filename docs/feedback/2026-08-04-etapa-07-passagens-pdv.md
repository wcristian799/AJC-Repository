# Etapa 07 — Passagens, PDV e embarque

Data de fechamento técnico: 04/ago/2026

Fonte: `2026-07-09-validacao-core-todas-telas-diagramado.docx`, requisitos REQ-07-01 a REQ-07-06.

## Resultado

A etapa foi implementada como uma fatia vertical real. O PDV não calcula preço comercial,
lotação, cortesia ou saldo apenas no navegador. O backend valida e persiste toda a venda numa
transação, com trilha de auditoria e idempotência.

## Requisitos atendidos

| Requisito | Entrega | Evidência |
|---|---|---|
| REQ-07-01 | Pagamento misto com conciliação exata, troco somente em forma habilitada e parcelamento condicionado a taxa publicada | `venda_pos_pagamento`, movimentos de caixa por forma e validador Jest |
| REQ-07-02 | Canal de venda persistido; estrutura preparada para app do agente; cortesia real exige código disponível e preserva motivo/observação | `venda_pos.canal`, consumo transacional de `cortesia` e modal do PDV |
| REQ-07-03 | Manifesto com total de saída e totais por cidade/origem a partir do trecho gravado no bilhete | `bilhete.origem_sigla`, `bilhete.destino_sigla` e `/api/vendas/manifesto/:viagemId` |
| REQ-07-04 | Validação real de QR; segunda leitura devolve `ja_validado` e não cria novo embarque | `/api/vendas/bilhetes/:id/validar` e `/embarque` sem botões simulados |
| REQ-07-05 | Opção de BP-e por canal versionada e registro fiscal auditável | configuração `fiscal`; adapter externo permanece inativo até homologação |
| REQ-07-06 | Área de foto da embarcação no PDV e edição da URL no cadastro da frota | `embarcacao.foto_url` e viagem expondo `embarcacaoFotoUrl` |

## Experiência do operador

- Login exclusivo da suíte de campo e permissão `campo.pdv`.
- Cabeçalho de estação com operador, saldo do caixa, histórico e sangria.
- Seleção de viagem, embarque e destino entre cidades válidas da rota.
- Foto da embarcação quando cadastrada; estado vazio honesto quando ausente.
- Acomodações geradas de preços publicados, metadados de classe e capacidade real da viagem.
- Cliente pesquisável ou venda avulsa, com identificação individual dos passageiros.
- Cesta com vários bilhetes, gratuidade legal e cortesia previamente emitida.
- Uma ou mais formas de pagamento, reconciliação, troco e parcelas.
- Resultado com códigos e QR reais, sem exemplos ou códigos fictícios.
- Layout responsivo validado em desktop e celular.

## Configuração em Cadastros

A chave versionada `vendas_pdv_operacao` controla:

- tipo/referência e exigência de abertura do caixa;
- canal padrão;
- meios de pagamento, troco, parcelas e acréscimos;
- nomes, descrições, ativação e cores de pulseira por classe;
- hipóteses/documentos de gratuidade;
- obrigatoriedade/opção de BP-e por canal;
- ativação e modelo homologado da impressora.

Preços continuam na tabela de passagem versionada. Viagens, rotas, capacidades, clientes,
cortesias e embarcações continuam nos respectivos cadastros reais; não são duplicados na chave.

## Banco e API

Migration: `infra/migrations/0033_passagens_pdv_operacional.sql`.

Endpoints novos:

- `GET /api/vendas/pdv/configuracao`
- `GET /api/vendas/pdv/historico`
- `POST /api/vendas/pdv/vendas`

Contratos ampliados:

- manifesto por origem/destino;
- listagem de bilhetes com pagamentos agregados;
- embarcação/viagem com foto;
- caixa com identificação do operador.

## QA executado

- Migration aplicada no PostgreSQL WSL: 33/33.
- NestJS build: aprovado.
- Jest: 9 suítes e 30 testes aprovados.
- Vite/Nitro SSR build: aprovado.
- Smoke integrado: venda `PDV-2026-98231235`, bilhete `BIL-2026-040114323D`, valor R$ 225,00,
  dinheiro + PIX, dois movimentos de caixa, total por cidade no manifesto e reenvio idempotente.
- Inspeção no navegador: desktop 1440×1000 e mobile 390×844, incluindo montagem de cesta e
  inclusão de segunda forma de pagamento.

## Dependências externas que não podem ser fingidas

- BP-e real: senha/uso do PFX, credenciamento SEFAZ-PA e fornecedor/API fiscal.
- Impressão física: equipamento e protocolo homologados e cadastrados.
- Fotos da frota: URLs reais fornecidas/cadastradas pela AJC.

Enquanto essas dependências estiverem ausentes, a interface comunica o estado e mantém os
registros auditáveis; não apresenta integração externa como concluída.
