# Módulo Vendas / Passagens — SPEC + Detalhamento de Telas

> Canais: **Site, App, PDV (porto), Totem**. Núcleo: venda de passagem com **QR Code**, validação no embarque por **pulseira por classe**, e controle regulatório de **gratuidades/cortesias**. Inclui também a venda de despacho de encomendas no PDV (precificação detalhada no módulo Encomendas).

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
