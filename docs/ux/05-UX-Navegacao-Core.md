# UX 05 — Navegação-Core (Embarcações · Viagens · Status)

> Documento de UX detalhado do módulo **Navegação-Core** do MVP AJC.
> **Herda integralmente** as regras de `00-Fundacao-DesignSystem-Navegacao-Acesso.md`: tokens, shell de back-office, componentes nomeados (DataTable, FilterBar, FormPanel, StatusChip, KPIStat, DetailDrawer, AuditTrail, etc.) e os 5+1 estados universais de tela. Quando uma tela aqui não especifica um comportamento, **vale o que está na Fundação**.
>
> **Escopo desta entrega (Navegação-Core):** (1) embarcações, (2) viagens/cronograma e (3) status de viagem.
> **Fast-follow (fora desta entrega, citado onde toca):** rastreamento em tempo real (mapa/GPS/AIS), escala avançada de colaboradores com notificação WhatsApp, e ETA calculada por posição real. Onde o cálculo de situação depende de dado em tempo real, esta entrega usa **fonte manual** (apontamento de chegada/saída) — ver §8.
>
> **Por que este módulo é a dependência-raiz:** toda passagem, encomenda, carga e veículo é vinculada a uma **viagem**. Sem embarcação cadastrada e viagem aberta, TMS e Vendas não operam. Ver §9 (consumo por TMS e Vendas).

---

## 0. Convenções deste documento

- **Persona padrão** do módulo: **Operação** (planejamento de frota/viagens) e **Diretoria** (leitura/BI). Ambiente: **Back-office (Console web)**, desktop. Não há app de campo nesta entrega.
- **Ícone da entidade viagem:** barco (⛴), conforme Fundação §2.4. **Carga:** caixa (📦). **Passagem:** ticket (🎫).
- **Trio de saúde** (Fundação §2.1): `success` = no prazo · `warning` = atenção · `atrasado` = `danger`. Renderizado sempre via **StatusChip**.
- 🔶 = informação ausente/pendente que **não** foi inventada aqui.
- Códigos de tela: `NAV-EMB-*` (embarcações), `NAV-VIA-*` (viagens), `NAV-STS-*` (status), `NAV-OPS-*` (painel operacional).

### Status × Situação (dois eixos que não se misturam)
A Fundação e o spec do módulo distinguem dois conceitos que a UI **nunca** colapsa num chip só:

| Eixo | Valores | Significado | Onde aparece |
|---|---|---|---|
| **Status da viagem** (ciclo de vida) | `planejada` · `em_curso` · `concluída` · `cancelada` 🔶 | Onde a viagem está no seu ciclo | Cronograma, lista, cabeçalho |
| **Situação** (saúde do cronograma) | `no_prazo` · `atenção` · `atrasado` | Cumprimento do previsto × real | Painel de status, só quando `em_curso` |

> Regra de UI: **situação só é exibida quando status = `em_curso`**. Viagem `planejada` não tem situação (não começou); viagem `concluída` mostra situação final congelada (ex.: "concluída — chegou atrasada").

---

## 1. Mapa do módulo e navegação interna

```
Sidebar ⛴ Navegação
   ├── Embarcações            → NAV-EMB-01 (lista)  → NAV-EMB-02 (cadastro/edição)
   ├── Cronograma de viagens  → NAV-VIA-01 (calendário) → NAV-VIA-02 (criar/editar viagem)
   ├── Status de viagem       → NAV-STS-01 (painel de situação)
   └── (de uma viagem)        → NAV-OPS-01 (painel operacional consolidado)
```

Fluxo macro de quem opera:
```
Cadastra embarcação ──▶ Abre viagem (cronograma) ──▶ Viagem fica disponível p/ Vendas e TMS
        NAV-EMB-02            NAV-VIA-02                    (seletor de viagem, §9)
                                   │
                                   ▼
                      Acompanha situação (NAV-STS-01)
                                   │
                                   ▼
                      Painel operacional da viagem (NAV-OPS-01)
```

---

## 2. NAV-EMB-01 — Lista de embarcações

- **Persona:** Operação (gestão de frota); leitura para Diretoria. **Dispositivo:** back-office web.
- **Objetivo:** dar à Operação uma visão única da frota e do estado de cada barco para decidir o que pode receber viagem.

