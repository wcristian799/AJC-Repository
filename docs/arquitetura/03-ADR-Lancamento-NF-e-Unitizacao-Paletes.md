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

## Implementacao operacional da Etapa 04 (03/ago/2026)

As migrations `0028_tms_volume_cadastrado_status.sql` e `0029_tms_paletizacao_etiquetas.sql` tornam a decisao acima executavel no banco:

- volume lancado por NF/DC nasce `cadastrado`; `recebido` so e gravado pela conferencia fisica;
- `conferencia_recebimento`, seus itens e volumes registram viagem, local, operador, quantidades declarada/informada/conferida, divergencia, justificativa, evidencia e fechamento;
- cada alocacao de palete possui ciclo `ativa`/`encerrada`/`cancelada`; apenas uma alocacao ativa e aceita por palete;
- proprietario do palete e uma referencia real e exclusiva para AJC, cliente ou fornecedor;
- local operacional e cadastro real (`porto`, `patio`, `embarcacao` ou `outro`) e pode ser mantido em Cadastros;
- `etiqueta_impressao` aceita alvo exclusivo palete ou volume, distingue impressao/reimpressao, guarda original, motivo, perfil fisico, solicitante, conclusao e erro;
- configuracao versionada `tms_paletizacao_etiquetas` controla tipos permitidos, evidencia, reimpressao, fila offline e perfil de impressora. Modelo, protocolo e dimensoes continuam nulos ate cadastro real.

### Maquina de estados

1. O conferente abre uma conferencia para viagem, local e tipo explicito. MP/PD/PC exigem palete livre; AVULSA proibe palete.
2. NF/DC reais da viagem sao adicionadas com quantidade fisicamente encontrada. Excedente exige justificativa e gera volumes fisicos adicionais identificados; falta gera divergencia.
3. Em AVULSA, cada volume precisa de etiqueta fisicamente confirmada e leitura do UUID. Em MP/PD/PC, o palete precisa de etiqueta confirmada.
4. A conferencia so fecha depois das regras configuradas de evidencia e etiquetagem. PD completo exige toda a carga; PC registra composicao parcial ou completa explicitamente.
5. O palete so pode ser liberado em local do tipo porto, com motivo, depois que todos os volumes estiverem desembarcados ou entregues. A acao encerra a alocacao e preserva o historico.

### Operacao offline

O app de campo mantem fila duravel em `localStorage` para adicao de item, leitura e fechamento, e IndexedDB para fotos. Uma conferencia precisa ser aberta ou retomada online uma vez; depois disso, o trabalho continua sem sinal e sincroniza em ordem quando a rede volta. Mutacoes usam `client_uuid`, e o servidor permanece a autoridade sobre conflitos. PowerSync continua sendo a evolucao prevista para sincronizacao completa de cadastros e abertura inteiramente offline.

### Impressora

Nao existe simulacao de Bluetooth. Enquanto perfil/modelo/protocolo nao forem cadastrados, o sistema gera a etiqueta real e oferece impressao pelo navegador, exigindo confirmacao explicita de saida legivel ou registro de falha. O adapter Bluetooth so deve ser ativado depois do modelo fisico ser homologado e configurado.
