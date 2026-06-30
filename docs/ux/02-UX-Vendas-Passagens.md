# UX 02 — Vendas / Passagens

> Herda integralmente `00-Fundacao-DesignSystem-Navegacao-Acesso.md` (tokens, shell, componentes nomeados, estados, acesso). Onde uma tela não especifica algo, vale a fundação.
>
> Este módulo é multi-dispositivo. Cada tela indica claramente onde roda:
> - **Site/App cliente** (mobile-first) — o passageiro compra sozinho
> - **PDV** (web/desktop no caixa do porto) — operador vende e despacha
> - **Totem** (quiosque no porto) — autoatendimento
> - **App Validação** (celular do bilheteiro, offline-first) — embarque
>
> **Atualização 30/jun/2026:** o FAQ 2026 foi recebido e registrado em `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`. Ele traz preços de passagem por destino/classe, formas atuais de pagamento e regras públicas de meia/isento para orientar o mock e a carga inicial do motor de preços.

## Índice de telas
| Código | Tela | Dispositivo |
|---|---|---|
| VEN-01 | Busca e compra de passagem | Site/App cliente |
| VEN-02 | Autocadastro de cliente | Site/App cliente |
| VEN-03 | PDV de passagens | PDV (caixa do porto) |
| VEN-04 | Totem de autoatendimento | Totem (quiosque) |
| VEN-05 | App de Validação (embarque) | App campo (bilheteiro) |
| VEN-06 | Gerador de cortesias | Back-office |
| VEN-07 | Gratuidades + relatório regulatório | Back-office |
| VEN-08 | Relatório de passageiros por viagem | Back-office |
| VEN-09 | Despacho de encomenda no PDV | PDV (caixa do porto) |
| VEN-10 | NPS pós-viagem | Site/App cliente |

---

## VEN-01 — Busca e compra de passagem
**Persona:** Passageiro · **Dispositivo:** site/app, **mobile-first**.
**Objetivo:** comprar uma passagem em poucos toques, com aceite do termo e QR ao final.

```
 ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
 │ AJC                ☰  │   │ ‹ Voltar    Viagens    │   │ ‹ Escolha a classe     │
 │                       │   │ BEL → STM · sáb 21/06  │   │ BEL→STM · 21/06 19h    │
 │  De  [Belém      ▾]   │   │ ───────────────────────│   │ ┌───────────────────┐ │
 │  Para[Santarém   ▾]   │   │ 19:00  Balsa 1         │   │ │ Rede        R$120 │ │
 │  Data[21/06      📅]  │   │   a partir de R$120 ›  │   │ │ rede ao relento   │›│
 │                       │   │ ───────────────────────│   │ ├───────────────────┤ │
 │   [  Buscar viagens ] │   │ 19:00  Balsa 3 (VIP)   │   │ │ Rede VIP    R$180 │ │
 │                       │   │   a partir de R$180 ›  │   │ │ c/ ar-condicionado│›│
 │  Minhas passagens ›   │   │ ───────────────────────│   │ ├───────────────────┤ │
 │  Entrar / Cadastrar › │   │ 22:30  Balsa 2 ESGOTADO│   │ │ Camarote  R$350+  │ │
 └───────────────────────┘   └───────────────────────┘   │ │ Standard / Royal  │›│
                                                          │ └───────────────────┘ │
                                                          └───────────────────────┘
```
Continuação do fluxo (passos seguintes, tela cheia mobile):
```
 ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
 │ ‹ Dados do passageiro │   │ ‹ Termo de embarque    │   │   ✓ Compra concluída   │
 │ Nome  [____________]  │   │ ┌───────────────────┐ │   │                        │
 │ CPF   [____________]  │   │ │ Regras da embarca-│ │   │     ███████████        │
 │ Whats [____________]  │   │ │ ção 🔶 (texto)    │ │   │     ██ QR CODE ██      │
 │ (logado: já preenche) │   │ │ • comandante manda│ │   │     ███████████        │
 │                       │   │ │ • áreas proibidas │ │   │                        │
 │ Classe: Rede VIP      │   │ │ • assédio = crime │ │   │ Rede VIP · Balsa 3     │
 │ Total:  R$ 180,00     │   │ └───────────────────┘ │   │ BEL→STM 21/06 19h      │
 │                       │   │ [☑] Li e aceito os    │   │ Enviado p/ WhatsApp ✓  │
 │      [ Continuar ]    │   │      termos           │   │ [Baixar] [Ver no app]  │
 │                       │   │   [ Ir para pagamento]│   │                        │
 └───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```
