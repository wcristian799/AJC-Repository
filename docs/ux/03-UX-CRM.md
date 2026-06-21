# UX 03 — CRM (Clientes, Agentes, Histórico de Preços e Cotações)

> Detalhamento de UX do módulo CRM do MVP. **Herda integralmente** a Fundação (`00-Fundacao-DesignSystem-Navegacao-Acesso.md`): design tokens, shell de navegação (Topbar + Sidebar), estados universais de tela e a biblioteca de componentes (`DataTable`, `FilterBar`, `DetailDrawer/DetailPage`, `FormPanel`, `StatusChip`, `KPIStat`, `AuditTrail`, `BulkAdjustDialog`). Quando uma tela não especifica um comportamento, vale o que está na Fundação.

## Contexto do módulo (do PRD + SPEC 04)

- **Estrutura comercial:** Belém = equipe comercial central; **7 cidades = 1 agente comercial por cidade** (BRV, GUR, ALM, PMZ, PRA, MTA, STM). Cada **cliente é alocado a exatamente um agente** — isso é a base da comissão e do split.
- **Confiança é o diferencial** (PRD §1): a precificação do próximo envio se apoia no **histórico do cliente** (mostrar ≥ 2 últimos envios). Saber o que foi cobrado da última vez evita prejuízo e dá segurança ao agente.
- **Cotação** (encomenda / carga / veículo) não compromete vaga e **pode virar despacho/pedido**, registrando o agente para comissão.
- **Dependências:**
  - Cadastro de cliente/agente é **compartilhado com Cadastros** (perfil Comercial). No CRM, criar/editar cliente abre o mesmo `FormPanel` do módulo Cadastros.
  - **Comissão fecha no Financeiro** (Fase 2, fora do MVP). No CRM tudo que envolve comissão aparece **rotulado "estimativa"** e nunca como valor fechado.
- **Pendências herdadas (🔶):** mecânica/tabela de preço de **encomendas** (Lucas); **regras de comissão** de agentes (diretoria). Marcadas com 🔶 onde impactam a tela.

## Personas deste módulo

| Persona | Onde atua | Dispositivo |
|---|---|---|
| **Comercial central (Belém)** | Back-office Console | Desktop |
| **Agente da cidade** | Painel do agente | Web responsivo (desktop no escritório da agência; tablet/celular em campo) |
| **Gerente comercial / Diretoria** | Visão de alocação e carteira | Desktop |
| **Administrador** | Realocação, permissões | Desktop |

## Mapa de telas (cobertura B.1–B.6)

| Código | Tela | SPEC | Persona principal |
|---|---|---|---|
| `CRM-01` | Base de clientes (lista) | B.1 | Comercial |
| `CRM-02` | Ficha do cliente 360º | B.2 | Comercial / Agente |
| `CRM-03` | Alocação de clientes a agentes | B.3 | Gerente / Admin |
| `CRM-04` | Histórico de envios e precificações | B.4 | Comercial / Agente |
| `CRM-05` | Cotação (encomenda/carga/veículo → despacho) | B.5 | Comercial / Agente |
| `CRM-06` | Painel do agente comercial | B.6 | Agente |

Posição na Sidebar: **👥 CRM** com subitens *Clientes · Alocação · Cotações*. O **Painel do agente** (`CRM-06`) é a home do perfil Agente (entra direto nela).

---

## CRM-01 — Base de clientes (lista)

- **Persona:** Comercial central (Belém); Gerente comercial.
- **Dispositivo:** Back-office Console (desktop).
- **Objetivo:** Encontrar qualquer cliente e ver, de relance, a que agente está alocado e quão ativo está.

