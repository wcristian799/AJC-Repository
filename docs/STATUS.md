# STATUS — Diário vivo do projeto AJC

## Trabalho 2026-08-04 - Etapa 07: Passagens, PDV e embarque
- Fonte vigente: requisitos `REQ-07-01` a `REQ-07-06` do documento de validação de 09/jul, usando a referência visual da Frota Martins apenas como inspiração de hierarquia para a estação de caixa.
- PDV real: `/pos` foi reconstruído como estação operacional autenticada, com caixa explícito por operador, viagem e intertrecho reais, lotação e tarifas publicadas, cliente pesquisável ou venda avulsa, identificação individual, cesta com vários bilhetes, gratuidade legal, cortesia real, pagamento misto, troco, parcelamento condicionado à taxa publicada, histórico, sangria e comprovante com QR.
- Integridade: `POST /api/vendas/pdv/vendas` recalcula preços e disponibilidade no PostgreSQL, trava concorrência, consome cortesias, cria bilhetes e movimentos de caixa na mesma transação, registra fiscal/auditoria e é idempotente por `client_uuid`. Não há preço, cliente, viagem, cortesia ou código de teste no front.
- Manifesto e embarque: os totais de saída e por cidade passaram a vir do trecho persistido de cada bilhete; o cálculo visual simulado foi removido. `/embarque` não oferece mais leituras fictícias e usa classes/pulseiras da configuração publicada; QR já utilizado continua bloqueado pela API real.
- Cadastros: `vendas_pdv_operacao` versiona caixa/canal, meios de pagamento, troco, parcelas/acréscimos, nomes e pulseiras das classes, gratuidades, regras de BP-e e hardware de impressão. Embarcações aceitam URL de foto editável e a viagem entrega a foto ao PDV.
- Banco: migration `0033_passagens_pdv_operacional.sql` aplicada no WSL dev (`33/33`). Ela cria `venda_pos`, itens e pagamentos, vínculos com bilhete/caixa, origem/destino do bilhete, foto da embarcação, permissão de configuração e configuração inicial versionada.
- QA: build NestJS aprovado; 9 suítes/30 testes Jest aprovados; build Vite/Nitro/SSR aprovado; smoke real criou `PDV-2026-98231235` e `BIL-2026-040114323D` com dinheiro + PIX, dois movimentos de caixa, manifesto por destino e retry idempotente; inspeção visual e funcional aprovada em 1440×1000 e 390×844.
- Dependências honestas: BP-e permanece auditado, mas sem autorização real até senha/uso do PFX, credenciamento SEFAZ-PA e fornecedor/API; impressão física só ativa após cadastrar hardware homologado; fotos aparecem após a AJC cadastrar as URLs reais da frota.
- Publicação: a Etapa 06 foi commitada e enviada como `007230f`. A Etapa 07 permanece local e ainda não foi commitada/pushada.
- Próximo passo: homologação do operador e, após aceite, commit/push da Etapa 07 e aplicação da migration 0033 em produção.

## Trabalho 2026-07-31 - Etapa 01 da validação de telas: Início operacional
- Contexto: a Etapa 01 do documento vivo de 09/jul exige manutenção explícita de alertas e caixas em tempo real separados por Porto, Embarcações e Agentes, com consistência entre os indicadores e as fontes operacionais.
- O que foi feito: `/app/inicio` ganhou uma Central de Alertas completa sobre a API real, com cadastro, edição, resolução, reabertura, busca, histórico, severidade, módulo, RBAC e distinção entre alertas manuais e alertas automáticos derivados das fontes operacionais. Nenhuma ação usa mock ou altera dados apenas no navegador.
- Dashboard resiliente: a carga das oito fontes passou a usar tolerância a falhas parciais, sinalização das fontes indisponíveis, horário da última atualização, atualização manual e polling a cada 30 segundos. Viagens planejadas deixaram de ser apresentadas como viagens em curso; indicadores radiais sem dado real e a ação sem comportamento `Escuta operacional` foram removidos.
- Caixas: a visão usa dados reais e sempre apresenta Porto, Embarcações, Agentes e Apoio, inclusive zerados, com filtro, quantidade, saldo, entradas, saídas, movimento líquido, operador e situação de cada caixa.
- QA: Prettier e ESLint focados nos arquivos alterados sem achados; `bun run build` exit 0; inspeção no navegador autenticado em desktop e mobile, sem overflow horizontal e sem mutação de dados de produção.
- Decisão pendente antes de considerar o fluxo de caixa totalmente encerrado: existe `POST /api/caixa/abrir`, mas não há interface de abertura e o modelo atual guarda apenas `operador_id`, `tipo` e `referencia` livres. É necessário decidir o vínculo formal do caixa com Porto/cidade, Embarcação ou Agente, mantendo operador como responsável separado; depois implementar migration, contrato da API e abertura/edição em Financeiro. Não será criado um cadastro baseado em texto livre porque isso impediria consistência operacional.
- Pendência técnica separada: o relógio ao vivo da tela de login gera hydration mismatch entre SSR e cliente quando o segundo muda durante a hidratação. Corrigir sem alterar o visual aprovado do login.
- Próximo passo: fechar a decisão de propriedade/origem dos caixas e concluir essa fatia vertical; em seguida avançar para a Etapa 02 do documento vivo.
## Trabalho 2026-07-25 - Catalogo Excel de automoveis no Brasil (2000+)
- Contexto: solicitado um Excel amplo de marcas e modelos de carros presentes no Brasil desde o ano/modelo 2000 para apoiar a construcao de uma tabela propria de precos.
- O que foi feito: gerado `outputs/019f9b7f-8ca7-7e13-b542-097301aec487/catalogo-carros-brasil-2000-mais.xlsx` a partir do snapshot publico fipeX/FIPE de julho/2026, filtrando `tipo_veiculo=carro` e ano/modelo a partir de 2000, com inclusao das versoes Zero KM disponiveis.
- Conteudo: 24.040 combinacoes de marca, modelo/versao e ano/modelo; 90 marcas; 6.394 modelos/versoes; combustivel, codigo FIPE, preco FIPE de referencia e colunas editaveis para preco proprio e observacoes. O workbook inclui abas `Leia-me`, `Catalogo` e `Resumo por marca`.
- Limite documentado: a lista representa o catalogo FIPE vigente, nao a frota individual registrada/circulante no Brasil; motos e caminhoes ficaram fora do recorte.
- QA: dados-chave inspecionados, varredura sem erros de formula e renderizacao visual conferida nas tres abas.
- Proximo passo: se este catalogo for incorporado ao modulo Veiculos/Maquinas do AJC, definir regra de importacao/versionamento mensal e separar preco FIPE de preco operacional configurado pela empresa.
## Trabalho 2026-07-25 - Documento vivo da validação de telas de 09/jul
- Contexto: o cliente enviou `VALIDAÇÃO DO CORE DE TODAS AS TELAS 09.07 (1).docx` com novas correções, porém o arquivo original estava sem estrutura editorial adequada para execução e acompanhamento.
- O que foi feito: criado `docs/feedback/2026-07-09-validacao-core-todas-telas-diagramado.docx`, preservando todos os 176 parágrafos não vazios do Word original e mantendo grafia, pontuação, caixa alta, marcações `OKOKOK`, exclusões e dependências.
- Camadas adicionadas: capa e metadados, guia de uso, leitura de status, mapa de 23 áreas/telas, solicitações originais destacadas, requisitos consolidados, critérios de aceite, protocolo para novas alterações e transcrição integral preservada ao final.
- QA documental: validação automática confirmou que todo o texto original está presente; auditoria de acessibilidade ficou sem achados altos após os ajustes finais. O renderizador oficial de DOCX não pôde executar porque LibreOffice/Word não está instalado nesta máquina, portanto a conferência foi estrutural, sem validação visual rasterizada.
- Governança: este DOCX passa a ser o documento vivo e a fonte mais recente para a rodada de alterações de telas de 09/jul; a validação consolidada de 25/jun permanece como histórico.
- Próximo passo: continuar adicionando ao mesmo documento os novos pontos que o cliente enviar, sempre preservando a fala original e acrescentando tela, requisito, critério de aceite, dependência e evidência de fechamento.

## Trabalho 2026-07-23 - Modelo de implantação operacional por setores
- Contexto: foi solicitado um documento de passo a passo para implantar o sistema na operação real da AJC, cobrindo setores/módulos, usuários, login mobile, equipamentos, impressoras térmicas Bluetooth e todas as configurações necessárias.
- O que foi feito: criado `docs/implementacao/01-MODELO-IMPLANTACAO-OPERACIONAL-AJC.md`, organizado em ondas desde governança e levantamento até infraestrutura, cadastros/configurações, equipamentos, implantação por setor, migração, homologação, treinamento, go-live e operação assistida.
- Conteúdo operacional: o playbook inclui modelos preenchíveis para responsáveis, unidades, usuários, matriz de acesso, inventário de equipamentos, impressoras, migração, treinamento, contingência, aceite por setor e incidentes. Os setores detalhados incluem Administração/Cadastros, Navegação, CRM/Comercial, Vendas/PDV/Portal/Totem, TMS administrativo, Portaria, Conferência porto/balsa, Encomendas, Veículos/Máquinas, Entregas, Bilheteiro, Prestação de Contas, Financeiro mínimo e Diretoria.
- Governança de escopo: gateway, BP-e/SEFAZ, WhatsApp/SMS, Bluetooth real, offline-sync completo, GPS background e buckets MinIO foram marcados conforme seu estado real, sem apresentar adapters/stubs como integrações concluídas. Financeiro completo, Compras e DRE permanecem pós-MVP.
- Documentação estrutural: o novo playbook foi adicionado ao mapa de documentação do `AGENTS.md`.
- Próximo passo recomendado: realizar uma reunião de implantação com os donos de cada setor e preencher primeiro as seções 3, 4, 6.1, 7.1 e 14; depois escolher a unidade e a viagem-piloto para transformar o modelo em cronograma executivo com datas e responsáveis.
- Entrega em PDF: gerado `docs/implementacao/Modelo-Implantacao-Operacional-AJC.pdf` em A4 paisagem, com capa, sumário navegável, 67 páginas, tabelas formatadas, cabeçalhos e paginação; conteúdo textual e amostras visuais conferidos.

## Trabalho 2026-07-07 - Agenda movida da Nova Carga para NF/DC
- Contexto: a agenda de recebimento foi inicialmente implementada em Nova Carga, mas a regra operacional correta e reservar a janela na NF/DC/documento, antes da formacao da carga.
- O que foi corrigido: `/app/tms` removeu o seletor de agendamento da Nova Carga; `NotasTab` agora coloca o seletor de dia + horario no `Lancamento manual de NF/DC`, consulta disponibilidade real e envia `agendadoPara` no `POST /api/tms/documentos/manual`.
- Backend/banco: migration `0023_documento_agendamento_recebimento.sql` adiciona `documento_fiscal.agendado_para`; `GET /api/tms/agendamentos/disponibilidade` agora conta documentos agendados por janela; `POST /api/tms/documentos/manual` exige `agendadoPara` e trava a janela com advisory lock para maximo 5 NF/DC por meia hora. A migration 0022 em `carga.agendado_para` fica documentada como legado da primeira tentativa e nao e mais usada pelo fluxo ativo.
- Verificacao: `npm run build --workspace apps/api` exit 0; `bun run build` em `apps/web-console` exit 0; runner `infra/migrations/run.mjs` aplicou a migration 0023 no banco WSL dev.

## Trabalho 2026-07-07 - Nova Carga com paradas e agenda real
- Contexto: a Nova Carga em `/app/tms` ainda permitia digitar Origem/Destino, trazia Destinatario no formulario e mostrava Agendamento de recebimento como campo/preview solto, sem consultar disponibilidade.
- O que foi feito: Origem e Destino agora sao selects alimentados pelas paradas da viagem selecionada (origem, escalas/paradas e destino); o campo Destinatario foi removido da Nova Carga; e o agendamento virou seletor de dia + horario, com janelas de 30 minutos e ocupacao visivel.
- Backend/banco: criada migration `0022_carga_agendamento_recebimento.sql` com `carga.agendado_para`; novo `GET /api/tms/agendamentos/disponibilidade?data=YYYY-MM-DD` retorna janelas de 06:00 a 18:00 com capacidade 5; `POST /api/tms/cargas` exige `agendadoPara` e valida capacidade em transacao com advisory lock para evitar duas cargas ocuparem a ultima vaga.
- Verificacao: `npm run build --workspace apps/api` exit 0; `bun run build` em `apps/web-console` exit 0; runner `infra/migrations/run.mjs` aplicou a migration 0022 no banco WSL dev. Observacao: `infra/apply-wsl.sh` ainda para em uma migration antiga 0012 ja registrada no runner (`uq_bilhete_codigo` existente); para migrations atuais, usar o runner.

## Trabalho 2026-07-07 - Governanca de buckets e MinIO no VPS
- Contexto: os fluxos de upload do MVP estavam aparecendo antes da definicao formal de object storage, o que abria espaco para cada tela inventar provider/bucket diferente.
- O que foi feito: criado docs/infra/BUCKETS-PENDENTES.md como inventario canonico de buckets; AGENTS.md agora obriga registrar qualquer novo upload/blob nesse arquivo; NotasTab passou a apontar para esse inventario no proprio texto operacional.
- Hospedagem decidida para o MVP: MinIO self-hosted no mesmo VPS/Coolify da stack AJC, por ser leve e S3-compatible. docker-compose.coolify.yml agora sobe minio, e pps/api/.env.coolify.example + docs/deploy/Coolify-Backend-API.md documentam as variaveis/servico.
- Buckets pendentes mapeados nesta rodada: documentos fiscais, assinaturas de DC, fotos de portaria/recebimento, comprovantes de entrega, anexos de prestacao, fotos de veiculos e documentos de gratuidade.
- Verificacao: un remove @supabase/supabase-js revertido com sucesso; builds do front/api serao mantidos como validacao desta rodada.
## Trabalho 2026-07-07 - Destinatario e upload na NF/DC manual
- Contexto: o formulario de `Lancamento manual de NF/DC` em `/app/tms` ainda tinha apenas nome do destinatario e nao permitia anexar a nota fiscal, embora a validacao do cliente exija nome/CPF-CNPJ/telefone e documento fiscal junto.
- O que foi feito: `NotasTab` agora coleta nome, CPF/CNPJ e telefone do destinatario, aceita upload de PDF/XML/JPG/PNG ate 10 MB, calcula SHA-256 no navegador e envia `arquivoUrl`/`arquivoHash` para `POST /api/tms/documentos/manual`; NF-e/NFC-e exige anexo para salvar.
- Backend/banco: `CreateDocumentoManualInput` passou a aceitar destinatario completo e anexo; `TmsRepository` grava e lista esses campos; migration `0020_documento_manual_destinatario.sql` adiciona `destinatario_documento` e `destinatario_telefone` em `documento_fiscal`. Como ainda nao ha provedor de arquivos definido, o anexo fica auditavel por hash e URI interna `manual-upload://...`, sem fingir storage real.
- Infra: `infra/apply-wsl.sh` agora define `PGUSER=ajc`/`PGPASSWORD=ajc_dev` por padrao para funcionar quando executado como root no WSL, conforme o runbook.
- Verificacao: `npm run build --workspace apps/api` exit 0; `bun run build` em `apps/web-console` exit 0; runner de migrations no WSL aplicou 0018, 0019 e 0020 no banco dev.
## Trabalho 2026-07-07 - Copy de Entrega na Nova Carga
- Contexto: o select operacional da Nova Carga em `/app/tms` ainda mostrava o rotulo `Recebimento` com opcoes `Porto/balsa` e `Agente`, mas a orientacao vigente do cliente para essa tela e apresentar a operacao como `Entrega`, com distincao explicita entre fluxo porto a porto e porto a agente.
- O que foi feito: em `apps/web-console/src/routes/app.tms.tsx`, o label do select foi trocado para `Entrega`; a opcao `Porto/balsa` passou a exibir `Porto x Porto`; e a opcao `Agente` passou a exibir `Porto x Agente`, preservando os valores internos `porto_balsa` e `direto` para nao quebrar a integracao existente com a API.
- Verificacao: `bun run build` em `apps/web-console` deve ficar verde apos esta rodada.


## Trabalho 2026-07-07 - Codigo automatico de palete
- Contexto: o cadastro de palete em `/app/tms` ainda deixava o operador digitar o codigo, mas a regra operacional correta e gerar automaticamente conforme o proprietario.
- O que foi feito: `PaletesTab` agora mostra o codigo automatico em campo somente leitura, alternando o preview entre `AJC-###` para palete proprio e `TER-###` para palete de terceiro; o valor nao e mais editavel nem enviado pelo front.
- Backend: `POST /api/tms/paletes` deixou de exigir `codigo` no body; `TmsRepository.createPalete` gera o proximo codigo por prefixo dentro de transacao com advisory lock, evitando colisao entre cadastros concorrentes.
- Verificacao: `npm run build --workspace apps/api` exit 0; `bun run build` em `apps/web-console` exit 0.
## Trabalho 2026-07-04 - Validacao de cidades no documento manual TMS
- Contexto: o lancamento manual de NF/DC ainda aceitava siglas livres de origem/destino, causando erro 500 por violacao de FK em documento_fiscal quando o operador digitava cidades inexistentes como DAS/ASD.
- O que foi feito: o backend agora valida cidade origem/destino antes do insert e devolve 400 legivel (`Cidade de origem invalida` / `Cidade de destino invalida`); no front, `NotasTab` passou a carregar `cadastros/cidades` via `/app/tms` e trocar os inputs livres por selects com cidades reais.
- Verificacao: npm run build --workspace apps/api exit 0; bun run build em apps/web-console exit 0.
## Trabalho 2026-07-04 - Hotfix listagem TMS documentos antes da migration 0019
- Contexto: a API em producao quebrou GET /api/tms/documentos com column df.cidade_origem_sigla does not exist quando a migration 0019 ainda nao tinha sido aplicada, e tambem referenciava incorretamente c.total_volumes, coluna que nao existe em carga.
- O que foi feito: TmsRepository.listDocumentos/findDocumento agora calcula volumes por volume, nao por carga.total_volumes, e detecta se os campos avulsos da 0019 existem antes de usa-los. A listagem volta a funcionar em banco sem 0019; o POST /api/tms/documentos/manual devolve erro claro enquanto a 0019 estiver pendente.
- Verificacao: npm run build --workspace apps/api exit 0.
## Trabalho 2026-07-04 - Lancamento manual NF/DC sem vinculo de viagem/carga
- Contexto: o fluxo de Lancar manual em NotasTab estava incorreto porque criava carga + documento + volumes e exigia iagem, quando a operacao correta e permitir NF/DC avulsa sem vinculo com viagem ou carga, mantendo numero, valor, peso e volumes preenchiveis.
- O que foi feito: criada a migration  019_documento_manual_avulso.sql para guardar origem/destino, peso, volumes e destinatario direto em documento_fiscal; o backend ganhou POST /api/tms/documentos/manual, que persiste documento manual sem carga_id/iagem_id; e o front NotasTab passou a usar esse endpoint, removendo a obrigatoriedade de viagem e trocando o badge para documento avulso sem carga/viagem.
- Verificacao: 
pm run build --workspace apps/api e un run build em pps/web-console devem ficar verdes apos esta rodada.
## Trabalho 2026-07-04 - Nova Carga derivada da NF/DC selecionada
- Contexto: o formulario de Nova Carga ainda exibia e aceitava edicao manual de Documento, Numero NF/DC, Peso total, Volumes e Valor NF/DC, embora a regra operacional correta seja derivar essas informacoes das NF/DC escolhidas no modal.
- O que foi feito: removidos esses campos da UI em pps/web-console/src/routes/app.tms.tsx; o payload agora deriva 
umeroDocumento da primeira NF/DC selecionada, consolida alorDeclarado e pesoTotal a partir das NF/DC escolhidas e calcula 	otalVolumes pela quantidade selecionada. A exibicao de Primeira NF/DC do pedido e o 
umero do pedido / venda ficaram explicitamente dinamicos pela primeira nota selecionada.
- Verificacao: un run build em pps/web-console exit 0.
## Trabalho 2026-07-04 - Remocao do badge Campos Lucas na Nova Carga
- Contexto: o formulario de Nova Carga ainda exibia o badge campos Lucas (30/jun) no cabecalho, mas essa marcacao ja nao deve aparecer na tela.
- O que foi feito: removido o badge do cabecalho de Nova carga em pps/web-console/src/routes/app.tms.tsx, sem alterar o restante do formulario.
- Verificacao: un run build em pps/web-console exit 0.
## Trabalho 2026-07-04 - Correcao de Recebimento na Nova Carga
- Contexto: o formulario de Nova Carga tinha sido ajustado com o rotulo Agente, mas a regra correta da tela aprovada e manter o campo como Recebimento e trocar apenas a opcao Direto para Agente.
- O que foi feito: pps/web-console/src/routes/app.tms.tsx voltou o label do select para Recebimento, preservando Porto/balsa, e renomeou a opcao direto exibida no dropdown para Agente.
- Verificacao: un run build em pps/web-console exit 0.
## Trabalho 2026-07-04 - Cor do dropdown de cliente na Nova Carga
- Contexto: o dropdown de busca de cliente em /app/tms estava abrindo sem contraste suficiente com o restante do modal, destoando do Crimson Prestige e dificultando a leitura visual da lista.
- O que foi feito: ClienteSearchField em pps/web-console/src/routes/app.tms.tsx agora usa --surface-elev como fundo da lista, borda em --hairline-brand e hover com mistura suave de --brand, mantendo a cor dentro do design system oficial sem criar token novo.
- Verificacao: un run build em pps/web-console exit 0.
## Trabalho 2026-07-04 - Nova Carga com modal de NF/DC
- Contexto: o fluxo aprovado foi refinado para priorizar cliente no topo, abrir o dropdown apenas durante a busca e mover a selecao de NF/DC para modal, em vez de lista inline no formulario.
- O que foi feito: /app/tms agora mostra cliente primeiro, abre resultados apenas quando ha digitacao, usa um acionador de NF/DC que abre modal por cliente selecionado, resume as notas escolhidas no formulario e preserva o numero do pedido pela primeira NF/DC selecionada. O campo Recebimento foi mantido e a opcao operacional do dropdown foi ajustada para Agente.
- Verificacao: un run build em pps/web-console exit 0.

