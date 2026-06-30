# Feedback do Cliente — Validação do Core de Todas as Telas

> Consolidação da reunião de validação do mockup/front com o cliente.
> Fontes lidas em 2026-06-29:
> - `C:\Users\Administrador\Downloads\VALIDAÇÃO DO CORE DE TODAS AS TELAS 2.0.docx`
> - `C:\Users\Administrador\Downloads\parte1.txt` a `parte4.txt` (transcrição TurboScribe)
> - `C:\Users\Administrador\Downloads\2026-06-25 16-39-05.txt` e `2026-06-25 16-53-01.txt`
>
> Este documento é a ponte entre o front mockado aprovado/criticado e a próxima rodada de ajustes. Para a rodada atual, ele é a fonte mais recente e prevalece sobre documentos antigos quando houver divergência.

## Leitura Executiva

O cliente validou que o caminho geral do front está bom, mas pediu ajustes operacionais antes de ligar backend. A prioridade combinada na conversa foi avançar por partes, começando por **TMS/Navegação**, depois as demais telas, simulando o dia a dia real.

Ponto de estratégia: **não fazer backend agora antes de refletir essas regras no front/documentação**. O portal online com pagamento continua sendo MVP, mas fica para o fim da rodada do MVP. **Veículos/Máquinas entram agora no MVP**, conforme reunião. Financeiro completo, Compras, DRE, migração de ERP e módulos avançados continuam como sistema maior/fase posterior.

## Ordem Recomendada de Trabalho

1. **TMS/Navegação**: maior volume de ajustes e regras operacionais novas.
2. **Veículos/Máquinas e apps de campo**: porteiro, conferente/recebimento, entregas; bilheteiro está aprovado.
3. **Vendas/PDV/Passagens**: multipagamento, canais por agente, manifesto, BP-e.
4. **Encomendas**: remetente/destinatário, NF junto da DC, regra de pagamento por remetente/destinatário.
5. **CRM/Cadastros**: filtros, dados de cliente, cotação, intertrecho e tabelas.
6. **Financeiro/Compras/DRE**: registrar como escopo de fase posterior, mantendo no mock apenas o que ajuda aprovação.
7. **Portal online**: fica por último dentro do MVP, depois do core interno estar coerente.

## Início / Dashboard

- **Feed ao vivo**: esclarecer origem das informações. Decisão da conversa: vem de logs/eventos da plataforma.
- **Alertas**: cliente quer opção de cadastrar alertas.
- **Caixas em tempo real**: separar por classe/tipo, como porto, embarcações e agentes.

## Navegação

- Botão **Nova viagem** estava sem fluxo; Lucas repassou campos em 30/jun/2026 (`docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md`).
- FAQ 2026 recebido em 30/jun/2026 (`docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`) resolve a fonte inicial de paradas automáticas para o mock, com divergências internas de horário a validar antes do backend definitivo.
- Botão/calendário está sem visualização; aguardar regra de visualização de cronograma longo.
- Cronograma, capacidade/ocupação, painel operacional e embarcações foram considerados ok.
- Conflito de escala: regra proposta é impedir mesmo colaborador no mesmo dia/horário ou período em duas embarcações/viagens diferentes.

## TMS — Notas, DC, Carga e Agendamento

- Botão **Nova carga** dependia de regra/campos do Lucas; campos recebidos em 30/jun/2026 (`docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md`).
- Botão **Lançar manual** deve lançar NF/DC manualmente; Lucas deve repassar campos.
- Botão **Etiquetar por volume** depende de visualização/regra.
- Em **Notas e DC**, incluir coluna **CIF/FOB**.
- No upload do cliente/agente, o campo "Carga/envio" ficou ambíguo. Deve pedir dados de remetente e destinatário:
  - Nome completo ou razão social.
  - CPF/CNPJ.
  - Telefone.