**Composição:** busca (origem/destino/data) → lista de viagens com **disponibilidade por classe** (`StatusChip` ESGOTADO) → seleção de classe (cards com foto e preço; camarote abre subtipos Standard/Royal) → dados do passageiro (autopreenchido se logado) → **termo de aceite** obrigatório (checkbox) → pagamento → **confirmação com QR** + envio WhatsApp/e-mail.
**Fluxo:** 6 passos, mobile-first; reserva mantida por X min durante o pagamento.
**Estados:** *Esgotado* (classe sem lotação → sugere outra/outro horário) · *Erro de pagamento* (mantém reserva, permite tentar de novo) · *Sucesso* (QR + resumo + canais de envio) · *Sessão sem login* → oferece VEN-02 ou compra como visitante.
**Regras:** sem aceite do termo (🔶 texto) não avança; não vende acima da lotação da classe (capacidade vem de Navegação); QR é token único assinado.
**Navegação:** Home → Viagens → Classe → Dados → Termo → Pagamento → Confirmação. "Minhas passagens" lista QRs ativos.

---

## VEN-02 — Autocadastro de cliente
**Persona:** Passageiro · **Dispositivo:** site/app, mobile-first.
**Objetivo:** o cliente cria a própria conta para comprar e acompanhar passagens/encomendas.

```
 ┌───────────────────────┐
 │ ‹ Criar conta          │
 │ Nome   [____________]  │
 │ CPF    [____________]  │
 │ E-mail [____________]  │
 │ Whats  [____________]  │
 │ Senha  [____________]  │
 │ [☑] Aceito os termos   │
 │     de uso e privac.   │
 │   [ Criar conta ]      │
 │ Já tenho conta ›       │
 └───────────────────────┘
```
**Composição:** `FormPanel` enxuto (nome, CPF, e-mail, WhatsApp, senha) + aceite LGPD.
**Estados:** *Erro* CPF/e-mail já cadastrado (oferece login/recuperar senha) · CPF inválido (inline) · *Sucesso* → volta ao fluxo de compra de onde veio.
**Regras:** validação de CPF e contato; LGPD obrigatória; reaproveita o mesmo cadastro de cliente do CRM/Cadastros (a conta self-service vira um Cliente).
**Navegação:** acessível de VEN-01 e do login (fundação §5.1).

---

## VEN-03 — PDV de passagens (caixa do porto)
**Persona:** Operador de caixa · **Dispositivo:** PDV web/desktop.
**Objetivo:** vender passagem presencialmente, incluindo cortesia/gratuidade, com vínculo ao caixa do operador.

```
┌ AJC · PDV  Caixa: Porto-01  ◑sync  Operador ▾ ───────────────────┐
│ Viagem: [BEL→STM · Balsa 3 · 21/06 19h ▾]   Lotação VIP 41/60     │
│ ┌─ Passageiro ───────────────┐ ┌─ Classe & tarifa ─────────────┐ │
│ │ CPF [___________] [buscar] │ │ ( ) Rede        R$120         │ │
│ │ Nome ____________________  │ │ (•) Rede VIP    R$180         │ │
│ │ (novo? cadastro rápido)    │ │ ( ) Camarote ▾  R$350         │ │
│ │                            │ │ ── Tarifa especial ──         │ │
│ │                            │ │ [ Inserir cortesia (código) ] │ │
│ │                            │ │ [ Gratuidade (idoso/PCD…)  ]  │ │
│ └────────────────────────────┘ └───────────────────────────────┘ │
│ Pagamento: (•)PIX ( )Cartão ( )Dinheiro      Total: R$ 180,00     │
│                            [ Cancelar ]   [ Vender e imprimir QR ]│
└───────────────────────────────────────────────────────────────────┘
```
**Composição:** seletor de **viagem** (contexto) com lotação visível · busca de passageiro por CPF (ou cadastro rápido) · seleção de classe/tarifa · atalhos **Cortesia** (insere código de VEN-06) e **Gratuidade** (abre tipo legal + comprovante, alimenta VEN-07) · forma de pagamento · **vender e imprimir QR**. Vínculo automático ao **caixa do operador** (Financeiro mínimo do MVP).
**Estados:** *Esgotado* na classe · *Erro de impressão* (reimprimir sem revender) · *Offline* (enfileira, imprime local) · *Sucesso* (QR impresso + resumo).
**Regras:** cortesia consome do limite da viagem (VEN-06); gratuidade exige tipo legal; venda lança no caixa; contrato não cobra na hora (faturamento mensal — Fase 2).
**Navegação:** PDV › Passagens. Compartilha contexto de viagem com VEN-09 (encomendas).