### Wireframe

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC]  Belém ▾                                   🔔   ◑sync   Ana (Comerc.) ▾│
├──────────┬─────────────────────────────────────────────────────────────────┤
│ ◉ Início │  CRM › Clientes                                                   │
│ ⛴ Naveg. │ ┌─ FilterBar ───────────────────────────────────────────────────┐│
│ 📦 TMS   │ │ Cidade [Todas ▾] Agente [Todos ▾] Tipo [PF·PJ ▾] Período [ ▾]  ││
│ 🎫 Vendas│ │ 🔍 Buscar nome / CPF·CNPJ            [Limpar]   [+ Novo cliente]││
│ 👥 CRM   │ └────────────────────────────────────────────────────────────────┘│
│  • Client│ ┌─ KPIStat row ──────────────────────────────────────────────────┐│
│  • Alocaç│ │ Clientes 1.284 │ Sem agente ⚠ 12 │ Ativos 90d 612 │ Novos mês 38││
│  • Cotaçõ│ └────────────────────────────────────────────────────────────────┘│
│ ⚙ Cadast.│ ┌─ DataTable ────────────────────────────────────────────────────┐│
│          │ │ ☐ Nome ▲        Tipo  CPF/CNPJ     Cidade  Agente    Últ.envio  Total mov.│
│          │ │ ☐ Ana Souza      PF   ***.123-00   STM     R. Lima   12/06  R$ 4.250 │
│          │ │ ☐ Comercial Boa  PJ   12.***/0001  BRV     J. Alves  09/06  R$ 38.900│
│          │ │ ☐ Pedro Marreta  PF   ***.880-00   —  ⚠sem  —         02/01  R$ 120   │
│          │ │ ☐ …                                                            ││
│          │ │ [Exportar CSV/PDF]  ◀ 1 2 3 … 26 ▶   Densidade ▣  50/pág ▾     ││
│          │ └────────────────────────────────────────────────────────────────┘│
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Composição (componentes nomeados)

- **`FilterBar`**: Cidade (8 siglas + "Todas"), Agente (lista de agentes ativos + "Sem agente"), Tipo (PF/PJ), Período (último envio). Persistente por usuário.
- **`KPIStat` (linha):** total de clientes, **Sem agente** (chip `warning` — clientes que exigem agente e não têm), ativos nos últimos 90 dias, novos no mês.
- **`DataTable`:** colunas nome (ordenável, padrão), tipo, CPF/CNPJ (mascarado por LGPD), cidade, **agente responsável**, **último envio** (data), **total movimentado**. Linhas sem agente em cidade que exige agente recebem `StatusChip` `warning` "sem agente". Busca, ordenação, paginação, densidade, exportar, seleção em lote.
- **Ações em lote:** atribuir/realocar agente (abre `CRM-03` com a seleção pré-carregada) — só perfil com permissão.
- **`+ Novo cliente`:** abre o `FormPanel` de cadastro de cliente (compartilhado com Cadastros).

### Fluxo passo a passo

1. Comercial entra em CRM › Clientes.
2. Filtra por cidade/agente/tipo ou busca por nome/CPF.
3. Clica numa linha → abre **`CRM-02` (Ficha 360º)** como `DetailDrawer` (lateral) ou `DetailPage`.
4. Para criar, clica `+ Novo cliente` → `FormPanel`; ao salvar, retorna à lista com o novo cliente em destaque.
5. Para exportar, aplica filtros e clica `Exportar`.

### Estados específicos

- **Vazio (sistema novo):** "Nenhum cliente cadastrado." + `[+ Novo cliente]`.
- **Filtro vazio:** "Nenhum cliente para estes filtros." + `[Limpar filtros]`.
- **Carregando:** skeleton de tabela (não spinner).
- **Erro:** "Não foi possível carregar os clientes. [Tentar de novo]".

### Regras e validações

- CPF/CNPJ exibido **mascarado**; valor completo só na ficha, com permissão (LGPD, PRD §7).
- "Total movimentado" e "último envio" derivam de Vendas/Encomendas (somatório de envios faturados). Se não houver envios, exibe "—".
- Cliente **sem agente** em cidade que exige agente é destacado e contado no KPI "Sem agente".

### Navegação

- Linha → `CRM-02`. `+ Novo` → `FormPanel` cadastro. Lote → `CRM-03`. Busca global (Ctrl+K) também leva à ficha.

---

## CRM-02 — Ficha do cliente 360º  ⭐ (tela mais rica)

- **Persona:** Comercial central; Agente (em modo leitura/edição conforme permissão).
- **Dispositivo:** Back-office Console (desktop); legível em tablet no painel do agente.
- **Objetivo:** Reunir num só lugar tudo do cliente — dados, agente, **histórico que sustenta a próxima precificação**, cotações, passagens e resumo financeiro.

