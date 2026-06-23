# Módulo Vendas / Passagens — SPEC + Detalhamento de Telas

> Canais: **Site, App, PDV (porto), Totem**. Núcleo: venda de passagem com **QR Code**, validação no embarque por **pulseira por classe**, e controle regulatório de **gratuidades/cortesias**. Inclui também a venda de despacho de encomendas no PDV (precificação detalhada no módulo Encomendas).
>
> **Escopo MVP:** o **portal público de venda online com pagamento integrado** faz parte do MVP (Fase 1) — detalhamento na **Parte C**. Emissão fiscal do bilhete (BP-e) é dependência em aberto (🔶 confirmar com Lucas/contador, ver §C.7).

---

## Parte A — SPEC técnica

### A.1 Classes e tipos de tarifa

| Classe | Vendável? | Pulseira | Observação |
|---|---|---|---|
| Rede | Sim | Cor A | Padrão, ao relento |
| Rede VIP | Sim | Cor B | Rede em ambiente com ar-condicionado (ex.: embarcação 5) |
| Camarote | Sim | Cor C | Vários tipos (ex.: Royal = suíte). Subtipos com preços próprios |
| Cortesia | Não (gerada) | Cor D | Código gerado; limite/contagem por viagem |
| Gratuidade | Não (concedida) | Cor D | Idoso, PCD, etc. Relatório regulatório obrigatório |
| Contrato | Sim (faturada depois) | conforme classe | Consumida na viagem, faturada no fim do mês |

> A cor da pulseira é configurável por classe. O app de validação exibe a cor correta após ler o QR.

### A.2 Geração e validação de QR Code
- Cada bilhete gera um **QR único** (token assinado, não sequencial e não adivinhável), vinculado a viagem + classe + passageiro.
- **Validação no embarque (offline-first):** o app do bilheteiro valida o token localmente (lista da viagem baixada antes do embarque) e marca como **usado**. Reuso → bloqueio "QR já validado". Sincroniza quando houver rede.
- Estados do bilhete: `emitido → validado(embarcado) → usado`. Também: `cancelado`, `reembolsado`.
- **Anti-fraude:** um QR só pode ser validado uma vez por viagem; tentativa duplicada mostra hora/local da 1ª validação.

### A.3 Tipos de venda
- **Online (site/app):** cliente autocadastrado, paga, recebe QR (e-mail/app/WhatsApp). Aceite do termo de embarque obrigatório.
- **PDV (porto):** operador de caixa vende presencialmente; pode imprimir QR.
- **Totem:** autoatendimento no porto.
- **Contrato:** vendida/consumida sem pagamento imediato; entra no faturamento mensal do cliente corporativo.
- **Cortesia/Gratuidade:** não passam por pagamento; exigem registro de motivo/tipo e entram nos relatórios de controle.

### A.4 Capacidade e sazonalidade
- Cada viagem tem capacidade por classe (lotação). Em férias a demanda dobra — o sistema deve impedir overbooking por classe e mostrar disponibilidade em tempo real nos 4 canais.

### A.5 Entidades principais
```
Tarifa (id, classe, subtipo?, embarcacao_id?, trecho, preco, ativo)
Bilhete (id, viagem_id, cliente_id, classe, subtipo?, tarifa_id, tipo[online|pdv|totem|contrato|cortesia|gratuidade],
         qr_token, status[emitido|validado|usado|cancelado|reembolsado], preco_pago, criado_por, criado_em)
Cortesia (id, codigo, viagem_id, motivo, concedido_por, limite_viagem)
Gratuidade (id, bilhete_id, tipo_legal[idoso|pcd|...], documento_comprobatorio?)
TermoAceite (id, bilhete_id, versao_termo, aceito_em, ip/dispositivo)
NPS (id, viagem_id, cliente_id, nota, comentario, respondido_em)
```

### A.6 Integrações
- **Pagamento** (gateway) para venda online/PDV/totem.
- **WhatsApp/SMS/e-mail** para envio do QR e da pesquisa NPS.
- **Impressora** (PDV/totem) para QR.
- **Cadastro de preços** (módulo Cadastros) com reajuste em massa ± X%.

---

## Parte B — Telas

> Estados padrão: **Vazio · Carregando · Erro · Sucesso · Esgotado** (sem lotação na classe) · **Offline** (validação).

