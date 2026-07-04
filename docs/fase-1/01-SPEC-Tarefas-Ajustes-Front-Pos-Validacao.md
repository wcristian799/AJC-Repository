# SPEC + Tarefas — Ajustes do Front Pós-Validação do Cliente

> Fonte vigente: `docs/feedback/2026-06-25-validacao-core-telas.md`.
> Objetivo: ajustar o **front real mockado** para refletir todas as regras pedidas na reunião antes de iniciar backend/banco definitivo.
> Regra de escopo: o que foi decidido na reunião entra nesta rodada. Portal online continua MVP, mas fica por último. Financeiro completo, Compras/DRE e ERP financeiro avançado ficam para depois.

## Estado Atual

- **Core interno implementado em 2026-06-29:** Início, Navegação, TMS/Carga, Veículos/Máquinas, apps de campo simulados, Vendas/PDV/Passagens, Encomendas, CRM, Cadastros e Financeiro mockado.
- **Verificação técnica:** `bun run build` em `apps/web-console` passou com exit 0; smoke das rotas principais retornou HTTP 200 no dev server local.
- **Novo material recebido em 2026-06-29:** o modelo real de prestação de contas em papel foi recebido e documentado em `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`.
- **Transcrição bruta auditada em 2026-06-29:** `docs/feedback/2026-06-29-auditoria-transcricao-bruta-e-pendencias.md` confirma o consolidado e acrescenta nuances: apps internos fora da Play Store/instalação direta, foto na portaria e regra futura de cobrança/comissão sobre carga.
- **Campos recebidos do Lucas em 2026-06-30:** `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md` baixa pendências de Nova Viagem, embarcações/classes e Nova Carga.
- **FAQ 2026 recebido em 2026-06-30:** `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md` baixa o DOC FAQ das paradas automáticas e traz horários, preços de passagem, formas de pagamento e endereços dos portos. Há divergências internas de horário a validar antes do backend definitivo.
- **Reabertura pontual:** antes do QA geral/Portal, refinar `PrestacaoTab` para espelhar o modelo real de prestação de contas.
- **Pendente proposital:** Portal online (`/portal`) permanece MVP, mas entra como último bloco depois do QA visual/navegação do core interno.

## Critério de Pronto Geral

- O front continua no design system **Crimson Prestige**.
- Login cinematográfico em `src/routes/index.tsx` não é alterado.
- Gestão fica em `/app/*`; operação de campo fica em `/campo/*`.
- Todos os ajustes são mockados/visuais, sem backend real.
- `apps/web-console`: rodar `bun run build` ao final.
- `docs/STATUS.md` deve ser atualizado com o que foi feito e o próximo ponto.

## Ordem de Execução

1. **Documentação e rastreabilidade da rodada**.
2. **Início/Dashboard e Navegação**.
3. **TMS/Carga**: Notas/DC, agendamento, paletes, etiquetas, acompanhamento em tempo real, prestação de contas.
4. **Veículos/Máquinas e apps de campo**: portaria, conferência/recebimento, entregas.
5. **Vendas/PDV/Passagens**: multipagamento, agente comercial, cortesia, manifesto, BP-e, QR usado/vencido.
6. **Encomendas**: remetente/destinatário, NF junto da DC, quem paga, assinatura.
7. **CRM/Cadastros**: cidade/UF, PF/PJ, CPF colaborador, intertrecho, preços por cliente/destino.
8. **Financeiro mockado**: tirar/baixar prioridade de conciliação, filtros AP/AR, comissão por AR pago; não construir financeiro completo.
9. **Portal online**: por último, depois do core interno.

## Checklist de Tarefas

### 0. Documentação de execução

- [x] Criar consolidação da reunião em `docs/feedback/2026-06-25-validacao-core-telas.md`.
- [x] Corrigir escopo: Veículos/Máquinas agora é MVP; impressão térmica via Bluetooth.
- [x] Atualizar `docs/STATUS.md` e `AGENTS.md` com este SPEC como próximo passo de qualquer nova sessão.
- [x] Ao terminar implementação, registrar no STATUS o que ficou pronto e pendências.