### Wireframe (cabeçalho + abas)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC] Belém ▾                                   🔔  ◑sync  Ana (Comerc.) ▾  │
├──────────┬─────────────────────────────────────────────────────────────────┤
│ Sidebar  │ CRM › Clientes › Comercial Boa Vista                              │
│          │ ┌─ Header da ficha ──────────────────────────────────────────────┐│
│          │ │ 🏢 Comercial Boa Vista LTDA          [PJ]   ● Cliente ativo      ││
│          │ │ CNPJ 12.345.678/0001-90 · Breves (BRV)                          ││
│          │ │ Agente: 👤 João Alves (BRV)  [Realocar]      ✉ WhatsApp  ✏ Editar││
│          │ │ KPIStat: Faturado 12m R$ 142.300 │ Em aberto R$ 8.900 │ Envios 27││
│          │ ├────────────────────────────────────────────────────────────────┤│
│          │ │ [Dados] [Agente] [Histórico de envios •2] [Cotações 1] [Passag.]││
│          │ │         [Financeiro]                                            ││
│          │ ├────────────────────────────────────────────────────────────────┤│
│          │ │  «conteúdo da aba selecionada»                                  ││
│          │ │                                                                ││
│          │ └────────────────────────────────────────────────────────────────┘│
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Composição

Implementado como **`DetailPage` com abas**. Header fixo com: ícone PF/PJ, nome, `StatusChip` de situação, identificação mascarável, **agente alocado** com botão `Realocar` (permissão), atalho de contato WhatsApp, `Editar`, e linha de **`KPIStat`** (faturado 12m, em aberto, nº de envios). As abas:

#### Aba "Dados"
`FormPanel` em modo leitura (toggle Editar): tipo PF/PJ, nome/razão, CPF/CNPJ, contatos[] (telefone/WhatsApp/e-mail), endereço, cidade, observações. Rodapé com Salvar/Cancelar quando em edição; aviso de alterações não salvas. **Compartilhado com Cadastros.** Rodapé inclui mini-`AuditTrail` ("criado por / atualizado por / quando").

#### Aba "Agente"
- Agente atual (crachá, cidade, **% de comissão** do agente — informativo).
- Botão `Realocar` → diálogo de realocação (mesmo de `CRM-03`).
- **`AuditTrail` de alocação:** linha do tempo de quem alocou/realocou e quando ("De — para João Alves, por Ana em 04/06").

#### Aba "Histórico de envios" ⭐ (coração da precificação)

```
┌─ 2 ÚLTIMOS ENVIOS (referência de preço) ──────────────────────────────────┐
│ ┌───────────────────────────┐  ┌───────────────────────────┐              │
│ │ MAIS RECENTE  12/06/2026  │  │ ANTERIOR      28/05/2026  │              │
│ │ BEL → BRV                 │  │ BEL → BRV                 │              │
│ │ 8 volumes · eletrônicos   │  │ 6 volumes · eletrônicos   │              │
│ │ Preço praticado           │  │ Preço praticado           │              │
│ │   R$ 1.240   (R$155/vol)  │  │   R$ 900    (R$150/vol)   │   ↑ +3,3%/vol│
│ │ [Repetir p/ nova cotação] │  │ [Repetir p/ nova cotação] │              │
│ └───────────────────────────┘  └───────────────────────────┘              │
└────────────────────────────────────────────────────────────────────────────┘
┌─ DataTable: todos os envios ───────────────────────────────────────────────┐
│ Data ▼     Trecho   Volumes  Conteúdo      Preço     R$/vol   Origem        │
│ 12/06/26   BEL→BRV   8        eletrônicos   1.240     155      Encomenda #..  │
│ 28/05/26   BEL→BRV   6        eletrônicos    900      150      Carga #..      │
│ 11/04/26   BEL→BRV  12        diversos      1.680     140      Encomenda #..  │
│ …                                                       [Exportar] [Ver B.4]│
└────────────────────────────────────────────────────────────────────────────┘
```

- **Dois cards em destaque** (mais recente + anterior), lado a lado, com **preço praticado** em número grande (princípio 4 da Fundação: "o número que importa fica gigante"), **R$/volume** calculado e **variação entre os dois** (`StatusChip` success/warning). É o apoio direto à nova precificação.
- Cada card tem **`Repetir p/ nova cotação`** → abre `CRM-05` pré-preenchido com trecho/volumes/conteúdo daquele envio (preço sugerido = último praticado).
- `DataTable` abaixo com o histórico completo; "Ver B.4" abre `CRM-04` (visão dedicada). Dados derivam de Encomendas/Carga (somente leitura aqui).

#### Aba "Cotações"
`DataTable` de cotações do cliente: tipo (encomenda/carga/veículo), trecho, valor estimado, validade, **status** (`StatusChip`: aberta/convertida/expirada). Ação `+ Nova cotação` → `CRM-05`; clicar numa aberta reabre a cotação; convertida tem link para o despacho gerado.

#### Aba "Passagens"
`DataTable` de passagens compradas (de Vendas): data, viagem/trecho, classe (Rede/VIP/Camarote/Cortesia/Gratuidade/Contrato), valor, status. Somente leitura no CRM.

