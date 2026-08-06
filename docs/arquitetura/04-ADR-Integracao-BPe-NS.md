# ADR 04 — Integração de BP-e pela NS Tecnologia

Data: 05/ago/2026  
Status: aceita e implementada; ativação depende do onboarding externo e homologação.

## Decisão

O AJC integra BP-e modelo 63 por meio da **NS BP-e API**, sem comunicação direta do ERP com os webservices da SEFAZ.

A NS mantém o certificado A1/PFX no cofre/painel fiscal dela e expõe uma API HTTP para emissão, consulta, download, contingência e cancelamento. O AJC guarda somente o token da API e as credenciais do webhook em variáveis secretas do Coolify.

## Motivos

- API HTTP/JSON adequada ao NestJS e ao worker Docker;
- emissão assíncrona com protocolo `nsNRec`;
- consulta de autorização/rejeição;
- XML e DABPE/PDF;
- cancelamento e contingência;
- elimina a necessidade de manter SOAP, certificados e mudanças de webservice SEFAZ dentro do ERP.

## Arquitetura

1. A venda e o bilhete são confirmados em transação.
2. Quando há emissão fiscal, nasce uma linha `bilhete_documento_fiscal` em `pendente` na mesma transação.
3. O worker varre a outbox, enfileira o documento no pg-boss e reserva a numeração fiscal por CNPJ, ambiente e série.
4. O payload usa o snapshot da configuração publicada `vendas_bpe_integracao` e dados reais de bilhete, viagem, cidades e pagamentos.
5. A NS recebe a emissão, devolve `nsNRec` e o worker consulta o processamento.
6. Autorizado: XML e DABPE são gravados no bucket privado `bpe-documentos`, com SHA-256.
7. Rejeição, contingência e falhas mantêm status, motivo, tentativas e próxima tentativa.
8. O webhook HTTPS da NS é autenticado por Basic Auth e idempotente.
9. Cancelamento exige permissão, justificativa mínima e guarda o XML do evento.

## Segurança

- PFX e senha não entram no Git, imagem Docker, PostgreSQL, logs ou navegador.
- `BPE_NS_TOKEN`, `BPE_WEBHOOK_USER` e `BPE_WEBHOOK_PASSWORD` são secrets do Coolify.
- o token é enviado apenas no corpo HTTPS exigido pela NS e nunca é persistido no payload auditável;
- documentos fiscais ficam privados no MinIO e só são baixados por URL assinada de cinco minutos;
- produção só pode ser habilitada depois da homologação e da confirmação de série/próximo número.

## Numeração e coexistência com o sistema atual

Enquanto o emissor atual continuar ativo, o AJC deve usar uma **série exclusiva**. O responsável fiscal deve confirmar com a contabilidade/NS a série e o próximo número antes de ativar produção. A tabela `bpe_numeracao` nunca reduz o contador já utilizado.

## Configuração sem hard-code

Cadastros › Configurações operacionais › BP-e publica ambiente, série, número inicial, emitente, percursos, mapeamentos de acomodação/pagamento, componente tarifário, tributação e política de retry.

Constantes inerentes ao documento BP-e, como modelo `63` e emissão normal `tpEmis=1`, permanecem no adapter técnico, não como decisão comercial.

## Referências

- Emissão: https://documentacao.nstecnologia.com.br/docs/ns-bpe/emissao-de-bpe/emissao/
- Status: https://documentacao.nstecnologia.com.br/docs/ns-bpe/emissao-de-bpe/status-de-processamento/
- Download: https://documentacao.nstecnologia.com.br/docs/ns-bpe/emissao-de-bpe/download/
- Cancelamento: https://documentacao.nstecnologia.com.br/docs/ns-bpe/eventos-de-bp-e/cancelamento/
- Contingência/webhook: https://documentacao.nstecnologia.com.br/docs/ns-bpe/emissao-bpe-contingencia-api-webhook/emissao/