### Wireframe
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC]  Belém ▾                                  🔔   ◑sync   Ana (Operação) ▾│
├──────────┬─────────────────────────────────────────────────────────────────┤
│ ◉ Início │ Navegação › Embarcações                                          │
│ ⛴ Naveg.▾│ ┌──────────────────────────────────────────────────────────────┐│
│  •Embarc.│ │ KPIStat   KPIStat        KPIStat          KPIStat            ││
│  •Cronog.│ │ ┌──────┐  ┌──────────┐   ┌────────────┐   ┌────────────────┐  ││
│  •Status │ │ │  3   │  │    1     │   │     2      │   │  ~150–400 pax  │  ││
│ 📦 TMS   │ │ │Ativas│  │Manutenção│   │  Alugadas  │   │ capac. total*  │  ││
│ 🎫 Vendas│ │ └──────┘  └──────────┘   └────────────┘   └────────────────┘  ││
│ 👥 CRM   │ ├──────────────────────────────────────────────────────────────┤│
│ ⚙ Cadast.│ │ FilterBar:  [Buscar nome/registro 🔎]  Status:▾  Tipo:▾  +Nova││
│          │ ├──────────────────────────────────────────────────────────────┤│
│          │ │ DataTable                                                     ││
│          │ │ Nome ▲     | Tipo          | Cap. pax | Cap. carga | Status   ││
│          │ │ ───────────┼───────────────┼──────────┼────────────┼──────────││
│          │ │ ⛴ Cidade   | Passeio+carga |   320    |  80 t      |🟢 Ativa  ││
│          │ │ ⛴ Anajás   | Passeio+carga |   280    |  60 t      |🟢 Ativa  ││
│          │ │ ⛴ Tajapuru | Passeio+carga |   200    |  40 t      |🟢 Ativa  ││
│          │ │ ⛴ Marajó   | Passeio+carga |   300    |  70 t      |🟠 Manut. ││
│          │ │ ⛴ Furo I   | Só carga      |    —     | 120 t      |🔵 Alugada││
│          │ │ ⛴ Furo II  | Só carga      |    —     | 110 t      |🔵 Alugada││
│          │ │ ──────────────────────────────────────────────  6 de 6 ◀ 1 ▶││
│          │ └──────────────────────────────────────────────────────────────┘│
└──────────┴─────────────────────────────────────────────────────────────────┘
* capac. total = soma das embarcações Ativas (manutenção/alugada não contam).
```

### Composição
- **KPIStat (×4):** `Ativas`, `Em manutenção`, `Alugadas`, `Capacidade total (pax)` somando apenas Ativas. Cada KPIStat é clicável e aplica o filtro de status correspondente na DataTable.
- **FilterBar:** busca por nome/registro; filtro `Status` (Ativa/Manutenção/Alugada); filtro `Tipo` (Passeio+carga/Só carga); botão primário **+ Nova embarcação**. Filtros persistentes por usuário (Fundação §3.2).
- **DataTable:** colunas `Nome` (com ícone ⛴, ordenável, default A→Z), `Tipo`, `Cap. pax` (soma das classes), `Cap. carga`, `Status` (**StatusChip**). Ações por linha (menu ⋯): **Editar**, **Ver viagens**, **Inativar/Ativar**, **Marcar em manutenção**. Densidade ajustável; exportar CSV/PDF.
- Clique na linha → abre **NAV-EMB-02** em modo edição.

### Fluxo de interação
1. Operação entra em Navegação › Embarcações. KPIs no topo, frota na tabela.
2. Filtra/busca conforme necessidade (ex.: clica no KPI "Ativas").
3. Clica **+ Nova embarcação** → NAV-EMB-02 (criação) **ou** clica numa linha → NAV-EMB-02 (edição).
4. Pelo menu ⋯ pode mudar status sem abrir a ficha (ação rápida com confirmação).

### Estados
- **Vazio (primeiro uso):** ilustração + "Nenhuma embarcação cadastrada. Cadastre as embarcações ativas para abrir viagens." + botão **Cadastrar embarcação**. (Esta tela é o passo 3 do wizard de setup — Fundação §5.4.)
- **Carregando:** skeleton de 4 KPIs + skeleton de tabela (não spinner).
- **Erro:** "Não consegui carregar a frota." + causa curta + **Tentar de novo**.
- **Filtro vazio:** "Nenhuma embarcação para estes filtros." + **Limpar filtros**.
- **Sucesso (pós-ação):** toast "Embarcação atualizada" / "Status alterado para Manutenção".

### Regras de negócio e validações
- Status possíveis: **Ativa · Manutenção · Alugada** (spec A.1).
- **Embarcação em Manutenção não pode receber novas viagens** (spec B.1). Na NAV-EMB-01 isso é só rótulo; o bloqueio é aplicado no seletor de embarcação da NAV-VIA-02.
- **Inativar/Manutenção com viagens futuras:** se houver viagens `planejada`/`em_curso` vinculadas, exibir confirmação destrutiva nomeando o objeto (Fundação §3.4): "A 'Marajó' tem 2 viagens planejadas. Alterar para Manutenção exige remanejá-las." → oferece atalho para o cronograma. Não exclui viagens automaticamente.
- Embarcação **Só carga** tem `Cap. pax = —` e não aparece como opção em telas de venda de passagem (Vendas filtra por tipo).

### Navegação
- **Vem de:** Sidebar › Navegação › Embarcações; ou wizard de setup (passo 3).
- **Vai para:** NAV-EMB-02 (criar/editar); "Ver viagens" → NAV-VIA-01 filtrado pela embarcação.

---

## 3. NAV-EMB-02 — Cadastro / edição de embarcação (capacidades por classe)

- **Persona:** Operação. **Dispositivo:** back-office web.
- **Objetivo:** registrar a embarcação e suas **capacidades por classe** (que alimentam a disponibilidade de passagem em Vendas) e a capacidade de carga.

### Wireframe (FormPanel)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC]  Belém ▾                                  🔔   ◑sync   Ana (Operação) ▾│
├──────────┬─────────────────────────────────────────────────────────────────┤
│ ⛴ Naveg.▾│ Navegação › Embarcações › Nova embarcação            [Cancelar]   │
│          │ ┌──────────────────────────────────────────────────────────────┐│
│          │ │ FormPanel                                                     ││
│          │ │ ── Identificação ──────────────────────────────────────────  ││
│          │ │  Nome*           [ Cidade de Breves            ]              ││
│          │ │  Registro/IMO 🔶 [ ____________ ]   Apelido [ Cidade     ]    ││
│          │ │  Tipo*           ( ) Passeio+carga   ( ) Só carga             ││
│          │ │  Status*         [ Ativa ▾ ]                                  ││
│          │ │                                                               ││
│          │ │ ── Capacidade de passageiros por classe ───────────────────  ││
│          │ │  (oculto se Tipo = Só carga)                                  ││
│          │ │  Classe         Lugares     Cor de pulseira (Vendas/Valid.)   ││
│          │ │  ┌────────────┬───────────┬──────────────────────────────┐   ││
│          │ │  │ Rede       │ [  180  ] │ [🟦 Azul   ▾]                │   ││
│          │ │  │ Rede VIP   │ [   80  ] │ [🟩 Verde  ▾]                │   ││
│          │ │  │ Camarote   │ [   40  ] │ [🟥 Vermelho▾]               │   ││
│          │ │  │ + Adicionar classe (ex.: Camarote Royal)             │   ││
│          │ │  └────────────┴───────────┴──────────────────────────────┘   ││
│          │ │  Total de lugares: 300  (calculado)                          ││
│          │ │                                                               ││
│          │ │ ── Capacidade de carga ────────────────────────────────────  ││
│          │ │  Peso máx.* [   70  ] t      Volume/posições 🔶 [        ]    ││
│          │ │                                                               ││
│          │ │ ── Observações ────────────────────────────────────────────  ││
│          │ │  [ ____________________________________________________ ]    ││
│          │ └──────────────────────────────────────────────────────────────┘│
│          │ ┌──────────────────────────────────────────────────────────────┐│
│          │ │  ⚠ Alterações não salvas        [ Cancelar ]  [ Salvar ⛴ ]   ││  ← rodapé fixo
│          │ └──────────────────────────────────────────────────────────────┘│
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Composição
- **FormPanel** (Fundação §3.2): validação inline, rodapé fixo com **Salvar/Cancelar**, aviso de alterações não salvas ao tentar sair.
- **Identificação:** `Nome*`, `Registro/IMO` (🔶 — campo opcional até confirmarmos qual identificador oficial a AJC usa), `Apelido`, `Tipo*` (radio Passeio+carga / Só carga), `Status*` (select Ativa/Manutenção/Alugada).
- **Capacidade por classe** (mini-tabela editável): linhas pré-populadas com **Rede, Rede VIP, Camarote** (classes do RF-1). Colunas: `Classe`, `Lugares` (inteiro), `Cor de pulseira`. Botão **+ Adicionar classe** permite variações (ex.: "Camarote Royal" — RF-1 cita "múltiplos tipos"). `Total de lugares` é somatório calculado, somente leitura.
  - *Decisão de UX:* a **cor de pulseira por classe** vive aqui porque é atributo estável da classe na embarcação e é consumida pelo App Validação (Fundação §3.3 ScanResultFullScreen). Mantê-la na embarcação evita reconfigurar a cada viagem.
- **Capacidade de carga:** `Peso máx.* (t)`; `Volume/posições` 🔶 (sem unidade confirmada no PRD — deixar opcional).
- Se `Tipo = Só carga`, a seção de classes some e o total de pax fica `—`.

### Fluxo de interação
1. Operação preenche Identificação. Ao escolher `Só carga`, a seção de pax é ocultada.
2. Ajusta lugares por classe; total recalcula ao vivo.
3. Define capacidade de carga.
4. **Salvar** → validação inline → sucesso (toast + volta para NAV-EMB-01 com a nova linha destacada). **Cancelar** com alterações → confirma descarte.

### Estados
- **Carregando (edição):** skeleton do formulário.
- **Erro de salvamento:** banner no topo do FormPanel "Não consegui salvar." + causa + mantém os dados digitados (nunca perde input).
- **Sucesso:** toast "Embarcação 'Cidade de Breves' cadastrada." → NAV-EMB-01.
- **Parcial/wizard:** quando aberta pelo wizard de setup, mostra "Salvar e cadastrar próxima" além de "Salvar".

### Regras de negócio e validações
- `Nome` único (case-insensitive) — erro inline "Já existe embarcação com este nome."
- `Lugares` por classe: inteiro ≥ 0; ao menos uma classe com lugares > 0 quando `Tipo = Passeio+carga` (senão não há o que vender).
- `Peso máx.` > 0.
- **Reduzir capacidade de uma classe** abaixo do já vendido numa viagem `planejada`/`em_curso`: alerta de impacto (a capacidade é por embarcação, mas a venda ocorre por viagem) — exibir aviso "Há viagens com X passagens vendidas em Camarote; reduzir abaixo de X pode gerar overbooking." Não bloqueia o cadastro, **bloqueia salvar** só se a redução for abaixo do vendido na viagem corrente. 🔶 (regra fina de overbooking a confirmar com a AJC.)
- Alterar `Tipo` de Passeio+carga → Só carga com classes preenchidas: confirmar descarte das classes.

### Navegação
- **Vem de:** NAV-EMB-01 (+Nova / clicar linha) ou wizard de setup.
- **Vai para:** NAV-EMB-01 (após salvar).

---

## 4. NAV-VIA-01 — Cronograma / calendário de viagens

- **Persona:** Operação (planejamento). **Dispositivo:** back-office web.
- **Objetivo:** ver e planejar as viagens da frota no tempo, detectando conflitos de agenda por embarcação.

### Wireframe (vista por embarcação × dias — timeline)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC]  Belém ▾                                  🔔   ◑sync   Ana (Operação) ▾│
├──────────┬─────────────────────────────────────────────────────────────────┤
│ ⛴ Naveg.▾│ Navegação › Cronograma                                           │
│          │ ┌──────────────────────────────────────────────────────────────┐│
│          │ │ FilterBar: [◀ Junho 2026 ▶]  Vista:[Semana▾][Embarcação▾]     ││
│          │ │            Embarcação:▾(todas)  Situação:▾   [+ Nova viagem]   ││
│          │ ├───────────┬──────────────────────────────────────────────────┤│
│          │ │           │ Seg 08 │ Ter 09 │ Qua 10 │ Qui 11 │ Sex 12 │ Sáb..││
│          │ │ Cidade    │■■■■━━━━━━━━━━━━▶│        │        │        │      ││
│          │ │ (Ativa)   │ →STM (ida)  retorno→    │        │        │      ││
│          │ │           │ 🟢 em curso · no prazo  │        │        │      ││
│          │ │ ──────────┼────────┼────────┼────────┼────────┼────────┼──────││
│          │ │ Anajás    │        │        │■■■■━━━━━━━━━━▶│       │       ││
│          │ │ (Ativa)   │        │        │ →BRV→GUR (planejada)   │       ││
│          │ │ ──────────┼────────┼────────┼────────┼────────┼────────┼──────││
│          │ │ Tajapuru  │   ░░░ disponível ░░░     │■■━━▶│           │       ││
│          │ │ (Ativa)   │                          │→PMZ (planej.)│       ││
│          │ │ ──────────┼────────┼────────┼────────┼────────┼────────┼──────││
│          │ │ Marajó    │░░░░░░ EM MANUTENÇÃO — indisponível ░░░░░░░░░░░░░░  ││
│          │ │ (Manut.)  │                                                  ││
│          │ └───────────┴──────────────────────────────────────────────────┘│
│          │ Legenda: ■ saída/escala  ━ em trânsito  ▶ retorno                 │
│          │          🟢 no prazo 🟠 atenção 🔴 atrasado  (só em curso)        │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Composição
- **FilterBar:** navegador de período (◀ ▶) com **Vista** (Semana/Mês); seletor de **Vista por** (Embarcação — default — ou Cidade); filtros `Embarcação` e `Situação`; botão primário **+ Nova viagem**.
- **Grade de timeline:** uma raia (lane) por embarcação (linhas); colunas = dias. Cada viagem é uma **barra** que cobre saída→retorno, com rótulo (rota resumida, ex.: "→STM") e **StatusChip** embutido (status do ciclo + situação se em curso).
- Embarcações em **Manutenção/Alugada** aparecem com a raia esmaecida e tarjada ("indisponível"), reforçando que não recebem viagem.
- **Hover/clique numa barra** → mini-popover com saída, escalas e retorno + botões **Abrir** (NAV-OPS-01) e **Editar** (NAV-VIA-02).
- *Decisão de UX:* timeline em vez de calendário mensal clássico, porque o eixo de decisão da Operação é **"qual barco está ocupado quando"** (conflito de agenda da embarcação — spec B.2), e a timeline torna conflito e ociosidade visíveis numa olhada.

### Fluxo de interação
1. Operação escolhe período e vista.
2. Identifica janelas livres (raia "disponível") e ocupação.
3. Clica **+ Nova viagem** (ou clica numa janela livre da raia, que pré-preenche embarcação + data) → NAV-VIA-02.
4. Clica numa barra existente → popover → Editar/Abrir.

### Estados
- **Vazio:** "Nenhuma viagem neste período. Crie a primeira viagem." + **+ Nova viagem**.
- **Carregando:** skeleton da grade (raias cinzas).
- **Erro:** "Não consegui carregar o cronograma." + Tentar de novo.
- **Conflito de agenda (destaque):** se duas viagens da **mesma embarcação** se sobrepõem, as barras ficam com borda `danger` e um aviso no topo: "⚠ Conflito: 'Cidade' tem 2 viagens sobrepostas em 10–11/jun." (spec B.2). O conflito é detectado aqui e **bloqueado** na NAV-VIA-02.
- **Filtro vazio:** "Nenhuma viagem para estes filtros." + Limpar filtros.

### Regras de negócio e validações
- Não renderiza barras de viagem em raia de embarcação **Manutenção** para datas dentro do período de manutenção.
- Situação (🟢🟠🔴) só pinta em viagens `em_curso`.
- Conflito de agenda = sobreposição temporal de duas viagens na mesma embarcação → sinalização visual + bloqueio na criação/edição.

### Navegação
- **Vem de:** Sidebar › Navegação › Cronograma; NAV-EMB-01 ("Ver viagens").
- **Vai para:** NAV-VIA-02 (criar/editar); NAV-OPS-01 (abrir viagem).

---

## 5. NAV-VIA-02 — Criar / editar viagem (escalas + retorno)

- **Persona:** Operação. **Dispositivo:** back-office web.
- **Objetivo:** montar a viagem completa — embarcação, origem, saída, escalas (cidade + dia/hora prevista) e retorno — que vira o contexto para Vendas e TMS.

### Wireframe (FormPanel + construtor de escalas)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC]  Belém ▾                                  🔔   ◑sync   Ana (Operação) ▾│
├──────────┬─────────────────────────────────────────────────────────────────┤
│ ⛴ Naveg.▾│ Navegação › Cronograma › Nova viagem                 [Cancelar]   │
│          │ ┌──────────────────────────────────────────────────────────────┐│
│          │ │ FormPanel                                                     ││
│          │ │ ── Dados da viagem ────────────────────────────────────────  ││
│          │ │  Embarcação*  [ Cidade (Ativa) ▾ ]   (só Ativas selecionáveis)││
│          │ │  Origem*      [ BEL · Belém ▾ ]                               ││
│          │ │  Saída*       [ 08/06/2026 ] [ 18:00 ]                        ││
│          │ │                                                               ││
│          │ │ ── Escalas (ida) ──────────────────────────────────────────  ││
│          │ │  Ordem  Cidade            Chegada prevista                     ││
│          │ │  ┌────┬──────────────┬────────────────────┬──────────────┐    ││
│          │ │  │ 1  │[BRV·Breves ▾]│[09/06] [06:00]    │ [↑][↓][🗑]   │    ││
│          │ │  │ 2  │[GUR·Gurupá ▾]│[09/06] [14:00]    │ [↑][↓][🗑]   │    ││
│          │ │  │ 3  │[STM·Santarém▾]│[10/06] [08:00]   │ [↑][↓][🗑]   │    ││
│          │ │  │ + Adicionar escala                                  │    ││
│          │ │  └────┴──────────────┴────────────────────┴──────────────┘    ││
│          │ │                                                               ││
│          │ │ ── Retorno ────────────────────────────────────────────────  ││
│          │ │  Destino retorno* [ BEL · Belém ▾ ]                           ││
│          │ │  Chegada prevista (retorno)* [ 12/06/2026 ] [ 20:00 ]         ││
│          │ │  ☑ Gerar escalas de retorno espelhando a ida (editável) 🔶    ││
│          │ │                                                               ││
│          │ │  ⓘ Resumo: Cidade · BEL→BRV→GUR→STM→BEL · 08–12/jun · 4 noites││
│          │ └──────────────────────────────────────────────────────────────┘│
│          │ ┌──────────────────────────────────────────────────────────────┐│
│          │ │  ⚠ Alterações não salvas     [Cancelar] [Salvar como rascunho]││
│          │ │                              [ Abrir viagem ⛴ ]               ││
│          │ └──────────────────────────────────────────────────────────────┘│
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Composição
- **Dados da viagem:** `Embarcação*` (select que lista **apenas embarcações Ativas**; manutenção/alugada aparecem desabilitadas com tooltip "Indisponível: em manutenção"). `Origem*` (cidade — lista das 8 siglas do glossário). `Saída*` (data + hora).
- **Construtor de escalas (ida):** mini-tabela ordenável com `Ordem` (auto), `Cidade` (select de siglas, sem repetir a origem), `Chegada prevista` (data+hora). Reordenar por ↑/↓ (recalcula `Ordem`); remover por 🗑; **+ Adicionar escala**. Mapeia para `ViagemEscala (cidade_sigla, data_hora_prevista, ordem)` do spec A.4.
- **Retorno:** `Destino retorno*` (normalmente a origem) + `Chegada prevista (retorno)*`. Checkbox **"Gerar escalas de retorno espelhando a ida"** 🔶 (conveniência; o spec só exige dia/hora de retorno, então espelhar escalas de volta é proposta a confirmar com a AJC).
- **Resumo (ⓘ):** linha viva com rota encadeada e duração, recalculada a cada mudança.
- **Rodapé:** **Salvar como rascunho** (status `planejada`, não publica p/ Vendas/TMS) e **Abrir viagem** (publica → vira contexto selecionável em Vendas/TMS, §9).
  - *Decisão de UX:* separar "rascunho" de "abrir viagem" evita que uma viagem meio-montada apareça no seletor de Vendas e gere venda em rota errada.

### Fluxo de interação
1. Operação escolhe embarcação Ativa e origem.
2. Define saída; adiciona escalas em ordem; cada uma com chegada prevista.
3. Define retorno (data/hora). Opcionalmente espelha escalas.
4. Revisa o Resumo. **Abrir viagem** → validações → sucesso → vai para NAV-OPS-01 da viagem recém-criada.
5. Edição posterior: campos que afetam capacidade/rota mostram aviso se já houver vendas/cargas vinculadas.

### Estados
- **Carregando (edição):** skeleton.
- **Validação inline (erro previne, não pune — Fundação §0.5):** datas fora de ordem destacam a célula e sugerem correção ("Chegada em GUR (09/06 06:00) é antes de BRV (09/06 06:00). Ajuste a hora.").
- **Conflito de agenda (bloqueante):** ao escolher embarcação+datas que se sobrepõem a outra viagem da mesma embarcação → banner `danger`: "A 'Cidade' já tem viagem de 10–12/jun. Ajuste as datas ou troque a embarcação." **Salvar/Abrir desabilitados** até resolver (spec B.2).
- **Sucesso:** "Viagem aberta: Cidade · BEL→STM · 08/jun." + ações "Ver no cronograma" / "Abrir painel operacional".
- **Erro de salvamento:** banner + preserva input.

### Regras de negócio e validações
- **Embarcação deve ser Ativa** (manutenção/alugada bloqueadas — spec A.1/B.1).
- `Saída` < primeira `chegada de escala` < ... < `chegada retorno` (sequência temporal estritamente crescente).
- Cidade de escala não pode ser igual à anterior consecutiva; origem não pode constar como escala de ida (a não ser como retorno).
- Ao menos **1 escala** ou retorno definido (não existe viagem sem destino).
- **Sem conflito de agenda** na mesma embarcação (sobreposição saída↔retorno).
- Editar viagem `em_curso`: escalas já cumpridas (com `data_hora_real`) ficam **read-only**; só escalas futuras são editáveis. Editar viagem `concluída`: bloqueado (somente leitura) 🔶 (política de reabertura a definir).
- Cancelar viagem com vendas/cargas vinculadas → confirmação destrutiva nomeando a viagem + aviso de impacto em Vendas/TMS. 🔶 (fluxo de estorno é do escopo de Vendas/Financeiro.)

### Navegação
- **Vem de:** NAV-VIA-01 (+Nova / janela livre / Editar).
- **Vai para:** NAV-OPS-01 (após abrir) ou NAV-VIA-01 (rascunho/cancelar).

---

## 6. NAV-STS-01 — Painel de status de viagem (no prazo / atenção / atrasado)

- **Persona:** Operação e Diretoria (acompanhamento). **Dispositivo:** back-office web.
- **Objetivo:** mostrar de relance a saúde de todas as viagens em curso e onde está o atraso (previsto × real por escala).

### Wireframe (lista de saúde + detalhe previsto×real)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC]  Belém ▾                                  🔔   ◑sync   Ana (Operação) ▾│
├──────────┬─────────────────────────────────────────────────────────────────┤
│ ⛴ Naveg.▾│ Navegação › Status de viagem                                     │
│          │ ┌──────────────────────────────────────────────────────────────┐│
│          │ │ KPIStat 🟢 No prazo: 2   🟠 Atenção: 1   🔴 Atrasado: 1       ││
│          │ ├──────────────────────────────────────────────────────────────┤│
│          │ │ FilterBar: Situação:▾  Embarcação:▾  [Buscar viagem 🔎]       ││
│          │ ├───────────────────────────────┬──────────────────────────────┤│
│          │ │ DataTable (viagens em curso)  │ DetailDrawer — previsto×real ││
│          │ │ Viagem      Próx.escala  Sit. │ ⛴ Anajás · BEL→BRV→GUR       ││
│          │ │ ────────────┼──────────┼──────│ 🔴 Atrasado (+3h20 em GUR)   ││
│          │ │ Cidade→STM  | STM 08:00 |🟢   │ ──────────────────────────── ││
│          │ │ Anajás→GUR  | GUR 14:00 |🔴 ◀ │ Escala   Previsto   Real     ││
│          │ │ Tajapuru→PMZ| PMZ 16:00 |🟠   │ BEL saída 08/18:00  18:10 🟢 ││
│          │ │ Furo I→STM  | STM 22:00 |🟢   │ BRV       09/06:00  07:50 🟠 ││
│          │ │             │          │      │ GUR       09/14:00  —  (+3h20)││
│          │ │             │          │      │ STM       10/08:00  —    🔴  ││
│          │ │             │          │      │ ──────────────────────────── ││
│          │ │             │          │      │ [Apontar chegada/saída]      ││
│          │ │             │          │      │ [Abrir painel operacional →] ││
│          │ └───────────────────────────────┴──────────────────────────────┘│
└──────────┴──────────────────────────────────────────────────────────────────┘
```

