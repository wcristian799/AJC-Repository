# UX 01 — TMS / Carga (o coração antifraude, todo em apps de campo)

> Documento de UX detalhado do módulo **TMS / Carga** do MVP AJC.
> **Herda integralmente** as regras de `00-Fundacao-DesignSystem-Navegacao-Acesso.md`: tokens (cores semânticas, tipografia, espaçamento), os 7 princípios de campo, o shell de apps mono-função e os **componentes nomeados de campo** — `ScanButton`, `ScanResultFullScreen`, `CounterBadge`, `PhotoCaptureGuided`, `SignaturePad`, `SyncIndicator`, `OfflineBanner`, `BigSelectList` — além de `DataTable`, `FilterBar`, `StatusChip`, `KPIStat`, `AuditTrail` no back-office. Quando uma tela aqui não especifica um comportamento, **vale o que está na Fundação**.
>
> **Base funcional:** `modulos/01-TMS-Carga.md` (SPEC + telas B.1–B.11, parte C, máquina de estados do volume) e `PRD.md` (RF-4, casos de fraude).
>
> **Por que este módulo é o coração:** 60% do faturamento e a maior brecha de controle. O objetivo de UX é tornar **fácil fazer certo e difícil fazer errado** com pressa, em pé, no sol e sem internet. Cada volume nasce com UUID, é bipado, etiquetado, fotografado, conferido duas vezes e entregue com prova. A tela de **conferência (TMS-CONF)** e a de **entrega (TMS-ENT)** são as mais críticas e recebem o maior detalhamento.

---

## 0. Convenções deste documento

- **Dois ambientes** (Fundação §1): a esmagadora maioria das telas aqui é **App de campo** (coletor/celular, toque grande, offline-first). Só **TMS-NF** (lançamento ADM) e **TMS-CTRL** (controle por viagem) são **back-office web**. **TMS-PAL** (paletes) é híbrida: cadastro no web, alocação rápida no coletor.
  - *Nota pós-validação 2026-06-25:* "coletor" aqui = **celular comum** (app Capacitor/PWA), não coletor industrial dedicado; impressão de etiqueta é **térmica via Bluetooth**. As telas de campo (portaria/conferência/recebimento/entrega) vivem em superfície de campo própria (`/campo`, shell próprio), **fora** do painel web de gestão.
- **Ícone da entidade:** carga/volume = caixa (📦), palete = palete, viagem = barco (⛴), agente = crachá, veículo = caminhão. Set único da Fundação §2.4.
- **Trio de saúde / cores semânticas** (Fundação §2.1): `success` (verde) = conferido/embarcado/entregue/no prazo · `warning` (âmbar) = divergência leve / atenção · `danger` (vermelho) = divergência **bloqueante** / volume não consta / avaria · `info/offline` (azul-acinzentado) = pendente de sincronizar. **Offline nunca é vermelho** (princípio 2).
- **O número que importa é gigante** (princípio 4): o `CounterBadge` ("12 / 15") é o maior elemento das telas de conferência e bipe.
- **Foto e assinatura são prova legal** (princípio 6): fluxos de captura obrigatórios, guiados e não puláveis onde a regra exige; carimbo de data/hora/GPS sobreposto (Fundação §3.4).
- 🔶 = informação ausente/pendente que **não** foi inventada aqui.
- **Códigos de tela deste módulo:**

| Código | Tela / App | Ambiente | Spec base |
|---|---|---|---|
| `TMS-HOME` | Home do App Conferente (seleção de viagem + ações) | Coletor | shell §4.2 |
| `TMS-PORT` | App Portaria — entrada/saída de veículos | App mobile | B.1 |
| `TMS-CONF` | Conferência no coletor (receber+conferir+etiquetar) | Coletor | B.4 |
| `TMS-ETIQ` | Impressão de etiqueta (cidade/palete/volume + QR) | Coletor + impressora | B.5 |
| `TMS-PAL` | Cadastro / alocação de paletes | Web + coletor | B.6 |
| `TMS-BIPE2` | 2º bipe / reconferência na balsa | Coletor | B.7 |
| `TMS-XDOCK` | Carregamento direto / cross-docking | Coletor | B.8 |
| `TMS-ENT` | Comprovante de entrega balsa→terra | Coletor | B.9 |
| `TMS-NF` | Lançamento / upload de NF-DC | Web (+ app) | B.2 / B.3 |
| `TMS-CTRL` | Controle de carga por viagem | Back-office web | B.11 |

> Atualização pós-validação do cliente (25/jun/2026): **Veículos/Máquinas entram agora no MVP**. Checklist, fotos, etiqueta, bipe de subida/descida e entrega devem ser tratados junto dos fluxos de portaria/conferência/entrega. O modelo em papel da prestação de contas do gerente (B.10) foi recebido em 29/jun/2026 e deve guiar o refinamento do front; a última milha agente→destinatário ainda precisa de confirmação 🔶.

### Máquina de estados do volume (referência visual constante)

A cor do `StatusChip`/`ScanResultFullScreen` segue sempre este mapa. Toda tela mostra em que transição atua.

```
                ┌─────────────── divergente (em qualquer ponto) ───────────────┐
                │  (volume a mais/menos, avaria — notifica gerente, bloqueia)    │
                ▼                                                                 ▼
 recebido ──► conferido ──► embarcado ──► reconferido ──► desembarcado ──► entregue
 TMS-CONF     TMS-CONF      (sobe balsa)   TMS-BIPE2      (desce balsa)    TMS-ENT
 (porto)      +TMS-ETIQ                    2º bipe                         (agente assina)

 Cross-docking (TMS-XDOCK): recebido+embarcado no MESMO ato ──► desembarcado ──► entregue
                            (bipe do porto OU da balsa, foto obrigatória; sem 2º bipe)
```

---

## 1. Mapa do módulo e navegação entre apps

```
APP CONFERENTE (coletor) — mesmo app, perfil porto OU balsa, mono-função:
   TMS-HOME (seleciona viagem ⛴)
      ├── [Conferir carga (porto)] ───────► TMS-CONF ──► TMS-ETIQ (imprime por volume)
      │                                         └─ aloca palete ─► TMS-PAL (alocação rápida)
      ├── [Carregamento direto] ──────────► TMS-XDOCK ─► TMS-ETIQ
      ├── [2º bipe (balsa)] ──────────────► TMS-BIPE2
      ├── [Entregar (balsa→terra)] ───────► TMS-ENT (assinatura do agente)
      └── [Fila de sincronização] ────────► SyncIndicator (Fundação §3.3)

APP PORTARIA (mobile) — porteiro, mono-função:
   TMS-PORT (entrada / saída / "no pátio agora")

BACK-OFFICE (Console web):
   📦 TMS › Notas (TMS-NF: fila + lançamento + etiquetar p/ conferência)
   📦 TMS › Paletes (TMS-PAL: cadastro/alocação)
   📦 TMS › Controle por viagem (TMS-CTRL: visão operação/diretoria)
```

Regra de shell de campo (Fundação §4.2): sem sidebar; topo fino (nome do app + usuário + `SyncIndicator`); rodapé com **ação primária fixa e grande**; navegação por "voltar" simples, profundidade ≤ 3.

---

## 2. TMS-HOME — Home do App Conferente

- **Persona:** Conferente do porto **ou** da balsa (mesmo app, perfil define quais ações aparecem). **Dispositivo:** coletor/Palm com câmera e leitor. **Online/Offline:** offline-first; abre e opera sem rede.
- **Objetivo:** escolher a viagem ativa e disparar a ação certa (conferir, cross-docking, 2º bipe, entregar) em um toque grande.