- Inserir **agendamento de recebimento de carga** no fluxo de NF/DC:
  - Upload de NF ou DC.
  - Agendamento de dia.
  - Agendamento de horário.
  - Regra inicial definida na reunião: máximo de **5 caminhões por janela**.
  - Janelas de **30 em 30 minutos**.
- Criar relatório de **previsibilidade de carga do dia**.
- Criar/acoplar tela de **acompanhamento de cargas recebidas em tempo real**.

## TMS — Paletes e Etiquetas

- Botão **Cadastrar palete** depende de campos do Lucas.
- Status **Livre** significa **livre no porto**.
- Filtro de proprietário deve ser lista suspensa em ordem alfabética.
- Remover ação **Realocar** para palete já alocado; palete só volta a ficar livre quando retorna/é dado como livre pela operação.
- Trocar "Reimprimir lote" por **Reimprimir etiqueta**.
- Reimpressão deve abrir tela/lista de conferências/etiquetas criadas no dia para selecionar o que reimprimir.
- Trocar "Volume a etiquetar" por **Palete ou volume para etiquetar**.
- Inserir tipos/siglas na etiqueta:
  - **MP** — multi-palete: uma carga distribuída em vários paletes.
  - **PD** — palete dedicado: um palete fechado para uma única carga.
  - **PC** — palete compartilhado: várias NF/DC/cargas no mesmo palete.

### Regra Operacional de Palete

- **MP / multi-palete**: uma mesma carga ocupa vários paletes. Ao bipar um palete, o app deve indicar que há outros paletes vinculados para reconferir. Regra operacional: não misturar outras cargas em palete de uma carga multi-palete.
- **PD / palete dedicado**: uma carga ocupa exatamente um palete. Bipe do palete movimenta aquela carga.
- **PC / palete compartilhado**: várias notas/cargas pequenas dividem o mesmo palete. O palete funciona como "container/apartamento"; ao bipar o palete, movimenta as NF/DC/volumes alocados nele.
- No recebimento, o conferente deve selecionar o tipo (MP/PD/PC), selecionar palete, alocar NF/DC no palete, informar quantidade de volumes e definir se o palete está **completo** ou **parcialmente completo**.
- Palete parcialmente completo deve continuar disponível para receber mais carga compatível.
- Carga sem palete continua existindo: mercadoria avulsa/porão, com volume a volume etiquetado e bipado.

## TMS — Prestação de Contas

- Inserir **embarcação** junto das informações da viagem.
- Receita de passagens deve quebrar por forma de recebimento: PIX, dinheiro, crédito e débito.
- Receita de encomenda/carga/veículo deve prever **frete intertrecho** com seleção de intertrecho e preço cobrado.
- Inserir receita de venda de **internet na embarcação**, também por forma de recebimento.
- Inserir recebimento de valores de passagens vendidas por **agências**: "Receita agências".
- Inserir despesas fixas/recorrentes:
  - Mão de obra: carregador/empilhador.
  - Despacho embarcação.
  - Recolhimento de resíduos.
  - Gratificações.
- Cada despesa deve ter:
  - Cidade relacionada: Breves, Gurupá, Almeirim, Porto de Moz, Prainha, Monte Alegre, Santarém, ou "Viagem".
  - Descrição/observação.
  - Valor.
- Usar como referência de formulário o modelo de devolução/desconto caução do Frota Martins.
- Inserir opção de emitir relatório em PDF.

## Encomendas

- Remetente e destinatário precisam de:
  - Nome completo.
  - CPF/CNPJ.
  - Telefone.
- Declaração de Conteúdo deve permitir também envio com **NF**.
- Lucas deve enviar modelo final da Declaração de Conteúdo.
- Campo "quem paga":
  - Remetente: entra no fluxo de caixa.
  - Destinatário: gera contas a receber.
- Assinatura do cliente segue obrigatória.

## Vendas / Passagens / PDV