#### Aba "Financeiro" (resumo — estimativa)
`KPIStat`: faturado (12m/total), **em aberto**, ticket médio por envio. Lista resumida de títulos a receber com `StatusChip` (a vencer/vence na semana/vencida). **Banner informativo:** "Visão resumida. O fechamento financeiro e a comissão do agente são consolidados no módulo Financeiro (fora do MVP)." Valores de comissão aqui são **estimativa**.

### Fluxo passo a passo (precificar com base no histórico)

1. Comercial/agente abre a ficha vindo de `CRM-01` ou da busca global.
2. Vai à aba **Histórico de envios**; lê os **2 cards em destaque** (último R$155/vol vs anterior R$150/vol → tendência de alta).
3. Clica **`Repetir p/ nova cotação`** no card mais recente.
4. É levado a `CRM-05` com trecho/volumes/conteúdo preenchidos e **preço de referência = último praticado**; ajusta e gera a cotação.
5. Se fechar negócio, converte a cotação em despacho (registra agente para comissão).

### Estados específicos

- **Cliente sem histórico:** cards de destaque em estado vazio ("Sem envios anteriores. A primeira precificação usará a tabela padrão." + atalho para `CRM-05`).
- **Cliente sem agente:** header mostra chip `warning` "Sem agente" + `[Alocar agente]`.
- **Aba carregando:** skeleton por aba (carrega sob demanda).
- **Erro parcial:** se uma aba falhar (ex.: Financeiro), exibe erro só naquela aba; o resto da ficha continua utilizável.

### Regras e validações

- CPF/CNPJ completo visível só com permissão; ação de "revelar" fica no `AuditTrail` (LGPD).
- `Realocar` exige permissão (Comercial/Admin) e **registra histórico** na aba Agente.
- Histórico, passagens e financeiro são **somente leitura** no CRM (donos: Encomendas/Carga, Vendas, Financeiro).
- Variação de preço é só indicador; **não bloqueia** decisão.

### Navegação

- Header `Realocar` → diálogo de `CRM-03`. `Editar` → `FormPanel`. Card histórico/`+ Nova cotação` → `CRM-05`. "Ver B.4" → `CRM-04`. Cotação convertida → despacho (módulo Encomendas/Carga).

---

## CRM-03 — Alocação de clientes a agentes

- **Persona:** Gerente comercial; Administrador.
- **Dispositivo:** Back-office Console (desktop).
- **Objetivo:** Ver a carteira de cada agente e realocar clientes mantendo a regra "1 agente por cidade" e o rastro da mudança.

### Wireframe (visão por agente + realocação)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC] Belém ▾                                   🔔  ◑sync  Marcos (Gerente) ▾│
├──────────┬─────────────────────────────────────────────────────────────────┤
│ Sidebar  │ CRM › Alocação                                                    │
│          │ ┌─ Cards por agente (KPIStat) ───────────────────────────────────┐│
│          │ │ ┌ João Alves · BRV ┐ ┌ R. Lima · STM ┐ ┌ ⚠ ALM · vago ┐        ││
│          │ │ │ Clientes   84    │ │ Clientes  210 │ │ Clientes  31  │        ││
│          │ │ │ Vol.12m R$1,2M   │ │ R$ 3,4M       │ │ R$ 410k       │        ││
│          │ │ │ Comissão* R$36k  │ │ R$ 102k       │ │ sem agente!   │        ││
│          │ │ │ %com. 3,0%       │ │ 3,0%          │ │ [Designar]    │        ││
│          │ │ └──────────────────┘ └───────────────┘ └───────────────┘        ││
│          │ │  *comissão = estimativa (fecha no Financeiro)                   ││
│          │ └────────────────────────────────────────────────────────────────┘│
│          │ ┌─ Clientes do agente selecionado: João Alves (BRV) ─────────────┐│
│          │ │ ☐ Nome           Cidade  Últ.envio  Total mov.   [Realocar ▾]   ││
│          │ │ ☐ Comercial Boa   BRV     12/06     R$142.300                    ││
│          │ │ ☐ Ana Souza       BRV     09/06     R$  4.250                    ││
│          │ │ ☐ …                                                            ││
│          │ │ Selecionados: 2   [Realocar para… ▾] [Confirmar realocação]    ││
│          │ └────────────────────────────────────────────────────────────────┘│
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Composição