## Trabalho 2026-07-04 - Nova Carga por cliente e NF/DC
- Contexto: o dono confirmou a regra operacional do TMS: primeiro selecionar o cliente por busca interna, depois selecionar uma ou mais NF/DC conectadas a esse cliente; o numero do pedido/venda deve ser gerado como CODIGO_CLIENTE + tipo/numero da primeira nota selecionada, exemplo 10-nfe-122.
- O que foi feito: /app/tms ja possui busca de cliente, lista NF/DC filtrada pelo cliente, selecao multipla de documentos, preenchimento automatico de tipo/numero/peso/valor a partir das notas selecionadas e preview do pedido a partir da primeira NF/DC. O backend POST /api/tms/cargas aceita documentoIds, valida que as notas pertencem ao cliente e ainda estao livres, vincula os documentos a carga e gera fallback de numero_pedido com cliente.codigo + tipo + numero.
- Ajuste desta rodada: corrigido o preview de Nova Carga para nao renderizar caracteres quebrados em UUID/QR e viagem; builds de API e front passaram.
- Proximo passo: redeploy do front/back para publicar o bundle atualizado; se a producao ainda nao recebeu a migration de cliente.codigo, aplicar infra/migrations/0018_cliente_codigo_cadastro.sql antes.
## Trabalho 2026-07-04 - Codigo unico de cliente
- Contexto: cada cliente precisa ter codigo unico de cadastro visivel para operacao e usado no TMS como COD CLIENTE do numero de pedido.
- O que foi feito: migration 0018 adiciona cliente.codigo com sequencia/default CLI-ANO-NNNN, backfill dos clientes existentes e indice unico; API de cadastros retorna codigo; CRM mostra codigo na lista, ficha 360, export e selects; TMS mostra codigo no select de cliente e usa cliente.codigo ao gerar numero_pedido.
- Proximo passo: aplicar migrations no banco de producao/Coolify antes de depender do campo no front publicado.

## Trabalho 2026-07-04 - Hotfix TMS volume sem UUID
- Contexto: /app/tms caia em runtime com TypeError ao tentar executar slice em volume.uuid ausente vindo da API/seed.
- O que foi feito: app.tms normaliza respostas de listagem para arrays e usa safeShortId(volume.uuid, volume.id) no preview de Nova Carga, impedindo crash da rota por dado incompleto.
- Verificacao: bun run build em apps/web-console exit 0.

## Trabalho 2026-07-04 - Navegacao como ciclo saida-retorno
- Contexto: Nova Viagem ainda podia parecer trecho isolado e abrir Belem-Almeirim com data incoerente. Regra corrigida pelo dono: Belem-Almeirim sai na terca e toda viagem deve nascer como saida + retorno/fechamento previsto.
- O que foi feito: /app/navegacao agora trata templates do FAQ como ciclo, mostra chips com ida/volta, exibe bloco Ciclo da viagem, preenche a proxima data correta da rota e calcula retorno/fechamento previsto. Belem-Almeirim preenche terca 17h com fechamento quinta 14h.
- Protecao no backend: POST /api/navegacao/viagens exige dataHoraRetorno e valida retorno posterior a saida; PATCH /api/navegacao/viagens/:id rejeita apagar retorno.
- Decisao complementar: Status/Situacao nao sao editaveis no formulario de viagem; a tela mostra o estado atual apenas como leitura e o PATCH generico rejeita alteracao manual desses campos. Transicoes futuras devem ser acoes/endpoints do ciclo operacional.
- Proximo passo recomendado: se Lucas entregar paradas detalhadas da volta fisica, enriquecer o template para separar ida, volta e chegada final; por enquanto retorno/fechamento fica obrigatorio e auditavel.

## Trabalho 2026-07-04 - Navegacao com edicao real em modal
- **Contexto:** na tela `/app/navegacao`, os dados de frota/viagens ja vinham da API real (`GET /api/cadastros/embarcacoes`, `GET /api/navegacao/viagens`, `GET /api/navegacao/templates-rotas`), mas Nova Viagem abria formulario inline grande e nao havia edicao real de viagem/embarcacao. Regra fechada pelo dono: tudo que cria precisa editar e abrir em modal.
- **O que foi feito no backend:** criado `PATCH /api/navegacao/viagens/:id` com RBAC `navegacao.editar`, atualizando embarcacao, trecho, saida/retorno, status, situacao, capacidade, observacoes e escalas com `audit_evento`; criado `PATCH /api/cadastros/embarcacoes/:id` com RBAC `cadastros.editar`, validando duplicidade, tipo/status/capacidades e auditando a alteracao.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `updateNavegacaoViagem` e `updateEmbarcacao`; `/app/navegacao` agora abre Nova/Editar viagem e Nova/Editar embarcacao em overlay modal, preenche o formulario ao clicar na linha da tabela/lista, salva via API real e atualiza o estado local. O formulario inline da tela principal deixou de ocupar a pagina.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `bun run build` em `apps/web-console` exit 0. Pente fino inicial apontou proximas lacunas: fornecedores/colaboradores ainda precisam PATCH; formularios grandes de Financeiro/TMS/Vendas/Veiculos ainda precisam virar modal/drawer padronizado se seguirmos a regra global.
- **Proximo passo recomendado:** continuar o pente fino por modulo: Cadastros fornecedores/colaboradores (editar real), depois formularios inline grandes de TMS Nova Carga, Vendas Nova Passagem, Financeiro Lancamento minimo e Veiculos Novo envio.

## Trabalho 2026-07-04 - Front Vercel apontando para API Coolify
- **Contexto:** o bundle publicado na Vercel estava chamando `http://localhost:3000/api/auth/login`, porque `apps/web-console/src/lib/ajc-api.ts` tinha fallback local quando `VITE_AJC_API_URL` nao era definida no build.
- **O que foi feito:** o fallback de `AJC_API_URL` passou para `https://apiajc.byteintelligence.com.br/api` e foi criado `apps/web-console/.env.production.example` com `VITE_AJC_API_URL=https://apiajc.byteintelligence.com.br/api`.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0; `rg` nao encontra `localhost:3000` em codigo fonte do front, apenas em documentacao antiga/dev.
- **Proximo passo recomendado:** configurar `VITE_AJC_API_URL` nas Environment Variables da Vercel e fazer redeploy do front, pois bundles antigos continuam com localhost ate novo build.## Trabalho 2026-07-04 - Compose Coolify com PostGIS e worker pg-boss
- **Contexto:** o `Dockerfile` da API nao subia banco nem worker; para Coolify, a stack completa precisa de Postgres/PostGIS, API e processo separado de fila.
- **O que foi feito:** criado `docker-compose.coolify.yml` com `postgres` (`postgis/postgis:16-3.4` + volume persistente), `api` (`Dockerfile`, porta interna 3000) e `worker` (`node apps/api/dist/apps/api/src/worker.js`) na mesma rede interna. `apps/api/.env.coolify.example` e `docs/deploy/Coolify-Backend-API.md` foram atualizados para orientar o deploy via Docker Compose.
- **Escopo tecnico real:** NestJS/PostgreSQL/PostGIS/Nx estao no repo; pg-boss existe como worker separado e agora entra no deploy. Firebase GPS e apps Ionic/Capacitor continuam fase futura/spike, nao foram implementados no MVP web atual. Integracoes externas seguem stub ate fornecedores/credenciais.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `apps/api/dist/apps/api/src/worker.js` existe no build; `docker compose -f docker-compose.coolify.yml config` validou com `POSTGRES_PASSWORD` e `AUTH_TOKEN_SECRET` dummy. Logs do Coolify indicaram queda por falta de `AUTH_TOKEN_SECRET`, entao compose/env/docs foram corrigidos para o nome real exigido por `TokenService`.
- **Proximo passo recomendado:** no Coolify, criar Application do tipo Docker Compose usando `docker-compose.coolify.yml`, apontar o dominio `apiajc.byteintelligence.com.br` para o servico `api:3000`, configurar secrets e rodar migrations/seed apos o primeiro deploy.
## Trabalho 2026-07-03 - Docker do backend para Coolify
- **Contexto:** o backend sera publicado no Coolify em `https://apiajc.byteintelligence.com.br`, enquanto o front aprovado esta em `https://ajcmvp.vercel.app`.
- **O que foi feito:** criado `Dockerfile` multi-stage na raiz, `.dockerignore`, `apps/api/.env.coolify.example` e `docs/deploy/Coolify-Backend-API.md`. A imagem roda `node apps/api/dist/apps/api/src/main.js`, expoe `3000`, inclui migrations/seeds para exec manual no container e possui healthcheck em `/api/health` validando `status=ok`.
- **Backend/CORS:** `apps/api/src/main.ts` agora le `CORS_ORIGINS`; fallback inclui `https://ajcmvp.vercel.app`, `https://apiajc.byteintelligence.com.br` e localhost para dev. `trust proxy` foi habilitado para rodar atras do proxy do Coolify.
- **Verificacao:** `npm run build --workspace apps/api` exit 0. `docker build -t ajc-api:coolify .` nao rodou localmente porque o Docker Desktop engine nao esta ativo nesta maquina (`dockerDesktopLinuxEngine` ausente); validar build final no Coolify/engine Linux.
- **Proximo passo recomendado:** configurar no Coolify as variaveis de `apps/api/.env.coolify.example`, conectar Postgres, publicar o dominio `apiajc.byteintelligence.com.br`, rodar `node infra/migrations/run.mjs` e `node infra/seed/run.mjs`, depois testar `GET https://apiajc.byteintelligence.com.br/api/health` e apontar o front para essa API.
## Trabalho 2026-07-03 - Comprovante de bilhete baixar/compartilhar real
- **Contexto:** `/cliente` e `/portal` ja exibiam bilhetes reais/confirmados, mas os botoes "Baixar" e "Compartilhar" ainda nao executavam nenhuma acao concreta para o passageiro.
- **O que foi feito no front:** criado `apps/web-console/src/lib/bilhete-comprovante.ts`, que gera HTML imprimivel com QR Code real via `qrcode`, abre impressao/download de comprovante e compartilha via `navigator.share`, com fallback para clipboard e arquivo `.txt`. `/cliente` usa os dados reais do bilhete do cliente; `/portal` usa pedido/bilhete/oferta confirmados.
- **Decisao de escopo:** nao cria novo backend porque os dados necessarios ja existem no contrato de bilhete/pedido. Gateway real, BP-e real e envio externo seguem como adapters/stubs ate fornecedor/credenciais.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0; `rg` confirma handlers reais em `/cliente`, `/portal` e na lib `bilhete-comprovante`.
- **Proximo passo recomendado:** continuar lacunas auxiliares restantes: busca/assinatura real no despacho de encomenda, filtros AP/AR e stubs auditaveis finais de gateway/totem/balanca/notificacao.
## Trabalho 2026-07-03 - QR real em bilhetes e etiquetas
- **Contexto:** `/cliente`, `/portal`, `/totem` e o preview de etiqueta ainda desenhavam QR deterministico decorativo, embora o backend ja gere `qr_token` real para bilhetes e UUID real para volumes/etiquetas.
- **O que foi feito no front:** adicionada dependencia `qrcode` no `apps/web-console` e criado `RealQR`, que gera SVG QR Code real a partir do valor recebido. `/cliente` usa `bilhete.qr_token`, `/portal` usa `pixCopiaCola` no pagamento PIX e `qr_token/codigo` no bilhete confirmado, `/totem` usa `bilhete.qr_token`, e `FakeQR` virou wrapper compat�vel sobre `RealQR` para o preview de etiqueta continuar com o mesmo import sem renderizar QR fake.
- **Decisao de escopo:** isso nao altera gateway/BP-e/Bluetooth; apenas torna o QR escaneavel usando tokens reais ja existentes. Pagamento PIX segue stub auditavel ate fornecedor/gateway real.
- **Verificacao:** `rg "QR fake|grid SVG|ClienteQR|TotemQR|function FakeQR" apps/web-console/src/routes apps/web-console/src/components/ops -g "*.tsx"` nao encontra geradores fake nas rotas; `bun run build` em `apps/web-console` exit 0 com SSR/Nitro.
- **Proximo passo recomendado:** seguir lacunas auxiliares restantes: busca/assinatura real no despacho de encomenda, filtros AP/AR e stubs auditaveis finais de gateway/totem/balanca/notificacao.
## Trabalho 2026-07-03 - Financeiro lancamento minimo AP/AR real
- **Contexto:** em `/app/financeiro`, o botao "Lancamento minimo" ainda era visual, embora o backend ja tivesse `POST /api/caixa/titulos` e a tela ja consumisse AP/AR real.
- **O que foi feito no front:** o botao agora abre formulario operacional de titulo minimo, com tipo receber/pagar, descricao, parte, vencimento, valor e observacao. Ao salvar, chama `createFinanceiroTitulo`, usa `clientUuid`, atualiza a lista local, muda para a aba AP/AR correspondente e recarrega os dados reais.
- **Decisao de escopo:** `Plano de contas`, conciliacao bancaria, Compras, DRE e fechamento completo de comissoes continuam fase financeira posterior. A fatia fecha apenas AP/AR minimo do MVP, sem redesenhar a tela aprovada.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0. Smoke HTTP em API temporaria `:3050` autenticou admin, criou titulo `tipo=pagar` via `/api/caixa/titulos`, confirmou listagem por `tipo=pagar`, apagou o registro temporario e encerrou a API.
- **Proximo passo recomendado:** seguir lacunas restantes apontadas na auditoria: busca/assinatura real no despacho de encomenda, filtros AP/AR e stubs auditaveis de gateway/totem/balanca/notificacao.
## Trabalho 2026-07-03 - Cotacao de encomenda registrada no CRM
- **Contexto:** a aba Cotacao em `/app/encomendas` ainda calculava preco sem efetivar nenhum registro, apesar de o CRM ja possuir contrato real de cotacoes e precificacao de encomendas via API.
- **O que foi feito no front:** `CotacaoTab` agora recebe clientes reais, permite selecionar o cliente, calcula o preco como antes e salva uma cotacao real `tipo=encomenda` via `createCrmCotacao`, registrando trecho, tamanho, peso, valor declarado, modo de preco e proxima viagem em `parametros`. A conversao para despacho continua separada, sem reservar espaco nem criar encomenda antes da decisao do operador.
- **Decisao tecnica:** nao foi criado endpoint duplicado em Encomendas; a cotacao comercial de encomenda reaproveita `/api/crm/cotacoes`, mantendo CRM como origem das oportunidades/cotacoes.
- **Verificacao:** smoke HTTP em API temporaria `:3049` autenticou admin, criou cotacao real `tipo=encomenda` com `parametros.origem=smoke_encomendas_cotacao`, validou retorno `status=aberta`, apagou o registro temporario e encerrou a API. `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** concluir a auditoria requisito-a-requisito dos componentes auxiliares restantes; integracoes externas reais (gateway, BP-e/SEFAZ, WhatsApp/SMS, Bluetooth, GPS background) seguem como adapters/stubs ate existirem credenciais/provedor/modelo.
## Trabalho 2026-07-03 - CRM novo envio por historico conectado
- **Contexto:** no drawer da ficha 360 em `/app/crm`, o botao "Novo envio com base no historico" ainda era visual, embora o historico de cargas e o endpoint de cotacoes ja estivessem reais.
- **O que foi feito no front:** o botao agora cria uma cotacao real de carga via `createCrmCotacao`, usando cliente/agente da ficha e o ultimo envio do historico como base de origem/destino, valor estimado e observacao auditavel em `parametros`. Se nao houver historico, o botao fica desabilitado para nao inventar envio.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** concluir auditoria requisito-a-requisito dos botoes auxiliares restantes e separar apenas integracoes externas reais (WhatsApp/SMS, gateway, BP-e, Bluetooth) como pendencias de fornecedor/credencial/modelo.
## Trabalho 2026-07-03 - Notificacao de escala e botoes auxiliares fechados
- **Contexto:** em `/app/navegacao`, o botao "Notificar via WhatsApp" ainda era visual; em `/app/inicio`, "Nova viagem" nao apontava para o fluxo real; em `/app/cadastros`, "Novo cadastro" no cabecalho nao abria nenhum formulario; e na aba Embarcacoes o botao de filtro nao acionava o formulario real ja existente.
- **O que foi feito no backend:** criado `POST /api/navegacao/escalas-colaboradores/notificar` com RBAC `navegacao.editar`. O endpoint marca escalas pendentes como `notificada`, preenche `notificado_em`, registra `audit_evento` como `atualizar` com `tipo_evento=notificar_whatsapp_stub`, `canal=whatsapp` e `status=stub_enfileirado`. Nao simula provedor real: WhatsApp/SMS segue pendente de fornecedor.
- **O que foi feito no front:** `/app/navegacao` chama o endpoint, recarrega escalas e mostra retorno de enfileiramento stub; `Nova embarcacao` abre o formulario real; `/app/inicio` leva "Nova viagem" para `/app/navegacao`; `/app/cadastros` abre o formulario de criacao conforme a aba atual.
- **Seed/contrato:** `infra/seed/0001_seed_minimo.sql` ganhou permissao `navegacao.editar`.
- **Verificacao:** seed idempotente aplicado no WSL; `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` exit 0; smoke HTTP em API temporaria `:3048` autenticou admin, chamou `/api/navegacao/escalas-colaboradores/notificar` e confirmou escala `notificada` com `notificadoEm` preenchido.
- **Proximo passo recomendado:** seguir para `Novo envio com base no historico` no drawer do CRM ou concluir a auditoria requisito-a-requisito dos botoes auxiliares restantes; integracoes externas reais (WhatsApp/SMS, gateway, BP-e, Bluetooth) continuam dependentes de provedor/credenciais/modelo.
## Trabalho 2026-07-03 - Export real no CRM
- **Contexto:** o botao "Exportar" em `/app/crm` ainda era visual, embora clientes, agentes e cotacoes ja viessem da API real.
- **O que foi feito no front:** o botao agora exporta CSV da aba atual: clientes/alocacao em `ajc-crm-clientes.csv`, agentes em `ajc-crm-agentes.csv` e cotacoes em `ajc-crm-cotacoes.csv`, usando os dados carregados de `listClientes`, `listAgentes` e `listCrmCotacoes`.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** atacar `Novo envio com base no historico` no drawer do CRM ou formalizar adapter/stub de WhatsApp/SMS para notificacao de escala em Navegacao.

## Trabalho 2026-07-03 - Exports reais em Vendas/Manifesto
- **Contexto:** os botoes "Exportar PDF" e "Exportar CSV" em `/app/vendas` ainda eram visuais nas abas Manifesto e Relatorio regulatorio. Os dados ja vinham da API real (`/api/vendas/manifesto/:viagemId`, bilhetes e resumo), entao nao era necessario criar novo backend.
- **O que foi feito no front:** Manifesto agora exporta CSV e abre HTML imprimivel para PDF com as linhas reais do manifesto carregado. Relatorio regulatorio exporta CSV/HTML imprimivel com gratuidades e cortesias reais da listagem. Helpers locais `downloadCsv` e `printHtmlReport` ficam isolados em `app.vendas.tsx`.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0. A primeira tentativa apontou precedencia invalida entre `??` e `||`; corrigido com `manifestoCodigo` intermediario e build repetido com sucesso.
- **Proximo passo recomendado:** seguir para CRM Exportar/Novo envio com base no historico ou formalizar adapter/stub de WhatsApp/SMS para remover o botao visual de notificacao em Navegacao.
## Trabalho 2026-07-03 - Relatorio do dia real no dashboard
- **Contexto:** o botao "Relatorio do dia" em `/app/inicio` ainda era apenas visual. Como o dashboard ja consome dados reais de viagens, bilhetes, TMS, caixa e alertas, faltava um contrato backend para consolidar o dia operacional.
- **O que foi feito no backend:** `GET /api/operacao/relatorio-dia?data=YYYY-MM-DD` foi adicionado ao `OperacaoModule` com RBAC `operacao.ver`. O endpoint agrega periodo do dia em America/Sao_Paulo, viagens por status/detalhe, bilhetes/receita, cargas/encomendas/volumes, movimentos de caixa e alertas abertos/criticos/resolvidos.
- **O que foi feito no front:** o botao "Relatorio do dia" agora chama `getOperacaoRelatorioDia`, mostra estado "Gerando..." e baixa `ajc-relatorio-operacional-YYYY-MM-DD.json` com o payload real, sem redesenhar o dashboard aprovado.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); `bun run build` exit 0. Smoke HTTP em API temporaria `:3046` autenticou admin, chamou `/api/operacao/relatorio-dia?data=2026-07-03`, validou shape principal e encerrou a API.
- **Proximo passo recomendado:** seguir nos exports de Vendas/CRM ou formalizar adapters/stubs para WhatsApp/SMS antes de remover os botoes visuais de notificacao.
## Trabalho 2026-07-03 - Nova Embarcacao real em Navegacao/Cadastros
- **Contexto:** a aba Embarcacoes em `/app/navegacao` listava frota real, mas o botao "Nova embarcacao" ainda era visual. Esse cadastro e base para Nova Viagem, capacidades por classe e bloqueio de venda por capacidade.
- **O que foi feito no backend:** `POST /api/cadastros/embarcacoes` foi adicionado com RBAC `cadastros.criar`, validacao de nome/tipo/status/capacidades, bloqueio de duplicidade por nome, persistencia em `embarcacao` e `audit_evento`.
- **O que foi feito no front:** `/app/navegacao` ganhou formulario real de Nova embarcacao com nome, tipo, status, capacidade de carga e capacidades por classe; salva via API, atualiza a lista local e ja deixa a embarcacao disponivel para Nova Viagem.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); `bun run build` exit 0. Smoke HTTP em API temporaria `:3045` autenticou admin, criou `F/B SMOKE *`, confirmou listagem com `capacidadePax` e removeu o registro/auditoria de smoke; API encerrada.
- **Proximo passo recomendado:** seguir para exports/relatorios locais e triagem de acoes dependentes de provedor (WhatsApp/SMS, gateway, BP-e, Bluetooth real) mantendo stubs auditaveis onde nao houver credencial/modelo.
## Trabalho 2026-07-03 - Notas NF/DC manual e etiqueta por documento
- **Contexto:** `NotasTab` ja conferia documentos reais, mas "Lancar manual" e "Etiquetar por volume" ainda nao fechavam o fluxo administrativo completo solicitado pelo cliente/Lucas.
- **O que foi feito no backend:** `TmsRepository.printEtiqueta` deixou de gerar protocolo `ETIQ/RETIQ` por contador inadequado em `carga`, passou a buscar o ultimo protocolo real em `etiqueta_impressao`, respeitar idempotencia por `client_uuid` e fazer retry em colisao de constraint unica.
- **O que foi feito no front:** `NotasTab` agora abre formulario real de lancamento manual de NF/NFCe/DC com viagem, cliente, origem/destino, valor, peso, volumes e destinatario; salva via `POST /api/tms/cargas`, recarrega cargas/documentos/volumes e permite etiquetar todos os volumes vinculados ao documento/carga usando `POST /api/tms/volumes/:id/etiquetas`.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); `bun run build` exit 0. Smoke HTTP em API temporaria `:3044` autenticou admin, criou `CG-2026-0003` com documento `NF-SMOKE-*`, 2 volumes e etiquetas `ETIQ-2026-0001/0002`; registros de smoke removidos e API encerrada.
- **Proximo passo recomendado:** continuar a auditoria de botoes auxiliares remanescentes: WhatsApp/exports devem ficar como adapters ou export real conforme escopo; Nova embarcacao/cadastros de frota e acoes do dashboard/CRM precisam ser triadas antes de declarar 100%.
## Trabalho 2026-07-03 - Nova Passagem real em Vendas
- **Contexto:** o botao "Nova passagem" em `/app/vendas` ainda era visual, embora POS/Totem ja usassem `POST /api/vendas/bilhetes`.
- **O que foi feito no backend:** `VendasRepository.createBilhete` agora verifica `client_uuid` antes de efeitos colaterais, retorna o bilhete existente em reenvio, bloqueia overbooking por classe quando `viagem.capacidade_pax_disponivel` possui capacidade configurada e trava a viagem com `FOR UPDATE` durante a emissao.
- **O que foi feito no front:** `/app/vendas` abre formulario real de Nova passagem, carrega viagens ativas e matriz de precos, calcula valor por trecho/classe usando `precoPassagemPorClasseApi`, chama `createBilhete` e recarrega bilhetes/gratuidades/resumo sem redesenhar a tela aprovada.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); `bun run build` exit 0. Smoke HTTP dentro do WSL em API temporaria `:3042` autenticou admin, criou `BIL-2026-00006` na viagem `V-2026-0003` classe `rede` preco `225`, repetiu o mesmo `clientUuid` e confirmou mesmo `id`; registros de smoke removidos e API encerrada.
- **Proximo passo recomendado:** continuar a auditoria de botoes visuais/lacunas remanescentes, com foco em Navegacao, Notas/Etiquetas auxiliares e exports; depois executar auditoria requisito-a-requisito antes de declarar backend/front 100%.
## Trabalho 2026-07-03 - Nova Viagem real em Navegacao
- **Contexto:** o painel Nova viagem em `/app/navegacao` ainda era visual, embora o backend ja tivesse `POST /api/navegacao/viagens`.
- **O que foi feito no backend:** `NavegacaoRepository.createViagem` passou a respeitar `client_uuid`, retornando a viagem existente em reenvio e evitando duplicar escalas/paradas quando o operador clica duas vezes.
- **O que foi feito no front:** `/app/navegacao` agora abre formulario real com FerryBoat da API, rota/template FAQ, data/hora de saida/retorno e capacidades numericas por classe da embarcacao selecionada. O botao Nova viagem da barra de cronograma abre o mesmo fluxo, e o salvamento chama `createNavegacaoViagem`, atualizando a lista local sem redesenhar a tela aprovada.
- **Verificacao:** `npm run build` em `apps/api` no WSL exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); `bun run build` exit 0. Smoke HTTP dentro do WSL em API temporaria `:3043` autenticou admin, criou `V-2026-0004` com 2 escalas e capacidades, repetiu o mesmo `clientUuid` e confirmou mesmo `id`; registros de smoke removidos e API encerrada.
- **Proximo passo recomendado:** seguir nos botoes auxiliares ainda visuais: Notificar via WhatsApp (manter stub/adaptador ate provedor), Nova embarcacao/cadastros de frota se entrar no MVP, Lancar manual/Etiquetar por volume em Notas e exports PDF/CSV.

## Trabalho 2026-07-03 - Nova Carga real no TMS
- **Contexto:** o painel "Nova carga" em `/app/tms` ainda era preview visual dos campos do Lucas, apesar de o backend ja possuir `POST /api/tms/cargas` para criar carga/documento/volumes.
- **O que foi feito no backend:** `TmsRepository.createCarga` passou a respeitar idempotencia por `client_uuid` usando `ux_carga_client_uuid`, retornando o registro existente em reenvio e registrando `audit_evento` ao criar carga. A transacao continua criando `carga`, `documento_fiscal` quando informado e os `volume` correspondentes.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `createTmsCarga`. O bloco `Nova carga` de `/app/tms` virou formulario real com viagem, cliente, origem/destino, destinatario, recebimento, NF/DC, peso, volumes, valor de nota e frete cobrado; ao salvar, recarrega cargas/documentos/volumes reais e fecha o painel sem redesenhar a tela aprovada.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` exit 0. Smoke HTTP dentro do WSL em API temporaria `:3041` autenticou admin, criou `CG-2026-0003` com 3 volumes e 1 documento, repetiu o mesmo `clientUuid` e confirmou mesmo `id/codigo`; registros de smoke removidos e API encerrada.
- **Proximo passo recomendado:** seguir revisando botoes visuais/lacunas restantes em Navegacao/Vendas/Prestacao e executar uma auditoria requisito-a-requisito antes de declarar backend/front 100% finalizados.

