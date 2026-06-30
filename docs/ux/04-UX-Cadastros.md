# UX 04 — Cadastros (dados-mestre, RBAC e motor de preços)

> Herda integralmente `00-Fundacao-DesignSystem-Navegacao-Acesso.md` (tokens, shell de back-office, componentes nomeados, estados, RBAC, fluxo de acesso/onboarding). Onde uma tela não especifica um comportamento, vale a fundação. O fluxo de **acesso e setup inicial** está na fundação (§5) — aqui **não se repete**, apenas se referencia.
>
> Ambiente: **back-office (Console web)**. Densidade densa: DataTable + FilterBar + FormPanel.

## Índice de telas
| Código | Tela | Persona |
|---|---|---|
| CAD-01 | Cadastro de usuários | Administrador |
| CAD-02 | Perfis e permissões (matriz) | Administrador |
| CAD-03 | Fornecedores | Financeiro |
| CAD-04 | Clientes (compartilhada com CRM) | Comercial |
| CAD-05 | Agentes comerciais | Comercial/Admin |
| CAD-06 | Preços de passagem (+ reajuste em massa) | Price |
| CAD-07 | Preços de carga (tier = %) | Price |
| CAD-08 | Preços de encomenda 🔶 | Price |
| CAD-09 | Colaboradores | RH/Admin |
| CAD-10 | Escalas (compartilhada com Navegação) | Operação |

---

## CAD-01 — Cadastro de usuários
**Persona:** Administrador · **Dispositivo:** web.
**Objetivo:** criar e gerir as contas que acessam o sistema, atribuindo perfil e status.

```
┌ AJC ───────────────────────────────── 🔔 ◑sync  Admin ▾ ┐
│ Cadastros › Usuários                                     │
│ ┌─FilterBar──────────────────────────────────────────┐  │
│ │ Buscar…   Perfil ▾   Status ▾        [+ Novo usuário]│  │
│ └────────────────────────────────────────────────────┘  │
│ ┌─DataTable──────────────────────────────────────────┐  │
│ │ Nome        Login/e-mail     Perfil     Status  ⋮  │  │
│ │ João Souza  joao@ajc.com     Conferente ●Ativo  ⋮  │  │
│ │ Ana Lima    ana@ajc.com      Financeiro ●Ativo  ⋮  │  │
│ │ Caixa 02    caixa02          PDV        ○Inativo ⋮  │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```
**Composição:** `FilterBar` (busca, filtro por perfil e status) + `DataTable` (Nome, Login/e-mail, Perfil, Status com `StatusChip`, menu ⋮ = editar/desativar/reset de senha). Botão primário **+ Novo usuário** abre `FormPanel` lateral.

**FormPanel (novo/editar):** nome, login/e-mail, **perfil** (select alimentado por CAD-02), contato, vínculo opcional a embarcação/cidade (contexto), ativar/desativar, **enviar convite / reset de senha**.

**Fluxo:** lista → +Novo → preenche → salvar → toast "Usuário criado, convite enviado".
**Estados:** *Vazio* "Nenhum usuário além do admin. Convide a equipe." · *Erro* login/e-mail duplicado (inline) · *Sucesso* convite enviado · usuário inativo aparece esmaecido.
**Regras:** e-mail/login único; não é possível excluir, apenas **desativar** (preserva auditoria); reset de senha gera link/código (ver fundação §5.2).
**Navegação:** Cadastros › Usuários. Perfil → CAD-02.

---

## CAD-02 — Perfis e permissões (matriz)
**Persona:** Administrador · **Dispositivo:** web.
**Objetivo:** definir o que cada perfil pode ver e fazer, por módulo e ação.

```
┌ Cadastros › Perfis e permissões ────────────────────────┐
│ Perfis: [Admin][Financeiro][Comercial][Price][Conferente]│
│         [Bilheteiro][Porteiro][Agente][Gerente] [+ Perfil]│
│ ┌─ Matriz: Comercial ──────────────────────────────────┐ │
│ │ Módulo        Ver  Criar Editar Excluir Aprovar      │ │
│ │ Navegação      ☑    ☐     ☐      ☐       —           │ │
│ │ TMS/Carga      ☑    ☐     ☐      ☐       ☐           │ │
│ │ Vendas         ☑    ☑     ☑      ☐       —           │ │
│ │ CRM            ☑    ☑     ☑      ☐       —           │ │
│ │ Cadastros      ☑*   ☑*    ☑*     ☐       —  *clientes│ │
│ │ Financeiro     ☐    ☐     ☐      ☐       ☐           │ │
│ └──────────────────────────────────────────────────────┘ │
│                                  [Cancelar] [Salvar perfil]│
└──────────────────────────────────────────────────────────┘
```
**Composição:** seletor de perfil (chips) + **matriz perfil × módulo × ação** (Ver / Criar / Editar / Excluir / Aprovar) com checkboxes. Asterisco indica permissão granular (ex.: Comercial só mexe em clientes/agentes dentro de Cadastros). **Presets por função** já vêm marcados ao criar perfil a partir de um modelo.

