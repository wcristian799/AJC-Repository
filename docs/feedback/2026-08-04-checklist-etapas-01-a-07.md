# Checklist de validação — Etapas 01 a 07

**Atualizado em:** 04/ago/2026

**Escopo:** Início, Navegação, TMS/NF/DC, Recebimento/Paletes/Etiquetas, Aplicativos de campo/Prestação, Encomendas e Passagens/PDV.

**Fonte funcional vigente:** `2026-07-09-validacao-core-todas-telas-diagramado.docx`, complementada pelas decisões posteriores registradas nos documentos de fechamento de cada etapa.

## Como ler este checklist

- `[x]` implementado e verificado no ambiente local de desenvolvimento.
- `[ ]` ainda exige implantação, configuração, integração externa ou homologação da AJC.
- Código concluído não significa integração externa concluída. BP-e, impressora física, MinIO e dados comerciais reais aparecem separadamente para não gerar falso aceite.
- O aceite final de produção exige concluir o checklist transversal e os itens pendentes da etapa correspondente.

## Visão executiva

| Etapa | Escopo principal | Situação do produto | Migration principal | Pendência que impede aceite integral em produção |
|---|---|---|---|---|
| 01 | Início e operação | Funcional | `0017` já existente | Homologar dados e caixas reais do ambiente |
| 02 | Navegação e calendário | Funcional e configurável | `0024` | Publicar programação oficial da AJC |
| 03 | NF/DC e controle por viagem | Funcional | `0025` a `0027` | MinIO e configuração operacional em produção |
| 04 | Recebimento, paletes e etiquetas | Funcional | `0028` a `0030` | Homologar impressora e manter MinIO operacional |
| 05 | Login de campo e prestação de contas | Funcional | `0031` | Criar usuários/perfis reais e publicar regras financeiras |
| 06 | Encomendas | Funcional | `0032` | Publicar preços/termo jurídico e validar MinIO |
| 07 | Passagens, PDV e embarque | Funcional, com integrações externas bloqueadas | `0033` | BP-e, impressora e fotos reais da frota |

---

## Etapa 01 — Início

### Pedido e entrega funcional

- [x] Existe ponto explícito para criar alerta operacional.
- [x] Alertas manuais podem ser editados, resolvidos e reabertos.
- [x] Alertas derivados da operação permanecem visíveis sem serem convertidos em dados fictícios.
- [x] A central permite buscar e filtrar alertas abertos e resolvidos.
- [x] Os caixas reais são apresentados por origem operacional: porto, embarcação e agente.
- [x] Cada caixa mostra saldo, entradas, saídas, situação e responsável quando informado pela API.
- [x] O painel usa viagens, embarcações, cargas, volumes, bilhetes, caixas e alertas vindos da API.
- [x] O relatório do dia é gerado a partir dos agregados reais do backend.
- [x] A UX foi reorganizada sem remover radar operacional, indicadores, feed, alertas ou caixas.

### Evidência técnica

- [x] Persistência/auditoria de alertas disponível pela migration `0017_alerta_operacional.sql`.
- [x] Fechamento funcional registrado no commit `d9776e8`.

### Implantação e homologação

- [ ] Confirmar em produção que os caixas reais estão cadastrados com tipo e responsável corretos.
- [ ] Homologar com a AJC a separação visual de porto, embarcações e agentes.
- [ ] Executar regressão do relatório do dia com movimento financeiro real.

## Etapa 02 — Navegação e calendário

### Pedido e entrega funcional

- [x] Nova Viagem cria registros reais e não usa viagens demonstrativas.
- [x] Viagem planejada pode ser editada com auditoria; o status não é alterado como simples campo de formulário.
- [x] Rotas, frequências, horários e intertrechos são configurados em Cadastros.
- [x] A programação é versionada e a viagem guarda o snapshot da versão usada.
- [x] Ida e volta podem formar um ciclo operacional sem misturar os estados dos dois sentidos.
- [x] O calendário agrupa viagens reais e permite abrir o detalhe dos intertrechos.
- [x] A frota usada no planejamento vem do cadastro real de embarcações.
- [x] Embarcações podem ser criadas e editadas, inclusive suas capacidades.
- [x] Nenhum horário do FAQ funciona como fallback escondido no componente.