### 1. Início / Dashboard (`/app/inicio`)

**SPEC**
- Feed ao vivo deve deixar claro que vem de logs/eventos da plataforma.
- Alertas precisam ter opção de cadastro.
- Caixas em tempo real devem ser separados por tipo/classe: porto, embarcações e agentes.

**Tarefas**
- [x] Ajustar cards/textos do feed para origem "eventos da plataforma".
- [x] Inserir ação/área "Cadastrar alerta".
- [x] Exibir caixas em tempo real por tipo.

### 2. Navegação (`/app/navegacao`)

**SPEC**
- Botão Nova viagem deve abrir fluxo mockado com campos recebidos do Lucas em `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md`.
- Nova viagem: número/código gerado automaticamente pelo sistema.
- Nova viagem: selecionar FerryBoat em lista.
- Nova viagem: selecionar data e hora da saída.
- Nova viagem: inserir local/cidade, data e hora das paradas; preenchimento automático conforme FAQ 2026 em `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`.
- Nova viagem: templates iniciais de rota devem cobrir Belém ↔ Almeirim e Belém ↔ Santarém, incluindo viagens de quarta/sexta e retornos de sábado/segunda.
- Nova viagem: sinalizar que horários são configuráveis e que existem divergências do próprio FAQ a validar antes do cadastro definitivo.
- Nova viagem: inserir manualmente número de passageiros disponível em redes.
- Nova viagem: inserir número de camarotes disponíveis por classe, conforme embarcação selecionada.
- Lista de embarcações: F/B Amazonas II, III, IV, V, VI e F/B Paru (cargas).
- Classes por embarcação devem seguir a matriz recebida do Lucas: Rede, Rede Sala VIP, Camarote, Suíte Comum, Suíte Comum VIP, Suíte Master, Suíte Master VIP e Mega Suíte.
- Calendário/cronograma precisa ter visualização acionável.
- Escala deve explicitar conflito: mesmo colaborador no mesmo dia/horário/período em duas embarcações/viagens.

**Tarefas**
- [x] Criar painel/form mockado de nova viagem.
- [x] Refinar painel/form de Nova Viagem com os campos e matriz de embarcação/classes recebidos do Lucas.
- [x] Adicionar templates de rota/paradas do FAQ 2026 no fluxo mockado de Nova Viagem.
- [x] Criar visualização de calendário/cronograma.
- [x] Mostrar alerta de conflito de escala com exemplo.

### 3. TMS — Notas/DC, carga e agendamento (`/app/tms`, `NotasTab`)

**SPEC**
- Nova carga, lançar manual e etiquetar por volume devem ter fluxo visual.
- Botão Nova Carga deve usar os campos recebidos do Lucas em `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md`.
- Nova Carga: gerar número do pedido e venda como `COD CLIENTE + NUMERO DE NF/DC`.
- Nova Carga: gerar automaticamente UUID de carga/QR Code.
- Nova Carga: gerar automaticamente código de carga.
- Nova Carga: selecionar viagem, origem e destino.
- Nova Carga: cliente puxado da NF/DC ou preenchido manualmente.
- Nova Carga: upload de nota/DC.
- Nova Carga: peso puxado da NF/DC ou preenchido manualmente.
- Nova Carga: valor de nota/DC puxado da NF/DC ou preenchido manualmente.
- Notas/DC precisam de coluna **CIF/FOB**.
- Upload precisa pedir remetente e destinatário: nome/razão social, CPF/CNPJ, telefone.
- Agendamento de recebimento: dia + horário em janelas de 30 min, máximo 5 caminhões por janela.
- Relatório de previsibilidade de carga do dia.
- Acompanhamento de cargas recebidas em tempo real.