### Composição
- **KPIStat (×3):** contadores grandes por situação (Fundação §0.4 — "o número que importa fica gigante"). Clicáveis → filtram a lista.
- **FilterBar:** `Situação`, `Embarcação`, busca.
- **DataTable (esquerda):** viagens **em curso**, colunas `Viagem`, `Próxima escala` (cidade + hora prevista), `Situação` (**StatusChip**). Linha selecionada abre o drawer.
- **DetailDrawer (direita):** cabeçalho com embarcação, rota e situação atual + desvio em destaque ("+3h20 em GUR"). Tabela **previsto × real** por escala (spec B.4): colunas `Escala`, `Previsto`, `Real`, mini-chip de situação por escala. Inclui **AuditTrail** implícito (quem apontou cada chegada/saída e quando).
- **Ação [Apontar chegada/saída]:** nesta entrega, a situação é alimentada por **apontamento manual** (a Operação registra a chegada/saída real numa escala). *Decisão de UX:* sem GPS/AIS no MVP (fast-follow), o painel ainda funciona com dado manual — preservando o conceito e a UI para quando o tempo real chegar.
- **[Abrir painel operacional →]** → NAV-OPS-01.

### Fluxo de interação
1. Operação abre o painel; KPIs mostram a saúde da frota.
2. Clica numa viagem (ou no KPI 🔴) → drawer com previsto×real.
3. Quando um barco chega/sai, clica **Apontar chegada/saída** → informa hora real → situação recalcula e o chip muda na hora.
4. Atalho para o painel operacional da viagem.