### Wireframe
```
┌─────────────────────────────────┐
│ App Conferente   ◑ 3   João P. ▾│  ← topo fino: SyncIndicator (3 na fila) + usuário
├─────────────────────────────────┤
│ ⚠ Sem conexão — 3 itens          │  ← OfflineBanner (azul-acinzentado, persistente)
│   aguardando envio          ›    │
├─────────────────────────────────┤
│ VIAGEM ATIVA                     │
│ ┌─────────────────────────────┐ │
│ │ ⛴ Cidade · BEL→STM          │ │  ← BigSelectList (item selecionado, grande)
│ │ Saída hoje 18:00            │ │
│ │ 124 volumes previstos       │ │
│ │              [Trocar viagem]│ │
│ └─────────────────────────────┘ │
│                                  │
│ O QUE VOCÊ VAI FAZER?            │
│ ┌─────────────────────────────┐ │
│ │ 📦  CONFERIR CARGA          ›│ │  ← alvo ≥ 64dp de altura
│ │     receber e etiquetar      │ │
│ ├─────────────────────────────┤ │
│ │ 🚤  CARREGAMENTO DIRETO     ›│ │
│ │     embarca direto na balsa  │ │
│ ├─────────────────────────────┤ │
│ │ 🔁  2º BIPE (RECONFERIR)    ›│ │
│ │     conferir o que sobe      │ │
│ ├─────────────────────────────┤ │
│ │ ✅  ENTREGAR (BALSA→TERRA)  ›│ │
│ │     assinatura do agente     │ │
│ └─────────────────────────────┘ │
│                                  │
│ Seu rastro hoje: 12 conferidos,  │  ← transparência (princípio 3)
│ 0 divergências · ver fila ›      │
└─────────────────────────────────┘
```

### Composição
- **`SyncIndicator`** no topo: ícone + contador da fila; toque abre a fila de sincronização (Fundação §3.3).
- **`OfflineBanner`** persistente quando sem rede; **some** quando online (não vira banner verde — apenas desaparece).
- **`BigSelectList`** para a viagem ativa: o contexto que define o que será bipado (Fundação §5.3). Mostra origem→destino, saída e total de volumes previstos.
- **Lista de ações grandes** (4 cartões ≥ 64dp): cada um abre um app/tela mono-função. Ícones fixos do set.
- **Linha de rastro pessoal** ("você conferiu 12 às 14h32"): princípio 3 (transparência inibe fraude).

### Fluxo passo a passo
1. Conferente abre o app → já logado (sessão longa + PIN, Fundação §5.1). Se offline, usa credencial em cache.
2. Confirma ou troca a **viagem ativa** (`BigSelectList` com busca).
3. Toca a ação. Perfil **porto** vê Conferir + Carregamento direto; perfil **balsa** vê todas as 4 (o conferente da balsa atua em 3 modos — B.7). Carregamento direto aparece para **os dois** perfis (A.4).
4. Volta sempre para a Home (botão voltar) — profundidade rasa.

### Estados específicos
- **Offline:** banner persistente; ações funcionam normalmente; contador de fila cresce.
- **Vazio (sem viagem):** "Nenhuma viagem aberta para você. Fale com a operação." + botão **Escolher viagem**. Sem viagem, as ações ficam **desabilitadas com tooltip** "Selecione uma viagem".
- **Fila com erro de sync:** badge do `SyncIndicator` em âmbar; toque mostra o item que falhou e **Tentar de novo** (nunca código cru).
- **Carregando viagens:** skeleton do cartão de viagem (não spinner).

### Regras e validações
- A viagem ativa é **pré-requisito** de todas as ações (sem ela, nada bipável).
- Ações disponíveis dependem do **perfil** (RBAC, Fundação §5.5): itens sem permissão **escondidos** — exceto "Selecione uma viagem", que é educativo.
- A fila de sincronização **nunca bloqueia** novas ações (offline é estado normal).

### Navegação
- **Vem de:** login / seleção de contexto (Fundação §5.3).
- **Vai para:** TMS-CONF, TMS-XDOCK, TMS-BIPE2, TMS-ENT, e a fila (SyncIndicator).

---

## 3. TMS-PORT — App Portaria (entrada/saída de veículos)

- **Persona:** Porteiro (turno fixo, uma entrada/saída no porto). **Dispositivo:** app mobile. **Online/Offline:** offline-first.
- **Objetivo:** registrar quem entra e sai do porto (veículos de carga, veículos para transporte, pessoas) para acabar com o "não sei de quem é esse caminhão" (PRD §2).

### Wireframe — Home da Portaria
```
┌─────────────────────────────────┐
│ Portaria · Porto Belém  ◑ 0  Zé ▾│
├─────────────────────────────────┤
│ ⚠ Sem conexão — 2 aguardando ›   │  ← OfflineBanner
├─────────────────────────────────┤
│ ┌──────────────┐ ┌─────────────┐ │
│ │      ⬇       │ │      ⬆      │ │
│ │  REGISTRAR   │ │  REGISTRAR  │ │  ← dois alvos enormes (≥ 96dp)
│ │   ENTRADA    │ │    SAÍDA    │ │
│ └──────────────┘ └─────────────┘ │
├─────────────────────────────────┤
│ NO PÁTIO AGORA              (3)  │
│ ┌─────────────────────────────┐ │
│ │ 🚚 ABC-1D23 · Transluz      │ │  ← BigSelectList
│ │    carga · há 2h14m         │ │
│ ├─────────────────────────────┤ │
│ │ 🚙 XYZ-9K88 · p/ transporte │ │
│ │    veículo · há 47m         │ │
│ ├─────────────────────────────┤ │
│ │ 👤 Maria Souza · visita     │ │
│ │    pessoa · há 12m          │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Wireframe — Registrar entrada
```
┌─────────────────────────────────┐
│ ‹ Voltar      REGISTRAR ENTRADA  │
├─────────────────────────────────┤
│ TIPO                             │
│ [🚚 Veículo de carga ]  ← seleção│
│ [🚙 Veículo p/ transporte]       │  ← BigSelectList (chips grandes)
│ [👤 Pessoa            ]          │
│                                  │
│ PLACA                            │
│ ┌─────────────┐  ┌────────────┐  │
│ │ ABC-1D23    │  │ 📷 Ler placa│  │  ← OCR opcional pela câmera
│ └─────────────┘  └────────────┘  │
│                                  │
│ EMPRESA                          │
│ ┌─────────────────────────────┐ │
│ │ Transluz▾  (ou digitar nova)│ │  ← autocomplete + criar
│ └─────────────────────────────┘ │
│                                  │
│ MOTORISTA / NOME (opcional)      │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                  │
│ FOTO (recomendada)               │
│ ┌─────────────────────────────┐ │
│ │ 📷  Tirar foto do veículo   │ │  ← PhotoCaptureGuided (opcional)
│ └─────────────────────────────┘ │
│                                  │
│ Data/hora: hoje 14:32 (auto)     │  ← carimbo do dispositivo
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │      REGISTRAR ENTRADA       │ │  ← ação primária fixa no rodapé
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Composição
- Dois botões gigantes **Registrar entrada / Registrar saída** (mono-função, princípio 1).
- **Tipo** como chips grandes (`BigSelectList`): veículo de carga / veículo para transporte / pessoa.
- **Placa**: campo texto + botão **Ler placa** (OCR pela câmera, opcional — B.1).
- **Empresa**: autocomplete sobre cadastro, com opção de digitar nova.
- **`PhotoCaptureGuided`**: foto opcional na entrada (recomendada); carimbo de data/hora/GPS sobreposto.
- **Data/hora automáticas** (carimbo do dispositivo, B.1).
- **Lista "No pátio agora"** (`BigSelectList`): placa, empresa, tipo, hora de entrada e **tempo decorrido**; toque → detalhe + **Registrar saída**.

### Fluxo passo a passo
1. **Entrada:** toca Registrar entrada → escolhe tipo → placa (digita ou OCR) → empresa → (motorista/foto opcionais) → **Registrar entrada**. Veículo entra em "No pátio agora".
2. **Saída:** toca Registrar saída → seleciona o item da lista "No pátio" → confirma → registro fechado (grava `saida_em`).
3. Tudo grava local com `client_uuid` (idempotência, A.1) e entra na fila se offline.