**Tarefas**
- [x] Adicionar CIF/FOB na tabela/lista.
- [x] Criar bloco/form de upload com remetente/destinatário.
- [x] Criar agenda de recebimento com capacidade por janela.
- [x] Criar relatório de previsibilidade do dia.
- [x] Criar painel de recebimento em tempo real.
- [x] Refinar fluxo de Nova Carga com número de pedido/venda, UUID/QR, código de carga, viagem, origem/destino, cliente, upload NF/DC, peso e valor.

### 4. TMS — Paletes e etiquetas (`PaletesTab`, `EtiquetaTab`, apps de campo)

**SPEC**
- "Livre" deve significar "livre no porto".
- Filtro de proprietário como lista suspensa alfabética.
- Remover ação **Realocar** de palete alocado.
- "Reimprimir lote" vira **Reimprimir etiqueta**.
- Reimpressão abre lista do dia para escolher etiqueta/conferência.
- "Volume a etiquetar" vira **Palete ou volume para etiquetar**.
- Etiqueta deve mostrar siglas **MP** (multi-pallet), **PD** (pallet único/diferenciado?), **PC** (pallet comum?). Significado exato de PD/PC deve ser confirmado com Lucas antes de definir label final.
- Recebimento deve contemplar MP/PD/PC, palete completo/parcial e carga sem palete.

**Tarefas**
- [x] Ajustar labels/status/filtros em Paletes.
- [x] Remover/renomear ações incorretas.
- [x] Adicionar lista de reimpressão do dia.
- [x] Adicionar MP/PD/PC nas telas de etiqueta e recebimento.
- [x] Adicionar status completo/parcial.
- [x] Manter fluxo sem palete com volumes avulsos.

### 5. TMS — Prestação de contas (`PrestacaoTab`)

**SPEC**
- Fonte adicional recebida: `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md`.
- O modelo real de papel deixa de ser pendência externa e passa a ser referência direta da tela.
- Incluir embarcação junto da viagem.
- Incluir número da viagem, período e caixa inicial/declarado.
- Receita de passagem por forma: PIX, dinheiro, crédito, débito.
- Receita de encomenda/carga/veículo com frete intertrecho.
- Receita de internet na embarcação por forma de recebimento.
- Receita agências.
- Estruturar receitas em blocos do formulário real: À bordo, Cozinha/Lanchonete/Internet, Passagens — Agências e Fretes — Agências.
- Passagens — Agências deve ter cidade/agência, Espécie, PIX/Conta, Total geral, Comissão e Saldo.
- Fretes — Agências deve ter cidade/agência, Espécie, PIX/Conta, Total e Saldo.
- Cozinha deve prever Café, Almoço e Jantar por dia da viagem, com total.
- Despesas: mão de obra, despacho embarcação, resíduos, gratificações.
- Cada despesa tem cidade/Viagem, descrição/observação e valor.
- Redondas e gratificações ficam em bloco separado com nome, função e valor.
- Fechamento deve mostrar Receita total, Despesa total e Saldo repassado por Espécie, PIX/Conta e Total.
- Incluir área de Local/Data e Responsável.
- Opção de relatório PDF.

**Tarefas**
- [x] Expandir resumo da viagem com embarcação.
- [x] Quebrar receitas por forma de pagamento.
- [x] Adicionar intertrecho para carga/encomenda/veículo.
- [x] Adicionar internet embarcada e receita agências.
- [x] Adicionar tabela/form de despesas por cidade.
- [x] Adicionar botão "Emitir PDF".
- [x] Refinar `PrestacaoTab` com a estrutura do modelo real recebido em 2026-06-29: cabeçalho, caixa, À bordo, Cozinha/Lanchonete/Internet, Passagens — Agências, Fretes — Agências, Despesas, Redondas/Gratificações e Fechamento.

### 6. Veículos/Máquinas (`/app/tms`, `/campo/*`, possível seção própria)