### Estados
- **Vazio:** "Nenhuma viagem em curso agora." + atalho ao cronograma.
- **Carregando:** skeleton de KPIs + tabela + drawer.
- **Erro:** "Não consegui calcular a situação das viagens." + Tentar de novo.
- **Parcial (sem real apontado):** escalas futuras mostram `Real = —`; a situação usa o previsto da próxima escala vs. relógio. Banner informativo (azul, não alarmante): "Situação baseada em apontamento manual. Rastreamento em tempo real chega numa próxima fase." (fast-follow).
- **Sucesso (apontamento):** toast "Chegada em GUR registrada às 17:20. Situação: Atrasado."

### Regras de negócio e validações
- **Situação só existe para `em_curso`.** Planejadas não aparecem; concluídas mostram situação final congelada (filtro opcional "incluir concluídas").
- **Cálculo de situação** (previsto × real/relógio):
  - 🔶 **Tolerâncias a definir com a AJC** (spec "Pendências"). Proposta de UX a confirmar: `no_prazo` = desvio ≤ 30 min; `atenção` = 30 min a 2 h; `atrasado` = > 2 h. Os limiares devem ser **configuráveis** (Cadastros), não hard-coded.
  - Desvio medido na escala corrente (real apontado) ou, se ainda não chegou, comparando o relógio com a chegada prevista da próxima escala.