- **Grid de cards por agente** (um `KPIStat` por agente das 7 cidades + Belém): nº de clientes, **volume captado 12m**, **comissão estimada** (rotulada `*estimativa`), % de comissão do agente. Cidade **sem agente** vira card `warning` "vago" com `[Designar]`.
- **`DataTable` da carteira** do agente selecionado, com seleção em lote.
- **Diálogo de realocação:** destino (agente/cidade), **motivo** (campo obrigatório), pré-visualização ("2 clientes sairão de João Alves → Maria Reis"). Confirmação destrutiva-leve (nomeia objetos).
- **`AuditTrail`** acessível por card/cliente: histórico de realocações.

### Fluxo passo a passo

1. Gerente abre CRM › Alocação; vê a saúde das carteiras nos cards.
2. Seleciona um agente → vê seus clientes.
3. Marca um ou mais clientes → `Realocar para…` escolhe destino → informa motivo.
4. Revisa a pré-visualização e `Confirmar realocação`.
5. Sistema move os clientes, **registra no `AuditTrail`** (quem/quando/de→para/motivo) e atualiza KPIs.

### Estados específicos

- **Cidade sem agente (erro de regra B.3):** card `warning` + alerta no topo "ALM está sem agente — 31 clientes sem responsável. [Designar agente]".
- **Vazio:** agente sem clientes → "Nenhum cliente nesta carteira."
- **Sucesso:** toast "2 clientes realocados para Maria Reis" + atualização imediata dos cards.

### Regras e validações

- **1 agente por cidade** (PRD): designar um segundo agente para uma cidade já ocupada exige confirmação explícita (substituição) e migra a carteira.
- Realocar **exige motivo** e gera registro imutável (antifraude/auditabilidade).
- Comissão exibida é **estimativa**; fechamento no Financeiro (banner sempre visível).
- Realocar não altera o histórico de envios já atribuído (comissão de envios passados pertence ao agente da época) — 🔶 regra de corte/efeito-retroativo da comissão depende das **regras de comissão** (diretoria).

### Navegação

- Card `Designar`/`Realocar` → diálogo de alocação. Linha de cliente → `CRM-02`. Lote vindo de `CRM-01` chega aqui pré-selecionado.

---

## CRM-04 — Histórico de envios e precificações

- **Persona:** Comercial; Agente.
- **Dispositivo:** Back-office Console (desktop); web responsivo para o agente.
- **Objetivo:** Visão dedicada e comparável dos envios de um cliente para precificar o próximo com segurança.

### Wireframe

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC] Belém ▾                                   🔔  ◑sync  João (Agente) ▾   │
├──────────┬─────────────────────────────────────────────────────────────────┤
│ Sidebar  │ CRM › Clientes › Comercial Boa Vista › Histórico de envios        │
│          │ ┌─ FilterBar ────────────────────────────────────────────────────┐│
│          │ │ Trecho [Todos ▾]  Tipo [Encomenda·Carga·Veíc ▾]  Período [12m ▾]││
│          │ └────────────────────────────────────────────────────────────────┘│
│          │ ┌─ 2 ÚLTIMOS (destaque) ─────────────────────────────────────────┐│
│          │ │  MAIS RECENTE 12/06  R$ 1.240  (R$155/vol·8 vol)                ││
│          │ │  ANTERIOR     28/05  R$   900  (R$150/vol·6 vol)   Δ +3,3%/vol  ││
│          │ │  Sugestão p/ próximo envio: ~R$155/vol  [Usar na cotação →]     ││
│          │ └────────────────────────────────────────────────────────────────┘│
│          │ ┌─ DataTable (todos os envios) ──────────────────────────────────┐│
│          │ │ Data ▼  Trecho   Vol  Conteúdo     Preço  R$/vol  Pago?  Origem ││
│          │ │ 12/06   BEL→BRV   8   eletrônicos  1.240   155    ●sim   Enc#…  ││
│          │ │ 28/05   BEL→BRV   6   eletrônicos    900   150    ●sim   Carga# ││
│          │ │ 11/04   BEL→BRV  12   diversos     1.680   140    ○aberto Enc#… ││
│          │ │ [Exportar CSV/PDF]                          ◀ 1 2 ▶            ││
│          │ └────────────────────────────────────────────────────────────────┘│
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Composição

- **`FilterBar`:** trecho, tipo (encomenda/carga/veículo), período.
- **Bloco "2 últimos" em destaque:** mesmos dois cards/linha da ficha, com **R$/volume** e **Δ** entre eles, mais uma **linha de sugestão** ("~R$155/vol") e botão `Usar na cotação →`.
- **`DataTable`:** data, trecho, volumes, conteúdo, **preço praticado**, R$/vol, status de pagamento (`StatusChip`), origem (link para o despacho/carga). Ordenável por data/preço; exportável.

