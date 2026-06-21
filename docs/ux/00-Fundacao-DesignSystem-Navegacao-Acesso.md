# UX 00 — Fundação: Design System, Shell de Navegação e Acesso

> Documento-base de UX do MVP. Define a linguagem visual, os padrões de interação, o shell de navegação e o fluxo de acesso/setup. **Todos os demais documentos de UX (TMS, Vendas, CRM, Cadastros, Navegação) herdam estas regras.** Quando uma tela de módulo não especifica um comportamento, vale o que está aqui.

---

## 0. Princípios de UX (os 7 mandamentos do produto)

1. **Operação em pé, com pressa, no sol.** As telas de campo (conferente, bilheteiro, portaria, entrega) são usadas em movimento, muitas vezes ao ar livre. Alvos de toque grandes (mín. 48×48 dp), alto contraste, texto grande, decisão em 1 olhada. Nada de formulário denso no campo.
2. **Offline é estado normal, não erro.** Internet cai no porto e na balsa. O app nunca trava por falta de rede: grava local, mostra "pendente de sincronizar" e segue. A cor de "offline" é informativa (azul/cinza), nunca alarmante (vermelho).
3. **Toda ação crítica deixa rastro visível.** Quem fez, quando, onde. O usuário vê o próprio rastro (ex.: "você conferiu 12 volumes às 14h32") — transparência gera confiança e inibe fraude.
4. **O número que importa fica gigante.** Contadores de conferência ("12/15"), saldo de caixa, status de viagem. O dado de decisão é o maior elemento da tela.
5. **Erro previne, não pune.** Validação inline antes de submeter. Se o peso excede o tamanho da caixa, o sistema sugere o tamanho certo — não só recusa.
6. **Foto e assinatura são prova legal, tratadas como tal.** Fluxo de captura é obrigatório, guiado (mostra o ângulo esperado) e não pulável onde a regra exige.
7. **Consistência > criatividade.** Mesma ação, mesmo lugar, mesmo nome em todo o sistema. Um operador que aprende o PDV entende o despacho de encomenda sem retreino.

---

## 1. Dois ambientes, uma linguagem

O produto tem **dois perfis de cliente** com necessidades visuais distintas, mas compartilham tokens (cores, tipografia, ícones):

| Ambiente | Quem usa | Dispositivo | Densidade |
|---|---|---|---|
| **Back-office (Console web)** | Admin, financeiro, comercial, price, operação, diretoria | Desktop, telas grandes | Densa: tabelas, filtros, multitarefa |
| **Apps de campo** | Conferente, bilheteiro, porteiro, entregador, agente | Celular / coletor / totem | Esparsa: 1 tarefa por tela, toque grande |

> Regra: o **mesmo conceito** (ex.: "viagem", "carga", "status") usa o **mesmo rótulo, ícone e cor** nos dois ambientes.

---

## 2. Design tokens

### 2.1 Cores semânticas
| Token | Uso | Sugestão |
|---|---|---|
| `brand` | Identidade AJC, ações primárias | Azul-marinho (rio/navegação) — definir hex com a marca |
| `brand-accent` | Destaques, links | Azul-claro |
| `success` | Válido, no prazo, conferido, pago | Verde |
| `warning` | Atenção, vence essa semana, divergência leve | Âmbar |
| `danger` | Inválido, atrasado, vencido, divergência bloqueante | Vermelho |
| `info / offline` | Pendente de sincronizar, informativo | Azul-acinzentado |
| `neutral-0..900` | Fundos, textos, bordas | Escala de cinzas |

> **Status de viagem** usa o trio padrão: `success` (no prazo) · `warning` (atenção) · `danger` (atrasado). Esse trio se repete em todo o sistema para qualquer "saúde" de processo.

### 2.2 Tipografia
- Família única, alta legibilidade (ex.: Inter / system-ui).
- Escala: Display (números de decisão) · H1/H2/H3 · Corpo · Caption.
- **Campo:** tamanho mínimo de corpo maior que o back-office (telas ao sol).

### 2.3 Espaçamento e raio
- Grid base 4px (campo usa múltiplos maiores: 8/12/16).
- Raio suave (8px) para cards/botões; pílulas para chips de status.

### 2.4 Ícones
- Set único (ex.: Lucide/Phosphor). Cada entidade tem ícone fixo: viagem (barco), carga (caixa), passagem (ticket/QR), cliente (pessoa), agente (crachá), caixa (cifrão), palete (palete).