## Trabalho 2026-07-03 - Veiculos/Maquinas com novo envio real
- **Contexto:** `VeiculosTab` em `/app/tms` ja listava envios via API, mas o botao "Novo envio veiculo/maquina" ainda era apenas visual e a aba voltava para mock quando a API retornava vazia.
- **O que foi feito no backend:** `POST /api/veiculos` passou a validar `tipo` explicitamente, criar envio em transacao, respeitar idempotencia por `client_uuid`, gerar evento inicial `cadastrado` e gravar `audit_evento` para `envio_veiculo`.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `createVeiculoEnvio`. `VeiculosTab` agora abre formulario compacto para veiculo/maquina, usa viagens reais como opcao, valida placa obrigatoria para veiculo, salva na API real e atualiza a fila local. Quando `/app/tms` recebe `envios=[]`, a tela mostra vazio real em vez de voltar para mock.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` exit 0. Smoke HTTP dentro do WSL em API temporaria `:3040` autenticou admin, criou `VEI-2026-0002`, repetiu o mesmo `clientUuid` e confirmou mesmo `id/codigo/status=vistoria`; registros de smoke removidos e API encerrada.
- **Proximo passo recomendado:** continuar a auditoria de botoes visuais/lacunas remanescentes do front aprovado, especialmente Nova Carga efetivamente salvando, Prestacao sem fallback e acoes auxiliares de Navegacao/Vendas antes da auditoria requisito-a-requisito.
## Trabalho 2026-07-03 - Embarque com fila offline real
- **Contexto:** `/embarque` ja consumia viagens/bilhetes reais e validava QR pela API, mas o modo offline era apenas estado em memoria do aparelho. Ao perder a pagina, as validacoes pendentes sumiam e o horario real do bipe offline nao era preservado.
- **O que foi feito no backend:** `ValidarBilheteInput` ganhou `validadoEm`. `VendasRepository.validarBilhete` agora grava `bilhete.validado_em = COALESCE(validadoEm, now())` e inclui o horario efetivo em `audit_evento`, mantendo idempotencia por `client_uuid`.
- **O que foi feito no front:** `/embarque` ganhou fila duravel `ajc.embarque.validacoes.v1` em `localStorage`, `deviceId` persistente, validacao local quando offline, contador real de pendencias e sincronizacao automatica quando o operador volta para online. A lista visual de embarcados mescla API + fila local sem redesenhar a tela aprovada.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` exit 0. Smoke HTTP em API temporaria `:3039` criou bilhete temporario, validou com `validadoEm` 15 minutos no passado, confirmou `resultado=valido`, segunda validacao `ja_validado` e `validado_em` igual ao horario capturado offline; registros de smoke removidos e API encerrada.
- **Proximo passo recomendado:** seguir lacunas restantes: remover botoes visuais de Navegacao/Vendas/Veiculos, revisar fallbacks em Prestacao/Cadastros de preco de carga e preparar auditoria de requisito por requisito antes de qualquer claim de backend 100% finalizado.

## Trabalho 2026-07-03 - Alertas operacionais cadastraveis no dashboard
- **Contexto:** `/app/inicio` ja exibia alertas derivados de viagens, volumes, caixas e falha de API, mas os botoes "Cadastrar alerta" ainda nao persistiam nada.
- **O que foi feito no banco/backend:** criada a migration `0017_alerta_operacional.sql` com enums de severidade/status e tabela `alerta_operacional`. Novo modulo `OperacaoModule` expoe `GET /api/operacao/alertas`, `POST /api/operacao/alertas` e `PATCH /api/operacao/alertas/:id`, com RBAC (`operacao.ver/criar/editar`), idempotencia por `client_uuid`, resolucao com `resolvido_por/resolvido_em` e `audit_evento`.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou client de alertas operacionais. `/app/inicio` agora carrega alertas manuais abertos, mescla com alertas derivados, abre formulario compacto pelos botoes existentes e permite resolver alerta manual direto na lista.
- **Documentacao:** `AGENTS.md` e `docs/arquitetura/02-ADR-Backend-Estado-Atual.md` atualizados com a migration 0017, modulo Operacao e endpoints.
- **Verificacao:** migration aplicada no WSL; seed aplicado; `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` exit 0. Smoke HTTP em API temporaria `:3038` autenticou admin, criou alerta critico, confirmou listagem em abertos, resolveu via PATCH, confirmou saida dos abertos e entrada em resolvidos; registros de smoke removidos e API encerrada.
- **Proximo passo recomendado:** seguir a auditoria das lacunas restantes: leitura real/offline de embarque, eventuais fallbacks em Prestacao/Cadastros de preco de carga, e integracoes externas apenas quando houver fornecedor/credencial/modelo.

## Trabalho 2026-07-03 - Conferencia real de NF/DC no TMS
- **Contexto:** `NotasTab` listava documentos reais, mas os icones de marcar conferida/divergente ainda nao gravavam a conferencia no backend.
- **O que foi feito no backend:** `TmsController/TmsRepository` ganharam `POST /api/tms/documentos/:id/conferencia`, protegido por `tms.conferir`. A rota valida status `conferida/divergente`, atualiza `documento_fiscal`, registra usuario em `lancado_por`, marca carga como `divergente` quando aplicavel e grava `audit_evento` com antes/depois e `client_uuid`.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `conferirTmsDocumento`. `NotasTab` agora chama a API nos botoes de conferida/divergente, mostra erro se falhar e atualiza a lista local via callback em `/app/tms`.
- **Documentacao:** `docs/arquitetura/02-ADR-Backend-Estado-Atual.md` atualizado com o endpoint de conferencia de documento.
- **Verificacao:** `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` exit 0. Smoke HTTP em API temporaria `:3037` criou documento pendente temporario, marcou como `conferida`, confirmou usuario `Administrador AJC` e listagem atualizada; registros de smoke removidos e API encerrada com codigo 143.
- **Proximo passo recomendado:** seguir auditoria das lacunas restantes: alertas cadastraveis do dashboard, leitura real/offline de embarque, e eventuais fallbacks em prestacao/cadastros de preco de carga. Integracoes externas seguem bloqueadas por fornecedor/credencial/modelo.

## Trabalho 2026-07-03 - Etiqueta com impressao/reimpressao auditavel
- **Contexto:** `EtiquetaTab` mostrava preview real de volumes, mas imprimir/reimprimir ainda era visual. Como o modelo/protocolo da impressora Bluetooth segue pendente, a decisao foi fechar o contrato auditavel sem fingir driver real.
- **O que foi feito no banco/backend:** criada a migration `0016_etiqueta_impressao.sql` com tabela `etiqueta_impressao`. `TmsController/TmsRepository` ganharam `GET /api/tms/etiquetas` e `POST /api/tms/volumes/:id/etiquetas`. A API registra impressao/reimpressao com protocolo `ETIQ/RETIQ`, payload can�nico da etiqueta, status `stub_enfileirado`, `client_uuid`, usuario solicitante e `audit_evento`. Segunda impressao do mesmo volume bloqueia com 400; reimpressao reaproveita o mesmo UUID.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `listTmsEtiquetas` e `printTmsEtiqueta`. `EtiquetaTab` carrega a lista real de etiquetas, registra impressao/reimpressao via API e mostra sucesso/erro mantendo o preview aprovado.
- **Documentacao:** `docs/arquitetura/02-ADR-Backend-Estado-Atual.md` atualizado para 16 migrations e endpoints de etiqueta.
- **Verificacao:** migration aplicada no WSL; `npm run build --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` exit 0. Smoke HTTP em API temporaria `:3036` registrou `ETIQ-2026-0001`, bloqueou segunda impressao com 400, registrou `RETIQ-2026-0001`, confirmou mesmo volume/UUID e listagem real; registros de smoke removidos e API encerrada com codigo 143.
- **Proximo passo recomendado:** revisar lacunas restantes de TMS/Prestacao/Cadastros cargo ou partir para integra��es externas bloqueadas apenas quando houver fornecedor/credencial/modelo da impressora.