### Fluxo passo a passo

1. Aberto pela ficha (`CRM-02`) ou direto pela busca.
2. Usuário filtra por trecho/tipo para comparar peras com peras (mesmo trecho).
3. Lê os 2 últimos + a sugestão de R$/vol.
4. Clica `Usar na cotação` → `CRM-05` pré-preenchido com trecho e preço de referência.

### Estados específicos

- **Sem envios:** "Este cliente ainda não tem envios. A primeira cotação usará a tabela padrão. [Nova cotação]".
- **1 único envio:** destaque mostra só o "mais recente"; o slot "anterior" diz "sem envio anterior".
- **Filtro vazio:** "Nenhum envio para este trecho/período."

### Regras e validações

- Preço exibido é o **efetivamente praticado** (não a tabela), pois é o que dá segurança.
- Δ e sugestão são **indicativos**; a decisão é do agente.
- 🔶 Quando a origem é **encomenda**, o detalhamento de preço por tamanho (P/M/G) depende da mecânica de encomendas (Lucas); até lá, mostra o valor cobrado registrado.
- Dados são somente leitura (donos: Encomendas/Carga).

### Navegação

- `Usar na cotação` / sugestão → `CRM-05`. Origem de cada linha → despacho/carga correspondente. Breadcrumb volta à ficha.

---

## CRM-05 — Cotação (encomenda / carga / veículo → converter em despacho)

- **Persona:** Comercial; Agente.
- **Dispositivo:** Back-office Console; web responsivo (agente em campo).
- **Objetivo:** Estimar o valor de um envio (encomenda/carga/veículo) e, fechando negócio, converter a cotação em despacho registrando o agente.

### Wireframe

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC] Belém ▾                                   🔔  ◑sync  João (Agente) ▾   │
├──────────┬─────────────────────────────────────────────────────────────────┤
│ Sidebar  │ CRM › Cotações › Nova cotação                                     │
│          │ ┌─ Tipo ─────────────────────────────────────────────────────────┐│
│          │ │  ( ) Encomenda 🔶    (•) Carga      ( ) Veículo                 ││
│          │ └────────────────────────────────────────────────────────────────┘│
│          │ ┌─ FormPanel ───────────────────┐ ┌─ Resumo da cotação ──────────┐│
│          │ │ Cliente [Comercial Boa Vista▾]│ │  Valor estimado              ││
│          │ │ Agente  [João Alves · BRV]    │ │     R$ 1.240                 ││
│          │ │ Trecho  [BEL → BRV ▾]          │ │  Validade: 7 dias (até 27/06)││
│          │ │ ── Carga (tabela/tier) ──      │ │  Tier carga: B (R$155/vol)   ││
│          │ │ Tier [B ▾]  Volumes [ 8 ]      │ │  ─────────────────────────   ││
│          │ │ Peso/m³ [..] Conteúdo [....]   │ │  ℹ Hist.: últ. R$155/vol     ││
│          │ │ 💡 Ref. histórico: R$155/vol  │ │     (12/06) — alinhado ✓     ││
│          │ │                               │ │  Comissão agente* ~R$37 (3%) ││
│          │ │                               │ │  *estimativa (Financeiro)    ││
│          │ │ [Salvar rascunho]             │ │ [Gerar cotação]              ││
│          │ └───────────────────────────────┘ │ [Converter em despacho →]    ││
│          │                                    └──────────────────────────────┘│
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Composição

- **Seletor de tipo:** Encomenda (🔶 mecânica pendente) · Carga (tabela/tier pronto) · Veículo (tabela pronta).
- **`FormPanel`** (esquerda): cliente (busca), **agente** (auto-preenchido pelo agente do cliente; editável só com permissão), trecho, e os parâmetros do tipo:
  - **Carga:** tier (= % de preço), volumes, peso/m³, conteúdo.
  - **Veículo:** categoria do veículo (tabela), trecho.
  - **Encomenda:** tamanho P/M/G + valor declarado — **🔶 cálculo pendente** (Lucas): acima de R$1.000, % sobre o valor declarado (RF-3). Até lá, campo de **valor manual** com aviso "tabela de encomenda pendente".
  - **💡 Referência de histórico:** mostra o último R$/vol do cliente naquele trecho (vem de `CRM-04`) e sinaliza se a cotação está alinhada/acima/abaixo.