**Fluxo:** seleciona/cria perfil → ajusta checkboxes → salvar. Pré-visualiza "este perfil verá no menu: …".
**Estados:** *Sucesso* "Perfil atualizado — N usuários afetados" · aviso ao remover permissão de um perfil com usuários ativos.
**Regras:** perfil **Admin** é protegido (não pode perder o acesso a Cadastros/Usuários — evita lockout); ações sem permissão ficam **ocultas** no sistema (fundação §5.5); toda alteração de perfil é auditada.
**Navegação:** Cadastros › Perfis. Consumido por CAD-01 (select de perfil) e por todo o shell (RBAC).

---

## CAD-03 — Cadastro de fornecedores
**Persona:** Financeiro · **Dispositivo:** web.
**Objetivo:** manter os fornecedores usados em compras e contas a pagar.

```
┌ Cadastros › Fornecedores ───────────────────────────────┐
│ Buscar…  Categoria ▾                  [+ Novo fornecedor] │
│ Nome           CNPJ            Categoria      Status   ⋮  │
│ Posto Náutico  00.000.000/..   Combustível    ●Ativo   ⋮  │
│ Gelo Pará LTDA 11.111.111/..   Insumos        ●Ativo   ⋮  │
└──────────────────────────────────────────────────────────┘
```
**Composição:** `DataTable` (Nome, CNPJ, Categoria, Status) + `FormPanel` (razão social, CNPJ, contatos, categoria, dados bancários, observação).
**Estados:** vazio · CNPJ inválido/duplicado (inline) · sucesso.
**Regras:** CNPJ validado; vínculo futuro com Compras/Contas a Pagar (Financeiro — Fase 2).
**Navegação:** Cadastros › Fornecedores.

---

## CAD-04 — Cadastro de clientes (compartilhada)
**Persona:** Comercial · **Dispositivo:** web.
**Objetivo:** manter a base de clientes (PF/PJ).
> **Esta tela é a mesma de CRM-01/CRM-02** (`03-UX-CRM.md`). Aqui ela aparece no menu de Cadastros por permissão do perfil Comercial; o componente de formulário é **o mesmo** (`FormPanel` único e reutilizado), para não divergir entre módulos. Detalhamento completo no doc de CRM. Autocadastro do cliente final está em Vendas.
**Regra-chave:** ao criar cliente, alocação a um **agente** (CAD-05) conforme a cidade.

---

## CAD-05 — Cadastro de agentes comerciais
**Persona:** Comercial/Admin · **Dispositivo:** web.
**Objetivo:** manter os agentes (1 por cidade) e seu percentual de comissão.

```
┌ Cadastros › Agentes comerciais ─────────────────────────┐
│ Buscar…  Cidade ▾                       [+ Novo agente]   │
│ Nome          Cidade        % Comissão  Clientes  Status  │
│ Carlos M.     STM Santarém  8%          142       ●Ativo  │
│ Marta R.      BRV Breves    8%          77        ●Ativo  │
│ — (vago)      GUR Gurupá    —           —         ⚠ vago  │
└──────────────────────────────────────────────────────────┘
```
**Composição:** `DataTable` (Nome, Cidade, % Comissão, nº de clientes alocados, Status). `StatusChip` "vago" (âmbar) para cidade sem agente. `FormPanel`: nome, **cidade** (uma das 8 siglas), **% de comissão**, contato (WhatsApp), status.
**Estados:** *Atenção:* cidade atendida sem agente → chip vago + alerta no topo · sucesso.
**Regras:** **1 agente ativo por cidade** (criar um segundo pede inativar/realocar o anterior); % comissão alimenta o relatório de comissão (Financeiro — Fase 2, 🔶 regras da diretoria).
**Navegação:** Cadastros › Agentes. Consumido por CRM (alocação de clientes, painel do agente) e pela entrega TMS (recebedor = agente da cidade).