### B.1 Site/App — Busca e compra de passagem (cliente)
**Objetivo:** cliente compra passagem em poucos passos.

**Fluxo:**
1. **Busca:** origem, destino, data → lista de viagens com horários e **disponibilidade por classe**.
2. **Seleção de classe:** Rede / Rede VIP / Camarote (com subtipos e fotos, ex.: Royal). Mostra preço.
3. **Dados do passageiro:** autopreenchido se logado; senão, autocadastro.
4. **Termo de aceite de embarque:** exibido, exige marcar "Li e aceito" (🔶 texto a definir). Sem aceite, não avança.
5. **Pagamento.**
6. **Confirmação:** QR Code exibido + enviado por e-mail/WhatsApp/app.

**Estados:** *Esgotado* (classe sem lotação, sugere outra) · *Erro de pagamento* (mantém reserva por X min) · *Sucesso* (QR + resumo).

**Responsivo:** mobile-first (maioria compra pelo celular).

### B.2 Autocadastro de cliente (self-service)
- Campos: nome completo, CPF, contato (WhatsApp/e-mail), senha.
- Validação de CPF e contato.
- LGPD: aceite de termos de uso/privacidade.
- Estados: erro de CPF duplicado/ inválido; sucesso → segue para a compra.

### B.3 PDV de passagens (porto)
**Persona:** Operador de caixa.
- Busca rápida de viagem; seleção de classe; identificação do passageiro (CPF) ou venda avulsa.
- Formas de pagamento; **impressão do QR**.
- Acesso a **cortesia** (inserir código) e **gratuidade** (selecionar tipo legal + comprovante).
- Vínculo ao **caixa** do operador (integra Tesouraria/Financeiro).
- Estados: esgotado; erro de impressão (reimprimir); offline (fila).

### B.4 Totem de autoatendimento
- Versão simplificada do B.1 para toque: busca → classe → pagamento (cartão/PIX) → imprime QR.
- Acessibilidade: fontes grandes, alto contraste, fluxo curto.
- Estados: ocioso (tela de atração) · em uso · erro de hardware (impressora/leitor) → mensagem e alterna para "fora de serviço".

### B.5 App de validação do bilheteiro (embarque)
**Persona:** Bilheteiro. **Plataforma:** App mobile, **offline-first**. Substitui o papel rasgado/assinado na porta.

**Fluxo:**
1. Seleciona a **viagem** (baixa a lista de bilhetes para validar offline).
2. **Lê o QR** do passageiro.
3. Resultado em tela cheia, otimizado para decisão rápida:
   - **Válido:** verde + **cor da pulseira** a colocar (ex.: "REDE VIP — pulseira AZUL") + classe/nome.
   - **Já validado:** vermelho + hora/local da 1ª validação.
   - **Inválido/outra viagem:** vermelho + motivo.
4. Confirma embarque → marca como `usado`.

**Componentes:** leitor de QR grande; contador "Embarcados X / Capacidade Y" por classe; busca manual por nome/CPF (fallback se QR ilegível).

**Estados:** offline (valida local) · sincronizando · erro de câmera.

### B.6 Gerador de cortesias
**Persona:** Comercial/diretoria.
- Gera código de cortesia para uma viagem; define motivo (influência/relacionamento) e classe.
- **Limite e contador por viagem** (controle de quantas cortesias por viagem).
- Lista de cortesias emitidas, com quem concedeu e status (usada/não usada).

### B.7 Gratuidades — registro e relatório regulatório
**Persona:** PDV/atendimento + administração.
- Registro: tipo legal (idoso, PCD, etc.), documento comprobatório (opcional anexar).
- **Relatório dedicado por viagem/período** exportável (atende pedido de MP/órgãos em < 1 min).
- Estados: vazio · filtros por período/cidade/viagem · exportar (PDF/CSV).

### B.8 Relatório de passageiros por viagem
**Persona:** Operação/gerência.
- Lista por viagem: nome completo, classe (Rede/VIP/Camarote), subtipo/assento, tipo de tarifa (paga/cortesia/gratuidade/contrato), status de embarque.
- Totais por classe e por tipo de tarifa.
- Exportável; base para conferência de embarque e BI.