- PDV deve permitir **mais de um modo de pagamento** na mesma venda, como no PDV Frota.
- Em canais de venda, o canal **Agente comercial** deve expandir por agente.
- Gerador de cortesia:
  - Incluir campo de **observação** para detalhar beneficiário/contexto.
  - Definir onde motivos/categorias de cortesia serão cadastrados.
- Testar se QR Code passa a constar como vencido/usado após validação, impedindo segunda entrada.
- Manifesto de passageiros:
  - Inserir total geral da saída.
  - Inserir total por cidade/escala.
- BP-e / SEFAZ-PA:
  - Cliente informou que BP-e é obrigatório desde 2019.
  - No PDV, inserir opção de **emitir ou não emitir BP-e no ato da venda**, usando certificado digital.
  - No site/app público, emissão deve ser automática/obrigatória.
  - Atualização 29/jun/2026: PFX da AJC recebido e registrado em `docs/feedback/2026-06-29-certificado-digital-ajc-pfx.md`.
  - Ainda confirmar senha do PFX, validade/uso, fornecedor/API, credenciamento e fluxo fiscal antes do portal funcional.
- Lucas enviará fotos das embarcações para usar no portal/página.

## Veículos e Máquinas

O cliente apontou que faltou envio de veículos/máquinas.

Escopo pedido:
- Cadastro de veículo/máquina para envio por PDV, Comercial e Gerente do Porto.
- Campos:
  - Placa obrigatória para veículo.
  - Nome, telefone e CPF/CNPJ do remetente.
  - Nome, telefone e CPF/CNPJ do destinatário.
- App conferente:
  - Checklist de envio, usando como referência o checklist de devolução do Frota Martins.
  - Fotos para comprovação do estado físico.
  - Emissão de etiqueta para veículo.
  - Controle de embarque: bipe de subida na balsa e descida no destino.
- Entrega:
  - Checklist de entrega para veículos/máquinas, também baseado no modelo de devolução Frota Martins.

**Decisão vigente:** Veículos/Máquinas entram agora no MVP por decisão da reunião/transcrição. Documentos antigos que tratavam isso como pós-MVP devem ser corrigidos.

## CRM

- Lista suspensa de cidade/UF, pois podem existir clientes fora do Pará.
- Filtros PF/PJ.
- Lucas deve repassar dados necessários para cadastro de novos clientes.
- Cotação precisa de informações/campos do Lucas.
- Comissão de agente foi considerada ok como conceito, mas regra definitiva fica no Financeiro.

## Financeiro

Financeiro completo foi reconhecido como um sistema grande à parte, maior que o mock atual. Decisão da conversa: pode ficar para segunda etapa/onda posterior, para não travar o core TMS/ERP.

Ajustes anotados:
- Retirar **Conciliação** do mock atual se não for escopo imediato.
- Lançamentos precisam de plano de contas/centro de custo; Lucas enviará modelo.
- Contas a pagar/receber precisam de filtros por dia, semana, mês e personalizado com data.
- Verificar ferramenta/API para rastrear faturas/NF/boletos emitidos contra o CNPJ da AJC.
- Comissão de agentes:
  - Ligada diretamente ao contas a receber.
  - Comissão só é liberada quando o contas a receber gerado pelo agente for pago pela empresa.
  - Status sugeridos: **em aberto**, **liberada**, **pago**.
  - Registrar datas de todas as mudanças de status.
- Inserir aba **DRE**.
  - Lucas enviará planilha/modelo.
  - DRE mensal em tempo real cruzando pagamentos e centros de custo.

## Compras

Módulo faltante apontado pelo cliente, mas associado ao ERP/Financeiro maior.

Escopo pedido:
- Solicitação de compras pelo usuário.
- Pedido de compras pelo comprador.
- Três cotações.
- Upload de comprovantes PDF das cotações.
- Controle de recebimento de compras.
- Geração de pré-nota para compromisso futuro de pagamento no contas a pagar.