---

## 3. Componentes compartilhados (biblioteca)

> Estes são os blocos reutilizados em todos os módulos. Cada doc de módulo referencia por nome.

### 3.1 Estados universais de tela
Todo conteúdo dinâmico tem 5+1 estados padronizados (sempre desenhados):
- **Vazio** — ilustração leve + 1 frase + ação primária ("Nenhuma viagem aberta. Criar viagem").
- **Carregando** — skeleton (não spinner solto) que imita o layout final.
- **Erro** — mensagem humana + causa + ação ("Tentar de novo"). Nunca código cru.
- **Sucesso** — confirmação clara; em fluxo de campo, tela cheia verde com o próximo passo.
- **Parcial / com filtro vazio** — "Nenhum resultado para estes filtros. Limpar filtros".
- **Offline** (apps de campo) — banner persistente "Sem conexão — X itens aguardando envio".

### 3.2 Componentes de back-office
- **DataTable**: colunas ordenáveis, busca, filtros salvos, paginação, ação em lote, exportar (CSV/PDF), densidade ajustável.
- **FilterBar**: período (hoje/semana/mês/intervalo), e filtros por entidade. Persistente por usuário.
- **DetailDrawer / DetailPage**: ficha 360º com abas.
- **FormPanel**: validação inline, salvar/cancelar fixos no rodapé, aviso de alterações não salvas.
- **StatusChip**: pílula colorida (success/warning/danger/info).
- **KPIStat**: número grande + label + variação.
- **AuditTrail**: linha do tempo de eventos (quem/quando/onde/foto).
- **BulkAdjustDialog**: para reajuste de preços ± X% (com pré-visualização do impacto).

### 3.3 Componentes de campo (mobile/coletor)
- **ScanButton**: botão gigante de leitura de QR/código, ocupa boa parte da tela.
- **ScanResultFullScreen**: resultado em tela cheia, cor semântica dominante, 1 informação central (ex.: cor da pulseira, "VÁLIDO", "12/15").
- **CounterBadge**: "Conferidos 12 / 15" sempre visível e grande.
- **PhotoCaptureGuided**: captura com moldura/ângulo sugerido, contador de fotos obrigatórias, miniatura do que já foi tirado.
- **SignaturePad**: assinatura em tela, com nome+documento acima.
- **SyncIndicator**: ícone+contador de itens na fila de sincronização; toque mostra a fila.
- **OfflineBanner**: barra persistente quando sem rede.
- **BigSelectList**: seleção de viagem/carga com itens grandes e busca.

### 3.4 Padrões transversais
- **Notificação WhatsApp/SMS**: sempre que um evento dispara mensagem (entrega, escala, NPS), a tela mostra "Notificação enviada a X" no sucesso.
- **Confirmação destrutiva**: ações irreversíveis exigem confirmação explícita nomeando o objeto.
- **Carimbo de prova**: fotos exibem data/hora/GPS sobrepostos.

---

## 4. Shell de navegação

### 4.1 Back-office (Console web)
```
┌────────────────────────────────────────────────────────────┐
│ [AJC]  Belém ▾ (contexto)            🔔   ◑sync   Usuário ▾ │  ← Topbar
├──────────┬─────────────────────────────────────────────────┤
│ Sidebar  │  Breadcrumb                                       │
│          │  ┌───────────────────────────────────────────┐   │
│ ◉ Início │  │  Conteúdo do módulo                        │   │
│ ⛴ Naveg. │  │  (DataTable / Detail / Form / Dashboard)   │   │
│ 📦 TMS   │  │                                           │   │
│ 🎫 Vendas│  └───────────────────────────────────────────┘   │
│ 👥 CRM   │                                                   │
│ ⚙ Cadast.│                                                   │
└──────────┴─────────────────────────────────────────────────┘
```
- **Sidebar** agrupada por domínio; respeita RBAC (usuário só vê o que tem permissão).
- **Seletor de contexto** no topo (ex.: embarcação/cidade ativa) quando faz sentido para o módulo.
- **Indicador de sync** global + central de notificações.
- **Busca global** (Cmd/Ctrl+K) por cliente, viagem, carga, bilhete.

