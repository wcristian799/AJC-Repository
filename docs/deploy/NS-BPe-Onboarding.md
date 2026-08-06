# Onboarding NS BP-e — passo a passo da AJC

Este roteiro separa contratação, homologação e produção. Não envie senha do certificado por chat, e-mail comum ou ticket sem cofre seguro.

## 1. Contratar o produto correto

Solicitar à NS Tecnologia:

- **NS BP-e API**, modelo 63;
- ambiente de homologação;
- emissão, status, XML/DABPE e cancelamento;
- contingência com webhook;
- upload/rotação de certificado A1/PFX;
- vínculo do CNPJ `10.736.847/0001-92` ao token.

Documentação: https://documentacao.nstecnologia.com.br/docs/ns-bpe/

## 2. Cadastrar a empresa na NS

1. cadastrar razão social, CNPJ, IE e dados fiscais da AJC;
2. subir exclusivamente o PFX corporativo da AJC;
3. informar a senha somente no painel/cofre seguro da NS;
4. confirmar validade e renovação do certificado;
5. obter o `X-AUTH-TOKEN` de homologação;
6. habilitar contingência e webhook.

O PFX recebido continua fora do repositório. O backend AJC não copia esse arquivo.

## 3. Definir série e numeração

Como existe outro emissor em uso, pedir à contabilidade/NS:

- uma série exclusiva para o AJC durante a coexistência;
- o primeiro `nBP` dessa série;
- códigos de percurso, viagem, serviço, acomodação, trecho, pagamento e componente tarifário;
- estrutura atual de ICMS/IBS/CBS do BP-e.

Não reutilizar a mesma série simultaneamente em dois sistemas.

## 4. Configurar secrets no Coolify

```env
BPE_MODE=ns
BPE_NS_BASE_URL=https://bpe.ns.eti.br/v1
BPE_NS_TOKEN=TOKEN_RECEBIDO_DA_NS
BPE_WEBHOOK_USER=usuario-longo-gerado
BPE_WEBHOOK_PASSWORD=senha-aleatoria-forte
```

O token deve existir nos serviços `api` e `worker`.

## 5. Cadastrar webhook na NS

```text
https://apiajc.byteintelligence.com.br/api/fiscal/bpe/webhooks/ns
```

Configurar HTTPS + Basic Auth com `BPE_WEBHOOK_USER` e `BPE_WEBHOOK_PASSWORD`.

## 6. Aplicar e publicar

```bash
node infra/migrations/run.mjs
```

A migration é `0037_bpe_integracao_ns.sql`. Depois, rebuild/redeploy de `api` e `worker`.

## 7. Preencher Cadastros

1. Cadastros › Cidades: preencher código IBGE de sete dígitos.
2. Cadastros › Configurações operacionais › BP-e:
   - manter Homologação;
   - informar série e primeiro número;
   - copiar emitente completo;
   - cadastrar intertrechos;
   - mapear classes e pagamentos;
   - colar o objeto `imp` aprovado;
   - publicar ainda desativado.
3. Conferir token, webhook, MinIO e cidades/IBGE.
4. Ativar em homologação e publicar novamente.

## 8. Homologação mínima

- dinheiro, PIX, cartão e multipagamento;
- todas as classes e ao menos um intertrecho por rota;
- autorização `cStat=100`, XML e DABPE;
- rejeição controlada e reprocessamento;
- cancelamento com justificativa;
- contingência e webhook;
- comparação com o emissor atual e aceite do contador.

## 9. Produção

1. obter token de produção, se diferente;
2. reconfirmar série e próximo número;
3. mudar o ambiente para Produção em Cadastros;
4. publicar;
5. fazer venda piloto acompanhada;
6. validar chave, protocolo, XML, DABPE e escrituração;
7. monitorar worker e fila fiscal no primeiro dia.

## 10. Renovação

- registrar validade e responsável pelo PFX;
- renovar no painel da NS antes do vencimento;
- rotacionar token/webhook se houver exposição;
- nunca reduzir série/número;
- manter backup do Postgres e `bpe-documentos`.