### Estados específicos
- **Vazio:** "Nenhum veículo no pátio agora."
- **Offline:** registro salvo localmente, badge "pendente de sincronizar" no item; banner persistente. Saída offline também funciona.
- **Erro de validação (inline):** placa em formato inválido → mensagem sob o campo, antes de submeter (princípio 5 — previne, não pune). Sugere o formato correto (ABC-1D23 / ABC-1234).
- **Empresa nova:** ao digitar nome não cadastrado, oferece "Adicionar 'X' como nova empresa".

### Regras e validações
- Placa validada por máscara (Mercosul e antiga); pessoa não exige placa.
- **Saída só fecha registro existente** "no pátio" — não cria registro avulso de saída.
- Data/hora sempre do dispositivo (não editáveis).
- Registro liga caminhão→carga→viagem (PRD §2, "sem rastreabilidade física").

### Navegação
- **Vem de:** login do porteiro (app mono-função, abre direto na Home da Portaria).
- **Vai para:** detalhe do item no pátio → Registrar saída. Porteiro é mono-função, sem link a outros apps.

---

## 4. TMS-CONF — Conferência no coletor (B.4) ⭐ TELA MAIS CRÍTICA

- **Persona:** Conferente do porto. **Dispositivo:** coletor/Palm com leitor de QR/código + câmera + (opcional) balança. **Online/Offline:** offline-first — conferência inteira funciona sem rede.
- **Objetivo:** receber a carga conferindo **volume a volume** contra a NF/DC, fotografando, alocando palete e etiquetando cada volume com QR/UUID — fechando a brecha do "declara 5, entram 10" (PRD §2).

> Esta é a **primeira barreira antifraude**. Tudo aqui é desenhado para que o número conferido seja inquestionável: contador gigante, foto obrigatória por lote, divergência impossível de ignorar, rastro pessoal de quem bipou o quê.