---

## CAD-06 — Preços de passagem (com reajuste em massa)
**Persona:** Price · **Dispositivo:** web.
**Objetivo:** definir preços por classe/subtipo e trecho, com reajuste em massa seguro.
> **Fonte inicial recebida:** FAQ 2026 (`docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`) traz preços de passagem por destino/classe para popular o mock e orientar a carga inicial versionada. Não hard-code no backend.

```
┌ Cadastros › Preços › Passagem ──────────── v.3 vigente ──┐
│ [Tabela vigente ▾]  Trecho: BEL→STM ▾   [⟳ Reajustar ±%] │
│ Classe        Subtipo     Preço (R$)   Última alteração  │
│ Rede          —           120,00       12/06 (v3)        │
│ Rede VIP      —           180,00       12/06 (v3)        │
│ Camarote      Standard    350,00       12/06 (v3)        │
│ Camarote      Royal       890,00       12/06 (v3)        │
│ ─ Histórico de versões: v3 (atual) · v2 · v1 ──────────  │
└──────────────────────────────────────────────────────────┘
```
**Composição:** seletor de trecho (`FilterBar`), `DataTable` editável (Classe, Subtipo, Preço, Última alteração), botão **⟳ Reajustar ±%** abre `BulkAdjustDialog`, e faixa de **Histórico de versões** com rollback.

**BulkAdjustDialog (reajuste em massa) — tela mais crítica deste módulo:**
```
┌ Reajustar preços ───────────────────────────────┐
│ Aplicar a: (•) Todas as classes ( ) Seleção      │
│ Trechos:   (•) Todos ( ) Trecho atual            │
│ Operação:  ( ) Subir  ( ) Descer   Valor: [10] % │
│ ┌ Pré-visualização do impacto ─────────────────┐ │
│ │ Classe      Atual     Novo      Δ            │ │
│ │ Rede        120,00 →  132,00   +12,00        │ │
│ │ Rede VIP    180,00 →  198,00   +18,00        │ │
│ │ Camarote S  350,00 →  385,00   +35,00        │ │
│ │ Royal       890,00 →  979,00   +89,00        │ │
│ │ Itens afetados: 4 · Ticket médio: +9,2%      │ │
│ └──────────────────────────────────────────────┘ │
│              [Cancelar]  [Aplicar como v4]         │
└───────────────────────────────────────────────────┘
```
**Fluxo do reajuste:** escolhe escopo (todas/seleção, todos os trechos/atual) → operação (subir/descer) e % → **preview obrigatório** com valor atual → novo → Δ e resumo de impacto → "Aplicar como nova versão". Gera **v+1** com autor/data; versão anterior fica no histórico para **rollback**.
**Estados:** *preview vazio* (nenhum item no escopo) · *confirmação* nomeando a versão · *sucesso* "Tabela v4 vigente — 4 itens reajustados" · rollback com confirmação.
**Regras:** edição manual também versiona; nunca sobrescreve sem registrar versão (auditoria de reajuste); o preço vigente é o usado por Vendas/PDV/totem.
**Navegação:** Cadastros › Preços › Passagem. Consumido por Vendas.

---

## CAD-07 — Preços de carga (tier = %)
**Persona:** Price · **Dispositivo:** web.
**Objetivo:** definir os tiers de carga (preço como % / faixa) por trecho.

```
┌ Cadastros › Preços › Carga ─────────────── v.2 vigente ──┐
│ Trecho: BEL→STM ▾                       [⟳ Reajustar ±%]  │
│ Tier        Critério            % / Valor   Alteração     │
│ Tier 1      até X kg/m³          R$ ..       10/06        │
│ Tier 2      faixa intermediária  % ..        10/06        │
│ Tier 3      acima de …           % ..        10/06        │
└──────────────────────────────────────────────────────────┘
```
**Composição:** igual a CAD-06 (DataTable por trecho + `BulkAdjustDialog` + histórico). Diferença: a coluna de preço é **tier = %** conforme o modelo de carga (tabela já pronta no negócio).
**Regras:** mesmas de versionamento e reajuste em massa; tier vigente alimenta cotação/CRM e o controle de carga.
**Navegação:** Cadastros › Preços › Carga.

---