### B.9 Venda de despacho de encomendas no PDV
**Persona:** Operador de caixa (com **balança** ao lado).
- Fluxo rápido: CPF remetente → CPF destinatário → cidade destino → **tamanho (P/M/G)** ou leitura de peso da balança → **preço automático**.
- Acima de R$ 1.000 de valor declarado → cobra **percentual** sobre a nota/declaração (ver módulo Encomendas).
- Gera a carga/volumes e dispara a impressão da etiqueta (integra TMS).
- Janela suspensa para seleção rápida de cidade/tamanho.
- *Detalhe completo da precificação e da Declaração de Conteúdo: módulo Encomendas (🔶 tabela pendente — Lucas).*

### B.10 Pesquisa NPS pós-viagem
**Persona:** Cliente.
- Disparada por WhatsApp/e-mail após a viagem.
- Pergunta NPS (0–10) + comentário aberto.
- Painel de acompanhamento (média, evolução, comentários) para a gestão.

---

## Pendências deste módulo
- 🔶 Texto do **termo de aceite de embarque** (AJC revisar).
- 🔶 Tabela/mecânica de preços de **encomendas** (Lucas) — afeta B.9.
- Definição das **cores de pulseira** por classe.
- Confirmar **gateway de pagamento** e meios (PIX/cartão) por canal.
- Subtipos de **camarote** (ex.: Royal) e seus preços/atributos.
- 🔶 **Emissão fiscal do bilhete (BP-e)** — confirmar com Lucas/contador se é obrigatória no MVP e qual o caminho (SeFAZ-PA, certificado, credenciamento). Ver Parte C §C.7.

---

## Parte C — Portal Público de Venda Online (MVP)

> **Decisão de escopo:** o portal público de autoatendimento com **pagamento integrado** faz parte do **MVP (Fase 1)** — confirmado pelo cliente. Esta parte aprofunda o que B.1/B.2 introduzem, com o que é necessário para vender de verdade pela internet sem fraude nem venda dupla. Depende do **design system do UX** para as telas finais; aqui especificamos comportamento, dados e integrações.

### C.1 Objetivo e princípios
- Cliente compra passagem sozinho, paga online (cartão/PIX), recebe o QR e o comprovante.
- **Mobile-first** (a maioria compra pelo celular, muitas vezes em conexão ruim).
- **Fonte única de disponibilidade:** portal, PDV e totem leem/escrevem a MESMA lotação por classe — nunca vender o mesmo assento/vaga duas vezes.
- O portal é um **canal do mesmo backend** (não um sistema à parte): reusa tarifa, viagem, bilhete, cliente, termo de aceite.

### C.2 Fluxo de compra (feliz)
1. **Busca:** origem, destino, data → viagens com horário e **disponibilidade por classe em tempo real**.
2. **Seleção de classe/assento:** Rede / Rede VIP / Camarote (subtipos com foto/preço). Onde houver assento/vaga marcada, escolhe; senão, conta por lotação da classe.
3. **Reserva temporária:** ao avançar, o sistema **segura a vaga por N minutos** (TTL, ex.: 10 min) para o cliente concluir o pagamento (ver C.4).
4. **Identificação:** logado → autopreenche; senão → autocadastro (C.6) ou compra como visitante com cadastro mínimo.
5. **Termo de aceite de embarque:** obrigatório marcar "Li e aceito" (🔶 texto). Versão do termo + data/IP/dispositivo gravados (`TermoAceite`).
6. **Pagamento:** cartão ou PIX via gateway (C.5).
7. **Confirmação:** QR exibido na hora + enviado por e-mail/WhatsApp/área do cliente; comprovante; (se aplicável) documento fiscal (C.7).

### C.3 Estados do pedido (máquina de estados)
Separamos **Pedido (compra)** do **Bilhete (resultado)** porque um pedido pode falhar no pagamento sem gerar bilhete.

```
Pedido: iniciado → reservado(vaga segura, TTL) → aguardando_pagamento
        → pago → emitido(gera Bilhete[s])           (caminho feliz)
        → expirado            (TTL estourou antes de pagar → libera vaga)
        → falha_pagamento     (recusado → mantém reserva enquanto houver TTL; permite retry)
        → cancelado           (cliente desiste / antifraude)
Bilhete (após emitido): emitido → validado(embarcado) → usado | cancelado | reembolsado
```

- **Expiração:** job que varre reservas com TTL vencido e devolve a vaga ao estoque da classe.
- **Idempotência:** o retorno do gateway (webhook) é idempotente — reprocessar o mesmo evento não emite bilhete em dobro.