### Wireframe — 4.A Seleção de carga e modelo de recebimento
```
┌─────────────────────────────────┐
│ ‹ Home    CONFERIR · BEL→STM ◑ 3│
├─────────────────────────────────┤
│ MODELO DE RECEBIMENTO            │
│ ┌─────────────┐ ┌─────────────┐  │
│ │ ● PORTO+    │ │ ○ CARREG.   │  │  ← BigSelectList (2 chips grandes)
│ │   BALSA     │ │   DIRETO    │  │
│ │ tem 2º bipe │ │ vai p/ B.8  │  │
│ └─────────────┘ └─────────────┘  │
├─────────────────────────────────┤
│ CARGAS PREVISTAS P/ EMBARCAR     │
│ ┌─────────────────────────────┐ │
│ │ 📦 Carga #4471 · STM        │ │  ← BigSelectList c/ busca
│ │  Remet: J.Silva  15 volumes │ │
│ │  NF-e ✓ vinculada           │ │
│ ├─────────────────────────────┤ │
│ │ 📦 Carga #4472 · STM        │ │
│ │  Remet: Comercial X  8 vol. │ │
│ │  ⚠ sem NF/DC — bloqueada    │ │  ← danger: não embarca sem doc (A.6)
│ ├─────────────────────────────┤ │
│ │ 📦 Carga #4480 · PMZ        │ │
│ │  Remet: M.Costa  3 volumes  │ │
│ │  DC ✓ vinculada             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Wireframe — 4.B Conferência ativa (tela-coração) — o contador é GIGANTE
```
┌─────────────────────────────────┐
│ ‹  Carga #4471 · STM        ◑ 3 │
├─────────────────────────────────┤
│                                  │
│         CONFERIDOS               │
│        ┌───────────┐             │
│        │  12 / 15  │             │  ← CounterBadge GIGANTE (princípio 4)
│        └───────────┘             │     verde enquanto ≤ declarado
│      faltam 3 volumes            │
│                                  │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │      ┌───────────────┐      │ │
│ │      │   BIPAR VOLUME │      │ │  ← ScanButton (ocupa boa parte da tela)
│ │      │      [ ▣ ]     │      │ │
│ │      └───────────────┘      │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                  │
│ ÚLTIMO: vol 12/15 · 14:32 ✓     │  ← rastro pessoal (princípio 3)
│ Palete atual: PAL-07 (STM) ▾    │  ← palete "grudado" entre bipes
│                                  │
│ Foto do lote: ⚠ pendente (0/2)  │  ← lembrete persistente
├─────────────────────────────────┤
│ [ Ver lista ]   [ FECHAR ▸ ]    │  ← fechar desabilitado até 15/15 + fotos
└─────────────────────────────────┘
```

### Wireframe — 4.C Resultado do bipe (tela cheia, ScanResultFullScreen)
```
┌─────────────────────────────────┐
│█████████████ VERDE ██████████████│
│                                  │
│            ✓                     │
│      VOLUME 13 / 15              │  ← informação central única
│                                  │
│   Carga #4471 · STM · 4,2 kg     │
│   Palete PAL-07                  │
│                                  │
│   Agora:                         │
│   ┌───────────────────────────┐ │
│   │ 📷 FOTO DO VOLUME (obrig.) │ │  ← PhotoCaptureGuided, não pulável
│   └───────────────────────────┘ │
│   ┌───────────────────────────┐ │
│   │ 🖨 IMPRIMIR ETIQUETA       │ │  → TMS-ETIQ
│   └───────────────────────────┘ │
│                                  │
│   [ Próximo volume ]             │
└─────────────────────────────────┘
```

### Wireframe — 4.D Estado de DIVERGÊNCIA (volume a mais) — vermelho
```
┌─────────────────────────────────┐
│█████████████ VERMELHO ███████████│
│            ✕                     │
│   VOLUME A MAIS!                 │
│   Você bipou 16, declarado 15    │  ← danger bloqueante (A.6)
│                                  │
│   Este volume não consta na      │
│   NF/DC desta carga.             │
│                                  │
│   O que fazer?                   │
│   ┌───────────────────────────┐ │
│   │ Justificar e abrir exceção │ │  → notifica gerente
│   └───────────────────────────┘ │
│   ┌───────────────────────────┐ │
│   │ Cancelar este bipe         │ │
│   └───────────────────────────┘ │
└─────────────────────────────────┘
```

### Composição
- **`BigSelectList`** (4.A): modelo de recebimento (Porto+Balsa / Carregamento direto) e lista de cargas previstas com indicador de NF/DC. Carga sem doc aparece **bloqueada** em vermelho (A.6).
- **`CounterBadge` GIGANTE** (4.B): "Conferidos X / Y declarados" é o **maior elemento da tela** (princípio 4). Verde até Y; âmbar/vermelho ao divergir.
- **`ScanButton`** (4.B): botão de leitura ocupando boa parte da tela; lê o código do volume (ou gera UUID no recebimento se o volume ainda não tem etiqueta).
- **`ScanResultFullScreen`** (4.C): após cada bipe, tela cheia verde com a posição (13/15), peso e palete; embute as duas próximas ações obrigatórias.
- **`PhotoCaptureGuided`**: (1) **foto obrigatória por volume** no fluxo de cada bipe; (2) **foto de recebimento do lote/palete** — padrão de **2 fotos** (ângulo de cima + do meio, B.4 §4). Contador "0/2" persistente.
- **Seletor de palete** "grudado": o palete atual persiste entre bipes para não repetir seleção; troca em 1 toque → abre alocação rápida (TMS-PAL).
- **Campo de peso**: preenchido pela balança se houver, senão manual (A.5).
- **Botão imprimir etiqueta** → TMS-ETIQ.
- **Rastro pessoal** ("último: vol 12 às 14h32"): princípio 3.

### Fluxo passo a passo
1. Seleciona **modelo de recebimento** e a **carga** (4.A). Se a carga não tem NF/DC, está bloqueada (não dá para conferir).
2. Entra na conferência (4.B): `CounterBadge` em "0 / 15".
3. Para cada volume: toca **`ScanButton`** → lê/gera UUID → `ScanResultFullScreen` (4.C) → **tira foto obrigatória do volume** → **imprime etiqueta** (TMS-ETIQ) → confirma palete → **Próximo volume**. Contador sobe.
4. Tira as **2 fotos de recebimento do lote/palete** (a qualquer momento; obrigatórias para fechar).
5. **Fechar conferência**: só habilita se **X = Y** (ou divergência justificada) **e** as 2 fotos de lote existirem → tela de sucesso "Carga conferida — N volumes, peso total X".

### Estados específicos
- **Offline (normal):** conferência segue 100%; cada bipe/foto/etiqueta grava local com `client_uuid`; banner persistente; sincroniza depois. Impressão de etiqueta funciona offline (impressora térmica local).
- **Divergência — volume a MENOS:** ao tentar **Fechar** com X < Y → `CounterBadge` fica **âmbar** + tela "Faltam 2 volumes". Opções: continuar bipando, **ou** Justificar e abrir exceção (notifica gerente, A.6). Fechamento bloqueado até X=Y ou justificativa.
- **Divergência — volume a MAIS** (4.D): bipe além do declarado → tela **vermelha bloqueante** "Volume a mais / não consta". Opções: Justificar+exceção (gerente) ou Cancelar bipe. Volume vira `divergente` na máquina de estados.
- **Bipe duplicado:** mesmo UUID lido 2×→ aviso âmbar "Volume já conferido (vol 7), não contei de novo" — não incrementa (idempotência, A.1).
- **Foto faltando:** botão **Fechar** desabilitado com rótulo "Faltam 2 fotos do lote"; foto do volume bloqueia o **Próximo volume** (não pulável — princípio 6).
- **Etiqueta não imprimiu:** ver TMS-ETIQ (reimprimir da fila; o UUID já está gravado).
- **Sucesso:** tela cheia verde "Carga #4471 conferida — 15 volumes · 63 kg" + próximo passo (voltar à Home ou conferir próxima carga).

### Regras e validações
- **Nenhum volume embarca sem etiqueta (UUID) e sem foto de recebimento** (A.6). A foto por volume + a foto de lote são impostas pelo fluxo.
- **Carga sob risco legal exige NF ou DC vinculada antes do embarque** (A.6) → conferência de carga sem doc é **bloqueada** já em 4.A.
- **Divergência declarado × bipado bloqueia o fechamento** até resolução pelo gerente (A.6). A exceção sempre grava quem/quando/foto (AuditTrail).
- Cada bipe grava **EventoVolume** (quem, quando, GPS, foto) — trilha imutável (A.1).
- Idempotência por `client_uuid`: reenvio na fila nunca duplica volume.

### Navegação
- **Vem de:** TMS-HOME › Conferir carga.
- **Vai para:** TMS-ETIQ (imprimir por volume), TMS-PAL (alocação rápida de palete), exceção → gerente (notificação). Fecha → volta à Home com a carga em `conferido`.

---

## 5. TMS-ETIQ — Impressão de etiqueta (B.5)

- **Persona:** Conferente do porto (ou da balsa no cross-docking). **Dispositivo:** coletor/celular + **impressora térmica Bluetooth** pareada. **Online/Offline:** funciona offline (impressão local).
- **Objetivo:** imprimir a etiqueta física padronizada de cada volume — CIDADE · PALETE · VOLUME (índice/total) · **QR com o UUID** — que vira a chave de todos os bipes seguintes.

### Wireframe — Pré-visualização e impressão
```
┌─────────────────────────────────┐
│ ‹  ETIQUETA · vol 13/15         │
├─────────────────────────────────┤
│  PRÉ-VISUALIZAÇÃO                │
│ ┌─────────────────────────────┐ │
│ │  AJC                  STM    │ │  ← CIDADE (sigla grande)
│ │ ─────────────────────────── │ │
│ │  PALETE: PAL-07             │ │
│ │  VOLUME: 13 / 15            │ │  ← índice/total
│ │ ─────────────────────────── │ │
│ │   ███ ▄▄ █ ▄█   Carga #4471 │ │
│ │   █ ▄█▄██ ▄██   Remet: JSil │ │  ← QR (UUID) + remet/dest abreviado
│ │   ██ ████ ▄ █   Dest: MCost │ │
│ └─────────────────────────────┘ │
│                                  │
│ Impressora: AJC-TERM-1  🟢 ok    │  ← status do pareamento
│ Cópias: [ – ]  1  [ + ]          │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │      🖨  IMPRIMIR            │ │  ← ação primária
│ └─────────────────────────────┘ │
│ Fila de impressão: 0 pendentes   │
└─────────────────────────────────┘
```

### Composição
- **Pré-visualização** fiel ao layout térmico: **CIDADE** (sigla — BEL/BRV/GUR/ALM/PMZ/PRA/MTA/STM), **PALETE** (código), **VOLUME** (ex. 1/2, 2/2, 3/3), **QR Code do UUID** e (recomendado) remetente/destinatário abreviado + nº da carga (B.5).
- **Status da impressora** pareada (verde ok / âmbar reconectando / vermelho sem impressora).
- **Seletor de cópias** (alvos +/− grandes).
- **Fila de impressão** local (offline-resiliente).
- Botão **Imprimir** fixo no rodapé.

### Fluxo passo a passo
1. Chega de TMS-CONF (ou TMS-XDOCK) já com o volume e o UUID definidos.
2. Confere a pré-visualização (cidade/palete/volume corretos).
3. **Imprimir** → etiqueta sai; sucesso retorna ao fluxo de conferência (Próximo volume).
4. Multi-volume: imprime sequência 1/3, 2/3, 3/3 automaticamente para a mesma carga.

### Estados específicos
- **Offline:** impressão é local, funciona normalmente; o UUID já está gravado no coletor.
- **Sem impressora / não pareada:** banner âmbar "Impressora não encontrada" + **Parear** / **Reimprimir depois** (enfileira). O **UUID não se perde** — a etiqueta pode sair depois sem reconferir.
- **Falha na impressão:** item fica na **fila de impressão** com **Reimprimir**; nunca gera novo UUID para o mesmo volume (evita duplicidade física).
- **Reimpressão:** permitida (etiqueta rasgou/borrou) — reimprime o **mesmo** UUID, registrado no AuditTrail.

### Regras e validações
- **UUID é imutável** por volume: reimpressão usa o mesmo QR. Trocar UUID exige cancelar o volume e recriá-lo (gera evento).
- Sigla de cidade vem do destino da carga (glossário PRD §10).
- Etiqueta sempre traz VOLUME índice/total coerente com `indice_volume`/`total_volumes`.

### Navegação
- **Vem de:** TMS-CONF / TMS-XDOCK (por volume).
- **Vai para:** retorna ao fluxo de conferência. Fila de impressão acessível pelo cabeçalho.

---

## 6. TMS-PAL — Cadastro e alocação de paletes (B.6)

- **Persona:** Conferente / operação. **Dispositivo:** **Web** (cadastro completo) + **coletor** (alocação rápida durante a conferência). **Online/Offline:** cadastro web online; alocação no coletor offline-first.
- **Objetivo:** cadastrar paletes (próprios e de terceiros) e alocá-los a viagem + cidade destino, com status livre / alocado / em trânsito.

### Wireframe — Web: lista de paletes (back-office)
```
┌────────────────────────────────────────────────────────────┐
│ [AJC] Belém ▾                       🔔  ◑sync  Ana (Oper.) ▾│
├──────────┬─────────────────────────────────────────────────┤
│ 📦 TMS  ▾│ TMS › Paletes                                    │
│  •Notas  │ FilterBar: [busca código🔎] Status:▾ Proprietár▾ │
│  •Paletes│                              Viagem:▾  + Novo    │
│  •Controle ├───────────────────────────────────────────────┤
│          │ DataTable                                        │
│          │ Código  | Propriet.| Status     | Viagem | Cidade│
│          │ ────────┼──────────┼────────────┼────────┼───────│
│          │ PAL-07  | AJC      |🟢 Livre    |  —     |  —    │
│          │ PAL-08  | AJC      |🟠 Alocado  | #BELSTM|  STM  │
│          │ TRC-21  | Transluz |🔵 Em trâns.| #BELSTM|  STM  │
│          │ TRC-22  | Transluz |🟠 Alocado  | #BELPMZ|  PMZ  │
│          │ ─────────────────────────────────  4 de 4 ◀1▶   │
└──────────┴─────────────────────────────────────────────────┘
```

### Wireframe — Coletor: alocação rápida (durante conferência)
```
┌─────────────────────────────────┐
│ ‹  ALOCAR PALETE · STM          │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │   📷  BIPAR PALETE          │ │  ← ScanButton (lê código do palete)
│ └─────────────────────────────┘ │
│ ou escolher:                     │
│ ┌─────────────────────────────┐ │
│ │ PAL-07 · AJC · Livre        │ │  ← BigSelectList (só livres p/ esta cidade)
│ ├─────────────────────────────┤ │
│ │ TRC-21 · Transluz · Livre   │ │
│ └─────────────────────────────┘ │
│                                  │
│ Destino do palete: STM (auto)    │
│ [ + Cadastrar palete de terceiro]│
├─────────────────────────────────┤
│ │        USAR ESTE PALETE       │ │
└─────────────────────────────────┘
```

### Composição
- **Web (`DataTable` + `FilterBar`):** colunas código, proprietário (AJC/terceiro), `StatusChip` (livre/alocado/em trânsito), viagem, cidade. Filtros por status/proprietário/viagem. Botão **+ Novo palete**.
- **Cadastro de palete de terceiro** (`FormPanel`): código, proprietário (terceiro), identificação (B.6).
- **Alocação** (web e coletor): vincula palete → viagem + cidade destino.
- **Coletor:** `ScanButton` para bipar o código do palete + `BigSelectList` filtrada (só paletes **livres** compatíveis com a cidade da carga). Atalho para cadastrar terceiro na hora.

### Fluxo passo a passo
1. **Cadastro (web):** operação cadastra paletes de terceiros e mantém os da AJC.
2. **Alocação (web ou coletor):** seleciona palete livre → vincula à viagem + cidade.
3. **Durante a conferência (coletor):** ao alocar um volume, bipa/seleciona o palete; ele "gruda" como palete atual em TMS-CONF.
4. Ao embarcar, o palete passa a **em trânsito**.

### Estados específicos
- **Vazio:** "Nenhum palete cadastrado. Cadastre os paletes da AJC e de terceiros."
- **Em trânsito:** **não pode realocar** (bloqueado com tooltip) — está numa viagem em curso.
- **Erro:** palete já alocado a outra viagem → "TRC-21 já está na viagem #BELPMZ. Libere-o antes de realocar."
- **Offline (coletor):** alocação grava local; se o palete bipado não existe no cache, oferece cadastro rápido de terceiro.

### Regras e validações
- Status: **livre → alocado → em trânsito**; em trânsito é terminal até a viagem concluir.
- Palete só é alocável a **uma** viagem por vez.
- Palete de terceiro exige proprietário identificado (rastreabilidade).
- Cidade do palete deve bater com a cidade destino dos volumes alocados (aviso se divergir).

### Navegação
- **Vem de:** Sidebar TMS › Paletes (web); TMS-CONF/TMS-XDOCK (alocação rápida no coletor).
- **Vai para:** retorna à conferência com o palete selecionado.

---

## 7. TMS-BIPE2 — 2º bipe / reconferência na balsa (B.7)

- **Persona:** Conferente da balsa. **Dispositivo:** coletor/Palm. **Online/Offline:** offline-first.
- **Objetivo:** reconferir no embarque tudo que foi conferido no porto — **segunda barreira antifraude** — comparando cada volume bipado contra a carga prevista da viagem.

### Wireframe — Reconferência ativa
```
┌─────────────────────────────────┐
│ ‹ Home   2º BIPE · BEL→STM   ◑ 1│
├─────────────────────────────────┤
│         EMBARCADOS               │
│        ┌───────────┐             │
│        │ 118 / 124 │             │  ← CounterBadge GIGANTE (esperado da viagem)
│        └───────────┘             │
│      faltam 6 volumes            │
│                                  │
│ ┌─────────────────────────────┐ │
│ │      ┌───────────────┐      │ │
│ │      │  BIPAR VOLUME │      │ │  ← ScanButton
│ │      │      [ ▣ ]     │      │ │
│ │      └───────────────┘      │ │
│ └─────────────────────────────┘ │
│                                  │
│ ÚLTIMO: vol 7/15 #4471 ✓ match  │  ← compara c/ conferido no porto
├─────────────────────────────────┤
│ [ Ver faltantes ]  [ FECHAR ▸ ] │
└─────────────────────────────────┘
```

### Wireframe — Resultado: MATCH / NÃO CONSTA
```
   MATCH (verde)              NÃO PREVISTO (vermelho)
