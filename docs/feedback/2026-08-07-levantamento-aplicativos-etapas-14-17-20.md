# Levantamento dos aplicativos — Etapas 14, 15, 16, 17 e 20

Data do levantamento: 07/ago/2026

Fonte vigente: `2026-07-09-validacao-core-todas-telas-diagramado.docx`, requisitos
`REQ-14-01` a `REQ-17-01` e `REQ-20-01` a `REQ-20-03`, incluindo as decisões posteriores
registradas no projeto sobre estados dos volumes, NF/DC independente, gerente da embarcação,
PDV sem venda avulsa, RBAC e configuração versionada.

## Parecer executivo

As etapas de aplicativos **não estão integralmente concluídas**. Existe uma boa base web real em
`/campo`, com login próprio, hub por permissão, conferência/paletização, embarque/cross-docking,
prestação de contas, entrega de volumes, PDV e validação de bilhetes. Entretanto, o mapa atual de
cartões não corresponde ao mapa final do cliente e ainda há fluxos demonstrativos ou incompletos.

A arquitetura recomendada é um único aplicativo instalável **AJC Campo**, com sete espaços de
trabalho liberados por perfil. Não devem ser mantidos sete APKs independentes: isso duplicaria
autenticação, sincronização, câmera, armazenamento seguro, publicação e suporte. O mesmo núcleo
React deve alimentar o aplicativo nativo e a superfície web `/campo`.

A Etapa 20 é o mapa integrador das demais etapas, não uma oitava aplicação. Ela define quais
funções cada perfil enxerga e exige que o mesmo envio avance entre aplicativos sem recadastro,
mantendo identificador, documentos, eventos, evidências e usuário responsável.

## Inventário atual

O hub atual publica sete cartões por uma lista hard-coded em `src/lib/field-apps.ts`:

1. Porteiro;
2. Conferente do Porto;
3. Conferente da Embarcação;
4. Entregas;
5. Gerente da Embarcação;
6. Bilheteiro;
7. PDV do porto.

O mapa final solicitado pelo cliente também possui sete aplicações, mas com outra composição:

1. Porteiro;
2. Encomendas;
3. Conferente Porto;
4. Conferente Navegação;
5. Gerente Embarcação;
6. CRM Comercial;
7. Bilheteria Digital.

Portanto, **Encomendas e CRM Comercial estão ausentes**, **PDV e Bilheteiro estão separados** e
**Entregas aparece como aplicativo isolado**, embora o documento a trate como capacidade
compartilhada pelos perfis de navegação e gerente.

## Situação por etapa

### Etapa 14 — Aplicativo do porteiro: parcial e ainda demonstrativo

Já existe:

- rota `/campo/portaria` protegida por login e permissão;
- listagem real de `registro_portaria`;
- criação real de entrada com placa, empresa, usuário e `client_uuid`;
- contador derivado dos registros carregados;
- as opções Pessoa e Veículo para transporte não aparecem no formulário.

Falta para concluir:

- remover operador, porto, turno, estado offline e pendências fixos no código;
- trocar `SimuladorPortaria` por fluxo operacional definitivo;
- registrar saída real — o botão atual não executa nenhuma mutação;
- separar a consulta de veículos presentes (`saida_em IS NULL`) do histórico completo; a API atual
  devolve os últimos registros sem esse recorte e a tela os trata como pátio atual;
- impedir duas entradas abertas para a mesma placa sem resolução explícita;
- buscar/selecionar empresa real, sem autocomplete apenas visual ou texto inconsistente;
- capturar e enviar foto real; hoje é gravada uma URL fictícia `field://...`;
- vincular o registro ao porto/local operacional e ao turno/escala reais;
- atualizar pátio com polling/sincronização configurável;
- criar relatório paginado e exportável com entrada, saída, placa, empresa, local e operador;
- registrar auditoria de entrada e saída;
- manter os tipos históricos antigos apenas para leitura, bloqueando novas mutações não aceitas.