- **Painel "Resumo da cotação"** (direita, fixo): **valor estimado** (número grande), validade (default 🔶, sugestão 7 dias), composição (tier/tabela), comparação com histórico, **comissão estimada** do agente (rotulada `*estimativa`).
- **Ações:** `Salvar rascunho`, `Gerar cotação` (status *aberta*), `Converter em despacho →`.

### Fluxo passo a passo

1. Usuário escolhe o tipo (carga/veículo/encomenda).
2. Seleciona o cliente → agente preenche automaticamente; trecho sugerido pelo histórico.
3. Preenche os parâmetros; o **valor estimado** atualiza em tempo real (tabela/tier). A **referência de histórico** ajuda a validar.
4. `Gerar cotação` → cria cotação **aberta** com validade; aparece na aba Cotações do cliente e em `CRM-06`.
5. Fechando negócio, `Converter em despacho →`: a cotação vira **despacho/pedido** (módulo Encomendas/Carga), status muda para **convertida**, e o **agente é registrado para comissão** (estimativa).

### Estados específicos

- **Aberta:** padrão após gerar; editável; conta na carteira/estimativa.
- **Convertida:** trava edição; link para o despacho gerado; chip `success`.
- **Expirada:** passou a validade; chip `neutral/warning`; ação `Reabrir/Recalcular` (recalcula com tabela atual).
- **Encomenda sem tabela (🔶):** banner "Preço de encomenda ainda não configurado — informe o valor manualmente; será recalculado quando a tabela chegar."
- **Cliente sem agente:** bloqueia conversão até alocar; CTA `[Alocar agente]`.

### Regras e validações

- Cotação **não compromete vaga** (SPEC A.2): converter em despacho é que entra no controle operacional/por viagem.
- Valor estimado vem da **tabela/tier** (carga/veículo); edição manual exige permissão e fica registrada.
- **Validade** obrigatória; expira automaticamente (🔶 duração padrão a definir).
- Conversão registra cliente + **agente** (base da comissão) e dispara o fluxo do módulo de destino (declaração de conteúdo/assinatura é tratada lá, não aqui).
- Comissão exibida é **estimativa** (🔶 regras de comissão pendentes; fecha no Financeiro).

### Navegação

- Vem de `CRM-02` (aba Cotações / card "Repetir"), `CRM-04` (sugestão) ou `CRM-06`. `Converter` → despacho em Encomendas/Carga. Após gerar, volta à ficha do cliente ou ao painel do agente.

---

## CRM-06 — Painel do agente comercial

- **Persona:** Agente da cidade (BRV, GUR, ALM, PMZ, PRA, MTA, STM) — e equipe de Belém.
- **Dispositivo:** **Web responsivo** — desktop no escritório da agência; tablet/celular em campo (toques ≥ 48dp, conforme Fundação para uso móvel).
- **Objetivo:** Dar ao agente, num só lugar, sua carteira, suas cotações e a **comissão estimada** do período — e permitir captar/cotar rápido.

### Wireframe (desktop)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC] Breves (BRV) ▾                            🔔  ◑sync  João Alves ▾      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Meu painel — Breves (BRV)              Período [Este mês ▾]   [+ Nova cotação]│
│ ┌─ KPIStat ────────────────────────────────────────────────────────────────┐ │
│ │ Comissão estimada* │ Captado no mês │ Cotações abertas │ Conversão        │ │
│ │   R$ 3.150         │  R$ 105.000    │      6           │   62%            │ │
│ │ *estimativa — fecha no Financeiro                                         │ │
│ └────────────────────────────────────────────────────────────────────────────┘
│ ┌─ Cotações abertas ─────────────────┐ ┌─ Meus clientes (top) ─────────────┐ │
│ │ Cliente      Tipo   Valor  Validade│ │ Cliente        Últ.envio  Total   │ │
│ │ Comercial B  Carga  1.240  27/06   │ │ Comercial Boa   12/06   R$142.300 │ │
│ │ Ana Souza    Enc🔶   180   25/06   │ │ Ana Souza       09/06   R$  4.250 │ │
│ │ … [converter] [reabrir]            │ │ … [ver todos →]                   │ │
│ └────────────────────────────────────┘ └───────────────────────────────────┘ │
│ ┌─ Captação rápida ──────────────────────────────────────────────────────────┐
│ │ [Captar carga] [Captar encomenda 🔶] [Captar veículo]  → cria cotação/lança │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Composição