---

## VEN-04 — Totem de autoatendimento
**Persona:** Passageiro · **Dispositivo:** Totem (quiosque), modo quiosque da fundação §6.
**Objetivo:** o passageiro compra sozinho no porto, com fluxo curto e toque grande.

```
┌──────────────────── TOTEM AJC ────────────────────┐
│                                                    │
│        Para onde você vai hoje?                    │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│   │ SANTARÉM │ │  BREVES  │ │  GURUPÁ  │  …mais ›  │
│   └──────────┘ └──────────┘ └──────────┘          │
│                                                    │
│   Próxima viagem: hoje 19:00 · Balsa 3            │
│   ┌──────────────┐ ┌──────────────┐               │
│   │ REDE  R$120  │ │ REDE VIP 180 │               │
│   └──────────────┘ └──────────────┘               │
│                                                    │
│            [ PIX ]      [ Cartão ]                 │
│        Retire seu QR impresso abaixo ↓             │
└────────────────────────────────────────────────────┘
```
**Composição:** versão simplificada de VEN-01 para toque: destino (botões grandes) → viagem → classe → pagamento (PIX/cartão) → imprime QR. Fontes grandes, alto contraste.
**Estados:** *Ocioso* (tela de atração, reinicia por timeout) · *Em uso* · *Erro de hardware* (impressora/leitor → "fora de serviço" + orienta ir ao caixa).
**Regras:** sem cortesia/gratuidade no totem (essas exigem operador); termo de aceite exibido antes do pagamento.
**Navegação:** auto-contido; timeout volta ao início.

---

## VEN-05 — App de Validação (embarque) ★ tela crítica
**Persona:** Bilheteiro · **Dispositivo:** celular, **offline-first**.
**Objetivo:** validar o QR e dizer ao bilheteiro, em 1 olhada, **qual cor de pulseira** colocar.

```
 SELEÇÃO              VÁLIDO (verde)        JÁ VALIDADO (verm.)   INVÁLIDO (verm.)
 ┌──────────────┐    ┌──────────────┐      ┌──────────────┐     ┌──────────────┐
 │ Validação    │    │ ████ VÁLIDO ██│      │ █ JÁ USADO ███│     │ █ INVÁLIDO ███│
 │ ◑ offline    │    │              │      │              │     │              │
 │ Viagem:      │    │  PULSEIRA:   │      │ 1ª validação:│     │ QR não é     │
 │ Balsa 3 ▾    │    │  ┌────────┐  │      │ 19:12 por    │     │ desta viagem │
 │ embarcados   │    │  │ AZUL   │  │      │ Bilh. João   │     │              │
 │  41 / 60 VIP │    │  └────────┘  │      │              │     │ [ Buscar     │
 │              │    │ REDE VIP     │      │ NÃO embarcar │     │   por nome ] │
 │ ┌──────────┐ │    │ Maria Souza  │      │              │     │              │
 │ │  ESCANEAR│ │    │              │      │ [ Voltar a   │     │ [ Voltar a   │
 │ │   QR  ▣  │ │    │ [ Confirmar  │      │   escanear ] │     │   escanear ] │
 │ └──────────┘ │    │   embarque ] │      └──────────────┘     └──────────────┘
 │ Buscar nome ›│    └──────────────┘
 └──────────────┘
```
**Composição:** seleção de **viagem** (baixa a lista para validar offline) + `CounterBadge` "embarcados X/Y" por classe → `ScanButton` gigante → `ScanResultFullScreen` colorido: **VÁLIDO** (verde, com a **cor da pulseira em destaque** + classe + nome), **JÁ VALIDADO** (vermelho, hora/bilheteiro da 1ª leitura), **INVÁLIDO/outra viagem** (vermelho, motivo). Fallback **buscar por nome/CPF** se o QR estiver ilegível.
**Fluxo:** seleciona viagem → escaneia → lê resultado → confirma embarque (marca `usado`).
**Estados:** *Offline* (valida na lista local; `OfflineBanner` azul, não vermelho) · *Sincronizando* · *Erro de câmera* (usa busca manual).
**Regras:** um QR valida uma única vez por viagem; reuso bloqueia e mostra a 1ª validação; cor de pulseira vem da classe (🔶 cores a definir, ancoradas na embarcação — ver Navegação-core).
**Navegação:** app mono-função; volta sempre ao scanner.