- Hora real não pode ser anterior à saída da escala anterior (validação inline no apontamento).

### Navegação
- **Vem de:** Sidebar › Navegação › Status; NAV-OPS-01.
- **Vai para:** NAV-OPS-01.

---

## 7. NAV-OPS-01 — Painel operacional consolidado da viagem

- **Persona:** Operação, Gerente da embarcação, Diretoria. **Dispositivo:** back-office web.
- **Objetivo:** ser o **hub da viagem** — resumo de passageiros/carga/encomendas/veículos e situação, com atalhos para os módulos que dependem da viagem.

### Wireframe
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [AJC]  Belém ▾                                  🔔   ◑sync   Ana (Operação) ▾│
├──────────┬─────────────────────────────────────────────────────────────────┤
│ ⛴ Naveg.▾│ Navegação › Viagens › ⛴ Anajás · BEL→BRV→GUR · 08–12/jun         │
│          │ ┌──────────────────────────────────────────────────────────────┐│
│          │ │ Cabeçalho: ⛴ Anajás   Status:[🟦 Em curso]  Situação:[🔴 Atras]││
│          │ │ Rota: BEL→BRV→GUR→STM→BEL   Próx.: STM 10/08:00               ││
│          │ │ Ações: [Editar viagem] [Status detalhado] [Relat. passageiros]││
│          │ ├──────────────────────────────────────────────────────────────┤│
│          │ │ KPIStat (consolidado da viagem)                               ││
│          │ │ ┌─────────────┬─────────────┬─────────────┬─────────────────┐ ││
│          │ │ │ 🎫 Passag.  │ 📦 Encomend.│ 📦 Carga    │ 🚚 Veículos     │ ││
│          │ │ │  212 / 300  │     38      │  54 t /70 t │      6          │ ││
│          │ │ │ 71% ocupação│ R$ decl.18k │  77% peso   │                 │ ││
│          │ │ └─────────────┴─────────────┴─────────────┴─────────────────┘ ││
│          │ ├──────────────────────────────────────────────────────────────┤│
│          │ │ Passageiros por classe          │ Atalhos operacionais        ││
│          │ │ Rede     128 / 180  ▓▓▓▓▓▓░░     │ → 🎫 Relatório passageiros  ││
│          │ │ Rede VIP  56 / 80   ▓▓▓▓▓▓▓░     │ → 📦 Controle de encomendas ││
│          │ │ Camarote  28 / 40   ▓▓▓▓▓▓░░     │ → 📦 Carga/conferência (TMS)││
│          │ │ Gratuid.   8  · Cortesia 4       │ → 🚚 Veículos embarcados    ││
│          │ │ Contrato   6  (fatura fim do mês)│ → 🧾 Prestação de contas    ││
│          │ ├──────────────────────────────────────────────────────────────┤│
│          │ │ AuditTrail (linha do tempo da viagem)                         ││
│          │ │ • 08/18:10 Saída BEL apontada (Ana)                           ││
│          │ │ • 09/07:50 Chegada BRV apontada (Ana)                         ││
│          │ │ • 09/—     Chegada GUR pendente (atraso +3h20)                ││
│          │ └──────────────────────────────────────────────────────────────┘│
└──────────┴──────────────────────────────────────────────────────────────────┘
```

### Composição
- **Cabeçalho da viagem:** embarcação, **StatusChip** de status (ciclo) + **StatusChip** de situação (se em curso), rota, próxima escala. Ações: **Editar viagem** (NAV-VIA-02), **Status detalhado** (NAV-STS-01), **Relatório de passageiros** (Vendas).
- **KPIStat (×4):** `Passageiros` (vendidos/capacidade + % ocupação), `Encomendas` (qtd + valor declarado), `Carga` (peso/capacidade + %), `Veículos` (qtd). Números grandes (Fundação §0.4). *Esses KPIs leem dados de Vendas/TMS filtrados pela viagem — esta tela não os edita.*
- **Passageiros por classe:** barras de ocupação por classe + linhas de Gratuidade/Cortesia/Contrato (conformidade regulatória — RF-1). Gratuidade com atalho ao relatório regulatório.
- **Atalhos operacionais:** lista de links para os módulos consumidores, sempre **pré-filtrados por esta viagem** (Relatório de passageiros, Controle de encomendas, Carga/conferência TMS, Veículos, Prestação de contas).
- **AuditTrail:** linha do tempo de eventos da viagem (apontamentos de chegada/saída, quem fez) — Fundação §3.2/§0.3.

### Fluxo de interação
1. Operação/Gerente abre a viagem (do cronograma ou status).
2. Lê os KPIs consolidados de relance.
3. Navega via atalhos para a tarefa específica (ex.: "Controle de encomendas" → módulo Encomendas filtrado nesta viagem).
4. Acompanha o histórico no AuditTrail.

### Estados
- **Vazio (viagem recém-aberta):** KPIs zerados com microcopy "Ainda sem vendas/cargas nesta viagem." + atalhos ativos.
- **Carregando:** skeleton de cabeçalho + KPIs.
- **Erro parcial:** se um módulo-fonte (ex.: TMS) não responde, o KPI correspondente mostra estado de erro isolado ("Carga indisponível — tentar de novo") sem derrubar o resto do painel. *Decisão de UX:* degradação graciosa por card, porque o painel agrega várias fontes.
- **Sucesso:** N/A (tela de leitura/hub).

### Regras de negócio e validações
- Painel é **somente leitura** sobre dados de outros módulos; edição acontece nos módulos de origem.
- Visível para perfis com permissão de Operação/Gerente/Diretoria (RBAC — Fundação §5.5). Gerente da embarcação vê principalmente sua(s) embarcação(ões).
- Contadores respeitam o vínculo `viagem_id` (spec A.5): tudo que TMS/Vendas gravam com esta viagem soma aqui.

### Navegação
- **Vem de:** NAV-VIA-01 (abrir), NAV-STS-01 (atalho), busca global (Cmd/Ctrl+K por viagem).
- **Vai para:** módulos consumidores filtrados pela viagem; NAV-VIA-02; NAV-STS-01.

---

## 8. Apontamento de situação no MVP (sem tempo real)

Como rastreamento em tempo real é **fast-follow**, a situação (no prazo/atenção/atrasado) é alimentada por **apontamento manual** em NAV-STS-01 / NAV-OPS-01:
- A Operação registra `chegada real` e `saída real` por escala (mapeia `ViagemEscala.data_hora_real`).
- A situação recalcula com base no desvio previsto × real (e relógio para escalas futuras), usando tolerâncias **configuráveis** 🔶.
- A UI já foi desenhada para receber o tempo real depois: quando GPS/AIS entrar (fast-follow), o `data_hora_real` passa a vir do rastreamento e o botão "Apontar" vira fallback. Nenhuma tela muda de layout — só a fonte do dado.

> Fast-follow declarado: painel de mapa (spec B.3), ETA automática, escala de colaboradores com WhatsApp (spec B.5). Não fazem parte desta entrega.

---

## 9. Como este módulo é consumido por TMS e Vendas (o seletor de viagem)

Navegação-Core é a **dependência-raiz**: TMS e Vendas só operam dentro de uma viagem. O ponto de integração é o **seletor de viagem** (componente compartilhado, padrão `BigSelectList` no campo e dropdown de contexto no back-office — Fundação §3.3/§4.1).

### 9.1 Contrato do seletor de viagem
- **Origem dos dados:** só viagens com status `planejada` (publicada via "Abrir viagem") ou `em_curso`. Rascunhos **não** aparecem. Concluídas/canceladas só com filtro explícito (ex.: relatórios).
- **Item do seletor mostra:** ⛴ embarcação · rota resumida (BEL→STM) · saída · **StatusChip** (status + situação). Ex.: `⛴ Anajás · BEL→BRV→GUR · 08/jun 18:00 · 🟦 Em curso`.
- **Capacidade por classe** da embarcação da viagem é o que Vendas usa para calcular **disponibilidade de passagem** (spec A.5). Camarote esgotado → Vendas bloqueia a classe.
- **Tipo da embarcação** filtra: viagem de barco "Só carga" não aparece no seletor de venda de passagem; aparece em TMS/Carga.

### 9.2 Quem seleciona o quê
```
                ┌──────────────── Navegação-Core ────────────────┐
                │  Embarcação (capacidades) ──▶ Viagem (rota)     │
                └───────────────┬─────────────────────────────────┘
                                │ seletor de viagem (contexto)
        ┌───────────────────────┼───────────────────────────────┐
        ▼                       ▼                                 ▼
   🎫 Vendas/PDV           📦 TMS/Carga                   📦 Encomendas / 🚚 Veículos
   - vende passagem         - registra entrada veículo     - despacha na viagem
     na viagem (classe       - confere/etiqueta carga       - controle por viagem
     + capacidade)           - 2º bipe, entrega             (qtd/valor decl./cobrado)
   - relatório de pax        - prestação de contas          
     por viagem              por viagem