┌──────────────────┐       ┌──────────────────┐
│████ VERDE ███████│       │███ VERMELHO ██████│
│        ✓         │       │        ✕         │
│  EMBARCADO       │       │ VOLUME NÃO CONSTA │
│  vol 7/15 #4471  │       │ Este volume não   │
│  conferido no    │       │ foi conferido no  │
│  porto às 14:32  │       │ porto.            │
│                  │       │ [Justificar]      │
│ [Próximo]        │       │ [Cancelar bipe]   │
└──────────────────┘       └──────────────────┘
```

### Wireframe — Fechamento com faltantes
```
┌─────────────────────────────────┐
│ ‹  FECHAR 2º BIPE                │
├─────────────────────────────────┤
│ ⚠ 6 volumes esperados NÃO foram │  ← danger
│   bipados na balsa:              │
│ ┌─────────────────────────────┐ │
│ │ vol 13/15 · #4471 · PAL-07  │ │  ← BigSelectList dos faltantes
│ │ vol 14/15 · #4471 · PAL-07  │ │
│ │ vol 3/8  · #4480 · PAL-09   │ │
│ │ ... +3                      │ │
│ └─────────────────────────────┘ │
│ Esses volumes ficaram em terra?  │
│ ┌─────────────────────────────┐ │
│ │ Justificar e notificar geren.│ │
│ └─────────────────────────────┘ │
│ [ Continuar bipando ]            │
└─────────────────────────────────┘
```

### Composição
- **`CounterBadge` GIGANTE** "Embarcados X / Y" — Y = total previsto/conferido da viagem.
- **`ScanButton`** para cada volume que sobe.
- **`ScanResultFullScreen`** com 3 desfechos: **match** (verde, vira `reconferido/embarcado`), **não previsto** (vermelho — "volume não consta"), **duplicado** (âmbar — já reconferido).
- **Lista de faltantes** (`BigSelectList`) no fechamento: volumes esperados que não subiram.

### Fluxo passo a passo
1. Seleciona a viagem (já é a ativa) → entra no 2º bipe.
2. Bipa cada volume que sobe à balsa → sistema compara com o conferido no porto.
3. **Match** → `reconferido`. **Não consta** → exceção/justificativa. **Duplicado** → ignora.
4. **Fechar**: mostra resumo; se há faltantes, exige justificativa (notifica gerente).

### Estados específicos
- **Match:** verde, mostra quando/quem conferiu no porto (cruza as duas barreiras).
- **Não previsto:** vermelho bloqueante — volume sem origem no porto. Justificar+exceção ou cancelar.
- **Faltante ao fechar:** lista vermelha dos esperados não bipados → "ficaram em terra?" → justificar e notificar gerente (A.6 divergência bloqueia).
- **Offline:** reconferência segue; sincroniza depois; a comparação usa o cache do que veio do porto.
- **Sucesso:** "124/124 embarcados — 2º bipe concluído, 0 divergências."

### Regras e validações
- Só vira `embarcado/reconferido` o volume que **deu match** com a conferência do porto.
- Volume bipado **sem origem** no porto = `divergente`, exige tratamento.
- Faltantes bloqueiam o fechamento até justificativa do gerente.
- Cross-docking **não** passa por aqui (embarca direto em TMS-XDOCK, sem 2º bipe — A.3).

### Navegação
- **Vem de:** TMS-HOME › 2º bipe.
- **Vai para:** exceção → gerente; fecha → volumes em `embarcado`, prontos para TMS-ENT no destino.

---

## 8. TMS-XDOCK — Carregamento direto / cross-docking (B.8)

- **Persona:** Conferente do porto **OU** da balsa (ambos podem efetivar — A.4). **Dispositivo:** coletor. **Online/Offline:** offline-first.
- **Objetivo:** receber carga que embarca **direto na balsa**, em vários lotes/horários, sem passar pelo pátio — recebimento e embarque no **mesmo ato** (sem 2º bipe separado).

### Wireframe — Lista de recebimentos da viagem
```
┌─────────────────────────────────┐
│ ‹ Home  CARREG. DIRETO·BEL→STM ◑2│
├─────────────────────────────────┤
│ Efetivado por: João P. (porto)   │  ← grava perfil/usuário (auditoria A.4)
│                                  │
│ RECEBIMENTOS DESTA VIAGEM        │
│ ┌─────────────────────────────┐ │
│ │ Recebimento 1 · 09:14       │ │  ← BigSelectList
│ │ 22 vol · foto ✓ · fechado   │ │
│ ├─────────────────────────────┤ │
│ │ Recebimento 2 · 11:40       │ │
│ │ 8 vol · ⚠ foto pendente     │ │  ← bloqueia fechamento do lote
│ ├─────────────────────────────┤ │
│ │ Recebimento 3 · em aberto   │ │
│ │ 0 vol · bipando...          │ │
│ └─────────────────────────────┘ │
│                                  │
│ TOTAL CONSOLIDADO: 30 volumes    │  ← total por viagem (princípio 4)
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │   + NOVO RECEBIMENTO         │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Wireframe — Dentro de um recebimento (lote)
```
┌─────────────────────────────────┐
│ ‹  RECEBIMENTO 3 · em aberto    │
├─────────────────────────────────┤
│         BIPADOS NESTE LOTE       │
│        ┌───────────┐             │
│        │     5     │             │  ← CounterBadge (cross-dock = recebido+embarcado)
│        └───────────┘             │
│ ┌─────────────────────────────┐ │
│ │     ┌───────────────┐       │ │
│ │     │  BIPAR VOLUME │       │ │  ← ScanButton → etiqueta (TMS-ETIQ)
│ │     └───────────────┘       │ │
│ └─────────────────────────────┘ │
│ Foto do lote: ⚠ pendente (0/1)  │  ← PhotoCaptureGuided obrigatória (A.6)
│ Palete atual: TRC-21 ▾          │
├─────────────────────────────────┤
│ [ FECHAR LOTE ▸ ]               │  ← só com foto presente
└─────────────────────────────────┘
```