**SPEC**
- Veículos/Máquinas entram agora no MVP.
- Cadastro/envio por PDV, Comercial e Gerente do Porto.
- Campos: placa obrigatória para veículo; remetente e destinatário com nome, telefone, CPF/CNPJ.
- **App conferente: checklist de envio/entrega DEVE ser embutido no app principal do conferente, NÃO em app separado.** Checklist baseado no modelo Frota Martins (envio + devolução/caução).
- App conferente: fotos, etiqueta, bipe de subida e descida.
- Entrega: checklist de entrega baseado no modelo Frota Martins.

**Tarefas**
- [x] Criar superfície visual de envio de veículo/máquina.
- [x] Adicionar dados completos de remetente/destinatário.
- [x] Criar checklist/fotos/etiqueta.
- [x] Adicionar bipe subida/descida.
- [x] Adicionar veículo/máquina no app de entregas.

### 7. Apps de Campo (`/campo/portaria`, `/campo/conferencia`, `/campo/recebimento`, `/campo/entregas`)

**SPEC**
- Portaria: remover Pessoa e Veículo para transporte; foco em veículo de carga.
- Saída deve selecionar item que já está no pátio.
- Painel inicial mostra veículos no pátio em tempo real.
- Relatório de entrada de veículos: data, horário, empresa.
- Transcrição bruta cita foto no registro/entrada de veículo de carga; representar como captura/anexo no mock e confirmar depois se será obrigatória no app final.
- Recebimento com palete: viagem → palete → NF/DC → conferência → quantidade → completo/parcial → etiqueta no palete.
- Recebimento sem palete: mercadoria avulsa/porão → NF/DC → quantidade → etiqueta em todos os volumes → bipe volume a volume.
- Recebimento de veículos/máquinas.
- Entregas: tipo Carga/Encomenda/Veículo-Máquina; antes de foto/assinatura exigir bipe.

**Tarefas**
- [x] Ajustar portaria.
- [x] Conferir/ajustar portaria para mostrar captura/anexo de foto no registro de veículo de carga, conforme nuance da transcrição bruta. (Já presente: tile "Foto (recomendada)" no fluxo de entrada; obrigatoriedade segue pendente de confirmação do cliente.)
- [x] Ajustar conferência/recebimento com e sem palete.
- [x] Inserir recebimento de veículos/máquinas.
- [x] Ajustar entregas com tipo e bipe obrigatório.

### 8. Encomendas (`/app/encomendas`)

**SPEC**
- Remetente e destinatário: nome completo, CPF/CNPJ, telefone.
- Declaração de Conteúdo também deve aceitar NF.
- Campo "quem paga": remetente entra no caixa; destinatário gera contas a receber.
- Assinatura continua obrigatória.

**Tarefas**
- [x] Expandir dados de remetente/destinatário.
- [x] Adicionar opção DC/NF.
- [x] Adicionar escolha de quem paga e consequência visual.
- [x] Conferir bloqueio/estado de assinatura.

### 9. Vendas / PDV / Passagens (`/app/vendas`, `/pos`, `/embarque`)

**SPEC**
- PDV permite mais de uma forma de pagamento na mesma venda.
- Canal Agente comercial deve expandir por agente.
- Cortesia tem observação.
- Motivos/categorias de cortesia devem ter indicação de cadastro.
- QR usado/vencido impede segunda entrada.
- Manifesto: total geral da saída e total por cidade/escala.
- **BP-e em 3 níveis (decisão do cliente):**
  - **Nível 1 — PDV manual:** agente comercial emite manualmente quando o cliente não tem acesso digital.
  - **Nível 2 — Site + app cliente (automático-obrigatório):** portal online e área do cliente emitem BP-e automaticamente após pagamento confirmado.
  - **Nível 3 — App do agente (opcional):** conferente/porteiro pode emitir BP-e via app se necessário, mas é opcional (não bloqueia operação).
