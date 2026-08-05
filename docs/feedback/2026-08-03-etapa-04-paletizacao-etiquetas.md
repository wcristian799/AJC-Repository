# Etapa 04 - Conferencia, embarque, paletizacao e etiquetas

**Data:** 03/ago/2026
**Fonte vigente:** Etapa 04 de `2026-07-09-validacao-core-todas-telas-diagramado.docx`, complementada pelas decisoes da Etapa 03 e pelo ADR 03.

## Resultado entregue

A etapa deixou de ser uma visualizacao demonstrativa. Conferencia, embarque, composicao de paletes e etiquetas agora possuem persistencia PostgreSQL, regras de dominio, RBAC, idempotencia, trilha de auditoria e fluxo de campo offline-first.

> Atualizacao de 04/ago/2026: a maquina de estados foi simplificada para `cadastrado -> conferido -> embarcado -> entregue`; no cross-docking, `cadastrado -> embarcado`. `Recebido`, `reconferido` e `desembarcado` nao sao estados operacionais.

### Recebimento fisico

- Abertura e retomada de conferencia real por viagem, local e operador autenticado.
- Classificacao explicita AVULSA, MP, PD ou PC; nenhuma inferencia por peso ou quantidade.
- Busca de NF/DC real vinculada a viagem e exibicao de cliente, destino e saldo ainda nao processado naquela operacao.
- Registro de quantidade encontrada, falta/excesso, justificativa e volumes adicionais identificados.
- Evidencia fotografica no MinIO; quando sem sinal, o arquivo fica localmente no aparelho ate sincronizar.
- Fechamento parcial/completo sujeito as regras publicadas em Cadastros.

### Paletes

- Lista paginada e filtrada no servidor, com ocupacao calculada pelos volumes reais.
- Criacao e edicao com proprietario real AJC/cliente/fornecedor e local operacional cadastrado.
- Bloqueio de edicao destrutiva durante alocacao/composicao.
- Historico de conferencias e liberacao controlada no destino/retorno, com motivo e auditoria.

### Etiquetas

- Alvos reais separados em palete e volume avulso.
- QR Code contem identificador operacional real.
- Impressao e reimpressao persistidas; reimpressao referencia a etiqueta original e exige motivo conforme configuracao.
- O sistema nao afirma que imprimiu: o operador confirma saida legivel ou registra falha.
- Perfil, modelo, protocolo, tamanho e copias sao configurados em Cadastros; nao ha impressora ficticia chumbada.

### Cadastros e configuracao

- Nova area em `Cadastros > Configuracoes operacionais` para regras MP/PD/PC, evidencia, reimpressao, fila offline e hardware de etiqueta.
- Cadastro real de locais operacionais (`porto`, `patio`, `embarcacao`, `outro`) ligado a cidades e embarcacoes existentes.
- Configuracoes sao versionadas e publicadas pela API; valores de negocio nao vivem no componente React.

## Contratos principais

- `GET/POST/PATCH /api/tms/locais-operacionais`
- `GET /api/tms/paletes/proprietarios`
- `GET/POST/PATCH /api/tms/paletes`
- `POST /api/tms/paletes/:id/liberar`
- `GET/POST /api/tms/conferencias`
- `POST /api/tms/conferencias/:id/itens`
- `POST /api/tms/conferencias/:id/volumes/bipar`
- `POST /api/tms/conferencias/evidencias`
- `POST /api/tms/conferencias/:id/fechar`
- `GET /api/tms/etiquetas-alvos`
- `GET/POST /api/tms/etiquetas`
- `POST /api/tms/etiquetas/:id/confirmacao`

## Deploy

1. Publicar backend e front do mesmo commit.
2. Executar `node infra/migrations/run.mjs` no ambiente da API; alem das migrations 0028, 0029 e 0030, a migration 0035 normaliza o fluxo simplificado.
3. Manter as credenciais MinIO validas e garantir o bucket privado `recebimento-fotos`.
4. Em Cadastros, revisar/publicar as regras operacionais e cadastrar o perfil da impressora somente com dados do equipamento real.

Nao e necessaria seed de demonstracao. A migration apenas materializa locais de porto a partir das cidades reais ativas ja cadastradas.

## Inspecao visual e de interacao

Inspecao concluida em desktop e viewport de celular (390 x 844) nas telas Paletes, Etiquetas, Configuracoes operacionais, Conferencia e Recebimento direto. Nao foi identificado overflow horizontal de pagina. A hierarquia, estados vazios, mensagens de hardware nao configurado, filtros e alvos de toque permaneceram coerentes com o Crimson Prestige.

Durante a inspecao foram corrigidos tres defeitos que nao deveriam chegar a producao:

- a conferencia de campo nao preseleciona mais PC; AVULSA/MP/PD/PC exige escolha explicita do conferente;
- a migration 0030 corrige apenas o nome automatico `Porto de Porto de Moz` para `Porto de Moz`, preservando locais editados manualmente;
- o `FieldShell` passou a manter o primeiro render SSR deterministico, eliminando o hydration mismatch entre `Usuario autenticado` e o nome da sessao.

O seed canonico tambem foi ajustado para vincular o palete terceiro a um cliente real e respeitar `ck_palete_proprietario_referencia`, sem relaxar a regra de dominio.