### Composição
- **Mesma base do TMS-CONF**, mas organizada em **lista de recebimentos** (Recebimento 1, 2, 3…), cada um com seus volumes e **sua foto obrigatória** (B.8).
- **Cabeçalho "Efetivado por"**: mostra perfil/usuário que registra (porto ou balsa) — gravado para auditoria (A.4).
- **Total consolidado** por viagem (soma dos lotes).
- **`ScanButton` + `PhotoCaptureGuided` + TMS-ETIQ**: recebido+embarcado no mesmo ato; etiqueta com UUID emitida na hora.

### Fluxo passo a passo
1. Disponível a partir da TMS-HOME para porto **e** balsa (A.4).
2. **+ Novo recebimento** → abre um lote → bipa volumes (cada um etiquetado) → tira a foto do lote → **Fechar lote**.
3. Repete para quantos lotes a viagem tiver (múltiplos horários).
4. Total consolidado acompanha o avanço; não há etapa de pátio nem 2º bipe para estes volumes.

### Estados específicos
- **Foto pendente:** lote não fecha; badge âmbar "foto pendente" (A.6 — foto obrigatória em cada lote).
- **Offline:** recebimentos e fotos gravam local; cada lote sincroniza com `client_uuid`.
- **Total consolidado:** sempre visível na lista; atualiza ao fechar cada lote.
- **Sucesso:** "Recebimento 2 fechado — 8 volumes, foto ✓."

### Regras e validações
- **Foto de recebimento obrigatória em cada lote** (A.6); bloqueia fechamento.
- Cada recebimento grava **qual conferente** o efetivou (A.4, auditoria).
- Volume de cross-docking entra em `recebido+embarcado` direto (sem `reconferido`).
- Etiqueta/UUID e foto ocorrem no ato (A.6 vale também para cross-docking).

### Navegação
- **Vem de:** TMS-HOME › Carregamento direto (porto ou balsa).
- **Vai para:** TMS-ETIQ (por volume), TMS-PAL (palete). Volumes seguem para TMS-ENT no destino.

---

## 9. TMS-ENT — Comprovante de entrega balsa→terra (B.9) ⭐ TELA CRÍTICA

- **Persona:** **Conferente da balsa**. **Dispositivo:** app mobile/coletor. **Online/Offline:** offline-first.
- **Objetivo:** registrar a entrega com **prova legal** (2 fotos + assinatura do agente da cidade) e disparar notificação — encerrando a custódia da AJC quando a mercadoria desce da balsa para a terra (B.9).

> Segunda tela mais crítica do módulo: é o ponto onde a responsabilidade jurídica da AJC termina. Por isso a **assinatura do agente** e as **2 fotos** são impostas — sem elas, não há "entregue". Tudo carimbado com data/hora/GPS.

### Wireframe — 9.A Selecionar volumes que descem
```
┌─────────────────────────────────┐
│ ‹ Home   ENTREGA · STM      ◑ 1 │
├─────────────────────────────────┤
│ Cidade de desembarque: STM       │
│         A DESCER                 │
│        ┌───────────┐             │
│        │   0 / 18  │             │  ← CounterBadge dos volumes p/ STM
│        └───────────┘             │
│ ┌─────────────────────────────┐ │
│ │     ┌───────────────┐       │ │
│ │     │  BIPAR VOLUME │       │ │  ← ScanButton (bipa o que desce)
│ │     └───────────────┘       │ │
│ └─────────────────────────────┘ │
│ [ Selecionar palete inteiro ]    │  ← atalho: desce palete completo
│ ÚLTIMO: vol 7/15 #4471 ✓        │
├─────────────────────────────────┤
│ [ AVANÇAR P/ PROVA ▸ ]          │
└─────────────────────────────────┘
```