- **Contexto fixado na cidade do agente** (seletor da topbar travado em BRV para João; Belém vê todas).
- **`KPIStat` (linha):** **comissão estimada** do período (rotulada `*estimativa`), captado no período, cotações abertas, taxa de conversão.
- **`DataTable` "Cotações abertas":** com ações rápidas `converter`/`reabrir` (vai para `CRM-05`).
- **`DataTable` "Meus clientes":** carteira do agente (link para `CRM-02`); "ver todos" abre `CRM-01` já filtrado pelo agente.
- **"Captação rápida":** botões grandes (uso em campo) que abrem `CRM-05` no tipo escolhido e/ou lançam a captação no controle operacional (RF-2/B.6).
- **`FilterBar` de período** (mês/semana/intervalo).

### Fluxo passo a passo

1. Agente faz login → cai direto no seu painel (home do perfil Agente).
2. Vê **comissão estimada** e cotações abertas do período.
3. Toca `+ Nova cotação` ou um botão de captação rápida → `CRM-05` já no contexto da cidade.
4. Converte cotações fechadas em despacho ali mesmo.
5. Acompanha a carteira; abre uma ficha para precificar com base no histórico.

### Estados específicos

- **Vazio (agente novo):** "Você ainda não tem clientes nem cotações. [Captar primeiro cliente]".
- **Offline (campo, web responsivo):** `OfflineBanner` "Sem conexão — captações serão enviadas ao reconectar"; cotação fica em rascunho local na fila de sincronização.
- **Carregando:** skeletons nos KPIs e tabelas.

### Regras e validações

- Agente **só vê a própria carteira/cidade** (RBAC); Belém e Gerente veem todas.
- **Comissão é sempre estimativa** no CRM — banner permanente; valor oficial fecha no Financeiro (fora do MVP).
- 🔶 O número da comissão depende das **regras de comissão** (diretoria); até lá usa `%comissao` do agente × captado, claramente marcado como provisório.
- 🔶 Captação de **encomenda** depende da mecânica de preço (Lucas).

### Navegação

- `+ Nova cotação` / captação → `CRM-05`. Cotação → `CRM-05`/despacho. Cliente → `CRM-02`. "Ver todos" → `CRM-01` filtrado.

---

## Dependências e pendências (resumo)

| Item | Tipo | Onde impacta | Tratamento no MVP |
|---|---|---|---|
| Cadastro de cliente/agente | Compartilhado com **Cadastros** | CRM-01, CRM-02 (Dados) | Reusa o mesmo `FormPanel`; permissão perfil Comercial |
| Fechamento de comissão | **Financeiro** (Fase 2) | CRM-02 (Financeiro), CRM-03, CRM-06 | Sempre rotulado **"estimativa"**; banner permanente |
| 🔶 Tabela/mecânica de **encomenda** | Pendente (Lucas) | CRM-05 (tipo encomenda), CRM-04 | Valor manual + aviso; recálculo quando chegar |
| 🔶 **Regras de comissão** | Pendente (diretoria) | CRM-03, CRM-06 | Estimativa provisória `% × captado` |
| 🔶 **Validade padrão** da cotação | A definir | CRM-05 | Sugestão 7 dias, configurável |
| 🔶 Efeito de **realocação** sobre comissão de envios passados | A definir | CRM-03 | Histórico permanece com agente da época (a confirmar) |

---

## Resumo (5 linhas) e decisões de UX

1. **6 telas** cobrem B.1–B.6, todas herdando o shell e a biblioteca da Fundação (`DataTable`, `FilterBar`, `DetailPage` com abas, `KPIStat`, `AuditTrail`, `StatusChip`, `FormPanel`).
2. A **ficha 360º (CRM-02)** é o centro: 6 abas, com a aba **Histórico** trazendo os **2 últimos envios como cards de preço em destaque** (preço e R$/vol gigantes + variação) e botão "Repetir → cotação".
3. O **histórico de preços alimenta diretamente a precificação**: `CRM-04` e os cards levam o último R$/vol para `CRM-05` como referência, validando se a nova cotação está alinhada/acima/abaixo.
4. **Cotação → despacho** num clique em `CRM-05`, registrando o **agente** para comissão; cotação não reserva vaga (status aberta/convertida/expirada).
5. **Decisões-chave:** comissão sempre marcada como **estimativa** (Financeiro é Fase 2); regra **1 agente/cidade** com realocação auditada e motivo obrigatório; painel do agente como **web responsivo** com captação rápida e RBAC por cidade; pendências de **encomenda** e **regras de comissão** isoladas com 🔶 e fallback manual para não travar o MVP.
