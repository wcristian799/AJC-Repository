# Etapa 06 - Encomendas funcionais

Data: 03/ago/2026  
Fonte vigente: `2026-07-09-validacao-core-todas-telas-diagramado.docx`, secao 06.

## Escopo entregue

A etapa preserva as cinco capacidades existentes - despacho, NF/DC, cotacao, controle por viagem e
rastreamento - e substitui demonstracoes e dados montados no front por um fluxo transacional real.

### Despacho

- busca de cliente por nome, codigo ou documento e cadastro de cliente novo;
- remetente e destinatario completos: nome, CPF/CNPJ e telefone;
- viagem e trecho vindos da navegacao real;
- tamanho, peso, volumes, conteudo e valor declarado;
- escolha NF ou DC, foto obrigatoria e documento conforme a regra publicada;
- upload privado no MinIO, limite de 12 MB, MIME validado e SHA-256;
- preco recalculado pelo servidor pela versao ativa da tabela;
- valor cobrado editavel; diferenca da tabela exige justificativa;
- pagamento pelo remetente exige caixa aberto e gera movimento; pagamento no destino gera titulo AR;
- carga, documento, volumes, detalhe, financeiro e auditoria gravados em uma unica transacao idempotente.

### Cotacao, DC e operacao

- cotacao real no CRM com `client_uuid` e conversao para despacho sem redigitar dados;
- termo da DC exibido exatamente como publicado; sem texto juridico de exemplo;
- assinatura desenhada em tela, enviada como evidencia real e vinculada com hash e aceite auditado;
- controle por viagem com filtros, totais e exportacao CSV baseados no PostgreSQL;
- rastreamento baseado em eventos dos volumes e comprovante de entrega, sem etapas ou notificacoes ficticias;
- registros antigos preservados e identificados como legado incompleto, sem inventar dados faltantes.

## Configuracao em Cadastros

A chave versionada `encomendas_operacao` controla tamanhos/pesos, limite entre preco fixo e percentual,
meios de pagamento, prazo do titulo a receber, obrigatoriedade de evidencia e o termo completo da DC.
A mesma area publica uma nova versao completa da tabela por trecho, tamanho e percentual. O sistema nao
inclui seed de preco comercial ou termo juridico.

## Banco e API

- migration: `0032_encomendas_operacionais.sql`;
- tabelas: `encomenda_detalhe` e `encomenda_evidencia`;
- permissoes: `encomendas.editar` e `encomendas.configurar`;
- endpoints: configuracao, listagem, detalhe, upload de evidencia, criacao, assinatura de DC e publicacao de precos.

## Implantacao

1. Publicar API e front em conjunto.
2. Executar `node infra/migrations/run.mjs` no ambiente da aplicacao.
3. Confirmar as credenciais MinIO e o bucket privado `encomendas-evidencias`.
4. Em Cadastros, revisar/publicar tamanhos e regras, tabela real e texto juridico aprovado.
5. Refazer login para renovar as permissoes do token.
6. Abrir o caixa do operador antes de validar pagamento pelo remetente.

## Dependencias honestamente bloqueadas

- texto juridico da DC e precos comerciais precisam de aprovacao/publicacao da AJC;
- balanca automatica depende do equipamento homologado;
- WhatsApp/SMS real depende de provedor e credenciais. Nenhuma dessas integracoes e simulada.

## Verificacao executada

- PostgreSQL local com 32/32 migrations;
- build NestJS;
- 8 suites e 26 testes Jest;
- build TanStack Start cliente, SSR, Nitro e preset Vercel;
- smoke autenticado da configuracao, listagem, precos e preservacao do registro legado;
- inspecao visual real em desktop e 390x844 de Encomendas e Cadastros;
- sem overflow horizontal de pagina, sem erro de console e com a barra de abas rolavel sem scrollbar nativa no celular.