### Etapa 15 — Conferentes Porto e Navegação: núcleo físico avançado, aplicativo incompleto

Já existe:

- `/campo/conferencia` para o primeiro bipe no porto;
- `/campo/recebimento` para embarque e cross-docking;
- seleção de viagem, destino, local e palete reais;
- NF/DC e cargas reais, quantidades declaradas e conferidas;
- AVULSA, MP, PD e PC escolhidos explicitamente;
- composição completa/parcial de palete;
- etiqueta auditada por palete ou volume;
- bipe individual de volume avulso;
- estados `cadastrado -> conferido -> embarcado -> entregue`, com cross-docking direto;
- divergência explícita;
- fotos MinIO com SHA-256;
- fila offline idempotente para conferências já abertas;
- configuração publicada de paletização, etiqueta, hardware e fila.

Falta para concluir:

- câmera/QR nativa real; a tela web recebe texto/leitor, mas ainda não incorpora o scanner do celular;
- impressão Bluetooth real, dependente do modelo homologado da impressora;
- SQLite/PowerSync no aplicativo nativo; hoje a fila web usa armazenamento do navegador;
- recebimento, vistoria, embarque e baixa de veículos/máquinas dentro dos perfis previstos;
- expor ao Conferente Navegação as funções de encomendas e entregas previstas na Etapa 20;
- usar contexto de viagem/embarcação/porto derivado da escala do operador, sem contexto livre;
- validar em aparelho Android real câmera, retomada após encerramento do processo e sincronização.

“Montagem de carga” deve significar a montagem física da carga/palete a partir de documentos e
cargas já existentes. O aplicativo de conferência não criará carga comercial nem voltará a fazer
NF/DC nascer como carga.

### Etapa 16 — Entregas: parcial

Já existe:

- `/campo/entregas` com leitura de UUID de volume;
- validação de que o volume está embarcado;
- identificação do recebedor;
- duas fotos e assinatura armazenadas no MinIO com hash;
- protocolo e atualização real para `entregue`;
- trilha do volume e idempotência no comprovante.

Falta para concluir:

- seleção explícita de Carga, Encomenda ou Veículo/Máquina;
- resolver no backend leitura de palete, volume avulso, encomenda e veículo/máquina;
- ao bipar palete, apresentar e baixar somente os itens elegíveis do destino correto;
- não depender de carregar uma lista truncada de volumes no navegador para localizar o item;
- checklist configurável de entrega de veículo/máquina;
- fotos por ângulo, avarias, quilometragem/horímetro quando aplicável e aceite final;
- assinatura desenhada no aparelho; hoje o campo aceita um arquivo de imagem;
- fila offline idempotente para entrega e suas evidências;
- scanner/câmera real;
- disponibilizar o módulo compartilhado aos perfis Conferente Navegação e Gerente Embarcação,
  sem manter “Entregas” obrigatoriamente como um oitavo app isolado.

### Etapa 17 — Bilheteiro: regra validada, acabamento nativo pendente

Já existe:

- venda de passagem real no `/pos`, com cliente de passagem obrigatório;
- viagem/embarcação, capacidade, tarifa, classe, pagamentos, caixa e QR reais;
- `/embarque` com manifesto real, validação idempotente e bloqueio de segunda leitura;
- busca manual de contingência;
- fila offline de validações com horário capturado no dispositivo;
- permissões separadas para vender e validar.

Falta para a versão final do aplicativo:

- reunir Venda e Validar dentro do espaço **Bilheteria Digital**;
- leitor ML Kit/câmera real — a animação atual do scanner não abre câmera;
- baixar o manifesto da viagem selecionada, em vez de carregar listas gerais limitadas;
- persistir manifesto e fila em SQLite no app nativo;
- tratar venda sem internet honestamente: validação pode operar offline, mas uma nova venda não
  deve ser confirmada sem uma reserva segura de capacidade para evitar overbooking;