### Evidência técnica

- [x] Migration `0024_navegacao_configuravel_calendario.sql` criada.
- [x] ADR `docs/arquitetura/03-ADR-Navegacao-Configuravel-e-Ciclo-Operacional.md` registra a regra fechada.
- [x] Fechamento funcional registrado no commit `a15989b`.

### Implantação e homologação

- [ ] Aplicar a migration `0024` no ambiente alvo, caso ainda não conste em `schema_migrations`.
- [ ] Revisar e publicar em Cadastros a versão oficial de rotas, paradas, dias e horários da AJC.
- [ ] Homologar ciclos completos de ida/volta e intertrechos com a operação.
- [ ] Cadastrar URLs reais de fotos das embarcações quando fornecidas pela AJC.

## Etapa 03 — TMS, lançamento de NF/DC e controle por viagem

### Pedido e entrega funcional

- [x] `Upload do cliente/agente (B.2)` foi descontinuado conforme decisão posterior do cliente.
- [x] O fluxo passou a se chamar `Lançamento de NF/DC`, sem o conceito de lançamento manual/avulso.
- [x] Upload é a primeira ação e o formulário continua disponível para revisão e complementação.
- [x] XML é analisado para preencher automaticamente os campos suportados.
- [x] Cliente existente é localizado; cliente inexistente pode ser criado no mesmo processo.
- [x] O lançamento persiste cliente, documento, carga, viagem e volumes de forma transacional.
- [x] Remetente, destinatário, CPF/CNPJ, telefone, CIF/FOB, valor, origem e destino são tratados no fluxo real.
- [x] A nota não escolhe palete e não infere MP/PD/PC; essa decisão pertence à conferência física.
- [x] Etiquetagem saiu da área de Notas e permanece no fluxo próprio.
- [x] Agenda de recebimento é configurável em Cadastros, incluindo intervalo e capacidade.
- [x] Controle por viagem usa agregação e paginação no PostgreSQL, com filtros, exportação e drill-down reais.
- [x] Valores, volumes e divergências não são estimados a partir de listas truncadas no navegador.

### Evidência técnica

- [x] Migration `0025_tms_lancamento_nf_unificado.sql` criada.
- [x] Migration `0026_documento_fiscal_origem_operacao.sql` corrige a origem operacional do documento.
- [x] Migration `0027_tms_controle_viagem_config.sql` publica o controle por viagem configurável.
- [x] Decisão de NF/DC e paletes registrada em `docs/arquitetura/03-ADR-Lancamento-NF-e-Unitizacao-Paletes.md`.

### Implantação e homologação

- [ ] Aplicar as migrations `0025`, `0026` e `0027` no ambiente alvo.
- [ ] Configurar credenciais válidas do MinIO na API e no worker.
- [ ] Confirmar existência e política privada dos buckets usados pelo lançamento de documentos.
- [ ] Publicar em Cadastros a agenda real de recebimento.
- [ ] Validar com XML, PDF e foto reais; conferir criação e seleção automática de cliente.
- [ ] Homologar o controle por viagem com um ciclo que possua cargas, documentos, volumes e divergências reais.

## Etapa 04 — Recebimento, paletização e etiquetas

### Pedido e entrega funcional