```

### 9.3 Regras que o seletor herda de Navegação-Core
- Embarcação **Manutenção/Alugada** não gera viagem → não há contexto → Vendas/TMS não conseguem operar nela (bloqueio na origem, NAV-VIA-02).
- Viagem **cancelada** remove o contexto; vendas/cargas já vinculadas seguem o fluxo de estorno do módulo de origem (fora do escopo de Navegação) 🔶.
- Tudo que TMS/Vendas gravam carrega `viagem_id`; é isso que alimenta os KPIs de NAV-OPS-01 e o BI de rentabilidade por viagem/embarcação/cidade (Fase 2).

### 9.4 Dependência de inicialização (ordem obrigatória)
```
Setup (Fundação §5.4 passo 3): cadastrar embarcações
        └▶ passo 6: abrir 1ª viagem
                └▶ só então Vendas pode vender e TMS pode receber carga
```
Mensagem de bloqueio padronizada quando Vendas/TMS são abertos sem viagem disponível: **"Nenhuma viagem aberta. Peça à Operação para abrir uma viagem em Navegação › Cronograma."** + link (respeitando RBAC).

---

## 10. Pendências (🔶) consolidadas deste módulo

| # | Pendência | Origem | Impacto na UI |
|---|---|---|---|
| 1 | Tolerâncias de `atenção` vs. `atrasado` (min/horas) | spec Pendências | Cálculo de situação; deve ser configurável em Cadastros |
| 2 | Identificador oficial da embarcação (Registro/IMO?) | não consta no PRD | Campo opcional em NAV-EMB-02 |
| 3 | Unidade de capacidade de carga além de peso (volume/posições) | não consta | Campo opcional em NAV-EMB-02 |
| 4 | Regra fina de overbooking ao reduzir capacidade com vendas ativas | inferência | Bloqueio de salvar em NAV-EMB-02 |
| 5 | Espelhar escalas no retorno | proposta de UX | Checkbox em NAV-VIA-02 |
| 6 | Política de reabertura/edição de viagem concluída | não consta | Read-only por ora |
| 7 | Fluxo de estorno ao cancelar viagem com vendas/cargas | escopo Vendas/Financeiro | Confirmação destrutiva + handoff |
| 8 | Status `cancelada` na máquina de estados | inferência | Incluído como provável; confirmar |

> **Fast-follow (fora desta entrega):** mapa de rastreamento em tempo real (GPS/AIS + provedor de mapa), ETA automática, escala de colaboradores com notificação WhatsApp (provedor 🔶).