- validar som, vibração e feedback de leitura em dispositivo Android;
- preservar todos os comportamentos já aprovados, sem redesenhar ou remover funções.

### Etapa 20 — Aplicativos necessários: incompleta

O login, hub e permissões de acesso existem, inclusive chaves reservadas para Encomendas e CRM
Comercial. Porém, o catálogo de aplicativos está no front, as duas superfícies não existem e os
perfis atuais não possuem todos os fluxos solicitados.

## Mapa funcional final

### 1. Porteiro

Fluxo: selecionar contexto permitido -> consultar pátio -> registrar entrada -> capturar foto ->
confirmar -> registrar saída pela placa/QR -> consultar/exportar relatório.

### 2. Encomendas

Fluxos: cotar com tabela publicada -> localizar/cadastrar cliente -> registrar envio com foto,
NF/DC e pagamento -> assinar DC quando aplicável -> acompanhar -> entregar com prova.

O módulo deve reutilizar o domínio e as APIs reais de Encomendas; não haverá uma cópia de regras
de preço no aplicativo.

### 3. Conferente Porto

Fluxos: selecionar viagem/contexto -> receber NF/DC e mercadoria -> conferir avulso ou alocar em
palete -> etiquetar -> bipar `conferido` -> registrar divergência -> receber/vistoriar veículo ou
máquina.

### 4. Conferente Navegação

Fluxos: selecionar viagem/embarcação -> receber/embarcar palete ou avulso -> cross-docking ->
bipar `embarcado` -> operar encomendas -> receber/embarcar veículos e máquinas -> executar
entregas autorizadas.

### 5. Gerente Embarcação

Fluxos: iniciar viagem -> acompanhar pendências -> receber encomendas/veículos quando autorizado
-> executar entregas -> encerrar viagem -> salvar/enviar prestação de contas.

Início, encerramento e prestação já existem; os demais módulos ainda precisam ser integrados ao
espaço do gerente.

### 6. CRM Comercial

Fluxos: localizar/cadastrar cliente -> cotar carga, encomenda ou veículo -> registrar pedido de
envio -> acompanhar conversão e histórico.

O pedido comercial não deve criar uma carga física antecipadamente. Será necessário um domínio
`pedido_envio` separado, que depois referencia NF/DC, carga, encomenda ou envio de veículo quando
a operação efetivamente for formada.

### 7. Bilheteria Digital

Fluxos: escolher Venda ou Validar -> vender passagem com cliente obrigatório e caixa aberto ->
emitir comprovante/QR -> selecionar viagem -> baixar manifesto -> validar QR online/offline ->
sincronizar e exibir conflitos.

## Fundação compartilhada obrigatória

Antes das frentes específicas, deve ser fechada uma fundação única:

- endpoint `/api/campo/aplicativos` derivado de permissões e recursos ativos;
- catálogo estrutural no backend, sem rotas de segurança editáveis como texto livre;
- Cadastros controla usuários, funções, permissões, aplicativos ativos e políticas operacionais;
- contexto real de porto, embarcação, viagem e turno obtido das escalas/atribuições do usuário;
- sessão nativa em armazenamento seguro, identificação do dispositivo e revogação;
- biblioteca compartilhada de câmera, QR/código de barras, foto, assinatura e evidência;
- fila idempotente e banco local SQLite/PowerSync;
- conflitos resolvidos pelo backend conforme a máquina de estados;
- auditoria com usuário, dispositivo, aplicativo, data/hora, GPS quando autorizado e
  `client_uuid`;
- estados de loading, vazio, erro, offline, conflito e sincronização em todos os fluxos;
- listas paginadas e busca no servidor, sem depender de `LIMIT 200/300` carregado no celular.

## O que será configurável em Cadastros