### C.4 Reserva de vaga e concorrência (ponto crítico de engenharia)
- A lotação por classe é recurso disputado entre 4 canais simultâneos. Em alta temporada a demanda dobra.
- **Mecanismo:** decremento de disponibilidade sob transação no Postgres (lock de linha do "estoque da viagem/classe" ou contador com verificação atômica), garantindo que duas compras concorrentes nunca ultrapassem a capacidade.
- Reserva gera registro com `expira_em`; só vira venda firme quando o pagamento confirma. Assento nominal (camarote) usa trava por assento; classe sem assento (rede) usa contador de vagas.
- **Sem overbooking** é requisito duro (PRD A.4). Esta lógica entra no backend (módulo `vendas`/`caixa` + `navegacao` para capacidade).

### C.5 Pagamento (gateway) — integração externa
- Suporte a **cartão de crédito** e **PIX** no mínimo.
- Fluxo assíncrono baseado em **webhook**: o backend cria a cobrança, o cliente paga, o gateway notifica; só então o pedido vai a `pago → emitido`.
- **Reconciliação:** todo pagamento referencia o pedido; valores conferidos contra a tarifa no momento da reserva (evita manipulação de preço no cliente).
- **A decidir (spike):** fornecedor (ex.: Mercado Pago, Pagar.me, Stripe, PagBank), taxas, prazos de repasse, exigências de cadastro (CNPJ da AJC). **Não construir o portal sem fechar o fornecedor.**

### C.6 Conta e área do cliente
- **Autocadastro (B.2):** nome, CPF, contato (WhatsApp/e-mail), senha; validação de CPF e contato; aceite LGPD.
- **Área "Minhas viagens":** bilhetes ativos e passados, **reenvio do QR**, status de embarque, comprovantes, 2ª via.
- **Recuperação de senha** e **recuperação de bilhete** por e-mail/WhatsApp (cliente perde o e-mail com frequência).

### C.7 Emissão fiscal do bilhete — 🔶 dependência em aberto
- Passagem hidroviária normalmente exige documento fiscal próprio (**BP-e — Bilhete de Passagem eletrônico**), com transmissão à SEFAZ, possível **certificado digital** e **credenciamento**.
- **Status:** a confirmar com **Lucas/contador** — se o BP-e é obrigatório já no MVP, qual o modelo atual da AJC, e se há API/fornecedor.
- **Arquitetura preparada:** o ponto de emissão fiscal é um **passo plugável** após `pago` (antes ou junto de `emitido`). Se a confirmação atrasar, o portal pode entregar o **QR de embarque** no MVP e a emissão fiscal pluga depois sem retrabalho do fluxo.

### C.8 Antifraude e segurança (mínimos do MVP)
- O **portal é endpoint público na internet** — exige cuidados que os canais internos não exigem:
  - QR como **token assinado, não sequencial** (já previsto em A.2).
  - Preço validado no servidor (nunca confiar em valor vindo do cliente).
  - Rate limiting e proteção contra abuso nos endpoints de busca/checkout.
  - Pagamento confirmado **só** por webhook server-to-server (não pela tela de "sucesso" do cliente).
  - Autenticação da área do cliente separada da dos operadores internos (perfis distintos).
- **Nota de segurança:** este canal entra na internet pública; auth, rate limiting e validação server-side são obrigatórios desde o primeiro deploy — não deixar para depois.

### C.9 Telas do portal (a vestir com o design system do UX)
1. Home/busca · 2. Resultados (viagens + disponibilidade) · 3. Seleção classe/assento · 4. Login/autocadastro · 5. Termo de aceite · 6. Checkout/pagamento (cartão/PIX) · 7. Confirmação (QR + comprovante) · 8. Área do cliente "Minhas viagens" · 9. Recuperação de senha/bilhete.
> Estados por tela: Vazio · Carregando · Erro · Esgotado · Reserva expirada · Falha de pagamento · Sucesso.

### C.10 Impacto no modelo de dados (a refletir na Fase 0)
- Novas entidades/ajustes: **Pedido** (compra com estados de C.3), **Reserva** (vaga + `expira_em`), **Pagamento** (referência ao gateway, status, valor, webhook), **ContaCliente/credenciais** (login do portal), e o gancho de **DocumentoFiscal** (C.7, opcional no MVP conforme confirmação).
- A capacidade por viagem/classe precisa de representação que suporte decremento atômico (C.4).