---

## VEN-06 — Gerador de cortesias
**Persona:** Comercial/diretoria · **Dispositivo:** back-office.
**Objetivo:** emitir cortesias com controle de limite e contagem por viagem.

```
┌ Vendas › Cortesias ─────────────────────────────────────┐
│ Viagem [BEL→STM · 21/06 ▾]   Emitidas: 3 / limite 10     │
│ ┌─ Nova cortesia ───────────────────────────────────┐   │
│ │ Beneficiário [__________]  Classe [Rede VIP ▾]     │   │
│ │ Motivo [Influência/relacionamento ____________]    │   │
│ │ Concedido por: (usuário logado)   [ Gerar código ] │   │
│ └────────────────────────────────────────────────────┘   │
│ Código       Beneficiário  Classe   Motivo     Status    │
│ CRT-9F2A     Gov. estadual VIP      Influência ●Não usada │
│ CRT-3B8C     Imprensa      Rede     Influência ●Usada     │
└──────────────────────────────────────────────────────────┘
```
**Composição:** seletor de viagem + **contador emitidas/limite** + form de nova cortesia (beneficiário, classe, motivo, quem concedeu) → **gera código** + `DataTable` de cortesias com status (usada/não usada).
**Estados:** *Limite atingido* (bloqueia nova emissão, exige aumentar limite com permissão) · sucesso (código gerado, pode enviar).
**Regras:** limite por viagem configurável; toda cortesia registra quem concedeu (auditoria); código é validado no embarque (VEN-05) e/ou inserido no PDV (VEN-03).
**Navegação:** Vendas › Cortesias.

---

## VEN-07 — Gratuidades + relatório regulatório ★ conformidade
**Persona:** PDV/atendimento + administração · **Dispositivo:** back-office (registro também no PDV).
**Objetivo:** registrar gratuidades legais e emitir, em segundos, a relação exigida por MP/órgãos.

```
┌ Vendas › Gratuidades ───────────────────────────────────┐
│ Período [01/06–21/06 ▾] Cidade ▾ Viagem ▾ Tipo ▾  [⤓ Exportar]│
│ ┌─KPIStat─┐ ┌─KPIStat─┐ ┌─KPIStat─┐                       │
│ │ Idoso 84│ │ PCD  31 │ │ Outros 7│   Total: 122          │
│ └─────────┘ └─────────┘ └─────────┘                       │
│ Passageiro    Tipo legal  Documento  Viagem      Data     │
│ José Lima     Idoso       RG ****    Balsa1 12/06 12/06    │
│ Ana P.        PCD         Laudo ✓    Balsa3 14/06 14/06    │
└──────────────────────────────────────────────────────────┘
```
**Composição:** `FilterBar` (período, cidade, viagem, tipo legal) + `KPIStat` por tipo + `DataTable` (passageiro, tipo legal, documento comprobatório, viagem, data) + **Exportar** (PDF/CSV).
**Estados:** vazio · filtro sem resultado · *Sucesso de exportação* "Relatório gerado (PDF)".
**Regras:** atende a meta do PRD (relatório em < 1 min); documento comprobatório opcional anexável; registro também pode nascer no PDV (VEN-03).
**Navegação:** Vendas › Gratuidades.

---

## VEN-08 — Relatório de passageiros por viagem
**Persona:** Operação/gerência · **Dispositivo:** back-office.
**Objetivo:** lista oficial de quem está/esteve em cada viagem, por classe e tipo de tarifa.

```
┌ Vendas › Passageiros por viagem ────────────────────────┐
│ Viagem [BEL→STM · Balsa3 · 21/06 ▾]            [⤓ Export] │
│ Totais: Rede 80 · VIP 52 · Camarote 12 · Cortesia 3 ·    │
│         Gratuidade 9 · Contrato 4        Embarcados 138   │
│ Nome           Classe   Assento/Subtipo Tarifa   Embarq. │
│ Maria Souza    Rede VIP —               Paga     ✓ 19:12 │
│ Gov. estadual  Rede VIP —               Cortesia ✓ 19:20 │
│ José Lima      Rede     —               Gratuid. — não   │
└──────────────────────────────────────────────────────────┘
```
**Composição:** seletor de viagem + totais por classe e por tipo de tarifa + `DataTable` (nome, classe, subtipo/assento, tipo de tarifa, status de embarque com hora). Exportável.
**Estados:** vazio (viagem sem vendas) · em curso (atualiza com a validação do VEN-05) · concluída.
**Regras:** cruza vendas (VEN-01/03/04) com validações (VEN-05); base para conferência de embarque e BI.
**Navegação:** Vendas › Passageiros. Também acessível pelo painel operacional da viagem (Navegação-core).