## CAD-08 — Preços de encomenda 🔶
**Persona:** Price · **Dispositivo:** web.
**Objetivo:** definir o preço fixo por tamanho (P/M/G até R$1.000) e o percentual acima de R$1.000, por trecho.
> 🔶 **Valores pendentes (Lucas).** A tela é desenhada e o motor de preço fica pronto; entram só os números quando chegarem. Por isso o despacho de encomenda no PDV do MVP ainda usa preço manual/cotação.

```
┌ Cadastros › Preços › Encomenda ──────── 🔶 a preencher ──┐
│ Trecho: BEL→STM ▾                       [⟳ Reajustar ±%]  │
│ ── Até R$ 1.000 (preço fixo por tamanho) ──────────────  │
│ Tamanho   Peso máx   Preço (R$)                           │
│ P         10 kg      🔶                                   │
│ M         20 kg      🔶                                   │
│ G         30 kg      🔶                                   │
│ ── Acima de R$ 1.000 ──────────────────────────────────  │
│ Percentual sobre valor declarado/nota:  🔶 %             │
└──────────────────────────────────────────────────────────┘
```
**Composição:** duas seções (fixo por tamanho / percentual), por trecho, com `BulkAdjustDialog` e histórico. Banner 🔶 "Tabela aguardando valores — preço automático desativado".
**Regras:** mesma mecânica de versionamento; ao preencher, ativa a precificação automática no despacho (Encomendas — Fase 2).
**Navegação:** Cadastros › Preços › Encomenda. Consumido por Encomendas/PDV/CRM.

---

## CAD-09 — Cadastro de colaboradores
**Persona:** RH/Admin · **Dispositivo:** web.
**Objetivo:** manter o quadro de colaboradores que serão escalados nas viagens.

```
┌ Cadastros › Colaboradores ──────────────────────────────┐
│ Buscar…  Função ▾  Cidade ▾            [+ Novo colab.]    │
│ Nome          Função        Cidade   WhatsApp     Status  │
│ Pedro A.      Comandante    BEL      (91)…        ●Ativo  │
│ Rita F.       Conferente    STM      (93)…        ●Ativo  │
└──────────────────────────────────────────────────────────┘
```
**Composição:** `DataTable` (Nome, Função, Cidade, WhatsApp, Status) + `FormPanel` (nome, função, cidade, contato WhatsApp p/ notificação de escala, status).
**Regras:** WhatsApp é o canal de notificação de escala (a notificação automática é Fase 3, 🔶 provedor).
**Navegação:** Cadastros › Colaboradores. Consumido por CAD-10 e Navegação.

---

## CAD-10 — Cadastro de escalas (compartilhada)
**Persona:** Operação · **Dispositivo:** web.
**Objetivo:** alocar colaboradores a viagens/períodos por função.
> **Compartilhada com Navegação** (`05-UX-Navegacao-Core.md`). A escala é definida no contexto da viagem; aqui em Cadastros expõe-se a visão por colaborador/período. Mesmo componente, dois pontos de entrada.

```
┌ Cadastros › Escalas ────────────────────────────────────┐
│ Período: Semana ▾   Embarcação ▾   Função ▾   [+ Escalar]│
│ Colaborador   Viagem            Função      Notificado   │
│ Pedro A.      Balsa1 · 20/06    Comandante  ✓ (Fase 3)   │
│ Rita F.       Balsa1 · 20/06    Conferente  ✓            │
│ ⚠ Conflito: Rita F. também em Balsa2 · 20/06             │
└──────────────────────────────────────────────────────────┘
```
**Composição:** `FilterBar` (período, embarcação, função) + `DataTable` (Colaborador, Viagem, Função, status de notificação) + alerta de **conflito de escala** (mesmo colaborador em duas viagens no mesmo período).
**Estados:** *conflito* destacado (âmbar/vermelho) e bloqueante até resolver · sucesso.
**Regras:** sem dupla alocação no mesmo período; notificação WhatsApp é Fase 3 (🔶).
**Navegação:** Cadastros › Escalas ↔ Navegação (viagem).

---

## Dependências e pendências do módulo
- **Consumido por:** Vendas (preços), CRM (clientes/agentes), TMS (agente como recebedor), Navegação (escalas), Financeiro/Fase 2 (fornecedores, comissão).
- 🔶 Valores de preço de encomenda (Lucas); regras de comissão de agentes (diretoria); provedor de WhatsApp (escala). Preços de passagem têm fonte inicial no FAQ 2026, com validação residual de divergências/restrições antes do backend definitivo.
- Matriz inicial de perfis × permissões a validar com a diretoria.