- [x] Conferência física pode ser aberta e retomada por viagem, local e operador autenticado.
- [x] AVULSA, MP, PD e PC exigem escolha explícita do conferente.
- [x] NF/DC vinculada à viagem apresenta cliente, destino e saldo ainda não recebido.
- [x] Quantidade encontrada, falta, excesso, justificativa e volumes adicionais são persistidos.
- [x] Evidência fotográfica é enviada ao MinIO; sem sinal, permanece na fila local até sincronizar.
- [x] Fechamento parcial/completo obedece à versão publicada da configuração.
- [x] Paletes possuem ocupação real, proprietário real e local operacional cadastrado.
- [x] Criação, edição, composição e liberação de palete possuem validação e auditoria.
- [x] A ação de realocar retirada pelo cliente não reapareceu no fluxo.
- [x] Etiquetas aceitam como alvo palete ou volume avulso.
- [x] Impressão e reimpressão são registradas; reimpressão referencia a original e pode exigir motivo.
- [x] O sistema exige confirmação de saída legível e não afirma impressão física sem confirmação.
- [x] Regras MP/PD/PC, evidências, fila offline e perfil de impressão ficam em Cadastros.
- [x] Existem superfícies reais em `/app/tms`, `/campo/conferencia` e `/campo/recebimento`.

### Evidência técnica e visual

- [x] Migrations `0028`, `0029` e `0030` criadas.
- [x] Inspeção concluída em desktop e em celular 390 × 844.
- [x] SSR/hidratação, escolha explícita de classificação e nome `Porto de Moz` foram corrigidos.
- [x] Fechamento registrado em `docs/feedback/2026-08-03-etapa-04-paletizacao-etiquetas.md`.

### Implantação e homologação

- [ ] Aplicar as migrations `0028`, `0029` e `0030` no ambiente alvo.
- [ ] Garantir credenciais MinIO válidas e bucket privado `recebimento-fotos`.
- [ ] Cadastrar locais operacionais reais e revisar proprietários de paletes.
- [ ] Publicar as regras operacionais aprovadas em Cadastros.
- [ ] Homologar modelo, protocolo, tamanho e conectividade da impressora física.
- [ ] Executar teste real de impressão, falha, confirmação e reimpressão com motivo.
- [ ] Executar ciclo offline real: receber sem sinal, recuperar conexão e confirmar idempotência.

## Etapa 05 — Aplicativos de campo e prestação de contas

### Pedido e entrega funcional

- [x] Existe login exclusivo em `/campo/login`, separado do login do painel administrativo.
- [x] O hub `/campo` mostra somente os aplicativos autorizados pelo perfil autenticado.
- [x] Acesso direto às rotas de campo, PDV e Bilheteiro é protegido por permissão.
- [x] Cadastros permite criar/editar usuários, funções/perfis e permissões por aplicativo.
- [x] O catálogo inclui apps atuais e pontos reservados para os próximos apps.
- [x] Existe o app `/campo/gerente` para prestação de contas da embarcação.
- [x] A prestação identifica viagem e embarcação.
- [x] Receitas aceitam formas de recebimento publicadas e categorias reais.
- [x] Frete intertrecho exige trecho cadastrado e receita de agência exige comissão cadastrada.
- [x] Despesas exigem categoria, cidade ou viagem, descrição e valor.
- [x] O gerente salva rascunho e envia; depois do envio, não altera o documento.
- [x] TMS possui a segunda superfície para comparar, emitir PDF e conferir a prestação enviada.
- [x] Rascunho, envio e conferência geram auditoria e usam configuração versionada.
- [x] Formas de pagamento, receitas, despesas, intertrechos e comissões ficam em Cadastros.

### Evidência técnica e QA

- [x] Migration `0031_campo_rbac_prestacao_contas.sql` criada.
- [x] Backend Nest compilado.
- [x] 7 suítes e 23 testes Jest aprovados no fechamento da etapa.
- [x] Front TanStack/Vite/Nitro compilado.
- [x] Smoke autenticado dos contratos principais retornou HTTP 200.
- [x] Login, hub, gerente, permissões, configuração e conferência foram inspecionados em desktop/mobile.