- usuários, funções e permissões por aplicativo e ação;
- ativação dos espaços de trabalho e políticas por perfil;
- portos/locais operacionais, turnos e atribuições;
- regras da portaria: foto, campos, duplicidade, atualização e relatório;
- unitização, etiquetas, filas e hardware de conferência;
- templates de vistoria, recebimento e entrega de veículo/máquina;
- provas obrigatórias por tipo de entrega;
- câmera, retenção offline, limite de fila e janela de cache;
- dispositivos autorizados e modelos homologados de impressora;
- regras já existentes de Encomendas, PDV, preços, prestação e origens de Veículos.

Rotas, nomes internos de permissões e máquinas de estado são estrutura de segurança e não serão
editáveis livremente. Cadastros administra ativação e concessão; uma configuração arbitrária não
poderá transformar uma rota inexistente em permissão válida.

## Aplicativo nativo

Será criado `apps/campo-mobile` com Ionic + Capacitor + React, compartilhando contratos, domínio e
componentes de campo com o web-console. O pacote nativo conterá somente a suíte de campo; não
empacotará o painel `/app/*`.

Integrações nativas previstas:

- ML Kit para QR/código de barras;
- Camera para fotos e retomada segura após retorno do sistema;
- Network para conectividade;
- SQLite/PowerSync para cache e fila;
- Secure Storage/Preferences para sessão e dispositivo;
- impressão Bluetooth após homologação do equipamento;
- compartilhamento/arquivos quando houver comprovante.

O `/campo` permanecerá como versão web de homologação, contingência e desenvolvimento, usando os
mesmos casos de uso. O aplicativo não será apenas um WebView apontando para o ERP remoto, pois isso
não entrega offline, câmera, armazenamento seguro nem comportamento confiável no rio.

## Execução paralela recomendada

### Onda 0 — Fundação comum

Catálogo/backend de apps, contexto operacional, RBAC granular, scanner/câmera compartilhados,
offline SQLite/PowerSync, dispositivo e estrutura Capacitor.

### Onda 1 — Frentes paralelas

- Frente 14: Portaria completa;
- Frente 15: Conferência Porto/Navegação e Veículos;
- Frente 16: Entrega multimodal e checklist;
- Frente 17: Bilheteria Digital e scanner real;
- Frente 20: Encomendas, CRM Comercial e composição do Gerente.

### Onda 2 — Integração

Passagem do mesmo envio entre CRM, operação, conferência, navegação, entrega e financeiro, sem
recadastro; matriz de permissão e auditoria ponta a ponta.

### Onda 3 — Homologação nativa

Build Android, instalação em aparelho real, câmera, fotos, processo encerrado/reaberto, modo avião,
fila, conflitos, atualização, impressão homologada e aceite por perfil.

## Critérios de saída da fase

- os sete espaços finais aparecem conforme perfil e nenhum cartão é hard-coded no cliente;
- cada ação crítica usa API/banco real ou fila offline persistente e idempotente;
- não existe nome de operador, porto, viagem, cliente, preço, status ou exemplo fixo;
- o mesmo envio mantém identificador e histórico em todos os aplicativos;
- câmera/QR funcionam em aparelho real;
- entrega cobre carga, encomenda e veículo/máquina;
- Porteiro possui entrada, saída, pátio em tempo real e relatório;
- Bilheteria vende e valida sem permitir overbooking ou venda avulsa;
- Encomendas e CRM Comercial existem como espaços próprios;
- Gerente e Conferente Navegação recebem somente as funções concedidas;
- testes de RBAC, estado, idempotência, offline, API, build e inspeção visual passam;
- dependências externas não homologadas aparecem como bloqueio explícito, nunca simulação.

## Dependências externas honestas

- modelo e protocolo da impressora Bluetooth;
- aparelhos Android e versões de SO que serão homologados;
- decisão final do spike PowerSync self-hosted;
- credenciais reais do MinIO em cada ambiente;
- provedor de WhatsApp/SMS, caso a notificação seja ativada.

Esses itens não impedem implementar os fluxos web/backend e o núcleo Capacitor, mas impedem declarar
hardware, sincronização nativa completa ou comunicação externa como homologados em produção.