## Trabalho 2026-07-03 - Paletes com alocacao real
- **Contexto:** `PaletesTab` ja listava paletes reais, mas os botoes de cadastrar/alocar/liberar eram apenas visuais. A regra de `palete_viagem` tambem dizia que um palete nao pode estar em duas viagens, mas essa validacao ainda nao estava fechada em servico.
- **O que foi feito no backend:** `TmsController/TmsRepository` ganharam `POST /api/tms/paletes/:id/alocacoes` e `POST /api/tms/paletes/:id/liberar`. A alocacao valida palete existente e livre, viagem existente, cidade destino da viagem/escala, opcionalmente volumes livres do mesmo destino, grava `palete_viagem`, atualiza status do palete e registra `audit_evento`. Palete alocado/em transito nao realoca sem liberacao.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `createTmsPalete`, `allocateTmsPalete` e `releaseTmsPalete`. `PaletesTab` agora cadastra palete, abre painel compacto de alocacao com viagens reais e libera retorno pela API, mantendo a tabela aprovada.
- **Documentacao:** `docs/arquitetura/02-ADR-Backend-Estado-Atual.md` atualizado com os endpoints novos de palete.
- **Verificacao:** `npm run build --workspace apps/api` no WSL exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` em `apps/web-console` exit 0. Smoke HTTP em API temporaria `:3035` criou `PAL-SMOKE-*`, alocou na viagem `V-2026-0003` destino `ALM`, bloqueou segunda alocacao com 400, liberou para `livre` e removeu o registro de smoke do banco.
- **Proximo passo recomendado:** fechar impressao/reimpressao auditavel de etiqueta, pois `EtiquetaTab` ainda tem acoes visuais e o protocolo Bluetooth segue como adapter/stub ate modelo da impressora.

## Trabalho 2026-07-03 - Declaracao de Conteudo real em Encomendas
- **Contexto:** a aba de Declaracao de Conteudo em Encomendas ainda simulava DC assinada localmente. Isso deixava risco juridico no mesmo nivel da entrega antes da validacao de prova.
- **O que foi feito no backend:** `EncomendasController` ganhou `GET /api/encomendas/declaracoes` e `POST /api/encomendas/:id/declaracao-conteudo`, reutilizando o repositorio TMS e persistindo em `declaracao_conteudo` + `documento_fiscal` tipo `DC`. A gravacao exige assinatura capturada com URL de evidencia e hash SHA-256 hexadecimal de 64 caracteres, recusando `field://`, `stub:` e `stub-*`.
- **O que foi feito no front:** `/app/encomendas` passou a carregar declaracoes reais pela API. `DeclaracaoTab` deixou de sintetizar DC assinada para toda encomenda e agora salva a declaracao da encomenda pendente via backend, gerando evidencia `local-proof://...` com SHA-256 pelo navegador.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0; `npm run build --workspace apps/api` no WSL exit 0; `npm test --workspace apps/api -- --runInBand` exit 0. Smoke HTTP em API temporaria `:3034` confirmou que payload stub falha com 400 e payload com SHA-256 real grava DC com hash de 64 caracteres; API temporaria encerrada com codigo 143.
- **Proximo passo recomendado:** seguir para paletes/alocacao e/ou impressao/reimpressao auditavel de etiqueta. Storage externo, gateway, BP-e/SEFAZ, WhatsApp/SMS e protocolo Bluetooth seguem como adapters/stubs ate fornecedor/credenciais.
## Trabalho 2026-07-03 - Prova juridica de entrega sem stub fake
- **Contexto:** o fluxo de entrega em campo chamava API real, mas enviava `field://...` e hashes `stub-*`, o que enfraquecia a prova juridica de foto/assinatura.
- **O que foi feito no backend:** `TmsRepository.createEntrega` agora valida assinatura + duas fotos antes de gravar `entrega_comprovante`: exige URL de evidencia e hash SHA-256 hexadecimal de 64 caracteres, recusando `field://`, `stub:` e `stub-*`.
- **O que foi feito no front:** `EntregasTab` passou a gerar evidencias locais auditaveis (`local-proof://...`) com SHA-256 via `crypto.subtle` para foto 1, foto 2 e assinatura, em vez de mandar strings fixas.
- **Verificacao:** `npm run build --workspace apps/api` no WSL exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` em `apps/web-console` exit 0. Smoke HTTP em API temporaria `:3033` confirmou que payload stub falha com 400 e payload com SHA-256 real gera protocolo `ENT-2026-0002`.
- **Limite consciente:** isso fecha a entrega contra prova fake no front atual, mas ainda nao substitui storage/provider externo real. A DC de encomendas continua pendente de endpoint proprio para gravar declaracao/assinatura anexada.

## Trabalho 2026-07-03 - RBAC mutavel em Cadastros
- **Contexto:** `Cadastros > Usuarios` e `Perfis e permissoes` ainda eram leitura/visual. O backend listava usuarios/perfis, mas nao permitia criar/editar acesso pela aplicacao.
- **O que foi feito no backend:** `CadastrosController` ganhou `POST/PATCH /api/cadastros/usuarios` e `POST/PATCH /api/cadastros/perfis`, protegidos por `cadastros.criar`/`cadastros.editar`. `CadastrosRepository` agora cria/edita usuario com hash pelo `PasswordService`, valida perfil ativo, evita login/perfil duplicado, sincroniza `perfil_permissao` por codigos `modulo.acao` e registra `audit_evento` com acoes enum `criar`/`atualizar`.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `create/updateUsuarioCadastro` e `create/updatePerfilCadastro`. `/app/cadastros` agora abre formulario para criar/editar usuario ao clicar em Novo usuario ou na linha da tabela; a aba de perfis permite criar perfil e editar permissao por checkbox mantendo a matriz visual aprovada.
- **Verificacao:** `npm run build --workspace apps/api` no WSL exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `bun run build` em `apps/web-console` exit 0. Smoke HTTP em API temporaria `:3032` autenticou admin, criou/editou perfil com `cadastros.ver/cadastros.criar`, criou/editou usuario vinculado ao perfil e retornou usuario inativo apos PATCH.
- **Proximo passo recomendado:** atacar prova juridica real de entrega/DC ou paletes/alocacao, mantendo Bluetooth/gateway/BP-e como adapters/stubs ate fornecedores/credenciais.

## Trabalho 2026-07-03 - Encomendas sem fallback local de preco/limite
- **Contexto:** a auditoria ainda encontrou `PRECO_ENCOMENDA_FALLBACK`, limite fixo local de R$ 1.000 e comparacao direta com `1000` no fluxo de Encomendas. Isso mantinha regra de negocio no front, fora do motor versionado.
- **O que foi feito no front:** `DespachoTab` e `CotacaoTab` deixaram de usar fallback local de tabela de encomenda. `/app/encomendas` agora carrega `GET /api/precos?tipo=encomenda` e `GET /api/config/tamanhos_encomenda`; se faltar tabela/config, o card de preco mostra bloqueio explicito e o despacho nao confirma. A classificacao fixo/percentual na listagem tambem usa o limite vindo da config, nao numero hard-coded.
- **O que foi feito no seed:** `infra/seed/run.mjs` publica `tamanhos_encomenda = { limiteFixo: 1000, tamanhos: P/M/G }` como config versionada ativa. O valor segue editavel pelo motor de configuracao, nao pelo bundle do front.
- **Verificacao:** `rg "PRECO_ENCOMENDA_FALLBACK|ENCOMENDA_LIMITE_FIXO"` em Encomendas sem ocorrencias; `bun run build` em `apps/web-console` exit 0; `npm run build --workspace apps/api` no WSL exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `npm run seed --workspace apps/api` exit 0; consulta direta ao Postgres retornou `{"tamanhos":[{"id":"P","pesoMax":10},{"id":"M","pesoMax":20},{"id":"G","pesoMax":40}],"limiteFixo":1000}`.
- **Proximo passo recomendado:** seguir lacunas restantes de backend/front funcional: usuarios/perfis criacao/edicao real, paletes/alocacao, eventos auditaveis de impressao/reimpressao de etiqueta, captura juridica real de assinatura/fotos/DC, e remocao de fallbacks em Prestacao/Cadastros cargo.

## Trabalho 2026-07-03 - Limite de cortesia em config/backend
- **Contexto:** a tela de Vendas usava limite local de cortesia e o backend aceitava criacao sem validar teto por viagem. Isso era regra de negocio contornavel no front.
- **O que foi feito no backend:** `VendasRepository.createCortesia` passou a ler `config_versao` ativa da chave `limite_cortesia` e bloquear a criacao quando a viagem atinge o teto. Se a config nao estiver publicada, a API retorna erro claro em vez de aplicar regra escondida.
- **O que foi feito no seed/front:** `infra/seed/run.mjs` publica `limite_cortesia = { porViagem: 3 }` como config versionada. `apps/web-console/src/lib/ajc-api.ts` ganhou `getConfigValue()`. `app.vendas.tsx` removeu `CORTESIA_LIMITE_PADRAO`, carrega a config real e bloqueia a UI quando a configuracao estiver ausente ou o limite for atingido.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0; `npm run build --workspace apps/api` no WSL exit 0; `npm test --workspace apps/api -- --runInBand` exit 0; `npm run seed --workspace apps/api` exit 0; consulta direta ao banco retornou `{"porViagem": 3}` para `limite_cortesia`.
- **Proximo passo recomendado:** seguir para encomendas sem fallback local de preco, paletes/alocacao e eventos auditaveis de impressao de etiqueta.

## Trabalho 2026-07-03 - Prompt oficial de backend MVP revisado
- **Contexto:** o front aprovado foi tratado como contrato para a proxima etapa de backend. O objetivo agora e orientar uma IA/agente sem contexto a fechar o backend funcional do MVP em uma pancada coordenada, sem redesenhar o front nem reabrir decisoes de stack/escopo.
- **O que foi atualizado:** `docs/fase-2/01-PROMPT-Backend-MVP-Completo.md` foi reescrito em ASCII, com leitura obrigatoria, regras nao negociaveis, uso de subagents, ordem de execucao, criterios de aceite e pendencias externas que nao bloqueiam.
- **Proximo passo recomendado:** executar o prompt revisado em uma sessao/agente dedicado para fechar backend, integracao front/back e QA, atualizando `docs/STATUS.md`, `AGENTS.md` e ADR/SPEC quando houver mudanca estrutural.

## Trabalho 2026-07-03 - Precos reais no POS/Totem e reajuste versionado
- **Contexto:** auditoria da continuidade apontou duas lacunas de alto impacto: `/pos` e `/totem` ainda tinham tabela local `PRECOS_PASSAGEM`, e `Cadastros > Precos de passagem` prometia aplicar reajuste sem mutacao real.
- **O que foi feito no front:** criado `apps/web-console/src/lib/passagem-pricing.ts` para traduzir as classes de UI (`rede`, `vip`, `camarote`) para as chaves da matriz versionada do backend. `/pos` e `/totem` passaram a carregar `GET /api/precos/passagem/matriz` junto das viagens e removem a tabela local de preco. `app.cadastros.tsx` agora chama a API real ao aplicar reajuste e recarrega a matriz vigente.
- **O que foi feito no backend:** `PrecosController/PrecosRepository` ganharam `POST /api/precos/:tipo/reajustes`, protegido por `precos.reajustar`. A rota encerra a tabela ativa, cria nova versao, copia itens com percentual aplicado, referencia `origem_versao_id` e registra `audit_evento` com acao `reajuste_preco`.
- **Verificacao:** `rg "PRECOS_PASSAGEM|PrecoPassagemPos|PrecoPassagemTotem" apps/web-console/src/routes/pos.tsx apps/web-console/src/routes/totem.tsx` sem ocorrencias; `bun run build` em `apps/web-console` exit 0; `npm run build --workspace apps/api` no WSL exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes).
- **Proximo passo recomendado:** seguir lacunas funcionais restantes priorizadas: limite de cortesias no backend/config, encomendas sem fallback local de preco, paletes/alocacao, eventos de impressao de etiqueta e captura juridica real de assinatura/foto.

## Trabalho 2026-07-02 - Front sem mocks + BP-e stub no back

### Resumo geral (auditoria da transcri��o)
- **Auditoria da documenta��o feita pela outra IA:** ? **feita corretamente**. Consolida��o em `docs/feedback/2026-06-25-validacao-core-telas.md` cobre os pontos centrais (Nova Viagem/Nova Carga do Lucas, BP-e, Ve�culos/M�quinas no MVP, financeiro p�s-MVP, portal online por �ltimo, certificado PFX, FAQ 2026, checklist Frota Martins). Pend�ncias externas (gateway PIX, BP-e real, credenciamento SEFAZ, fornecedor fiscal) corretamente sinalizadas como ??. Pontos deixados em aberto aguardando o Lucas (siglas PD/PC, classe/categoria de fornecedores, campos CRM).
- **Lacunas menores fechadas nesta sess�o:** BP-e em 3 n�veis documentado em `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md` �9 e `docs/modulos/02-Vendas-Passagens.md` �C.7; checklist de ve�culo embutido no app do conferente registrado no SPEC �6; DRE/plano de contas tem estudo real registrado no SPEC �11 para fase posterior.

### Estado dos componentes
- **Todos os tabs TMS j� usam API real:** `PortariaTab`, `ColetorTab`, `EntregasTab`, `NotasTab`, `PrestacaoTab`, `ControleTab`, `EtiquetaTab`, `PaletesTab`, `CrossDockingTab`, `VeiculosTab` � todos consomem endpoints via `ajc-api.ts`. Zero imports de mocks operacionais.
- **Apps de campo (`/campo/*`):** portaria, conferencia, recebimento, entregas � todos com `FieldShell` pr�prio e API real.
- **Rotas p�blicas/venda:** `/portal` (busca, pedido, pagamento stub), `/cliente` (minhas viagens), `/pos` (PDV porto com checkbox BP-e), `/totem`, `/embarque` � todos conectados ao backend real nas a��es principais.
- **Rotas internas:** `/app/inicio`, `/app/navegacao` (escalas reais), `/app/tms`, `/app/vendas` (agregados reais), `/app/cadastros` (cria��o real de fornecedores/colaboradores), `/app/crm` mut�vel, `/app/encomendas`, `/app/financeiro` (AP/AR leve) � todos funcionais.

### Backend: BP-e stub audit�vel
- **Campo adicionado:** `CreateBilheteInput.emitirBpe?: boolean` em `apps/api/src/modules/vendas/vendas.types.ts`.
- **Stub gerado automaticamente:** quando `emitirBpe=true`, `createBilhete` insere registro em `bilhete_documento_fiscal` com status `stub_emitido` e payload descrevendo que o fornecedor/SEFAZ/PFX ainda n�o est�o configurados. Mesma abordagem usada pelo portal em `modules/portal/portal.repository.ts`.
- **Front j� marca o checkbox:** `/pos` passa a flag na observa��o (�BP-e solicitado no ato�). A integra��o direta no par�metro `emitirBpe` ser� feita em uma pr�xima fatia se necess�rio.

### Documenta��o
- **ADR 02 criado:** `docs/arquitetura/02-ADR-Backend-Estado-Atual.md` � m�dulos implementados, migrations, endpoints p�blicos, como rodar localmente e pend�ncias externas.
- **AGENTS.md atualizado:** refer�ncia ao novo ADR adicionada no mapa de documenta��o.

### Verifica��es
- **Build front:** `bun run build` exit 0 em `apps/web-console`.
- **Build back:** `npm run build` exit 0 em `apps/api`.
- **Zero mocks operacionais:** `rg '@/mocks/data' apps/web-console/src` retorna vazio.

### Pr�xima frente recomendada
Integrar front?back removendo mocks residuais por m�dulo (prioridade: `/campo/*` ? `/pos` ? `/totem` ? `/embarque` ? `/app/cadastros`), implementar gateway PIX/cart�o real, destravar BP-e (senha, validade, credenciamento SEFAZ-PA, fornecedor/API), e avan�ar para o Portal online completo (checkout p�blico com pagamento integrado). Financeiro completo/DRE/Compras ficam para fase posterior conforme conversa com o cliente.

## Trabalho 2026-07-02 - Front web sem imports de mocks operacionais
- **Contexto:** depois das fatias de TMS/Encomendas/Vendas, ainda restavam imports de `@/mocks/data` em `/app/cadastros`, `/cliente`, `/portal`, `/pos`, `/totem` e `/embarque`.
- **O que foi feito:** `/app/cadastros` deixou de usar fallbacks de usuarios, perfis, precos, fornecedores, colaboradores e cidades; agora renderiza API real ou vazio/erro. `/cliente` e `/embarque` ganharam tipos/pulseiras locais e removem fallbacks de bilhetes/listas/viagens mockadas. `/portal`, `/pos` e `/totem` deixaram de importar o seed mockado; mantem constantes locais minimas para labels/classes/cidades enquanto as acoes principais continuam usando APIs reais (`portal`, `vendas`, `navegacao`, `caixa`). `/totem` agora exige oferta real para emitir bilhete e mostra vazio quando nao ha viagem sincronizada.
- **Verificacao:** `rg '@/mocks/data' apps/web-console/src` nao encontrou ocorrencias; `bun run build` em `apps/web-console` exit 0.
- **Limite consciente:** algumas tabelas visuais locais de passagem em `/pos` e `/totem` ainda devem ser unificadas contra `GET /api/precos/passagem/matriz` em uma proxima fatia para eliminar duplicidade de preco. Cores oficiais de pulseiras seguem pendencia externa; as constantes locais usam marcador `pendente`.
- **Proximo passo recomendado:** rodar uma auditoria funcional por modulo com API temporaria e navegador, priorizando fluxos de criacao/validacao: nova viagem, nova carga/encomenda, bilhete PDV/totem, portal pedido-pagamento, embarque, prestacao e cadastros. Depois fechar as lacunas de mutacao ainda visuais (upload/storage, impressao Bluetooth, alocacao de palete, aplicar reajuste de preco).
## Trabalho 2026-07-02 - TMS web sem imports de mocks nos componentes operacionais
- **Contexto:** depois de `ControleTab`, `EtiquetaTab` e `PaletesTab`, ainda restavam `NotasTab` e `PrestacaoTab` com fallback para `@/mocks/data`, embora os endpoints `GET /api/tms/documentos` e `GET /api/tms/prestacoes` ja existissem.
- **O que foi feito no front:** `NotasTab` ganhou tipos locais (`NotaDC`, `NotaDCStatus`) e deixou de cair para `NOTAS_DC`; documentos/cargas reais alimentam a fila e, se nao houver dados, a tabela fica vazia. `PrestacaoTab` removeu `PRESTACOES_CONTAS`, `VIAGENS` e `EMBARCACOES`; agora usa apenas `listTmsPrestacoes()` e mostra estado vazio/erro quando nao ha prestacao real. A funcao `mapMockPrestacao` foi removida.
- **Verificacao:** `rg '@/mocks/data|PRESTACOES_CONTAS|NOTAS_DC|VIAGENS|EMBARCACOES' apps/web-console/src/components/ops/tms apps/web-console/src/routes/app.tms.tsx` nao encontrou ocorrencias; `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** seguir superficies publicas/operacionais (`/portal`, `/pos`, `/totem`, `/embarque`, `/cliente`) e dashboards/rotas que ainda importam mocks como apoio visual. Mutacoes de imprimir/reimprimir, upload/storage real, alocacao de palete e Bluetooth seguem pendentes de adaptador/provedor.
## Trabalho 2026-07-02 - TMS auxiliar sem fallbacks mockados em controle, etiquetas e paletes
- **Contexto:** `ControleTab`, `EtiquetaTab` e `PaletesTab` ja recebiam cargas/volumes/viagens/paletes reais pela rota `/app/tms`, mas ainda importavam `@/mocks/data` para fallback visual quando a API viesse vazia.
- **O que foi feito no front:** os tres componentes passaram a usar tipos locais e renderizar dados reais recebidos por props. `ControleTab` calcula resumo de viagem somente com `NavegacaoViagemApi`, `TmsCargaApi`, `TmsVolumeApi` e `EmbarcacaoApi`; `EtiquetaTab` monta preview de etiqueta a partir de volumes reais e mostra estado vazio quando nao ha volume; `PaletesTab` lista paletes reais sem lookup em `VIAGENS` mockadas.
- **Limite consciente:** botoes de imprimir/reimprimir etiqueta e cadastrar/alocar palete continuam visuais ate existir protocolo real de impressora Bluetooth e mutacoes completas de palete/alocacao. Nao foi criado backend novo nesta fatia.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0; `rg` em `ControleTab`, `EtiquetaTab` e `PaletesTab` nao encontrou imports de `@/mocks/data` nem constantes mockadas operacionais.
- **Proximo passo recomendado:** continuar TMS com `NotasTab`/`PrestacaoTab` e depois superficies publicas/operacionais (`/portal`, `/pos`, `/totem`, `/embarque`, `/cliente`) que ainda importam `@/mocks/data` como apoio visual.
## Trabalho 2026-07-02 - Encomendas com precificacao real por tabela versionada
- **Contexto:** `/app/encomendas` ja consumia encomendas/clientes/viagens reais, mas componentes filhos ainda importavam `@/mocks/data` para tipos, trechos, tamanhos, calculo de preco, declaracoes, controle por viagem e rastreamento.
- **O que foi feito no backend/seed:** `PrecosRepository` passou a expor `item_preco.tamanho` em `GET /api/precos`. `infra/seed/run.mjs` agora cria tabela ativa `tipo = encomenda`, versao 1, com linhas P/M/G por trecho e uma linha percentual por destino. Os valores continuam marcados como tabela inicial pendente de validacao do Lucas, mas deixam de ser hard-code escondido no front e passam pelo motor de preco versionado.
- **O que foi feito no front:** `/app/encomendas` carrega `GET /api/precos?tipo=encomenda` junto de encomendas, viagens e clientes. `components/ops/encomendas/pricing.ts` centraliza tamanhos, fluxo, termo DC temporario e calculo a partir da tabela real. `DespachoTab` e `CotacaoTab` usam os precos da API; `ControleViagemTab`, `RastreamentoTab`, `DeclaracaoTab`, `shared.tsx` e `types.ts` deixaram de importar `@/mocks/data`. Se a API de preco falhar, ha fallback explicito local apenas para manter a tela operavel em dev.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0; `npm run build --workspace apps/api` no WSL exit 0; `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc npm run seed --workspace apps/api` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); smoke em API temporaria `API_PORT=3030` validou login admin e `GET /api/precos?tipo=encomenda` retornou 28 linhas, sendo 21 por tamanho e 7 percentuais. API temporaria encerrada.
- **Proximo passo recomendado:** seguir removendo imports de `@/mocks/data` em superficies publicas/operacionais (`/portal`, `/pos`, `/totem`, `/embarque`, `/cliente`) e componentes TMS auxiliares (`ControleTab`, `EtiquetaTab`, `PaletesTab`, `NotasTab`, `PrestacaoTab`). Tabela oficial final de encomenda ainda deve ser substituida quando Lucas confirmar os valores.

## Trabalho 2026-07-02 - Vendas com agregados reais de canais, ocupação e agentes
- **Contexto:** continuidade da remoção de mocks operacionais. `/app/vendas` já usava bilhetes, cortesias, gratuidades e manifesto reais, mas as abas "Canais de venda", "Ocupação por classe" e o bloco de agentes ainda dependiam de `CANAIS_VENDA`, `OCUPACAO_CLASSE` e `AGENTES` de `@/mocks/data`.
- **O que foi feito no backend:** `VendasRepository/VendasController` ganharam `GET /api/vendas/resumo`, protegido por `vendas.ver`. O endpoint agrega canais a partir de `bilhete.canal/tipo`, ocupação por classe a partir de `viagem.capacidade_pax_disponivel` + bilhetes não cancelados, e agentes a partir de `agente`, `cliente` e bilhetes vinculados.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `VendasResumoApi` e `getVendasResumo()`. `/app/vendas` removeu o import de `@/mocks/data`; canais, ocupação e agentes agora vêm da API real ou são derivados dos bilhetes reais carregados. Motivos/classes de cortesia e rótulos de tarifa ficaram como constantes locais da tela até existir configuração própria.
- **Limite consciente:** cores oficiais de pulseira continuam pendência externa; a aba mostra "Pulseira pendente" em vez de inventar cor. Limite de cortesia segue padrão local até a regra virar config versionada específica.
- **Verificação:** `npm run build --workspace apps/api` no WSL exit 0; `bun run build` em `apps/web-console` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); smoke em API temporária `API_PORT=3029` validou login admin e `GET /api/vendas/resumo` retornou 3 canais, 8 classes de ocupação e 4 agentes. API temporária encerrada.
- **Próximo passo recomendado:** seguir removendo imports de `@/mocks/data` em superfícies públicas/operacionais e componentes TMS/Encomendas que ainda usam fallback visual. Bons candidatos: `/portal`, `/pos`, `/totem`, `/embarque`, `/cliente` e componentes auxiliares de TMS (`ControleTab`, `EtiquetaTab`, `PaletesTab`) conforme prioridade de uso.

## Trabalho 2026-07-02 - Cadastros mutáveis de fornecedores e colaboradores
- **Contexto:** continuidade da remoção de mocks/ações visuais. `/app/cadastros` já listava usuários, perfis, cidades, preços, fornecedores e colaboradores via API, mas os botões "Novo fornecedor" e "Novo colaborador" ainda não gravavam nada.
- **O que foi feito no backend:** `CadastrosRepository/CadastrosController` ganharam `POST /api/cadastros/fornecedores` e `POST /api/cadastros/colaboradores`, protegidos por `cadastros.criar`. Fornecedor valida nome e bloqueia CNPJ duplicado quando informado; colaborador valida nome e grava função, cidade e WhatsApp. Não houve migration nova porque as tabelas canônicas `fornecedor` e `colaborador` já existiam desde a fundação.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `createFornecedor()` e `createColaborador()`. `/app/cadastros` agora abre formulários inline compactos nos botões "Novo fornecedor" e "Novo colaborador", salva na API real e atualiza a lista local sem redesenhar a tela.
- **Verificação:** `npm run build --workspace apps/api` no WSL exit 0; `bun run build` em `apps/web-console` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); smoke em API temporária `API_PORT=3028` validou login admin, `POST /api/cadastros/fornecedores` e `POST /api/cadastros/colaboradores`. Registros de smoke removidos e API temporária encerrada.
- **Próximo passo recomendado:** seguir lacunas de Cadastros/RBAC se entrar no escopo imediato: usuários/perfis/preços ainda têm listagem real mas mutações limitadas/visuais. Agregados auxiliares de Vendas e componentes com import de `@/mocks/data` continuam bons candidatos.

## Trabalho 2026-07-02 - Escala de colaboradores da Navegação conectada ao backend real
- **Contexto:** continuidade da remoção de mocks depois do CRM mutável. A aba "Escala de colaboradores" de `/app/navegacao` ainda usava `COLABORADORES`/`ESCALAS` de `@/mocks/data`, apesar de o banco já ter a tabela canônica `escala_colaborador`.
- **O que foi feito no backend:** `NavegacaoRepository/NavegacaoController` ganharam `GET /api/navegacao/escalas-colaboradores`, protegido por `navegacao.ver`. O endpoint faz join de `escala_colaborador`, `colaborador`, `viagem` e `embarcacao`, expõe dados de contato/viagem/período e deriva `status = conflito` quando o mesmo colaborador tem escalas não canceladas com períodos sobrepostos. A regra fica calculada, sem criar enum novo gravado no banco.
- **O que foi feito na seed:** `infra/seed/run.mjs` agora cria colaboradores operacionais e escalas idempotentes para `V-2026-0001`, `V-2026-0002` e `V-2026-0003`, incluindo uma sobreposição intencional do maquinista Joao Nonato Pereira para validar o bloqueio visual de conflito.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `NavegacaoEscalaColaboradorApi` e `listNavegacaoEscalasColaboradores()`. `/app/navegacao` carrega as escalas junto de viagens/frota/templates e a tabela de escala deixou de depender de `COLABORADORES`/`ESCALAS` do mock. O botão de notificação WhatsApp continua visual até existir provedor real.
- **Verificação:** `npm run build --workspace apps/api` no WSL exit 0; `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc npm run seed --workspace apps/api` exit 0; `bun run build` em `apps/web-console` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); smoke em API temporária `API_PORT=3027` validou login admin e `GET /api/navegacao/escalas-colaboradores` retornou 7 escalas reais com 2 conflitos derivados. API temporária encerrada.
- **Próximo passo recomendado:** seguir a auditoria de mocks remanescentes. Bons candidatos: cadastros mutáveis além de clientes, criação/edição real de fornecedores/colaboradores/perfis, agregados auxiliares de Vendas, e componentes que ainda importam `@/mocks/data` como fallback visual. WhatsApp/SMS real, Bluetooth, gateway e BP-e seguem adapters/stubs até fornecedores/credenciais.

## Trabalho 2026-07-02 - CRM mutável conectado ao backend real
- **Contexto:** continuidade da remoção de mocks depois de Financeiro leve. `/app/crm` já lia clientes, agentes, cotações e histórico 360 reais, mas ainda importava `@/mocks/data` como fallback e os controles "Novo cliente", "Realocar" e "Nova cotação" eram visuais.
- **O que foi feito no backend:** `CadastrosController/CadastrosRepository` ganharam `POST /api/cadastros/clientes` e `PATCH /api/cadastros/clientes/:id`, protegidos por `crm.criar` e `crm.editar`. A criação valida nome/documento, impede CPF/CNPJ duplicado com erro 400 claro e grava histórico inicial quando há agente. A atualização permite realocação de agente e registra `cliente_agente_historico`. `CrmController/CrmRepository` ganhou `POST /api/crm/cotacoes`, protegido por `crm.criar`, gravando `cotacao` com `parametros` JSONB e status `aberta`.
- **O que foi feito na seed/RBAC:** `infra/seed/0001_seed_minimo.sql` recebeu permissões `crm.criar` e `crm.editar`; o seed reaplicado concedeu as permissões ao perfil Administrador.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `createCliente()`, `updateCliente()` e `createCrmCotacao()`. `/app/crm` removeu o import de `@/mocks/data`; clientes/agentes/cidades/cotações vêm da API, cadastro rápido grava cliente real, a ficha 360 realoca agente via PATCH e a aba Cotações cria cotação real via POST. Se a API falhar, a tela mostra erro e não volta para dados mockados.
- **Verificação:** `npm run build --workspace apps/api` no WSL exit 0; `npm run seed --workspace apps/api` exit 0; `bun run build` em `apps/web-console` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); smoke em API temporária `API_PORT=3026` validou login admin, criação de cliente `Cliente Smoke CRM`, realocação para outro agente e criação de cotação `carga` aberta com valor `456.78`. Registros de smoke removidos e API temporária encerrada.
- **Próximo passo recomendado:** seguir a auditoria de mocks remanescentes. Bons candidatos: cadastros mutáveis além de cliente (fornecedores/colaboradores/usuários/perfis), navegação/escala de colaboradores, agregados auxiliares de Vendas e componentes TMS que ainda usam fallback. Integrações externas reais continuam adapters/stubs até credenciais/fornecedores.

## Trabalho 2026-07-02 - Financeiro leve AP/AR conectado ao backend real
- **Contexto:** continuidade da remoção de mocks depois de Notas/DC. `/app/financeiro` já consumia caixas reais, mas `CONTAS_PAGAR` e `CONTAS_RECEBER` ainda vinham de `@/mocks/data`, apesar de AP/AR leve aparecer no front aprovado.
- **O que foi feito no banco/backend:** criada `infra/migrations/0015_financeiro_titulos_minimos.sql` com `financeiro_titulo`, `tipo_titulo_financeiro` e `status_titulo_financeiro`. O escopo é deliberadamente mínimo: títulos a pagar/receber com origem auditável e vínculos opcionais a cliente, fornecedor, agente, caixa_movimento, carga, bilhete e cotação. `CaixaController/CaixaRepository` ganharam `GET /api/caixa/titulos` e `POST /api/caixa/titulos`, com RBAC `caixa.ver`/`caixa.operar` e idempotência por `client_uuid`.
- **O que foi feito na seed:** `infra/seed/run.mjs` agora cria 6 títulos idempotentes: 3 a receber ligados a bilhete/carga/encomenda e 3 a pagar ligados a agentes/despesa operacional. Isso permite abrir AP/AR com dados reais sem antecipar Compras/DRE.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `FinanceiroTituloApi`, `listFinanceiroTitulos()` e `createFinanceiroTitulo()`. `/app/financeiro` removeu o import de `@/mocks/data`; caixas, AP/AR e comissões agora usam API real ou ficam vazios com aviso de erro, sem voltar para mock visual.
- **Limite consciente:** plano de contas completo, conciliação bancária, Compras e DRE continuam fase posterior. A fatia cobre o caixa financeiro mínimo do MVP e os KPIs/listas AP/AR aprovados no front.
- **Verificação:** `npm run build --workspace apps/api` no WSL exit 0; `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc node infra/migrations/run.mjs` aplicou 0015; `npm run seed --workspace apps/api` exit 0; `bun run build` em `apps/web-console` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); `node infra/migrations/run.mjs --status` mostra 0015 aplicada; smoke em API temporária `API_PORT=3025` validou login admin, `GET /api/caixa/titulos` retornou 6 títulos seedados (3 receber, 3 pagar) e `POST /api/caixa/titulos` criou título de teste idempotente. O título de smoke foi removido e a API temporária encerrada.
- **Próximo passo recomendado:** seguir a auditoria de mocks remanescentes. Candidatos úteis: CRM mutável (criar cotação/realocar agente/cadastrar cliente), cadastros mutáveis e agregados auxiliares de Vendas/Navegação. Gateway/BP-e reais, WhatsApp/SMS, Bluetooth, storage e financeiro completo continuam adapters/pendências externas.

## Trabalho 2026-07-02 - Notas/DC do TMS conectadas ao backend real
- **Contexto:** continuidade da desmockagem do TMS depois de Prestação de Contas; `NotasTab` ainda usava cargas/mocks como aproximação, embora o banco já tivesse a tabela canônica `documento_fiscal`.
- **O que foi feito no backend:** `TmsRepository/TmsController` ganharam `GET /api/tms/documentos`, lendo `documento_fiscal` com joins para carga, cliente e usuário lançador. O endpoint expõe tipo, número, valor, arquivo/hash, origem, status, dados da carga vinculada, cliente e datas.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `TmsDocumentoApi` e `listTmsDocumentos()`. `/app/tms` passou a carregar documentos junto das demais fontes TMS e `NotasTab` agora usa documentos fiscais reais como fonte primária, mantendo cargas/mocks apenas como fallback visual.
- **Limite consciente:** upload/storage real de NF/DC continua dependente de provedor de arquivos e contrato operacional; a tela não finge integração externa. A mutação de Nova Carga já cria `documento_fiscal` básico quando recebe NF/DC.
- **Verificação:** `npm run build --workspace apps/api` no WSL exit 0; `bun run build` em `apps/web-console` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); smoke em API temporária `API_PORT=3024` validou login admin e `GET /api/tms/documentos` retornou 3 documentos reais da seed, incluindo `NFe 352406120099`, carga `CG-2026-0002`, cliente `Atacadao Santarem`, status `conferida`, valor `218400`. API temporária encerrada manualmente depois.
- **Próximo passo recomendado:** fazer auditoria final de mocks remanescentes e separar o que é fallback visual aceitável do que ainda precisa de endpoint/mutação. Prioridade provável: ações de mutação restantes em Cadastros/CRM/Financeiro leve e agregados auxiliares; gateway/BP-e reais, WhatsApp/SMS, Bluetooth e storage continuam adapters/pendências externas.

## Trabalho 2026-07-02 - Prestação de Contas/TMS conectada ao backend
- **Contexto:** continuidade da desmockagem front/back depois de `/app/inicio`; foco em `PrestacaoTab`, que já espelhava o modelo real recebido do cliente, mas ainda montava o formulário inteiro em memória.
- **O que foi feito no backend:** criado contrato operacional em `TmsRepository/TmsController` para `GET /api/tms/prestacoes`, `GET /api/tms/prestacoes/:id` e `POST /api/tms/prestacoes`. A prestação usa a tabela canônica `prestacao_contas`, guarda o formulário real em `itens` JSONB versionável, calcula `total_sistema` a partir de bilhetes + cargas/encomendas + veículos da viagem e expõe contadores de passageiros/cargas/encomendas/veículos. Nova migration `infra/migrations/0014_prestacao_contas_operacional.sql` adiciona unicidade por `(viagem_id, gerente_id)`.
- **O que foi feito na seed:** `infra/seed/run.mjs` agora cria uma prestação idempotente para `V-2026-0001`, com blocos do formulário real: receitas a bordo, cozinha por dia, lanchonete, internet, passagens por agência, fretes por agência, despesas, redondas/gratificações, assinatura e anexo de exemplo. A divergência seedada é intencional para demonstrar conferência financeiro.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou tipos e chamadas de prestação. `PrestacaoTab` passou a carregar `listTmsPrestacoes()` e alimentar o formulário aprovado com dados reais, mantendo fallback visual se a API estiver indisponível/vazia.
- **Verificação:** `npm run build --workspace apps/api` no WSL exit 0; `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc node infra/migrations/run.mjs` aplicou 0014; `npm run seed --workspace apps/api` exit 0; `bun run build` em `apps/web-console` exit 0; `npm test --workspace apps/api -- --runInBand` exit 0 (2 suites, 5 testes); smoke em API temporária `API_PORT=3023` validou login admin e `GET /api/tms/prestacoes` retornou 1 prestação (`V-2026-0001`, `enviada`, `totalSistema=7722`, `totalDeclarado=7840.5`, 7 linhas de receitas). API temporária encerrada manualmente depois.
- **Próximo passo recomendado:** revisar mocks remanescentes de componentes auxiliares de TMS/Vendas/Encomendas e decidir a próxima fatia de backend funcional. AP/AR/DRE/Compras, gateway/BP-e reais, WhatsApp/SMS e Bluetooth real continuam adapters/fase posterior ou dependem de fornecedor/credenciais.

## Trabalho 2026-07-02 - Dashboard inicial conectado ao backend real
- **Contexto:** continuidade da integração front/back depois de Encomendas; foco em `/app/inicio`, que ainda usava `VIAGENS`, `CAIXAS`, `ALERTAS` e `EMBARCACOES` como fonte principal.
- **O que foi feito no front:** `apps/web-console/src/routes/app.inicio.tsx` passou a carregar em paralelo `GET /api/navegacao/viagens`, `GET /api/cadastros/embarcacoes`, `GET /api/caixa`, `GET /api/tms/cargas`, `GET /api/tms/volumes` e `GET /api/vendas/bilhetes`. KPIs, radar, viagens operacionais, ticker, alertas derivados e caixas em tempo real agora são calculados a partir dos dados reais do backend quando disponíveis.
- **Fallback preservado:** os mocks antigos continuam apenas como fallback visual quando a API estiver indisponível/vazia, para não quebrar a apresentação do front aprovado. Alertas cadastráveis ainda não têm endpoint próprio; por enquanto o painel deriva alertas de viagens em atenção/atraso, volumes divergentes/bloqueados/avariados e caixas fechados.
- **Verificação:** `bun run build` em `apps/web-console` exit 0.
- **Próximo passo recomendado:** atacar `PrestacaoTab`/Prestação de Contas no TMS se entrar agora como backend funcional, ou seguir removendo mocks remanescentes de componentes auxiliares de TMS/Vendas/Encomendas. AP/AR/DRE/Compras, gateway/BP-e reais, WhatsApp/SMS e Bluetooth real continuam adapters/fase posterior ou dependem de fornecedor/credenciais.

## Trabalho 2026-07-02 - Encomendas conectado ao backend real
- **Contexto:** continuidade da remocao gradual de mocks depois de CRM/financeiro leve; foco em `/app/encomendas`.
- **O que foi feito no backend:** `TmsRepository.listCargas()` passou a expor `viagem_id`, `destinatario_nome` e `observacoes` para permitir mapear encomendas no front. `createCarga()` agora gera prefixo `ENC-YYYY-NNNN` quando `categoria = encomenda`, mantendo `CG-*` para carga. O endpoint existente `POST /api/encomendas` continua reaproveitando TMS com categoria `encomenda`, documento DC padrao e volume criado no TMS.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou `listEncomendas()` e `createEncomenda()`. `/app/encomendas` agora carrega encomendas, viagens e clientes reais em paralelo e usa mocks apenas como fallback. `DespachoTab` cria encomenda real no backend; `ControleViagemTab`, `RastreamentoTab` e `CotacaoTab` recebem dados reais por props e preservam fallback visual. Foi adicionado contrato UI em `components/ops/encomendas/types.ts`.
- **Mocks ainda presentes nesta fatia:** Declaracao de Conteudo segue visual/termo placeholder porque o texto/modelo definitivo ainda e pendencia externa; precificacao de encomenda ainda usa a mecanica visual/tabela placeholder ate Lucas entregar tabela oficial. WhatsApp/SMS e impressao Bluetooth continuam adapters/stubs, sem fingir integracao real.
- **Verificacao:** `npm run build --workspace apps/api` no WSL exit 0; `bun run build` em `apps/web-console` exit 0; `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc npm run seed --workspace apps/api` exit 0; `npm test -- --runInBand` em `apps/api` exit 0 (2 suites, 5 testes). API temporaria em `API_PORT=3022` validou login admin, `POST /api/encomendas` criou `ENC-2026-0002`, `GET /api/encomendas` listou o registro; o teste foi removido do banco depois.
- **Proximo passo recomendado:** conectar dashboards auxiliares de `/app/inicio` aos agregados reais ja existentes; depois revisar mocks remanescentes em Vendas/TMS/Prestacao de Contas e avaliar se vale criar endpoint proprio de Prestacao de Contas agora. AP/AR/DRE/Compras e integracoes externas reais seguem fase posterior/adapters.

## Trabalho 2026-07-02 - CRM e financeiro leve conectados ao backend
- **Contexto:** continuidade da remocao gradual de mocks depois de Cadastros; foco em `/app/crm` e `/app/financeiro`.
- **O que foi feito no backend:** criado `CrmModule` com endpoints autenticados/RBAC `GET /api/crm/cotacoes` e `GET /api/crm/clientes/:id/historico`, lendo `cotacao`, `carga`, `volume`, `bilhete`, `viagem` e `embarcacao`. `infra/seed/run.mjs` agora popula 3 cotacoes reais e idempotentes para demonstrar CRM/comissoes.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou tipos/chamadas para clientes, agentes, cotacoes CRM, historico 360 do cliente e movimentos de caixa. `/app/crm` passou a carregar clientes/agentes/cotacoes/historico real, mantendo fallback visual apenas quando API vazia/indisponivel. `/app/financeiro` passou a carregar caixas reais e usar agentes/cotacoes reais para estimativa de comissao; AP/AR continuam visuais porque financeiro completo segue pos-MVP/fase posterior.
- **Mocks ainda presentes nesta fatia:** cadastro/mutacao de cliente, realocacao de agente, nova cotacao, AP/AR/plano de contas/comissoes finais e financeiro avancado seguem placeholders conscientes ate existir contrato funcional definitivo. Nao redesenhar essas telas; integrar por contrato quando o backend correspondente entrar.
- **Verificacao:** `npm run build --workspace apps/api` no WSL exit 0; `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc npm run seed --workspace apps/api` exit 0; consulta em `cotacao` retornou 3 registros (carga aberta, veiculo aberta, encomenda convertida); `npm test -- --runInBand` em `apps/api` exit 0 (2 suites, 5 testes); `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** conectar `/app/encomendas` ao backend real de Encomendas/TMS ja existente; depois dashboards auxiliares de `/app/inicio` e mocks remanescentes. Prestacao de Contas/TMS ainda pode ganhar endpoint proprio se entrar no backend funcional agora; AP/AR/DRE/Compras seguem fase posterior.

## Trabalho 2026-07-02 - Cadastros conectado ao backend
- **Contexto:** continuidade da remocao gradual de mocks depois de Vendas/Passagens; foco em `/app/cadastros`.
- **O que foi feito no backend:** `CadastrosRepository` e `CadastrosController` ganharam endpoints autenticados/RBAC para `GET /api/cadastros/usuarios`, `/perfis`, `/fornecedores` e `/colaboradores`, alem dos endpoints ja existentes de cidades/embarcacoes/agentes/clientes. As listagens leem as tabelas reais `usuario`, `perfil/permissao/perfil_permissao`, `fornecedor` e `colaborador`.
- **O que foi feito no front:** `apps/web-console/src/lib/ajc-api.ts` ganhou tipos/chamadas de cadastros e precos (`/precos/passagem/matriz`, `/precos?tipo=carga`). `/app/cadastros` passou a carregar usuarios, perfis/permissoes, cidades, matriz de precos de passagem, precos de carga, fornecedores e colaboradores reais em paralelo, mantendo fallback visual apenas quando a API estiver vazia/indisponivel.
- **Mocks ainda presentes nesta fatia:** acoes de criacao/reajuste em massa seguem visuais ate existir contrato de mutacao/versionamento para esses cadastros no backend; alguns dados auxiliares de exibicao permanecem fallback quando a seed ainda nao popula fornecedores/colaboradores/precos de carga.
- **Verificacao:** `npm run build --workspace apps/api` no WSL exit 0; `npm test -- --runInBand` em `apps/api` exit 0 (2 suites, 5 testes); `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** conectar CRM e caixa/financeiro leve, priorizando as rotas internas que ainda importam `@/mocks/data`: `/app/crm`, `/app/financeiro`, `/app/encomendas` e dashboards auxiliares de `/app/inicio`.

## Trabalho 2026-07-02 - Vendas/Passagens concluido na integracao principal
- **Contexto:** continuidade da fatia Vendas/Passagens depois de `/app/vendas`, `/pos` e `/embarque` ja terem iniciado consumo de API.
- **O que foi feito:** `/totem` passou a carregar viagens reais de `GET /api/navegacao/viagens` e emitir bilhete real via `POST /api/vendas/bilhetes` com `tipo/canal = totem`; o QR final usa `qr_token`/`codigo` retornado pelo backend. Em `/app/vendas`, a aba **Gerador de cortesias** passou a carregar viagens/cortesias reais (`GET /api/navegacao/viagens`, `GET /api/vendas/cortesias`) e gerar cortesia real (`POST /api/vendas/cortesias`) com `clientUuid`. A aba **Manifesto / passageiros** passou a carregar viagens reais e consultar `GET /api/vendas/manifesto/:viagemId`, calculando totais por classe/tarifa a partir dos bilhetes reais.
- **Mocks removidos/conectados nesta fatia:** totem deixou de depender de `VENDA_OFERTAS` como fonte primaria e usa fallback visual apenas se a API estiver indisponivel; cortesias e manifesto deixaram de usar `CORTESIAS_EMITIDAS`/`PASSAGENS` como fonte. O painel de Vendas ainda mantem cards auxiliares de canais, ocupacao e agentes com dados visuais ate haver endpoints/config especificos para esses agregados.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** seguir a remocao gradual de mocks nas rotas internas restantes: `/app/cadastros` primeiro (cadastros base/RBAC/precos), depois CRM/caixa/financeiro e dashboards auxiliares. Depois revisar PrestacaoTab/TMS se o endpoint de prestacao entrar ainda nesta rodada.

## Trabalho 2026-07-02 - Vendas/PDV/Embarque parcialmente conectados ao backend
- **Contexto:** continuidade da integracao front/back depois dos apps de campo TMS, focando Vendas/Passagens e superficies operacionais relacionadas.
- **O que foi feito:** `apps/web-console/src/lib/ajc-api.ts` ganhou tipos e chamadas autenticadas para Vendas/Caixa: `GET/POST /api/vendas/bilhetes`, validacao de bilhete, manifesto, cortesias, gratuidades e caixa. `/app/vendas` passou a carregar bilhetes/gratuidades reais para KPIs, tabela principal e relatorio regulatorio. `/pos` passou a carregar viagens e caixa reais, abrir caixa quando necessario e emitir bilhetes reais no backend ao cobrar o ticket, com movimento de caixa quando houver `caixaId`. `/embarque` passou a baixar viagens/embarcacoes/bilhetes reais e chamar `POST /api/vendas/bilhetes/:id/validar` ao ler/selecionar QR.
- **Mocks ainda presentes nesta fatia:** `/app/vendas` ainda conserva cards auxiliares de canais/ocupacao/agentes e as abas de cortesia/manifesto com parte visual baseada no mock/config local; `/pos` ainda usa a matriz visual de precos/classes do front para compor o ticket enquanto o backend de precos nao expoe o lookup direto por classe no PDV; `/totem` ainda nao foi conectado e deve ser o proximo encaixe de Vendas.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0 apos a integracao.
- **Proximo passo recomendado:** concluir Vendas/Passagens conectando `/totem` e refinando as abas de cortesias/manifesto para usar `POST /api/vendas/cortesias` e `GET /api/vendas/manifesto/:viagemId`; depois seguir para `/app/cadastros`, CRM/caixa/financeiro e, por fim, remover mocks remanescentes de dashboards auxiliares.

## Trabalho 2026-07-02 - Apps de campo TMS conectados ao backend
- **Contexto:** continuidade da integracao front/back depois de `/app/tms`; foco nos apps de campo aprovados em `/campo/*`.
- **O que foi feito:** `apps/web-console/src/lib/ajc-api.ts` ganhou mutacoes autenticadas `POST /api/tms/portaria`, `POST /api/tms/volumes/:id/eventos` e `POST /api/tms/entregas`. `PortariaTab` agora lista registros reais de portaria e cria entrada no backend. `ColetorTab` carrega viagens/embarcacoes/volumes reais e registra bipe/evento de volume. `CrossDockingTab` carrega volumes reais e registra embarque/cross-docking como evento de volume. `EntregasTab` carrega volumes reais e cria comprovante de entrega com protocolo no backend.
- **Mocks removidos/conectados nesta fatia:** `/campo/portaria`, `/campo/conferencia`, `/campo/recebimento` e `/campo/entregas` deixaram de importar `@/mocks/data` e passaram a usar endpoints TMS reais quando o usuario esta autenticado. WhatsApp/SMS, fotos/assinatura e GPS seguem como placeholders/adapters de campo, sem fingir integracao externa real.
- **Ainda pendente:** dentro do TMS web, `PrestacaoTab` ainda usa mock e precisa de modelagem/endpoint proprio se entrar no backend funcional agora. Outros modulos internos ainda com mocks: `/app/inicio`, `/app/vendas`, `/pos`, `/totem`, `/embarque`, `/app/encomendas`, `/app/crm`, `/app/cadastros`, `/app/financeiro`.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** conectar Vendas/Passagens e superficies operacionais relacionadas (`/app/vendas`, `/pos`, `/totem`, `/embarque`) ao backend de Vendas/Caixa/Bilhetes ja implementado.

## Trabalho 2026-07-02 - TMS web parcialmente conectado ao backend
- **Contexto:** continuidade da integracao front/back nas rotas internas, apos login/auth e `/app/navegacao`.
- **O que foi feito:** `apps/web-console/src/lib/ajc-api.ts` ganhou tipos e chamadas autenticadas para `GET /api/tms/cargas`, `/tms/volumes`, `/tms/paletes`, `/tms/portaria`, `/tms/entregas` e `GET /api/veiculos`. A rota `/app/tms` agora carrega cargas, volumes, paletes, portaria, entregas, veiculos, viagens e embarcacoes em paralelo.
- **Mocks removidos/conectados nesta fatia:** KPIs principais de `/app/tms`, painel "Nova carga", `ControleTab`, `NotasTab`, `PaletesTab`, `EtiquetaTab` e `VeiculosTab` passam a usar API real quando houver dados; mantem fallback visual para nao quebrar se a API estiver indisponivel/vazia durante desenvolvimento.
- **Ainda pendente:** `ColetorTab`, `PortariaTab`, `EntregasTab`, `CrossDockingTab` e `PrestacaoTab` ainda usam simuladores/mocks. A proxima fatia deve conectar `/campo/portaria`, `/campo/conferencia`, `/campo/recebimento` e `/campo/entregas` aos endpoints TMS reais e depois modelar endpoint/dados de prestacao de contas se for entrar nesta fase funcional.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** conectar apps de campo `/campo/*` ao backend TMS real, com chamadas de criacao de portaria, evento de volume/bipe e entrega com protocolo; depois seguir para `/app/vendas`, `/pos`, `/totem` e `/embarque`.

## Trabalho 2026-07-02 � Fechamento das lacunas de documenta��o da valida��o + QA final

**Contexto:** retomar ap�s auditoria da transcri��o para fechar as 3 lacunas documentais identificadas pela outra IA, revisar m�dulos desatualizados e fazer QA visual/build do front.

**O que foi feito:**
1. **Lacuna 1 � BP-e em 3 n�veis:** documentado no SPEC (`docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md`) e no m�dulo Vendas-Passagens (`docs/modulos/02-Vendas-Passagens.md` �C.7). Front j� implementa n�vel 1 (PDV com checkbox emitir/n�o emitir) em `apps/web-console/src/routes/pos.tsx`; portal emite autom�tico via backend; app do agente fica opcional.
2. **Lacuna 2 � Checklist de ve�culo embutido:** registrado no SPEC se��o Ve�culos/M�quinas que o checklist deve viver no app do conferente, n�o em app separado.
3. **Lacuna 3 � DRE/plano de contas tem estudo real:** registrado no SPEC se��o Financeiro mockado que existe consultoria 2026 para usar na fase posterior.
4. **Revis�o de m�dulos:** m�dulo 02-Vendas-Passagens atualizado com os 3 n�veis de BP-e; demais m�dulos revisados contra decis�es fechadas.
5. **QA visual + build:** `bun run build` exit 0; front aprovado mantido intacto.

**Conclus�o:** todas as tarefas pendentes (#1�#8) foram conclu�das. O front mockado est� alinhado com as regras da reuni�o, a documenta��o reflete as decis�es do cliente e o build passa sem erros.

**Pr�ximo passo recomendado:** iniciar integra��o back?contrato?front removendo mocks por m�dulo quando houver endpoint real equivalente (prioridade: `/app/tms` + `/campo/*`, depois `/app/vendas` + `/pos` + `/totem` + `/embarque`, `/app/cadastros`, caixa/CRM). Portal online entra por �ltimo conforme decis�o do cliente.
- **Contexto:** continuidade da integracao front/back apos `/portal` e `/cliente`; objetivo e remover mocks por modulo sem redesenhar o front aprovado.
- **O que foi feito:** `apps/web-console/src/lib/ajc-api.ts` ganhou sessao autenticada (`login`, `refresh`, `me`, `logout`) com token em `localStorage`, chamadas protegidas e tipos para viagens/templates/embarcacoes. A tela de login cinematografica passou a chamar `POST /api/auth/login` com login corporativo, salvar a sessao e redirecionar para `/app/inicio`; `/app/*` agora valida a sessao em `GET /api/auth/me`.
- **Navegacao conectada:** `/app/navegacao` passou a carregar `GET /api/navegacao/viagens`, `GET /api/navegacao/templates-rotas` e `GET /api/cadastros/embarcacoes`; KPIs, calendario, painel operacional, frota, cronograma, capacidade e tabela de embarcacoes deixam de usar `EMBARCACOES`/`VIAGENS` do mock. Escala de colaboradores ainda usa mock porque falta endpoint dedicado de escala/alocacao.
- **Verificacao:** `bun run build` em `apps/web-console` exit 0.
- **Proximo passo recomendado:** continuar a integracao das rotas internas guiadas pelo front aprovado: `/app/tms` + `/campo/*` primeiro (cargas, volumes, paletes, portaria, recebimento, entregas), depois `/app/vendas` + `/pos` + `/totem` + `/embarque`, e por fim `/app/cadastros`, caixa/CRM. Sempre remover o mock somente quando houver endpoint real equivalente.

## Trabalho 2026-07-02 - Front publico conectado ao backend do Portal
- **Contexto:** primeira fatia da integracao front/back e remocao gradual dos mocks, comecando pelas superficies publicas aprovadas: `/portal` e `/cliente`.
- **O que foi feito:** criada a camada `apps/web-console/src/lib/ajc-api.ts` com `VITE_AJC_API_URL` configuravel e fallback de producao `https://apiajc.byteintelligence.com.br/api`; `/portal` passou a buscar viagens reais em `GET /api/portal/viagens`, mapear classes/capacidade/preco do backend, criar reserva real em `POST /api/portal/pedidos`, criar pagamento stub em `POST /api/portal/pedidos/:codigo/pagamentos` e confirmar via webhook stub auditavel `POST /api/portal/webhooks/stub`; `/cliente` passou a consultar `GET /api/portal/cliente/bilhetes` por CPF/CNPJ ou e-mail salvo/informado.
- **Mocks removidos nesta fatia:** `/portal` nao usa mais `VENDA_OFERTAS` nem `PRECOS_PASSAGEM`; `/cliente` nao usa mais `CLIENTE_BILHETES`. Ainda usa dados visuais aprovados de cidades/classes/pulseiras/QR deterministico, ate essas superficies serem substituidas por config/API propria.
- **Verificacao:** `bun install --force` em `apps/web-console` restaurou `node_modules` corrompido; `bun run build` em `apps/web-console` exit 0; `npm run build` em `apps/api` exit 0; `node infra/migrations/run.mjs --status` mostrou 13/13; `npm test -- --runInBand` em `apps/api` exit 0 (2 suites, 5 testes); `npm run seed --workspace apps/api` exit 0; API em `API_PORT=3000` validou contrato usado pelo front: busca BEL->STM 2026-07-08, pedido, pagamento PIX stub, webhook aprovado, bilhete emitido e consulta por e-mail. Registros temporarios foram removidos.
- **Observacao operacional:** o front usa `VITE_AJC_API_URL` para apontar o backend. Em producao/Vercel, configurar `VITE_AJC_API_URL=https://apiajc.byteintelligence.com.br/api`; o fallback do codigo tambem aponta para esse dominio para evitar bundle batendo em localhost.
- **Proximo passo recomendado:** continuar integracao front/back nas rotas internas, sem redesenhar: primeiro autenticar/login e criar cliente API compartilhado para rotas protegidas; depois `/app/navegacao`, `/app/tms` + `/campo/*`, `/app/vendas` + `/pos` + `/totem` + `/embarque`, `/app/cadastros`, caixa/CRM. Remover mocks por modulo somente quando a tela estiver consumindo endpoint real equivalente.

## Trabalho 2026-07-02 - Backend Portal/Pedido/Reserva/Pagamento/Fiscal stub funcional
- **Contexto:** quinta fatia vertical da Fase 2, guiada pelo front aprovado: `/portal` (venda online), `/cliente` (minhas viagens) e contrato da Parte C de Vendas/Passagens.
- **O que foi feito:** criada a migration `infra/migrations/0013_portal_pedido_pagamento_fiscal.sql` com `portal_pedido`, `portal_reserva`, `portal_pagamento`, `portal_webhook_evento` e `bilhete_documento_fiscal` (stub BP-e). Adicionado `PortalModule` no NestJS com endpoints publicos para buscar viagens/ofertas, criar pedido com reserva TTL, criar pagamento stub, processar webhook idempotente e consultar bilhetes do cliente.
- **Regras implementadas:** reserva usa capacidade real de `viagem.capacidade_pax_disponivel`, bilhetes ja emitidos e reservas ativas para evitar overbooking; transacao usa advisory lock por viagem/classe/assento; preco vem da tabela ativa `tabela_preco/item_preco`, nao do front; estados seguem pedido `reservado -> aguardando_pagamento -> emitido` no fluxo aprovado; webhook aprovado emite bilhete, termo de aceite, documento fiscal stub e auditoria.
- **Verificacao:** `DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc node infra/migrations/run.mjs --status` mostrou 13/13 aplicadas; `npm run build` em `apps/api` exit 0; `npm test -- --runInBand` em `apps/api` exit 0 (2 suites, 5 testes); `npm run seed --workspace apps/api` exit 0; API em `API_PORT=3015` validou fluxo real: `GET /api/portal/viagens`, `POST /api/portal/pedidos`, `POST /api/portal/pedidos/:codigo/pagamentos`, `POST /api/portal/webhooks/stub`, `GET /api/portal/pedidos/:codigo` e `GET /api/portal/cliente/bilhetes`. Registros temporarios de teste foram removidos.
- **Pendencias externas mantidas:** gateway PIX/cartao real, BP-e real, senha/validade/uso do PFX, credenciamento SEFAZ-PA e fornecedor/API fiscal. O backend esta pronto com adaptadores/stubs auditaveis para plugar isso depois.
- **Proximo passo recomendado:** iniciar **integracao front/back e remocao gradual dos mocks**, sem redesenhar o front aprovado. Comecar por cliente API/autenticacao e rotas publicas `/portal` + `/cliente`, depois internas por dependencia: `/app/navegacao`, `/app/tms`, `/campo/*`, `/app/vendas`, `/pos`, `/totem`, `/embarque`, `/app/cadastros` e paineis de caixa/CRM.

## Trabalho 2026-07-02 - Backend Vendas/Caixa/Bilhetes funcional
- **Contexto:** quarta fatia vertical da Fase 2, guiada pelo front aprovado: PDV porto, totem, manifesto de passageiros, cortesias/gratuidades, app de embarque e area do cliente.
- **O que foi feito:** criada a migration `infra/migrations/0012_vendas_caixa_operacional.sql` com snapshots operacionais em `bilhete` (`codigo`, documento do passageiro, assento, canal, observacoes), `caixa` (`tipo`, `referencia`), `caixa_movimento.observacao` e idempotencia de `cortesia`; adicionados `VendasModule` e `CaixaModule` no NestJS; endpoints protegidos por RBAC para listar/criar bilhetes, validar QR, manifesto por viagem, cortesias, gratuidades, abrir/fechar caixa e movimentos.
- **Seed atualizado:** `infra/seed/run.mjs` agora cria caixa do porto, 5 bilhetes seed (pagos, online, suite, gratuidade e cortesia), movimentos de caixa, gratuidade regulatoria e cortesia vinculada; tambem ficou idempotente ao recriar precos e volumes ja referenciados. `infra/seed/0001_seed_minimo.sql` recebeu `vendas.ver`, `vendas.cortesia` e `caixa.ver`.
- **Verificacao:** `node infra/migrations/run.mjs --status` mostrou 12/12 aplicadas; `npm run build` exit 0 no WSL; `npm test -- --runInBand` exit 0 (2 suites, 5 testes); `npm run seed` exit 0; API em `API_PORT=3014` respondeu autenticada: 5 bilhetes seed, 1 caixa, manifesto por viagem, `POST /api/vendas/bilhetes` criou `BIL-2026-00006` com movimento de caixa e `POST /api/vendas/bilhetes/:id/validar` retornou `valido`. O bilhete de teste foi removido depois.
- **Proximo passo recomendado:** iniciar **Portal/Pedido/Reserva/Pagamento/Fiscal stub**: modelar pedido/reserva com concorrencia/sem overbooking, estados pedido->pagamento->bilhete, adaptador mock de gateway/webhook, area do cliente e stub fiscal BP-e. Nao integrar gateway/BP-e real ainda sem senha PFX, credenciamento SEFAZ-PA e fornecedor/API fiscal.


## Trabalho 2026-07-01 — Backend TMS/Carga/Veículos/Encomendas funcional
- **Contexto:** terceira fatia vertical da Fase 2, guiada pelo front aprovado: Nova Carga, NF/DC, UUID/QR por volume, paletes, portaria, entrega com prova, Veículos/Máquinas e Encomendas com Declaração de Conteúdo.
- **O que foi feito:** criada a migration `infra/migrations/0011_tms_operacional.sql` com campos operacionais em `carga` (`codigo`, `numero_pedido`, `categoria`, origem, peso total, observações) e origem do documento fiscal; módulos NestJS `TmsModule`, `VeiculosModule` e `EncomendasModule`; endpoints protegidos por RBAC para cargas, volumes/eventos, paletes, portaria, entregas, veículos/fotos/eventos e encomendas.
- **Seed atualizado:** `infra/seed/run.mjs` agora cria base comercial mínima (agentes/clientes), paletes, 2 cargas, 1 encomenda, documentos NF/DC, volumes UUID, alocação de palete, registro de portaria, entrega com protocolo/fotos/assinatura e um veículo em trânsito com eventos de cadastro/vistoria/etiqueta/bipe. `infra/seed/0001_seed_minimo.sql` recebeu permissões `tms.ver/criar`, `veiculos.ver/criar` e `encomendas.ver/criar`.
- **Verificação:** `node infra/migrations/run.mjs` aplicou `0011`; `node infra/migrations/run.mjs --status` mostrou 11/11 aplicadas; `npm run build` exit 0; `npm test -- --runInBand` exit 0 (2 suites, 5 testes); `npm run seed` exit 0; API em `API_PORT=3012` respondeu autenticada: 3 cargas, 5 volumes, 3 paletes, 1 registro de portaria, 1 entrega, 1 veículo e 1 encomenda. `POST /api/tms/cargas` criou uma Nova Carga real com pedido cliente+NF, documento e 3 volumes; a carga de teste `NFE-CODEX-TESTE` foi removida depois.
- **Próximo passo recomendado:** iniciar **Vendas/Caixa/Bilhetes**: emissão de bilhete por PDV/totem/contrato/cortesia/gratuidade, validação de QR, caixas/movimentos, manifesto por viagem, limites de cortesia e base para Portal/Pedido/Reserva/Pagamento.

## Trabalho 2026-07-01 — Backend Config/Cadastros/Preços/Navegação funcional
- **Contexto:** segunda fatia vertical da Fase 2, seguindo o front aprovado como contrato: Nova Viagem, frota Lucas, templates do FAQ 2026 e preços reais iniciais de passagem.
- **O que foi feito:** criada a migration `infra/migrations/0010_navegacao_operacional.sql` (código/destino/capacidade por classe/client_uuid em `viagem`, observação em `viagem_escala`, enum `status_viagem.cancelada`, índice único de embarcação viva); módulos NestJS `ConfigModule`, `CadastrosModule`, `PrecosModule` e `NavegacaoModule`; endpoints protegidos por RBAC para cidades, embarcações, agentes/clientes, config versionada, matriz de preços de passagem, templates de rotas e viagens.
- **Seed atualizado:** `infra/seed/run.mjs` agora grava frota oficial Lucas (`F/B AMAZONAS II` a `VI` + `F/B PARU (CARGAS)`), matriz de classes por embarcação, templates de paradas do FAQ 2026, formas de pagamento/regras públicas do FAQ, tabela ativa de preços de passagem por 7 destinos e 3 viagens futuras de exemplo.
- **Verificação:** `node infra/migrations/run.mjs` aplicou `0010`; `npm run build` exit 0; `npm test -- --runInBand` exit 0 (2 suites, 5 testes); `npm run seed` exit 0; API em `API_PORT=3011` respondeu autenticada: 8 cidades, 6 embarcações, 4 templates de rota, 7 trechos de preço e 3 viagens. `POST /api/navegacao/viagens` criou uma viagem real com 4 escalas e capacidade por classe; a viagem de teste `V-2026-0004` foi removida depois.
- **Próximo passo recomendado:** iniciar **TMS/Carga/Veículos/Encomendas**: endpoints e serviços para Nova Carga (pedido = COD CLIENTE + NF/DC, UUID/QR, código de carga, viagem, origem/destino, cliente, peso/valor), volumes/etiquetas, portaria, paletes, recebimento direto, entregas e Veículos/Máquinas.

## Trabalho 2026-07-01 — Backend Auth/RBAC/sessão funcional
- **Contexto:** início da Fase 2 funcional pelo alicerce de acesso, conforme runbook `docs/fase-2/01-PROMPT-Backend-MVP-Completo.md`.
- **O que foi feito:** `DatabaseService` sobre `pg`; `AuthModule` com `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` e `GET /api/auth/me`; senha PBKDF2-SHA256; tokens HMAC-SHA256 com sessão; `AuthGuard`, `RequirePermissions` e `CurrentUser`; CORS local; seed programático `infra/seed/run.mjs`; scripts `start`/`worker` corrigidos para `dist/apps/api/src/...`.
- **Verificação:** no WSL2, `npm run build` exit 0; `npm test -- --runInBand` exit 0 (2 suites, 5 testes); `npm run seed` exit 0; login real `admin/admin123` em `/api/auth/login` retornou perfil `Administrador`, 13 permissões, access token e refresh token válidos.
- **Próximo passo recomendado:** iniciar **Config/Cadastros/Preços/Navegação**: serviços SQL + endpoints para motor de config, cidades, embarcações/classes, templates do FAQ 2026, preços de passagem e criação/listagem de viagens. Depois seguir TMS/Carga/Veículos/Vendas/Caixa e por último Portal/Pedido/Pagamento/Fiscal stub.

> Atualize ao fim de cada bloco de trabalho. Topo = mais recente. Uma sessão nova lê o `CLAUDE.md` e depois este arquivo para saber exatamente onde retomar.

## Planejamento 2026-07-01 — Prompt/runbook para backend MVP completo
- **Contexto:** front aprovado/refinado por outra IA; usuário quer partir para "matar o backend" em uma frente grande, usando o front como contrato de comportamento.
- **Registro criado:** `docs/fase-2/01-PROMPT-Backend-MVP-Completo.md`.
- **Direção:** continuar do backend já iniciado, não começar do zero. O backend atual já tem NestJS, `DatabaseModule`, `HealthController`, migrations SQL puro, runner `infra/migrations/run.mjs`, `schema_migrations`, classes reais de passagem, schema de Veículos/Máquinas e harness Jest.
- **Próximo passo recomendado:** executar o runbook começando por Auth + RBAC + sessão, depois Config/Cadastros/Preços/Navegação, TMS/Veículos/Vendas/Caixa, Portal/Pedido/Reserva/Pagamento/Fiscal stub e integração gradual do front.
- **Atualização de continuidade:** `AGENTS.md` e `CLAUDE.md` agora apontam a frente ativa para backend MVP funcional e referenciam o runbook de Fase 2.

## Trabalho 2026-07-01 — Fundação do backend: controle de migrations, enum de classes, schema de Veículos/Máquinas e harness de testes
- **Contexto:** primeira frente de backend real. Objetivo era alinhar o schema já aplicado com os docs canônicos e as decisões da validação do cliente, sem reabrir decisões fechadas.
- **O que foi feito:**
  - **Controle de versão de migrations** (`infra/migrations/0008_schema_migrations_e_classes_8.sql` + `infra/migrations/run.mjs`): criada a tabela `schema_migrations` (versao/hash/aplicado_em) e um runner leve em `pg` puro (`node run.mjs`, com `--status` e `--baseline`). As migrations 0001–0008 foram registradas via `--baseline` (já estavam aplicadas à mão). O runner ancora o `require('pg')` em `apps/api/package.json` porque `pg` não está hoisted para a raiz e a resolução ESM de `infra/` não o alcança (env `PG_REQUIRE_BASE` sobrescreve se o layout mudar).
  - **classe_passagem 3 → 8 classes reais** (mesma migration 0008): `rede_vip` renomeado para `rede_sala_vip` + 5 novas (`suite_comum`, `suite_comum_vip`, `suite_master`, `suite_master_vip`, `mega_suite`), alinhando o banco ao doc canônico (`docs/fase-0/01-Modelo-de-Dados-MVP.md` §2, já atualizado em 30/jun pelo material do Lucas) e ao `libs/shared/domain-types/src/enums.ts` (agora com as 8 + `CLASSE_PASSAGEM_LABEL`). Capacidade por classe segue em `embarcacao.capacidade_pax` (JSONB), não no enum — "zero hard-code".
  - **Schema de Veículos/Máquinas** (`infra/migrations/0009_veiculos_maquinas.sql`): promovido de gancho §16 a MVP pela validação. Três tabelas espelhando os padrões do TMS (soft-delete, trigger `set_atualizado_em`, `client_uuid` para sync offline, prova fotográfica com hash, log imutável): `envio_veiculo` (com máquina de estados `rascunho→vistoria→embarque→em_transito→entrega→entregue/cancelada` e CHECK "veículo exige placa"), `envio_veiculo_foto` (etapa vistoria/entrega) e `envio_veiculo_evento` (etiqueta, bipe_subida/descida, checklist — append-only). Modelagem derivada do front já validado `VeiculosTab.tsx`.
  - **Harness de testes** (`apps/api`): Jest 29 + ts-jest + @nestjs/testing + Supertest adicionados; `jest.config.js` (unit) + `test/jest-e2e.json` (e2e); smoke test `src/health/health.controller.spec.ts` cobrindo db up/down.
- **Verificação:** runner aplicou 0009 (`8/8` migrations no `--status`); banco confirma `classe_passagem` com as 8 na ordem canônica e as 3 tabelas `envio_veiculo*` criadas; `npm run build` da api exit 0; `npm test` → 2/2 passando; `tsc --noEmit` isolado do `enums.ts` exit 0. Tudo rodado dentro do WSL2.
- **Próximo passo:** iniciar a camada de acesso (Auth + RBAC + sessão, tarefa #12) como primeira fatia vertical, usando o harness recém-criado. Decisão operacional desta rodada: seguir **sem ORM**, com migrations em SQL puro + runner próprio + `pg` no NestJS.

## Trabalho 2026-06-30 — Nova Viagem, Nova Carga e Prestação refinados no front
- **O que foi feito:**
  - `apps/web-console/src/routes/app.navegacao.tsx`: painel **Nova viagem** reescrito com os campos do Lucas — número auto, FerryBoat em lista (frota oficial F/B Amazonas II–VI + Paru), saída, paradas com **preenchimento automático via templates do FAQ 2026** (Belém→Almeirim, Belém→Santarém quarta/sexta, retorno de sábado), passageiros em rede (manual) e camarotes/classes condicionais à embarcação (matriz do Lucas). Chips de atenção sinalizam horários do PDF a validar.
  - `apps/web-console/src/routes/app.tms.tsx`: painel **Nova carga** reescrito com os campos do Lucas — pedido = COD CLIENTE + NF/DC, UUID/QR e código de carga gerados pelo sistema, viagem/origem/destino, cliente da NF/DC ou manual, upload NF/DC, CIF/FOB, peso e valor, agendamento por janela. Adicionado helper `CargaField`.
  - `apps/web-console/src/components/ops/tms/PrestacaoTab.tsx`: já reescrito para espelhar o modelo real (cabeçalho/caixa, À bordo, Cozinha/Lanchonete/Internet, Passagens — Agências, Fretes — Agências, Despesas, Redondas/Gratificações, Fechamento, Local/Data/Responsável, PDF).
  - Portaria (`PortariaTab`): conferido — já possui tile "Foto (recomendada)" no registro de entrada de veículo de carga; obrigatoriedade segue pendente de confirmação do cliente.
- **Verificação:** `bun run build` exit 0; rotas `/app/tms`, `/app/navegacao`, `/campo/portaria` respondem 200 no dev server.
- **Checklist atualizado:** marcadas as tarefas de Nova Viagem (refino + templates FAQ), Nova Carga (refino) e Prestação (modelo real) e a conferência de foto na portaria em `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md`.
- **Próximo passo:** QA visual/navegação do core interno (abrir os painéis e validar leitura), depois atacar o Portal online (último item do MVP). Backend só depois do front aprovado. Validar com Lucas as divergências de horário do FAQ e as capacidades numéricas reais por classe/embarcação antes do cadastro definitivo.

## Material recebido 2026-06-30 — FAQ 2026 de paradas, preços e portos
- **Novo arquivo analisado:** `C:\Users\Administrador\Downloads\FAQ 2026.pdf`.
- **Registro criado:** `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`.
- **Pendências baixadas:** DOC FAQ das paradas automáticas; trechos/rotas públicas; preços de passagem por destino/classe; formas de pagamento atuais; regras públicas de meia/isento; endereços dos portos.
- **Atenção:** o PDF tem divergências internas de horário (ex.: 17h vs 18h em saídas, chegada em Santarém com horário cravado vs "início da tarde"). Para front mockado é suficiente; para backend/cadastro definitivo, validar com Lucas antes de publicar tabela oficial.
- **O que NÃO foi resolvido:** tabela de preço de encomendas, tabela/regra de preço de veículos/máquinas, capacidades numéricas reais por classe/embarcação, termo de embarque, cores de pulseira, gateway e BP-e.
- **Impacto no front:** próxima IA deve refinar `/app/navegacao` usando os templates de rota/paradas do FAQ e pode refinar Cadastros/Vendas com preços reais de passagem do FAQ 2026. Não ligar backend agora.

## Material recebido 2026-06-30 — campos de Nova Viagem e Nova Carga
- **Novo material recebido do Lucas:** campos para Botão Nova Viagem, lista/classes de embarcações e Botão Nova Carga.
- **Registro criado:** `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md`.
- **Pendências baixadas:** campos detalhados de Nova Viagem; lista de embarcações; matriz de classes por embarcação; campos detalhados de Nova Carga.
- **Atualização:** o DOC FAQ foi recebido depois e registrado em `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`; resta validar divergências internas de horário antes do backend definitivo.
- **Ainda pendente dentro desse assunto:** capacidades numéricas reais por classe/embarcação, caso existam em tabela separada.
- **Impacto no front:** próxima IA deve refinar `/app/navegacao` com Nova Viagem e matriz de embarcação/classes, e refinar `/app/tms`/Nova Carga com pedido/venda, UUID/QR, código de carga, viagem, origem/destino, cliente, upload NF/DC, peso e valor. Isso entra junto com os ajustes já pendentes de `PrestacaoTab` e foto na portaria.

## Auditoria 2026-06-29 — transcrição bruta conferida
- **Fonte auditada:** `C:\Users\Administrador\Desktop\texto.txrt.txt`.
- **Registro criado:** `docs/feedback/2026-06-29-auditoria-transcricao-bruta-e-pendencias.md`.
- **Resultado:** o consolidado `docs/feedback/2026-06-25-validacao-core-telas.md` cobre os pontos principais da reunião e do documento de pauta anexado ao fim da transcrição.
- **Nuances adicionadas a partir do bruto:** apps internos provavelmente por instalação direta/fora da Play Store; portaria cita foto no registro de veículo de carga; regra financeira futura de carga: toda carga tem valor declarado/cobrado, nenhuma carga sobe sem etiqueta/cobrança, etiquetas geram cobrança, e foi citada comissão de 2% com relatório separado por viagem.
- **Impacto:** nada disso bloqueia o front mockado. O próximo passo continua sendo `PrestacaoTab` pelo modelo real, QA visual e Portal por último.

## Material recebido 2026-06-29 — certificado digital PFX da AJC
- **Novo arquivo recebido:** `C:\Users\Administrador\Downloads\2866916_A__J__C__NAVEGACAO_LTDA_10736847000192 (1).pfx`.
- **Registro criado:** `docs/feedback/2026-06-29-certificado-digital-ajc-pfx.md`.
- **Pendência parcialmente resolvida:** o material de certificado digital para o fluxo fiscal/BP-e foi recebido. O nome do arquivo indica AJC Navegação LTDA / CNPJ `10.736.847/0001-92`.
- **Cuidados obrigatórios:** não copiar o PFX para o repo, não commitar e não registrar senha em docs/código/chat. `.gitignore` agora bloqueia `*.pfx`, `*.p12`, `*.jks` e `*.keystore`.
- **Ainda pendente:** senha do PFX, validade/cadeia/uso do certificado, confirmação de que serve para BP-e, credenciamento SEFAZ-PA, fornecedor/API fiscal, homologação/produção e desenho seguro de armazenamento em produção.
- **Impacto no trabalho atual:** não muda o próximo passo imediato de front. Primeiro refinar Prestação de Contas pelo modelo real; depois QA/Portal. Para o Portal/backend fiscal, considerar que o certificado foi recebido, mas o fluxo BP-e ainda exige spike fiscal.

## Material recebido 2026-06-29 — modelo real de prestação de contas
- **Novo arquivo analisado:** `C:\Users\Administrador\Downloads\PRESTAÇÃO DE CONTAS GERENTES AM VI 24 09 (2).docx`.
- **Registro criado:** `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`.
- **Pendência externa resolvida:** "modelo atual em papel da prestação de contas do gerente" agora foi recebido. Ele valida a estrutura real do formulário: cabeçalho com embarcação/viagem/período/caixa, receitas À bordo, cozinha por dia, lanchonete, internet, passagens por agências com comissão/saldo, fretes por agências, despesas, redondas/gratificações, fechamento com receita/despesa/saldo repassado e assinatura local/data/responsável.
- **Reabertura pontual do front:** antes de considerar o core interno 100% pronto para QA final, ajustar `apps/web-console/src/components/ops/tms/PrestacaoTab.tsx` para espelhar esse modelo real. O checklist foi atualizado em `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md`.
- **O que NÃO mudou:** BP-e/gateway, preços de encomendas, declaração de conteúdo, termos, impressora Bluetooth, regras definitivas de comissão e provedores continuam pendências externas. Observação: o PFX foi recebido depois, mas BP-e ainda depende de senha/validade/credenciamento/fornecedor.

## Implementação 2026-06-29 — core interno do front pós-validação aplicado
- **SPEC/checklist criado e atualizado:** `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md` agora quebra a rodada em SPEC, tarefas e detalhamento por tela/módulo.
- **Core interno ajustado no front mockado:** `/app/inicio`, `/app/navegacao`, `/app/tms`, apps de campo simulados dentro do TMS, `/app/encomendas`, `/app/vendas`, `/pos`, `/embarque`, `/app/crm`, `/app/cadastros` e `/app/financeiro` receberam os pontos da reunião/transcrição: caixas separados, alerta cadastrável, calendário/nova viagem, conflito de escala, CIF/FOB, agenda 30 min/5 caminhões, MP/PD/PC, palete completo/parcial, reimpressão de etiqueta, prestação de contas detalhada, Veículos/Máquinas, portaria/recebimento/entrega, multipagamento, agente comercial, cortesias, manifesto, BP-e, QR usado/vencido, remetente/destinatário completos, cidade/UF, intertrecho, preços por cliente/destino e financeiro mínimo sem prometer conciliação/Compras/DRE agora.
- **Verificação:** `bun run build` em `apps/web-console` passou com exit 0 depois das alterações.
- **Próximo passo para qualquer agente/IA nova:** fazer QA visual e de navegação do front ajustado no navegador, corrigir eventuais quebras visuais/responsivas, e só então partir para o **Portal online** (último bloco do MVP) ou para o desenho do backend funcional por ordem de dependência. Não reabrir escopo: reunião/transcrição continua mandando.

## Correção de escopo 2026-06-29 — reunião/transcrição manda
- **Hierarquia corrigida:** a reunião/transcrição de validação do cliente (`docs/feedback/2026-06-25-validacao-core-telas.md`) é a fonte vigente da rodada atual. Se divergir de documento antigo, corrigir o documento antigo; não tratar como conflito.
- **Veículos/Máquinas entram agora no MVP**, conforme pedido na reunião: envio por PDV/Comercial/Gerente do Porto, checklist/fotos, etiqueta, bipe de subida/descida e checklist de entrega.
- **Impressão térmica deve considerar Bluetooth**, conforme transcrição. A decisão antiga de PC/USB foi superada para esta rodada; atualizar UX/arquitetura/implementação nessa direção.
- **Permanece fora desta rodada:** Financeiro completo, Compras/DRE e ERP financeiro avançado. Portal online com pagamento continua no MVP, mas será trabalhado por último após o core interno.

## Execução ativa 2026-06-29 — ajustar front pós-validação
- **Status:** checklist do core interno estava concluído, mas o modelo real de prestação de contas recebido em 2026-06-29 reabriu um refinamento pontual em `PrestacaoTab`.
- **Próximo passo para qualquer agente/IA nova:** abrir `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md` e `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`; ajustar primeiro a aba de Prestação de Contas no front.
- **Ordem restante:** refinamento de Prestação de Contas pelo modelo real → QA visual/responsivo do core interno → Portal online por último → backend funcional por ordem de dependência.
- **Natureza do trabalho:** front real mockado para aprovação; não ligar backend agora. Usar mocks, cards, tabelas, formulários e estados visuais suficientes para o cliente validar regra.
- **Verificação:** ao final de cada bloco de front, rodar `bun run build` em `apps/web-console` e atualizar este STATUS + checklist da SPEC.

## Retomada 2026-06-29 — entendimento pós-validação do cliente
- **Contexto absorvido:** lidos `AGENTS.md`, `docs/STATUS.md`, PRD/SPEC, módulos 01..09, UX 00..05, roadmap pós-MVP, ADRs, Fase 0/modelo de dados, migrations/seed, estrutura do front `apps/web-console` e a reunião de feedback do cliente.
- **Feedback do cliente consolidado:** novo doc em `docs/feedback/2026-06-25-validacao-core-telas.md`. Fontes brutas estavam em Downloads: `VALIDAÇÃO DO CORE DE TODAS AS TELAS 2.0.docx`, `parte1.txt`..`parte4.txt` e transcrições timestampadas.
- **Direção atual:** antes de ligar backend, ajustar o front mockado com base na validação tela a tela do cliente. Sequência recomendada: TMS/Navegação → Veículos/Máquinas e apps de campo → Vendas/PDV/Passagens → Encomendas → CRM/Cadastros → deixar Financeiro/Compras/DRE como fase posterior.
- **Portal online:** continua MVP, mas fica por último dentro da rodada do MVP. Antes de backend definitivo do portal, atualizar o modelo canônico/migrations: a Parte C de Vendas exige `Pedido`, `Reserva`, `Pagamento`, webhook e fiscal plugável, mas as migrations atuais ainda estão em `bilhete` + `caixa_movimento`.
- **Atenção de escopo:** Veículos/Máquinas foram trazidos para agora pela reunião. Compras, DRE e Financeiro completo continuam posteriores.

## Deploy (Vercel)
- **Front `apps/web-console` → Vercel.** Root Directory: `apps/web-console`. Install/Build com **Bun** (`vercel.json`). SSR via Nitro com preset **vercel** forçado em `vite.config.ts` (`nitro: { preset: "vercel" }`) — sem isso o wrapper do Lovable pula o plugin de deploy fora do ambiente Lovable e a saída fica só estática (404 na raiz). Saída gerada em `.vercel/output/` (Build Output API v3, função `__server.func`).
- Autoria git do repo fixada localmente em `wcristian799 <wellington.cris799@gmail.com>` (antes ia como `dev@ajc.local`, não vinculado ao GitHub).

## Onde estamos agora
**Fase atual:** Fase 1 — telas reais mockadas para aprovação comercial. **Front adotado e telas dos módulos MVP construídas.** (Fase 0/banco já validada no WSL — ver mais abaixo.)
**Status:** o designer do cliente entregou um front completo (Lovable) que **adotamos como base oficial** em `apps/web-console` — design system "Crimson Prestige", TanStack Start + Bun + shadcn + Tailwind v4 + motion. Login cinematográfico mantido idêntico. Telas internas (início, navegação, tms, vendas, crm, financeiro, cadastros) e superfícies (portal de venda online, pos, totem, embarque, cliente) com usabilidade real e mockada. Build verde, navegação verificada no preview.

### Front web — construído e VERIFICADO (sessão jun/2026)
- **Revisão de UX tela por tela:** mapa de gaps em `docs/ux/MAPA-GAPS-UX.md` (referência × SPEC × gap por tela). Telas de gestão estavam boas; faltavam telas operacionais/de campo.
- **TMS/Carga COMPLETADO** (era o maior gap): rota `/app/tms` expandida com B.1 Portaria, B.2/B.3 Notas & DC, B.5 Etiqueta térmica, B.6 Paletes, B.8 Recebimento direto/cross-docking, B.9 Entregas (foto+assinatura+protocolo), B.10 Prestação de contas, B.11 Controle por viagem. Componentes em `src/components/ops/tms/` (PhoneFrame compartilhado). B.4/B.7 (simulador coletor) preservados.
- **Encomendas CRIADO do zero:** rota `/app/encomendas` (+ entrada no HelmDock, ícone Package). Abas B.1 Despacho, B.2 Declaração de conteúdo (assinatura obrigatória — botão confirma bloqueado sem assinar; cláusula de exclusão visível), B.3 Cotação, B.4 Controle por viagem, B.5 Rastreamento. Componentes em `src/components/ops/encomendas/`. Precificação A.1 funcional com valores placeholder (🔶 tabela do Lucas).
- **Vendas operacional REFINADO:** B.6 Gerador de cortesias (limite/contador por viagem, bloqueia ao atingir teto) e B.8 Manifesto de passageiros por viagem (totais por classe/tarifa, status de embarque).
- **Bug de tipo pré-existente corrigido:** `embarque.tsx` passava `style` a um ícone lucide (tsc acusava). Agora `tsc --noEmit` = 0 erros em toda a base.
- **Adoção:** `temp-front` (entrega do designer) movido para `apps/web-console`. Stack: TanStack Start (React 19 SSR/Nitro) + Bun + shadcn/ui (new-york) + Tailwind v4 + motion + recharts. Design system "Crimson Prestige" em `src/styles.css` (vermelho AJC/preto/platina, dark padrão) — base oficial, não refazer.
- **Login** (`src/routes/index.tsx`): cinematográfico (tinta carmim, balsa percorrendo rota fluvial, headline kinetic, botão magnético). Mantido IDÊNTICO por decisão do dono.
- **Telas internas** (`/app/*`, via 2 subagents): inicio (dashboard diretoria com radar, VoyageTrack, feed ao vivo, KPIs), navegacao (embarcações + cronograma + escalas), vendas (canais incl. portal, ocupação por classe, cortesias/gratuidades), crm (ficha 360º, cotações), financeiro (caixas, AP/AR, comissões — leve, Fase 2), cadastros (RBAC matriz, preços com reajuste em massa, fornecedores/colaboradores).
- **Superfícies de venda/campo:** `/portal` (venda online pública, mobile-first, 7 passos busca→pagamento→QR — é MVP), `/pos` (PDV porto, gratuidade/cortesia/caixa), `/totem` (autoatendimento), `/embarque` (validação bilheteiro offline-first, QR válido/já-validado/inválido), `/cliente` (minhas viagens).
- **Bugs de SSR resolvidos:** hydration mismatch no RadarSweep (coordenadas Math.cos/sin arredondadas) e CountUp preso em 0 (animação no mount + salvaguarda setTimeout). Documentado no CLAUDE.md (seção Front) para não reintroduzir.
- **Como rodar:** pasta `apps/web-console`, `export PATH="$HOME/.bun/bin:$PATH" && bun run dev`, porta **8080**. Build: `bun run build` (exit 0 verificado).
- **Ressalvas atualizadas:** filtros/busca/botoes visuais daquela etapa foram sendo fechados por fatias; QR fake foi resolvido em 03/jul/2026 com RealQR; falha de pagamento do portal permanece stub auditavel ate gateway real.

## Onde estamos agora (Fase 0 — base técnica, já validada)
**Banco + API validados rodando no WSL.** Monorepo, tipos, migrations (42 tabelas) e seed prontos e APLICADOS em Postgres vivo; esqueleto NestJS sobe e o health-check confirma `db:up`.

### Já construído e VERIFICADO
- Monorepo: configs Nx, `tsconfig.base.json` (paths `@ajc/*`), `.gitignore`, `.env.example`, READMEs.
- `libs/shared/domain-types`: enums do MVP — tsc OK.
- `infra/migrations/0001..0007` + `infra/seed`: **aplicados em Postgres 16.14+PostGIS 3.6 no WSL** (teste de fogo verde — ver seção do banco).
- `apps/api` (NestJS): main + worker pg-boss + database pool + health + módulos vazios. **Build OK; `GET /api/health` → `db:up`** rodando no WSL.

### Banco — RESOLVIDO via WSL2 (Docker Desktop abandonado)
- **Docker Desktop (4.78 e 4.77) é inutilizável nesta máquina:** o "Inference manager" tenta criar o socket `unix://C:/...dockerInference` (caminho inválido no Windows) e derruba o app no boot, em ambas as versões, mesmo com `enableInference:false`. O lock via `admin-settings.json` exige licença Docker Business (não temos). **Decisão: não usar Docker Desktop.**
- **Solução adotada:** PostgreSQL **16.14 + PostGIS 3.6** instalados **nativos no WSL2 (Ubuntu-22.04)** via repositório PGDG. Cluster online na porta 5432. Role `ajc` / senha `ajc_dev` / db `ajc`.
- **TESTE DE FOGO PASSOU** (banco vivo): 42 tabelas, 27 enums, 9 índices únicos de `client_uuid`, índice GiST de geolocalização, FKs circulares adiadas OK, seed (8 cidades/8 perfis/13 permissões/7 configs), idempotência confirmada.

### Ambiente de execução = WSL (Linux), não Windows
- O forward de rede WSL2↔Windows (NAT, Win10 build 19045) é **instável**: `localhost`/`127.0.0.1` do Windows não alcança o Postgres do WSL de forma confiável (Node resolve `localhost`→IPv6 `::1`; NAT cobre só IPv4 e de forma intermitente; portproxy via IP do WSL também caiu porque o IP da VM muda a cada restart). `mirrored` não é suportado no Win10.
- **Decisão:** rodar o **back (Node/NestJS) DENTRO do WSL**, junto do Postgres, onde `localhost:5432` é nativo. É idêntico à produção (tudo Linux/Docker). Node 20.18 instalado no WSL.
- **API VALIDADA ponta a ponta:** `GET /api/health` → `{"status":"ok","db":"up"}` rodando no WSL contra o Postgres local. Build NestJS OK (precisou de `esModuleInterop` no tsconfig por causa do pg-boss).
- Scripts: `infra/apply-wsl.sh` (migrations+seed), `infra/verify-wsl.sh` (validação), `infra/open-pg-wsl.sh` (abre listen do PG), `infra/run-api-wsl.sh` (build+run da API no WSL). Rodar com `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu-22.04 -u root -- bash /mnt/c/.../infra/<script>.sh`.
- Para o FRONT (web-console): o Vite dev server roda no WSL e o navegador do Windows acessa — validar o forward nesse sentido (servidor no WSL→browser Windows costuma funcionar melhor que o inverso; testar no E5).

## Próximo passo imediato (retomada)
1. **Executar o backend MVP funcional** seguindo `docs/fase-2/01-PROMPT-Backend-MVP-Completo.md`.
2. **Começar/continuar por Auth + RBAC + sessão** (tarefa #12 indicada no topo), usando SQL puro + `pg`, sem ORM.
3. **Criar/atualizar migrations 0010+ e seeds idempotentes** para lacunas do portal e dados iniciais: perfis/permissões, usuário admin dev, embarcações/classes, templates do FAQ, preços de passagem e chaves de config.
4. **Implementar módulos por fatias verticais:** Config/Cadastros/Preços/Navegação → TMS/Carga/Veículos/Encomendas → Vendas/Caixa/Bilhetes → Portal/Pedido/Reserva/Pagamento/Fiscal stub → CRM/Audit/Sync.
5. **Integrar o front aprovado sem redesenhar:** substituir mocks por API gradualmente e manter o design Crimson Prestige/login intactos.
6. **Verificação obrigatória:** migrations no WSL, `npm run build`, `npm test` e `npm run test:e2e` quando existir; se tocar front, `bun run build`.
7. **Pendências paralelas:** gateway real, BP-e/SEFAZ real, WhatsApp/SMS, impressora Bluetooth, PowerSync/GPS e regras ainda não entregues pelo cliente entram como adapters/stubs/configuração, sem travar o MVP funcional.

> Decisão técnica encerrada para esta rodada: **sem ORM**. Seguir com SQL puro em `infra/migrations/`, runner `infra/migrations/run.mjs`, `pg` no NestJS e testes Jest.

## Linha do tempo (resumo)
- **Etapa 1 — Discovery/Produto:** PRD + SPEC global + 9 módulos documentados (`docs/`, `docs/modulos/`).
- **Etapa 2 — UX:** Fundação (design system/shell/acesso) + UX detalhada de TMS, Vendas, CRM, Cadastros, Navegação-core (`docs/ux/`). Telas com wireframes ASCII.
- **Etapa 3 — Roadmap:** recorte do MVP e backlog pós-MVP (`docs/ROADMAP-Pos-MVP.md`).
- **Etapa 4 — Arquitetura:** stack e repo definidos (ADR 00); spikes técnicos pesquisados — offline-sync (PowerSync), hardware (celular + impressão Bluetooth), hospedagem (VPS Hostinger) (ADR 01).
- **Etapa 5 — Fase 0 (em curso):** regra de continuidade criada (`CLAUDE.md` + este arquivo). Construção do repo a seguir.

## Decisões recentes
- **Escopo MVP atualizado (cliente):** o **portal público de venda de passagem online com pagamento integrado** ENTRA no MVP (Fase 1). Detalhado na Parte C do módulo Vendas/Passagens (`docs/modulos/02-Vendas-Passagens.md`). Isso adiciona ao caminho crítico: reserva de vaga com concorrência (sem overbooking), máquina de estados pedido/pagamento, gateway (webhook), área do cliente e gancho de emissão fiscal.
- **Front anterior descartado:** todo o front da sessão (web-console + conceito IGARAPÉ + libs/ui) foi removido a pedido do cliente; o **UX vai enviar um design system** para nos basearmos. Decisões técnicas de stack (React+TS+Vite, rodar no WSL) seguem válidas; só o visual será refeito sobre o DS do UX.
- Hardware atualizado pela validação do cliente: celular comum (não coletor industrial) + impressão térmica via Bluetooth. GPS background segue como risco técnico paralelo.
- Sequência confirmada com o cliente: Fase 0 → telas mockadas para aprovação comercial → MVP funcional → avançados.
- Telas de aprovação serão front real mockado (reaproveitável), não protótipo descartável.

## Pendências do cliente (🔶) — não bloqueiam a Fase 0
- **Emissão fiscal do bilhete (BP-e):** certificado PFX recebido em 29/jun/2026, mas ainda falta confirmar senha, validade/uso, credenciamento SEFAZ-PA e API/fornecedor. Ver §C.7 e `docs/feedback/2026-06-29-certificado-digital-ajc-pfx.md`.
- **Gateway de pagamento:** definir fornecedor (Mercado Pago / Pagar.me / Stripe / PagBank), meios (cartão/PIX), taxas e exigências — **spike antes de construir o portal**.
- Tabela de preço de encomendas (Lucas).
- Textos: termo de aceite de embarque, declaração de conteúdo, termo de veículos.
- Cores de pulseira por classe.
- Modelo da impressora de etiqueta (define ESC-POS vs ZPL e compatibilidade Bluetooth).
- Regras de comissão de agentes (diretoria).
- Provedores: pagamento, WhatsApp/SMS.
- **Ainda pendente do Lucas/AJC após 30/jun/2026:** validar divergências de horário do FAQ antes do cadastro definitivo; capacidades numéricas reais por classe/embarcação se houver tabela; campos de lançamento manual NF/DC se divergirem de Nova Carga; regra final de Etiquetar por volume; campos de cadastro de palete; tabela de preço de encomendas; regra/tabela de preço de veículos/máquinas; dados de cliente/cotação; fornecedores; plano de contas/centro de custo; DRE; fotos das embarcações.
- **Resolvido em 2026-06-29:** modelo atual em papel da prestação de contas do gerente recebido e registrado em `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`.
- **Resolvido em 2026-06-30:** campos de Nova Viagem, lista/classes de embarcações e campos de Nova Carga recebidos e registrados em `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md`.
- **Resolvido em 2026-06-30:** FAQ 2026 recebido e registrado em `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`, baixando DOC FAQ/paradas automáticas, preços de passagem, formas de pagamento atuais e endereços dos portos.

## Spikes técnicos a executar (ver ADR 01)
- Offline-sync: PowerSync self-hosted vs fila própria (1º spike, antes do TMS).
- **Pagamento + fiscal do portal:** escolher gateway e mapear o caminho do BP-e. PFX recebido, mas ainda depende de senha/validade/credenciamento/fornecedor fiscal. Derriscar antes de construir o portal funcional.
- GPS background em celular real (paralelo; afeta só rastreamento).
- Impressão Bluetooth com a impressora definida.

## Trabalho 2026-07-31 - Etapa 02: navegacao, calendario e programacao configuravel
- Fonte: Etapa 02 do documento vivo de 09/jul + `FAQ 2026 (1).pdf` recebido em 31/jul. O FAQ foi tratado como carga inicial; suas divergencias internas de horario permanecem sinalizadas para revisao humana no painel.
- Configuracao operacional: `Cadastros` ganhou a area `Configuracoes operacionais`, com rotas, origem/destino, dia/hora de saida, embarcacao padrao, intertrechos por offset, ativacao, revisao de divergencias e publicacao versionada com confirmacao. Nenhum horario, parada ou embarcacao padrao e inferido pelo front.
- Persistencia: migration `0024_navegacao_configuravel_calendario.sql` cria a chave versionada `navegacao_rotas_horarios`, importa seis sentidos do FAQ e adiciona a `viagem` o snapshot da versao/template, `ciclo_uuid` e motivo de cancelamento. Banco local conferido em 24/24 migrations.
- Backend: novas viagens exigem rota e versao validas; embarcacoes fora de operacao e sobreposicao de agenda sao bloqueadas. O ciclo operacional possui transicoes auditaveis `iniciar`, `concluir` e `cancelar`, esta ultima com motivo. Somente viagens planejadas podem ser editadas.
- UX: `/app/navegacao` foi reconstruida com agenda semanal por embarcacao, filtros reais, barras multi-dia, abertura de detalhe sem perder a agenda, linha do tempo prevista/real dos intertrechos, vinculo opcional de ida/volta e formulario que calcula chegada e paradas a partir da configuracao publicada. Lista, agenda, escalas e frota usam apenas API real.
- Embarcacoes: cadastro/edicao agora permite escolher classes suportadas e informar capacidades reais; ausencia de capacidade e exibida como `nao informada`, sem inventar zero ou usar ocupacao por cabine como lotacao.
- Infra de desenvolvimento: `infra/apply-wsl.sh` passou a usar o runner oficial `schema_migrations`, evitando reaplicacao destrutiva de SQL historico. O proxy de desenvolvimento aceita `VITE_DEV_API_PROXY` sem mudar o destino padrao de producao.
- QA: backend build verde; 5 testes Jest verdes; frontend SSR/Vercel build verde; API local retornou 6 rotas da versao 1, 3 viagens e 16 escalas com horario; inspecao autenticada em desktop e mobile cobriu agenda, drawer, formulario e editor de configuracoes. O hydration mismatch do `LiveClock` do login foi eliminado com hidratacao tolerante, sem alteracao visual.
- Pendencia de negocio explicita: quatro rotas seguem marcadas `requerRevisao` porque o FAQ diverge entre 17h/18h e no dia de Prainha. A operacao deve confirmar e publicar a versao 2 no painel; nao existe valor definitivo escondido no codigo.
- Proximo passo: aplicar a migration 0024 em producao, revisar/publicar a programacao real no painel e entao avancar para a Etapa 03 do documento vivo.

## Trabalho 2026-08-01 - Etapa 03: lancamento unificado de NF/DC
- A decisao mais recente do cliente foi consolidada em `docs/feedback/2026-08-01-etapa-03-lancamento-nf-dc-unificado.md`: o bloco `Upload do cliente/agente (B.2)` foi descontinuado, assim como as expressoes `lancamento manual`, `documento avulso` e a acao de etiquetar dentro de Notas.
- `/app/tms`, aba Notas, agora possui um unico fluxo `Lancar NF/DC`: o arquivo vem primeiro; XML de NF-e/NFC-e preenche chave, numero, emitente, destinatario, documentos, valor, peso, volumes e modalidade quando presentes. PDF/foto permanecem para revisao humana, sem OCR ficticio.
- Cliente e resolvido pelo CPF/CNPJ extraido. Cliente existente e selecionado; se nao existir, o cadastro e criado na mesma transacao do documento. O operador pode revisar e trocar o cliente antes da confirmacao.
- Toda NF/DC exige viagem e destino e cria carga, documento e volumes juntos. Nao existe mais caminho salvo sem carga/viagem. O backend oferece `POST /api/tms/documentos/analisar` para upload/analise e `POST /api/tms/documentos` para a confirmacao transacional e idempotente.
- A migration `0025_tms_lancamento_nf_unificado.sql` cria metadados de arquivo e extracao, staging de upload, vinculos de viagem/remetente, classificacao de unitizacao e a configuracao versionada `tms_agendamento_recebimento`. O banco local ficou com 25/25 migrations aplicadas.
- Horario inicial/final, janela, capacidade e polling da agenda nao estao chumbados no front: sao editaveis e publicaveis em Cadastros > Configuracoes operacionais. A API valida concorrencia da janela com advisory lock.
- Arquivos sao privados no MinIO, bucket `documentos-fiscais`, com limite de 10 MB, MIME validado e SHA-256. O backend falha explicitamente se o object storage nao estiver configurado; nao ha fallback local ou mock. O inventario foi atualizado em `docs/infra/BUCKETS-PENDENTES.md`.
- Regra de paletes registrada no ADR `docs/arquitetura/03-ADR-Lancamento-NF-e-Unitizacao-Paletes.md`: upload de nota nao aloca palete. MP/PD/PC, parcial/completo e palete fisico so podem ser definidos no recebimento, e liberacao ocorre por acao auditada depois da descarga, reconciliacao e retorno. Foram removidas inferencias falsas por peso ou quantidade.
- QA verde: build NestJS, 4 suites/11 testes Jest, build SSR/Vercel do front e smoke local autenticado da configuracao/documentos. Inspecao visual desktop e mobile confirmou o fluxo progressivo sem overflow da pagina e sem erros de console.
- Proximo passo: implementar a persistencia operacional da classificacao MP/PD/PC e da composicao dos paletes no fluxo de recebimento fisico. Aplicar a migration 0025 e configurar as variaveis MinIO antes do deploy desta etapa em producao.


## Trabalho 2026-08-01 - Correcao pos-deploy NF/DC
- UX corrigida conforme retorno do dono: o formulario completo de Lancamento de NF/DC volta a aparecer antes do upload, com cliente, remetente, tipo, viagem, destino, valores, destinatario e agenda editaveis. O upload e um campo do formulario e apenas autopreenche dados quando conclui.
- Storage corrigido para divergencia de credenciais: a API tenta primeiro o usuario dedicado de object storage e depois as credenciais root da propria stack MinIO, sem duplicar tentativas. O compose propaga ambas as credenciais e aguarda o healthcheck do MinIO.
- QA verde: backend build, 4 suites/13 testes Jest, frontend SSR/Vercel build, git diff --check e inspecao visual autenticada desktop/mobile sem overflow ou erros de console.
- Proximo passo de deploy: publicar API/front novamente. Nao ha migration nova; manter MINIO_ROOT_USER e MINIO_ROOT_PASSWORD validos no Coolify.


## Trabalho 2026-08-02 - Deploy bloqueado pelo healthcheck do MinIO
- Log do Coolify confirmou MinIO online em :9000 e Postgres saudavel, mas o comando wget do healthcheck falhou ate marcar o storage unhealthy; por isso api e worker, que aguardavam service_healthy, nunca iniciaram.
- docker-compose.coolify.yml passou a usar o healthcheck oficial mc ready local. API e worker aguardam apenas service_started para o MinIO, isolando indisponibilidade de upload sem derrubar o ERP/TMS inteiro.
- Validacao local docker compose config --quiet e git diff --check passaram. Nao ha migration nova.
- Proximo passo: publicar a correcao e redeployar a stack no Coolify.


## Trabalho 2026-08-02 - Constraint da origem no lancamento de NF/DC
- Causa do erro 500 identificada: o fluxo unificado grava corretamente origem operacao, mas a constraint historica ck_documento_fiscal_origem ainda aceitava apenas cliente, agente e manual.
- A migration 0026_documento_fiscal_origem_operacao.sql amplia a constraint para aceitar operacao, preservando os valores historicos sem voltar a classificar o fluxo atual como lancamento manual.
- Validacao local concluida: runner com 26/26 migrations aplicadas e constraint consultada diretamente no PostgreSQL contendo operacao.
- Proximo passo de producao: publicar a migration, executar node infra/migrations/run.mjs no container da API e repetir o lancamento da nota.


## Trabalho 2026-08-02 - Busca de cliente no lancamento de NF/DC
- O select nativo de Cliente remetente foi substituido por combobox pesquisavel no fluxo Lancar NF/DC.
- A busca local aceita nome, codigo, CPF/CNPJ e cidade, ignora acentos e pontuacao e limita a renderizacao aos primeiros 50 resultados para manter o seletor responsivo com uma base grande.
- A acao Cadastrar novo cliente permanece fixa e leva o foco aos dados do remetente; ao sair de um cliente existente, nao reutiliza silenciosamente os dados selecionados, preservando apenas dados extraidos do arquivo quando houver.
- Cada resultado mostra nome, codigo, documento e cidade para reduzir selecao de homonimos. Build SSR/Vercel concluido com sucesso.


## 02/ago/2026 - TMS B.11 Controle por viagem funcional

- A tela Controle por viagem deixou de cruzar listas limitadas no front e passou a consumir um agregado paginado real do PostgreSQL.
- Migration 0027 adiciona a configuracao versionada tms_controle_viagem; o ambiente local foi verificado em 27/27.
- Novos endpoints: GET /api/tms/controle-viagens, /exportacao, /:viagemId/volumes e /volumes/:volumeId/eventos, todos protegidos por tms.ver.
- Funil recebido/embarcado/entregue e cumulativo e considera estado atual + evento_volume; divergencia e o estado aberto atual. Valores ausentes nao sao estimados.
- Cadastros > Configuracao operacional ganhou editor para fuso, atualizacao, periodo, paginacao, exportacao, eventos e divergencias, com publicacao auditavel.
- Front B.11 ganhou busca e filtros reais, refresh manual/automatico, skeleton/erro/vazio, paginacao, rota da viagem, valores declarados/cobrados, CSV, impressao/PDF, volumes, divergencias e AuditTrail.
- Correcao de linguagem: o KPI superior agora mede Volumes processados, em vez de afirmar Conferidos hoje sem base temporal de eventos.
- QA concluido: build Nest, teste unitario do validador, smoke autenticado dos agregados/detalhes e build TanStack/Vite; inspecao visual desktop e viewport 390px sem overflow horizontal.
- Deploy: executar a migration 0027 antes ou junto do novo backend. Nenhuma seed de negocio adicional e necessaria.

## 03/ago/2026 - Etapa 04: recebimento, paletizacao e etiquetas funcionais

- A Etapa 04 deixou de ser demonstrativa: migrations 0028/0029 implementam `volume.cadastrado`, conferencia fisica, locais operacionais, proprietario real de palete, ciclo de alocacao e etiqueta por alvo real.
- `/app/tms` ganhou operacao real nas abas Coletor, Cross-docking, Paletes e Etiquetas; `/campo/conferencia` e `/campo/recebimento` reutilizam o fluxo de campo responsivo, com usuario autenticado e conectividade real.
- Recebimento exige classificacao explicita AVULSA/MP/PD/PC. NF/DC, viagem, cliente, destino, quantidades, divergencias, volumes e ocupacao sao lidos/persistidos pela API; nao existe inferencia por peso ou lista mockada.
- Fila offline duravel usa `client_uuid`, `localStorage` para mutacoes e IndexedDB para evidencias. Conferencia ja aberta continua sem sinal e sincroniza em ordem; abertura totalmente offline aguarda o spike PowerSync.
- Fotos de evidencia usam o bucket privado MinIO `recebimento-fotos`, MIME de imagem, limite de 12 MB e SHA-256. O inventario canonico foi atualizado.
- Etiquetas distinguem palete e volume avulso, possuem QR real, impressao/reimpressao auditada, original/motivo e confirmacao explicita de sucesso/falha. Nao ha Bluetooth simulado; hardware e configuravel.
- Cadastros > Configuracoes operacionais ganhou editor versionado das regras de unitizacao/etiqueta e CRUD de locais operacionais ligados a cidades/embarcacoes reais.
- Paletes usam busca/paginacao do servidor, proprietarios reais AJC/cliente/fornecedor, local real, historico de conferencias e liberacao auditada somente no porto depois de descarga/entrega.
- QA automatizado: migrations aplicadas (29/29), build Nest verde, 6 suites/21 testes Jest verdes, build cliente+SSR/Nitro verde e smoke HTTP autenticado dos novos contratos. A conexao do navegador do Codex falhou antes da inspecao visual por ausencia dos assets do proprio runtime; nenhuma falha da aplicacao apareceu nos gates executados.
- Documento de entrega: `docs/feedback/2026-08-03-etapa-04-paletizacao-etiquetas.md`. ADR 03 atualizado com estados, offline e politica de impressao.
- Deploy: publicar API/front juntos, executar o runner para 0028/0029, validar MinIO e publicar as regras reais no painel. Nao executar seed demonstrativa.
## 03/ago/2026 - Inspecao visual da Etapa 04 concluida

- Inspecao real no navegador concluida em desktop e viewport 390x844 para Paletes, Etiquetas, Configuracoes operacionais, Conferencia e Recebimento direto; sem overflow horizontal de pagina e sem regressao visual do Crimson Prestige.
- A conferencia de campo deixou de assumir PC: o conferente agora precisa escolher explicitamente AVULSA, MP, PD ou PC antes de abrir o processo.
- Migration 0030 corrige o nome automatico `Porto de Porto de Moz` para `Porto de Moz` sem alterar locais personalizados; ambiente local validado com 30 migrations.
- O `FieldShell` deixou de consultar localStorage durante o render inicial e nao gera mais hydration mismatch entre SSR e cliente. Revalidacao no console nao produziu novos erros.
- O seed canonico agora liga `TER-101` ao cliente real Comercial Ribeira Ltda. e respeita `ck_palete_proprietario_referencia`; reaplicacao idempotente concluida.
- Build TanStack/Vite/Nitro verde apos as correcoes. Deploy deve executar tambem a migration 0030.
## Trabalho 2026-08-03 - Etapa 05: login de campo e prestação de contas
- `/campo/login` agora autentica exclusivamente a suíte operacional; `/campo` lista apenas apps permitidos pelo perfil e as rotas internas, PDV e Bilheteiro possuem bloqueio de acesso por aplicativo.
- Perfis continuam sendo as funções oficiais do RBAC. Cadastros passou a carregar o catálogo completo de permissões do banco, incluindo apps atuais/futuros e ações granulares de prestação.
- `/campo/gerente` cria e salva rascunho real por viagem/embarcação, recebe receitas/despesas configuradas, valida intertrechos/agências, envia com bloqueio, reconhece explicitamente viagem sem movimento e emite PDF.
- TMS › Prestação de contas passou a conferir dados enviados, comparar declarado/sistema/divergência, mostrar base operacional, emitir PDF e registrar conferência auditada.
- Migration 0031 adiciona permissões, idempotência, versão da configuração, timestamps/responsáveis de envio/conferência e a chave versionada `tms_prestacao_contas`. Ambiente local em 31/31.
- QA: backend build WSL; 7 suítes/23 testes; front SSR/Vercel build; smoke autenticado HTTP 200; inspeção visual desktop/mobile sem overflow.
- Deploy: aplicar 0031, publicar API/front juntos e exigir novo login para renovar as permissões presentes no token. Documento: `docs/feedback/2026-08-03-etapa-05-app-gerente-prestacao.md`.
## Trabalho 2026-08-03 - Etapa 06: Encomendas

- `/app/encomendas` deixou de depender de dados demonstrativos: despacho, NF/DC, cotacao, controle por viagem e rastreamento consomem API e banco reais.
- Migration 0032 cria `encomenda_detalhe`, `encomenda_evidencia`, permissoes e configuracao versionada `encomendas_operacao`; ambiente local em 32/32.
- Despacho exige partes completas, viagem/trecho, foto, documento conforme regra, conteudo, peso/volumes e pagamento. O preco e recalculado no servidor e ajuste exige justificativa.
- Evidencias ficam no bucket privado `encomendas-evidencias`, com MIME/12 MB/SHA-256; DC usa termo publicado e assinatura real em tela.
- Pagamento pelo remetente movimenta caixa aberto; pagamento no destino cria titulo a receber. Cotacao converte sem redigitacao e com idempotencia.
- Cadastros publica tamanhos, pesos, limite fixo/percentual, meios de pagamento, prazo AR, exigencias documentais, termo juridico e tabela completa por trecho.
- Controle por viagem exporta CSV e rastreamento usa eventos reais do TMS. Registros anteriores continuam visiveis como legado incompleto, sem dados fabricados.
- QA automatizado: migration 32/32, backend build, 8 suites/26 testes Jest, front SSR/Nitro/Vercel build e smoke HTTP autenticado dos contratos de configuracao/listagem/precos.
- Dependencias para producao: configurar MinIO, publicar precos reais e termo juridico aprovado, renovar login/RBAC e abrir caixa para pagamento no remetente. Documento: `docs/feedback/2026-08-03-etapa-06-encomendas.md`.
- Proximo passo: Etapa 07 do documento vigente; a Etapa 06 permanece sem commit/push ate revisao do dono.
- Inspecao visual concluida em desktop e 390x844 para Encomendas e Cadastros: sem overflow horizontal de pagina, sem erro de console e com navegacao movel refinada.