### Implantação e homologação

- [ ] Aplicar a migration `0031` no ambiente alvo.
- [ ] Criar os usuários reais e atribuir funções/perfis aprovados pela AJC.
- [ ] Garantir ao gerente `campo.gerente_embarcacao` e `prestacao.lancar`.
- [ ] Garantir à administração `prestacao.ver` e `prestacao.conferir`.
- [ ] Publicar categorias, pagamentos, intertrechos e comissões reais.
- [ ] Solicitar novo login após a publicação das permissões, pois elas ficam no token.
- [ ] Homologar uma prestação completa nas duas superfícies: app do gerente e TMS.
- [ ] Conferir o PDF final contra o modelo real recebido do cliente.

## Etapa 06 — Encomendas

### Pedido e entrega funcional

- [x] Despacho, NF/DC, cotação, controle por viagem e rastreamento continuam disponíveis.
- [x] Cliente pode ser pesquisado por nome, código ou documento e criado no fluxo quando necessário.
- [x] Remetente e destinatário exigem nome, CPF/CNPJ e telefone.
- [x] Viagem e trecho vêm da navegação real.
- [x] O operador escolhe NF ou DC e envia evidência conforme a configuração publicada.
- [x] Fotos de documento e encomenda são privadas, validadas e armazenadas no MinIO com SHA-256.
- [x] Preço é recalculado pelo servidor com a versão publicada da tabela.
- [x] Alteração do valor cobrado exige justificativa quando diverge da tabela.
- [x] Pagamento pelo remetente exige caixa aberto e gera movimento financeiro.
- [x] Pagamento no destino gera título a receber.
- [x] Cotação pode virar despacho sem redigitação desnecessária.
- [x] A DC usa exatamente o termo publicado e registra assinatura/aceite auditável.
- [x] Controle por viagem, rastreamento e comprovante usam dados/eventos reais.
- [x] Registros antigos são preservados como legado incompleto, sem dados inventados.
- [x] Tamanhos, limites, pagamentos, prazo, evidências, termo e tabela de preços ficam em Cadastros.

### Evidência técnica e QA

- [x] Migration `0032_encomendas_operacionais.sql` criada.
- [x] PostgreSQL local validado com 32/32 migrations no fechamento.
- [x] Build NestJS aprovado.
- [x] 8 suítes e 26 testes Jest aprovados.
- [x] Build TanStack Start, SSR, Nitro e preset Vercel aprovado.
- [x] Smoke autenticado e inspeção desktop/mobile concluídos sem erro de console ou overflow horizontal.

### Implantação e homologação

- [ ] Aplicar a migration `0032` no ambiente alvo.
- [ ] Garantir credenciais MinIO e bucket privado `encomendas-evidencias`.
- [ ] Publicar tamanhos, limites, meios de pagamento e prazos aprovados.
- [ ] Publicar a tabela comercial real por trecho/tamanho/percentual.
- [ ] Publicar o texto jurídico final da Declaração de Conteúdo.
- [ ] Refazer login para renovar as permissões do token.
- [ ] Abrir caixa real antes do teste de pagamento pelo remetente.
- [ ] Homologar despacho com NF, despacho com DC assinada, pagamento na origem e pagamento no destino.
- [ ] Registrar como integrações futuras a balança automática e WhatsApp/SMS, até existirem equipamento/provedor reais.

## Etapa 07 — Passagens, PDV e embarque

### Pedido e entrega funcional

