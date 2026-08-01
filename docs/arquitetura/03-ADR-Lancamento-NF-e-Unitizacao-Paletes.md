# ADR 03 - Lancamento de NF/DC e momento da unitizacao

**Status:** aceito em 01/ago/2026.

## Decisao

O TMS possui um unico fluxo interno de **Lancamento de NF/DC**. A antiga area "Upload do cliente / agente (B.2)" e o conceito de "lancamento manual/avulso sem carga" foram descontinuados.

1. O operador envia XML, PDF ou foto. O arquivo real vai ao bucket privado `documentos-fiscais` com SHA-256.
2. XML de NF-e/NFC-e preenche numero/chave, emitente, destinatario, valor, peso, volumes e modalidade de frete quando essas informacoes existirem.
3. O emitente e procurado por CPF/CNPJ normalizado. Se existir, e selecionado; se nao existir, o cliente e criado na mesma transacao do lancamento.
4. Salvar cria e liga **cliente + documento fiscal + carga + viagem + volumes**. Nao existe NF/DC nova sem carga/viagem nesse fluxo.

## Paletes

A nota fiscal nao informa qual palete fisico a operacao usara. Por isso, o sistema **nao aloca palete automaticamente no lancamento**.

- **AVULSA:** sem palete; etiqueta e bipe por volume.
- **MP:** uma carga em mais de um palete; os paletes nao misturam outras cargas.
- **PD:** uma carga inteira em exatamente um palete exclusivo.
- **PC:** cargas/NF/DC diferentes podem compartilhar um palete; o conferente marca parcial ou completo.

A classificacao e a alocacao nascem no recebimento fisico, depois da conferencia. O palete parcialmente completo continua disponivel apenas para carga compativel da mesma viagem/destino. O palete nao e realocado enquanto estiver ativo; volta a `livre` por acao operacional auditada depois da descarga/reconciliacao no destino ou retorno ao porto.

Heuristicas por quantidade/peso para adivinhar MP/PD/PC sao proibidas.

## Consequencias

- Notas nao oferece etiquetagem; a impressao permanece na aba Etiqueta/fluxo de recebimento.
- Agenda de recebimento e versionada em `tms_agendamento_recebimento` e editavel em Cadastros.
- A tela de Paletes nao inventa tipo ou ocupacao enquanto o recebimento fisico ainda nao registrou esses dados.