- FAQ 2026 traz preços atuais de passagem por destino/classe, formas de pagamento atuais (dinheiro, PIX, crédito, débito e parcelamento até 2x com acréscimo) e regras públicas de meia/isento; usar como referência visual de tabela/preço, sem hard-code no futuro backend.

**Tarefas**
- [x] Adicionar multipagamento no PDV.
- [x] Expandir canais por agente.
- [x] Adicionar observação/categoria no gerador de cortesia.
- [x] Evidenciar QR usado/vencido em `/embarque`.
- [x] Ajustar manifesto com total geral e por cidade.
- [x] Adicionar opção BP-e no PDV e indicação automática no público.
- [ ] Atualizar mocks/tabelas visuais de preços de passagem com os valores do FAQ 2026, se o próximo bloco de front tocar Vendas/Cadastros/Portal.

### 10. CRM e Cadastros (`/app/crm`, `/app/cadastros`)

**SPEC**
- CRM: cidade/UF como lista suspensa, filtros PF/PJ, dados/cotação aguardam Lucas.
- Cadastros: preço de passagem com intertrecho; saindo/indo com cidades fixas.
- Cadastros: preço de passagem deve considerar valores reais do FAQ 2026 por destino/classe, versionáveis e com reajuste em massa; para front, mostrar como tabela editável/importável.
- Preço de carga: tabela amarrável a cliente e variação por cidade destino.
- Fornecedores: classe/categoria pendente Lucas.
- Colaboradores: CPF obrigatório.

**Tarefas**
- [x] Adicionar filtros PF/PJ e cidade/UF.
- [x] Ajustar cotação com campos pendentes marcados.
- [x] Adicionar intertrecho em preços de passagem.
- [x] Adicionar preço de carga por cliente/destino.
- [x] Adicionar CPF em colaboradores.

### 11. Financeiro mockado (`/app/financeiro`)

**SPEC**
- Financeiro completo fica depois, mas o mock deve não prometer conciliação como escopo imediato.
- AP/AR com filtros dia, semana, mês e personalizado.
- Comissão de agentes ligada ao contas a receber; libera quando AR é pago; status em aberto, liberada, pago; datas de mudança.
- DRE e Compras aparecem como fase posterior, não como construção agora.
- **Nota:** já existe estudo real do cliente sobre DRE/plano de contas (consultoria 2026); esse material será usado na fase financeira avançada, não no MVP.
- Transcrição bruta cita regra futura: carga/encomenda/veículo com valor declarado/cobrado, nenhuma carga sobe sem etiqueta/cobrança, etiquetas geram cobrança e comissão de 2% sobre montante de carga com relatório por viagem. Não construir financeiro completo agora; no front, no máximo sinalizar como indicador/pendência financeira.

**Tarefas**
- [x] Retirar/baixar destaque de Conciliação.
- [x] Ajustar filtros AP/AR.
- [x] Ajustar comissão de agentes com status e datas.
- [x] Sinalizar DRE/Compras como posterior.
- [x] Registrar que DRE/plano de contas tem estudo real (consultoria 2026) para fase posterior.

### 12. Portal online (`/portal`) — por último

**SPEC**
- Portal continua MVP, mas só depois do core interno.
- BP-e automático/obrigatório no público.
- Certificado digital PFX da AJC recebido em 29/jun/2026 e registrado em `docs/feedback/2026-06-29-certificado-digital-ajc-pfx.md`; não copiar para o repo nem expor senha. Ainda falta confirmar senha, validade/uso, credenciamento SEFAZ-PA e fornecedor/API fiscal.
- Fotos das embarcações entram quando Lucas enviar.
- Antes do backend, modelo deve prever Pedido, Reserva, Pagamento, webhook e fiscal plugável.

**Tarefas**
- [x] Não iniciar antes de fechar core interno.
- [ ] Quando iniciar, ajustar front e depois modelo de dados/backend.