### Wireframe — 9.B Prova: 2 fotos + recebedor + assinatura
```
┌─────────────────────────────────┐
│ ‹  ENTREGA · 18 volumes · STM   │
├─────────────────────────────────┤
│ 1) FOTOS OBRIGATÓRIAS (2)        │
│ ┌──────────┐ ┌──────────┐        │
│ │ 📷 DE    │ │ 📷 DO    │        │  ← PhotoCaptureGuided (padrão 90°)
│ │  CIMA ✓  │ │  MEIO ⚠  │        │     molduras de ângulo
│ └──────────┘ └──────────┘        │
│                                  │
│ 2) RECEBEDOR                     │
│ ┌─────────────────────────────┐ │
│ │ Agente: Carlos Lima (STM) ▾ │ │  ← autocomplete cadastro de agentes
│ │ Doc: 123.456.789-00         │ │
│ └─────────────────────────────┘ │
│ [ Recebedor avulso (justificar)]│  ← exige justificativa (auditoria)
│                                  │
│ 3) ASSINATURA DO AGENTE          │
│ ┌─────────────────────────────┐ │
│ │ Carlos Lima · 123.456.789-00│ │  ← nome+doc acima (SignaturePad)
│ │  ✍  (assine aqui)           │ │
│ │  ___________________        │ │
│ └─────────────────────────────┘ │
│ GPS: -1.45, -48.50 · 16:08 ✓     │  ← carimbo de prova
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │   CONFIRMAR ENTREGA          │ │  ← desabilitado até 2 fotos+assinatura
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Wireframe — 9.C Sucesso: protocolo digital
```
┌─────────────────────────────────┐
│████████████ VERDE ███████████████│
│            ✓                     │
│   ENTREGA REGISTRADA             │
│   Protocolo nº 2026-STM-0473     │  ← protocolo digital (tipo ML/Shopee)
│                                  │
│   18 volumes · STM               │
│   Recebido por: Carlos Lima      │
│   16:08 · GPS ✓                  │
│                                  │
│   📲 Notificação enviada a       │  ← WhatsApp/SMS remet+dest
│      remetente e destinatário    │
│   (ou: enviará ao sincronizar)   │
│                                  │
│ [ Compartilhar comprovante ]     │
│ [ Nova entrega ]                 │
└─────────────────────────────────┘
```

### Composição
- **`CounterBadge`** dos volumes a descer naquela cidade.
- **`ScanButton`** para bipar cada volume + atalho **"Selecionar palete inteiro"** (desce palete completo de uma vez).
- **`PhotoCaptureGuided`** com **2 fotos obrigatórias** em padrão 90° (de cima + do meio do palete/volume, B.9) — molduras de ângulo guiam o conferente.
- **Recebedor** = **agente de carga da cidade** (autocomplete pelo cadastro de agentes); opção **recebedor avulso** com justificativa obrigatória.
- **`SignaturePad`** com nome + documento do agente acima (Fundação §3.3).
- **Carimbo de prova**: GPS + data/hora sobrepostos (Fundação §3.4).
- **Protocolo digital** na tela de sucesso + **compartilhar comprovante** + notificação WhatsApp/SMS.

### Fluxo passo a passo
1. Seleciona a cidade de desembarque (vem da escala da viagem) → bipa os volumes que descem (ou palete inteiro).
2. **Avançar para prova** (9.B): tira as **2 fotos** → seleciona o **agente recebedor** (ou avulso+justificativa) → coleta **assinatura** no `SignaturePad`.
3. **Confirmar entrega**: só habilita com 2 fotos + recebedor + assinatura presentes.
4. Volume passa a `entregue`; gera **protocolo digital**; dispara **WhatsApp/SMS** a remetente e destinatário (9.C).

### Estados específicos
- **Faltam fotos/assinatura:** botão **Confirmar** desabilitado, com rótulo do que falta ("Falta 1 foto", "Falta assinatura"). Não pulável (princípio 6).
- **Recebedor não é o agente da cidade:** ativa **recebedor avulso** → **justificativa obrigatória** (auditoria, B.9). Grava `recebedor_avulso = true`.
- **Offline:** entrega registrada localmente com fotos/assinatura/GPS; **a notificação WhatsApp/SMS é enviada ao sincronizar** (a tela de sucesso avisa "enviará ao sincronizar"). Protocolo é gerado local (sequência reconciliável).
- **Divergência ao descer:** volume bipado que não pertence à cidade/viagem → vermelho "volume não é desta entrega"; volume avariado → marca `divergente` com foto.
- **Sucesso:** protocolo nº gerado; comprovante compartilhável (PDF/imagem).

### Regras e validações
- **2 fotos + assinatura são obrigatórias** para concluir (B.9); sem elas não existe estado `entregue`.
- Recebedor padrão = **agente de carga da cidade de destino**; avulso exige justificativa registrada.
- Carimbo GPS + data/hora + hash da foto = blindagem jurídica (A.1, RF-7 §7 auditabilidade).
- Encerra a custódia da AJC (balsa→terra). **Última milha** agente→destinatário é 🔶 — confirmar com o cliente se entra no sistema (nova foto/assinatura do destinatário) ou fica fora do escopo (B.9).
- Notificação sempre confirmada na tela ("Notificação enviada a X" — Fundação §3.4).

### Navegação
- **Vem de:** TMS-HOME › Entregar (balsa→terra).
- **Vai para:** sucesso → compartilhar comprovante / nova entrega. Volume em `entregue` reflete em TMS-CTRL.

---

## 10. TMS-NF — Lançamento / upload de NF-DC (B.2 + B.3)

Duas faces do mesmo fluxo: **B.2** upload pelo cliente/agente (app/web simples) e **B.3** lançamento/validação pelo ADM Notas (back-office), que vincula a NF/DC à carga e **gera os volumes a serem bipados** pela conferência.

### 10.1 TMS-NF-UP (B.2) — Upload pelo cliente/agente
- **Persona:** Cliente ou agente comercial. **Dispositivo:** Web/App. **Online/Offline:** online (upload de arquivo).
- **Objetivo:** o cliente/agente sobe a NF/DC antes ou no momento do envio.

```
┌─────────────────────────────────┐
│  Enviar documento da carga       │
├─────────────────────────────────┤
│ Carga / envio:                   │
│ ┌─────────────────────────────┐ │
│ │ Carga #4471 · STM ▾         │ │
│ └─────────────────────────────┘ │
│ Remetente: nome/razão · CPF/CNPJ │
│           · telefone             │
│ Destinatário: nome/razão ·       │
│           CPF/CNPJ · telefone    │
│ Tipo de documento:               │
│ ( ) NF-e   ( ) NFC-e   (•) DC    │
│                                  │
│ Nº / chave (NF-e):               │
│ ┌─────────────────────────────┐ │
│ │ 3526...                     │ │
│ └─────────────────────────────┘ │
│ Valor: R$ [ 1.250,00 ]           │
│                                  │
│ Arquivo (PDF/foto):              │
│ ┌─────────────────────────────┐ │
│ │ 📎 Anexar ou tirar foto      │ │
│ └─────────────────────────────┘ │
│ Agendar recebimento:             │
│ Dia [ ▾ ]   Horária [ 30/30 ▾ ]  │
│ (máx. 5 caminhões por janela)    │
├─────────────────────────────────┤
│ [        ENVIAR DOCUMENTO     ]  │
└─────────────────────────────────┘
```
**Composição:** seletor de carga, **dados de remetente e destinatário** (nome/razão, CPF/CNPJ, telefone — atualizado pós-validação 2026-06-25, o campo único "carga/envio" era ambíguo), tipo (NF-e/NFC-e/DC), número/chave ou valor, upload (PDF/foto), **agendamento de recebimento** (dia + janela de 30 em 30 min, máx. 5 caminhões por janela). **Estados:** vazio (nenhum doc) · carregando (upload com barra) · erro (arquivo grande/inválido) · sucesso ("Documento enviado, aguardando conferência"). **Regras:** valida formato/tamanho; chave NF-e validada por máscara; janela cheia (5 caminhões) fica indisponível para novo agendamento.

### 10.2 TMS-NF-ADM (B.3) — Lançamento pelo ADM Notas (back-office)
- **Persona:** ADM Notas. **Dispositivo:** Web. **Online/Offline:** online.
- **Objetivo:** lançar/validar as NF/DC, vincular à carga e **etiquetar por volume e por palete** (gera os volumes que a conferência vai bipar).

```
┌────────────────────────────────────────────────────────────┐
│ [AJC] Belém ▾                       🔔  ◑sync  Lia (Notas) ▾│
├──────────┬─────────────────────────────────────────────────┤
│ 📦 TMS  ▾│ TMS › Notas                                      │
│  •Notas  │ FilterBar: [busca nº/cliente🔎] Status:▾ Tipo:▾  │
│  •Paletes│ ┌─────────────┬──────────────────────────────┐  │
│  •Controle │ FILA PENDENTE│  DETALHE DO DOCUMENTO         │  │
│          │ │ 🔴 #—  DC    │  Tipo: DC                     │  │
│          │ │ J.Silva     │  Cliente: J.Silva             │  │
│          │ │ R$1.250 →#4471  Carga vinculada: #4471 ▾    │  │
│          │ │─────────────│  Valor: R$ 1.250,00           │  │
│          │ │ 🔴 NF-e 5526│  Nº volumes declarados: [ 15 ]│  │
│          │ │ Comercial X │  ┌─────────────────────────┐  │  │
│          │ │ R$8.900     │  │ Etiquetar por VOLUME (15)│  │  │
│          │ │─────────────│  │ Etiquetar por PALETE     │  │  │
│          │ │ 🟢 NF-e 5500│  └─────────────────────────┘  │  │
│          │ │ (conferida) │  [ Conferida ] [ Divergente ]│  │
│          │ └─────────────┴──────────────────────────────┘  │
└──────────┴─────────────────────────────────────────────────┘
```
**Composição:** `DataTable`/lista de **pendentes** (uploads dos clientes + lançamento manual) + painel de detalhe (`FormPanel`); ação **Etiquetar por volume** e **por palete** (gera os Volumes com `indice/total`); marcar **conferida** ou **divergente** (`StatusChip`). **Estados:** fila vazia · carregando · erro de validação de chave NF-e · sucesso. **Regras:** nº de volumes declarado aqui é o **Y** do `CounterBadge` da conferência (TMS-CONF); carga sem NF/DC conferida fica **bloqueada** para conferir (A.6). **Navegação:** Sidebar TMS › Notas → gera volumes consumidos por TMS-CONF.

---

## 11. TMS-CTRL — Controle de carga por viagem (B.11, back-office web)

- **Persona:** Operação, gerência, diretoria. **Dispositivo:** **back-office web** (desktop). **Online/Offline:** online.
- **Objetivo:** visão em tempo real do que está em cada viagem (recebidos/embarcados/entregues, valores, divergências) — base do BI de rentabilidade.

### Wireframe
```
┌────────────────────────────────────────────────────────────┐
│ [AJC] Belém ▾                       🔔  ◑sync  Dir.  ▾      │
├──────────┬─────────────────────────────────────────────────┤
│ 📦 TMS  ▾│ TMS › Controle por viagem                        │
│  •Notas  │ FilterBar: Embarcação▾  Cidade▾  Período▾  🔎    │
│  •Paletes├─────────────────────────────────────────────────┤
│  •Controle KPIStat (da viagem selecionada)                  │
│          │ ┌────────┐┌────────┐┌────────┐┌──────────────┐  │
│          │ │  124   ││  118   ││   96   ││ ⚠ 3 divergên.│  │
│          │ │recebid.││embarc. ││entregue││  abertas     │  │
│          │ └────────┘└────────┘└────────┘└──────────────┘  │
│          │ Valor declarado R$ 84.200 · cobrado R$ 79.500    │
│          ├─────────────────────────────────────────────────┤
│          │ DataTable — viagens                              │
│          │ Viagem   |Emb.   |Receb|Emb |Entr|Diverg|Status │
│          │ ─────────┼───────┼─────┼────┼────┼──────┼───────│
│          │ BEL→STM  |Cidade |124  |118 |96  |🔴 3  |em curso│
│          │ BEL→PMZ  |Anajás | 40  | 40 |40  |🟢 0  |conclu. │
│          │ BEL→BRV  |Tajapuru 22  |  0 | 0  |🟢 0  |planej. │
│          │ ──────────────────────────────────  3 de 3 ◀1▶  │
│          ├─────────────────────────────────────────────────┤
│          │ Divergências abertas (da viagem):                │
│          │ • vol +1 #4471 — "volume a mais" (gerente)       │
│          │ • 2 faltantes no 2º bipe #4480                   │
│          └─────────────────────────────────────────────────┘
└──────────┴─────────────────────────────────────────────────┘
```

### Composição
- **`KPIStat` (×4+):** recebidos · embarcados · entregues · divergências abertas; valor declarado vs. cobrado. KPIs clicáveis filtram a tabela.
- **`FilterBar`:** embarcação, cidade destino, período (Fundação §3.2).
- **`DataTable`:** por viagem — contagem por estado do volume, valores, divergências (`StatusChip`), status da viagem. Exportar CSV/PDF.
- **Painel de divergências abertas** com link para o evento/AuditTrail.

### Fluxo / Estados / Regras
- **Fluxo:** operação filtra viagem → vê o funil recebido→embarcado→entregue e as divergências → drill-down no volume (AuditTrail: quem/quando/onde/foto).
- **Estados:** vazio (sem viagens no período) · carregando (skeleton) · erro · filtro vazio.
- **Regras:** números refletem a máquina de estados do volume; **divergências abertas bloqueiam** o fechamento da carga (A.6) e aparecem em vermelho até resolução do gerente. É a base do BI por viagem/embarcação/cidade (B.11, PRD RF-9/Diretoria).
- **Navegação:** Sidebar TMS › Controle por viagem; drill-down → ficha do volume / AuditTrail.

---

## 12. Padrões transversais do módulo (valem em todas as telas de campo)

### 12.1 Offline-first (princípio 2 + A.1)
- Toda ação de campo grava **local** com `client_uuid` (idempotência: reenvio não duplica volume/evento/entrega).
- `OfflineBanner` persistente; `SyncIndicator` com contador no topo de cada app.
- **Offline nunca é vermelho** — é azul-acinzentado/informativo. Vermelho fica reservado a **divergência bloqueante** e **avaria**.
- Impressão de etiqueta e captura de foto/assinatura funcionam offline; **notificação WhatsApp/SMS é enfileirada** e disparada ao sincronizar (a tela de sucesso avisa).

### 12.2 Divergência — linguagem visual única
| Situação | Cor | Onde | Ação |
|---|---|---|---|
| Volume a **menos** (faltam) | âmbar→vermelho ao fechar | TMS-CONF, TMS-BIPE2 | continuar bipando ou justificar (gerente) |
| Volume a **mais** / não consta | vermelho bloqueante | TMS-CONF, TMS-BIPE2 | justificar+exceção ou cancelar bipe |
| Avaria | vermelho | TMS-CONF, TMS-ENT | foto + marca `divergente` |
| Faltante no 2º bipe | vermelho (lista) | TMS-BIPE2 fechar | justificar "ficou em terra" (gerente) |
- Divergência **sempre** abre exceção com quem/quando/foto e **notifica o gerente** (A.6); **bloqueia o fechamento** da carga até resolução.

### 12.3 Prova legal (princípio 6 + A.1)
- Fotos obrigatórias: por volume (TMS-CONF), 2 por lote (TMS-CONF/TMS-XDOCK), 2 na entrega (TMS-ENT). Carimbo data/hora/GPS + hash de integridade.
- Assinatura (TMS-ENT) com nome+documento do agente; recebedor avulso exige justificativa.
- Tudo alimenta o **AuditTrail** imutável (coração do antifraude — PRD §7).

### 12.4 Pendências (🔶)
- 🔶 Última milha agente→destinatário entra no sistema? (nova foto/assinatura) — B.9.
- 🔶 Modelo da **Declaração de Conteúdo** + cláusula de exclusão (Lucas) — afeta TMS-NF.
- ✅ Modelo de **prestação de contas** do gerente (B.10) recebido em 29/jun/2026 — usar `docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md` para refinar a tela.
- 🔶 Texto do **termo de aceite de veículos** (parte C) — necessário para fechar o fluxo de veículos/máquinas do MVP.
- 🔶 Regras de **preço/tamanho/trecho** no recebimento.
- 🔶 Confirmar modelo/SO do **coletor/Palm** (app nativo vs. PWA).
- 🔶 Foto na entrada da Portaria é recomendada; confirmar se vira obrigatória.