**Atenção de escopo:** tratar como fase posterior junto do Financeiro completo, salvo decisão formal de antecipação.

## Cadastros

- Preços de passagem: inserir cobrança **intertrecho**.
- FAQ 2026 trouxe tabela inicial de preços de passagem por destino/classe; ainda validar divergências/restrições antes do cadastro definitivo.
- Usar listas suspensas para:
  - Saindo de: Belém, Breves, Gurupá, Almeirim, Porto de Moz, Prainha, Monte Alegre, Santarém.
  - Indo para: Belém, Breves, Gurupá, Almeirim, Porto de Moz, Prainha, Monte Alegre, Santarém.
- Preços de carga:
  - Tabelas de preço devem poder ser amarradas a clientes.
  - Inserir variação por cidade de destino.
- Fornecedores: Lucas repassará classes/categorias.
- Colaboradores: inserir CPF.

## Apps de Campo

### Porteiro

- Remover tipos **Pessoa** e **Veículo para transporte**.
- Deixar foco em veículo de carga.
- Saída deve selecionar item que já está "no pátio"; não redigitar.
- Painel inicial deve mostrar veículos no pátio em tempo real.
- Criar relatório de entrada de veículos com data, horário e empresa.

### Conferente / Recebimento no Porto e Direto na Balsa

- Fluxo com palete:
  - Seleciona viagem.
  - Seleciona palete.
  - Aloca NF/DC no palete.
  - Confere.
  - Digita quantidade de volumes da NF/DC alocados no palete.
  - Define status do palete: completo ou parcialmente completo.
  - Etiqueta vai no palete.
- Fluxo sem palete:
  - Seleciona mercadoria avulsa/porão.
  - Disponibiliza NF/DC.
  - Digita quantidade de volumes.
  - Etiqueta todos os volumes.
  - Bipa volume por volume para recebimento.
- Inserir função de recebimento de veículos/máquinas para transporte.

### Entregas

- Inserir seleção de tipo: **Carga**, **Encomenda**, **Veículo/Máquina**.
- Antes de solicitar foto/assinatura, exigir bipe de:
  - Palete.
  - Mercadoria avulsa.
  - Encomenda.
  - Veículo/máquina.
- Para veículos, usar checklist de entrega baseado no modelo Frota Martins.

### Bilheteiro

- Sem ressalvas. App de validação por QR foi considerado ok.

## Pendências Externas Citadas

- Lucas/AJC: validar divergências internas de horário do FAQ 2026, lançamento manual NF/DC se divergir de Nova Carga, paletes, cadastro cliente, cotação, tabela de preço de encomendas, preço de veículos/máquinas, plano de contas/centro de custo, DRE, fornecedores, Declaração de Conteúdo, fotos das embarcações. Campos de Nova Viagem/Nova Carga, matriz de embarcações/classes e FAQ 2026 foram recebidos em 30/jun/2026.
- Contador/fiscal: BP-e SEFAZ-PA, senha/validade/uso do PFX recebido, fornecedor/API e obrigatoriedade por canal.
- AJC: checklist Frota Martins, modelo fiscal atual, impressora de etiqueta. O modelo de prestação de contas foi recebido em 29/jun/2026 e registrado em `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`.

## Pontos a Resolver Antes de Back

- **Portal online**: SPEC de Vendas exige `Pedido`, `Reserva`, `Pagamento`, webhook e fiscal plugável, mas o modelo canônico/migrations atuais ainda não materializam essas entidades. Antes do backend definitivo de Vendas, atualizar `docs/fase-0/01-Modelo-de-Dados-MVP.md` e migrations.
- **Financeiro/Compras/DRE**: cliente quer, mas conversa confirmou que é sistema grande/posterior. Não puxar para MVP sem recorte formal.
- **Impressão**: seguir Bluetooth conforme transcrição; confirmar modelo da impressora e protocolo antes de implementar.