### 4.2 Apps de campo
- **Sem sidebar.** Cada app é mono-função, abre direto na tarefa.
- **Home do app** = seleção de viagem (contexto) → lista de ações grandes.
- **Topo fino**: nome do app + usuário + SyncIndicator.
- **Rodapé**: ação primária fixa e grande.
- Navegação por "voltar" simples; profundidade máxima rasa (2–3 níveis).

### 4.3 Mapa de apps (1 propósito cada)
| App | Persona | Função única |
|---|---|---|
| **Console** (web) | Back-office | Gestão completa por módulo (RBAC) |
| **App Conferente** | Conferente porto/balsa | Receber, conferir, etiquetar, 2º bipe, cross-docking, entrega |
| **App Validação** | Bilheteiro | Ler QR e indicar pulseira no embarque |
| **App Portaria** | Porteiro | Entrada/saída de veículos no porto |
| **App Agente** | Agente da cidade | Captação, cotação, receber carga na cidade |
| **PDV / Totem** | Caixa / autoatendimento | Vender passagem e despachar encomenda |

---

## 5. Fluxo de Acesso e Setup inicial

### 5.1 Login
**Tela:** logo AJC, campo usuário/e-mail, senha, "entrar", "esqueci a senha".
- Suporta login por e-mail ou usuário.
- **Apps de campo**: login com sessão longa (operador não quer logar toda hora) + PIN rápido para retomar. Permite **login offline** se já autenticou antes no dispositivo (credencial em cache seguro).
- Estados: erro de credencial (sem dizer qual campo, por segurança), conta inativa, sem rede (campo: usa cache).

### 5.2 Recuperação de senha
- Por e-mail/SMS (link ou código). Fluxo: solicitar → código → nova senha. Mensagens neutras (não revela se o e-mail existe).

### 5.3 Seleção de contexto pós-login
- Usuário com acesso a mais de uma embarcação/cidade escolhe o contexto (ou já entra no padrão).
- Apps de campo: escolher a **viagem** ativa é o primeiro passo (define o que será bipado/validado).

### 5.4 Onboarding / Setup inicial (primeira vez do sistema)
Assistente passo a passo (wizard) para o administrador, executado uma vez:
1. **Dados da empresa** (AJC) — razão social, CNPJ, logo, cidades atendidas (pré-carrega as 8 siglas).
2. **Primeiro administrador** — cria a conta-mestre.
3. **Embarcações** — cadastra as 3 ativas (nome, tipo, capacidades). *(Navegação-core)*
4. **Perfis e usuários** — cria perfis (admin, financeiro, comercial, price, conferente, bilheteiro, porteiro, agente, gerente) e convida usuários.
5. **Preços** — carrega tabelas de passagem/carga (encomenda fica pendente 🔶) ou marca "configurar depois".
6. **Primeira viagem** — abre uma viagem de teste para validar o fluxo ponta a ponta.
- Cada passo é pulável e retomável; barra de progresso; "concluir depois".
- Estado final: checklist de prontidão ("Sistema pronto para operar").

### 5.5 Perfis e permissões (RBAC) — comportamento de UX
- Itens de menu e ações **escondidos** (não só desabilitados) quando sem permissão, exceto quando educar o usuário agrega (aí desabilita com tooltip "requer perfil X").
- Tela de gestão de perfis: matriz **perfil × módulo × ação** (ver/criar/editar/excluir/aprovar), com presets por função.

---

## 6. Acessibilidade e responsividade
- Contraste mínimo AA; alvos de toque ≥ 48dp no campo.
- Suporte a fonte aumentada do SO sem quebrar layout.
- Totem: modo quiosque, fontes grandes, alto contraste, fluxo curto, timeout que reinicia para a tela de atração.
- Console: responsivo até tablet; abaixo disso, redireciona para o app adequado.
- Idioma: PT-BR. Termos do negócio preservados (rede, camarote, palete, balsa).

---

## 7. Glossário de UX
- **Shell**: moldura persistente (topbar + sidebar/rodapé) onde o conteúdo do módulo é renderizado.
- **Contexto**: embarcação/cidade/viagem ativa que filtra o que se vê.
- **Estado de tela**: vazio/carregando/erro/sucesso/offline — sempre desenhados.
- **Fila de sincronização**: itens gravados offline aguardando envio.
- **Prova**: foto+assinatura+carimbo que sustenta juridicamente um evento.