- [x] O PDV é uma estação de caixa real, responsiva e coerente com o Crimson Prestige.
- [x] Preço, capacidade, gratuidade, cortesia e saldo são validados pelo backend.
- [x] Venda aceita vários bilhetes e pagamento misto com conciliação exata.
- [x] Troco, parcelamento e acréscimos obedecem à configuração publicada.
- [x] Viagem, embarque e destino usam cidades válidas da rota e suportam intertrechos.
- [x] Acomodações usam preço publicado e capacidade real por classe.
- [x] Cliente pode ser pesquisado e passageiros são identificados individualmente.
- [x] Cortesia exige código válido e preserva motivo/observação.
- [x] Sangria e histórico operam sobre o caixa real do operador.
- [x] Códigos e QR Codes são reais; segunda validação retorna `ja_validado` sem duplicar embarque.
- [x] Manifesto apresenta total de saída e subtotais reais por cidade.
- [x] Canal de venda e opção fiscal por canal são persistidos e auditáveis.
- [x] A foto da embarcação é exibida quando `foto_url` está cadastrada e possui estado vazio honesto.
- [x] A URL da foto pode ser editada no cadastro da embarcação.
- [x] Caixa, pagamentos, parcelas/taxas, classes/pulseiras, gratuidades, fiscal e impressão ficam em Cadastros.
- [x] A interface não afirma que BP-e ou impressão física estão ativos quando os adapters externos estão desabilitados.

### Evidência técnica e QA

- [x] Migration `0033_passagens_pdv_operacional.sql` criada.
- [x] PostgreSQL local validado com 33/33 migrations no fechamento.
- [x] Build NestJS aprovado.
- [x] 9 suítes e 30 testes Jest aprovados.
- [x] Build Vite/Nitro SSR aprovado.
- [x] Smoke integrado validou venda, pagamento dinheiro + PIX, caixa, manifesto e idempotência.
- [x] Inspeção real concluída em desktop 1440 × 1000 e celular 390 × 844.

### Implantação e homologação

- [ ] Aplicar a migration `0033` no ambiente alvo.
- [ ] Publicar a configuração real `vendas_pdv_operacao` em Cadastros.
- [ ] Revisar preços de passagem e intertrechos publicados.
- [ ] Cadastrar caixas, formas de pagamento, parcelas/taxas, classes, gratuidades e pulseiras reais.
- [ ] Cadastrar URLs reais das fotos da frota ou implementar upload para MinIO em etapa específica.
- [ ] Validar venda completa, pagamento misto, cortesia, gratuidade, sangria, manifesto e segunda leitura do QR em produção.
- [ ] Validar o modelo de bilhete/comprovante com a AJC.

### BP-e — bloqueio externo explícito

- [x] Existe chave de configuração para obrigatoriedade/opcionalidade por canal.
- [x] Existe registro fiscal auditável e adapter desativado enquanto a integração não está homologada.
- [x] O certificado PFX foi recebido e está documentado sem ser commitado no repositório.
- [ ] Obter e armazenar a senha do PFX por mecanismo seguro.
- [ ] Validar titularidade, validade, cadeia e finalidade de uso do certificado.
- [ ] Confirmar credenciamento da AJC para BP-e na SEFAZ-PA.
- [ ] Definir o fornecedor/API fiscal ou concluir o adapter direto autorizado.
- [ ] Configurar homologação, CSC/credenciais e endpoints exigidos pelo modelo escolhido.
- [ ] Emitir um BP-e de homologação e validar XML, protocolo, impressão e consulta.
- [ ] Só depois executar o teste final de produção, considerando a regra informada de não cancelamento.

### Impressão física — bloqueio de hardware

- [x] Configuração prevê ativação e modelo homologado.
- [x] Há impressão de navegador para o comprovante enquanto o hardware não está homologado.
- [ ] Confirmar marca, modelo, protocolo e conectividade da impressora real.
- [ ] Cadastrar o equipamento/perfil real em Cadastros.
- [ ] Implementar ou ativar o adapter compatível com o equipamento homologado.
- [ ] Testar caracteres, QR, largura, corte, reconexão, falha e reimpressão.

---

## Checklist transversal de publicação até a Etapa 07

### Código e banco