---

## VEN-09 — Despacho de encomenda no PDV (caixa do porto)
**Persona:** Operador de caixa (com **balança**) · **Dispositivo:** PDV web/desktop.
**Objetivo:** despachar encomenda rápido — CPF, cidade, tamanho/peso → preço → declaração → etiqueta.

```
┌ AJC · PDV  Caixa: Encomenda-01  ◑sync  Operador ▾ ───────────────┐
│ Viagem [BEL→STM · 21/06 ▾]                                        │
│ ┌─ Remetente ──────────┐ ┌─ Destinatário ───────┐               │
│ │ CPF [_______][buscar]│ │ CPF [_______][buscar] │               │
│ │ Nome _______________ │ │ Nome ________________ │               │
│ └──────────────────────┘ └───────────────────────┘               │
│ Cidade destino [STM ▾]   Quem paga (•)Rem ( )Dest                │
│ ┌─ Dimensão ───────────────────────────────────────────────┐    │
│ │ Tamanho ( )P ≤10kg ( )M ≤20kg ( )G ≤30kg   Balança: 8,4kg │    │
│ │ Valor declarado R$ [______]                               │    │
│ │ Preço: 🔶 (manual no MVP — tabela pendente)   R$ [_____]  │    │
│ └───────────────────────────────────────────────────────────┘    │
│ [ Declaração de conteúdo ]            [ Despachar + etiqueta ]    │
└───────────────────────────────────────────────────────────────────┘
```
**Composição:** seletor de viagem · remetente/destinatário por CPF (cadastro rápido) · cidade destino · quem paga · **dimensão** (tamanho P/M/G **ou** leitura da balança) · valor declarado · **preço** · botão **Declaração de conteúdo** (abre a tela do módulo Encomendas — assinatura em tela) · **Despachar + imprimir etiqueta** (gera volumes e dispara etiqueta do TMS).
**Estados:** *Acima de R$ 1.000* → destaque "cobrança por percentual" (quando a tabela existir) · *Peso > tamanho* sugere tamanho maior · *Offline* (enfileira, imprime local) · *Sucesso* (etiqueta impressa, lança no caixa).
**Regras (MVP):** 🔶 **tabela de preço pendente (Lucas)** → no MVP o preço é **manual/cotação**; o motor automático liga na Fase 2. Declaração de conteúdo é **obrigatória** (risco jurídico) e detalhada no módulo Encomendas. Integra TMS (volumes/etiqueta/UUID) e o caixa.
**Navegação:** PDV › Encomendas. Compartilha contexto de viagem com VEN-03.

---

## VEN-10 — NPS pós-viagem
**Persona:** Passageiro · **Dispositivo:** site/app (disparo por WhatsApp/e-mail).
**Objetivo:** medir satisfação logo após a viagem.

```
 ┌───────────────────────┐
 │ Como foi sua viagem?   │
 │ BEL→STM · 21/06        │
 │ De 0 a 10, recomenda?  │
 │ 0 1 2 3 4 5 6 7 8 9 10 │
 │         ● (8)          │
 │ Comentário (opcional)  │
 │ [____________________] │
 │     [ Enviar ]         │
 └───────────────────────┘
```
**Composição:** pergunta NPS (0–10) + comentário aberto. No MVP é só a **captura**; o painel analítico é Fase 3 (ver ROADMAP).
**Estados:** *Sucesso* "Obrigado!" · já respondido (não duplica).
**Regras:** 1 resposta por passageiro/viagem; disparo após a conclusão da viagem.
**Navegação:** link único enviado por WhatsApp/e-mail.

---

## Dependências e pendências do módulo
- **Consome:** Navegação-core (viagens, lotação, classes/cores por embarcação), Cadastros (preços de passagem; cliente), Financeiro mínimo (caixa).
- **Alimenta:** TMS (despacho → volumes/etiqueta), Relatório de passageiros, conformidade regulatória (MP).
- 🔶 Texto do **termo de aceite de embarque** (AJC); **cores de pulseira** por classe; **gateway de pagamento** e meios por canal; **tabela de preço de encomenda** (Lucas) — afeta VEN-09; provedor de **WhatsApp/SMS/e-mail** para QR e NPS. Preços de passagem têm fonte inicial no FAQ 2026, com validação residual antes do backend definitivo.