- [x] Etapas 01 a 07 possuem fechamento funcional registrado no repositório.
- [x] Migrations SQL existem até `0033` e usam o runner de `schema_migrations`.
- [ ] Confirmar que o deploy de API, worker e front aponta para o mesmo commit.
- [ ] Executar `node infra/migrations/run.mjs --status` no ambiente da aplicação.
- [ ] Executar `node infra/migrations/run.mjs` se houver migrations pendentes.
- [ ] Confirmar no status final as migrations `0024` a `0033` como aplicadas.
- [ ] Executar build e suíte de testes novamente sobre o commit exato do release.

### Segurança e acesso

- [ ] Revisar perfis por função e aplicar o princípio do menor privilégio.
- [ ] Criar usuários nominais; não compartilhar credenciais operacionais.
- [ ] Refazer login após mudanças de RBAC/configuração carregadas no token.
- [ ] Confirmar auditoria de criação, edição, envio, conferência, impressão, recebimento e venda.
- [ ] Confirmar que PFX, senha, chaves MinIO e credenciais externas não estão no Git.

### Object storage

- [ ] Validar endpoint, acesso, segredo, região e TLS do MinIO em produção.
- [ ] Confirmar buckets privados e policies conforme `docs/infra/BUCKETS-PENDENTES.md`.
- [ ] Executar upload, leitura autorizada, expiração de URL e bloqueio de acesso anônimo.
- [ ] Validar backup, retenção e recuperação dos documentos/evidências.

### Configurações reais em Cadastros

- [ ] Publicar rotas, horários, paradas e intertrechos.
- [ ] Publicar agenda e regras de recebimento/paletização.
- [ ] Cadastrar locais operacionais e proprietários reais.
- [ ] Publicar categorias e regras da prestação de contas.
- [ ] Publicar tamanhos, preços e termo jurídico de encomendas.
- [ ] Publicar parâmetros de caixa, passagem, gratuidade, fiscal e impressão.
- [ ] Guardar autor, data e versão de cada publicação.

### Homologação operacional

- [ ] Etapa 01: alertas e caixas com dados reais.
- [ ] Etapa 02: ciclo de viagem e calendário com programação oficial.
- [ ] Etapa 03: NF/DC por XML, PDF e foto; cliente existente e novo.
- [ ] Etapa 04: recebimento AVULSA/MP/PD/PC, palete, offline e etiqueta física.
- [ ] Etapa 05: prestação lançada no app do gerente e conferida no TMS.
- [ ] Etapa 06: encomenda completa com NF e com DC, evidências e financeiro.
- [ ] Etapa 07: venda, multipagamento, cortesia/gratuidade, manifesto e QR usado duas vezes.
- [ ] Registrar evidências e aceite nominal da AJC para cada etapa.

## Critério de encerramento

As Etapas 01 a 07 podem ser consideradas **concluídas em engenharia**. O aceite **integral em produção** somente deve ser marcado quando:

1. as migrations estiverem aplicadas no ambiente alvo;
2. as configurações comerciais e operacionais reais estiverem publicadas;
3. MinIO, usuários e permissões tiverem sido homologados;
4. os fluxos reais tiverem evidência e aceite da AJC; e
5. os itens externos forem tratados com honestidade: BP-e e impressão física continuam pendentes até integração/homologação, sem simulação de sucesso.

## Documentos de referência

- `docs/feedback/2026-07-09-validacao-core-todas-telas-diagramado.docx`
- `docs/feedback/2026-08-01-etapa-03-lancamento-nf-dc-unificado.md`
- `docs/feedback/2026-08-03-etapa-04-paletizacao-etiquetas.md`
- `docs/feedback/2026-08-03-etapa-05-app-gerente-prestacao.md`
- `docs/feedback/2026-08-03-etapa-06-encomendas.md`
- `docs/feedback/2026-08-04-etapa-07-passagens-pdv.md`
- `docs/infra/BUCKETS-PENDENTES.md`
- `docs/STATUS.md`
