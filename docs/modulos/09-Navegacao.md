# Módulo Navegação — SPEC + Detalhamento de Telas

> Operação das embarcações. Núcleo: **cadastro/cronograma das embarcações**, **rastreamento em tempo real**, **status de viagem** (no prazo / atenção / atrasado) e **escala de colaboradores com notificação via WhatsApp**. Base para o BI de rentabilidade por viagem/embarcação/cidade.

---

## Parte A — SPEC técnica

### A.1 Frota
- 7 barcos no total (6 passeio+carga, 1 só carga). 3 ativos hoje; 1 em manutenção; 2 alugados.
- Modelar status da embarcação: ativa / manutenção / alugada.
- Quanto mais embarcações cadastradas, mais inteligência por barco (passagem, carga, tipo de precificação, cidade mais rentável).

### A.2 Viagem e cronograma
- Cada viagem: embarcação, origem, **dia/hora de saída**, escalas com **dia/hora previstos de chegada por cidade**, e **dia/hora de retorno**.
- O FAQ 2026 recebido em 30/jun/2026 é a referência operacional inicial para templates de rota/paradas: Belém ↔ Almeirim e Belém ↔ Santarém, com variações por dia/embarcação. Ver `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`.
- Status calculado comparando previsto × posição real (rastreamento): **no prazo / atenção / atrasado**.
- Horários precisam continuar configuráveis/versionáveis: o FAQ informa "horários sujeitos a alteração" e contém divergências internas a validar antes do backend definitivo.

### A.3 Rastreamento
- Posição em tempo real da embarcação (fonte: GPS próprio ou AIS — 🔶 a definir).
- Mapa com as embarcações e o cumprimento do cronograma.

### A.4 Entidades
```
Embarcacao (id, nome, tipo[passeio_carga|carga], capacidade_pax_por_classe{}, capacidade_carga, status)
Viagem (id, embarcacao_id, origem, data_hora_saida, data_hora_retorno, status[planejada|em_curso|concluida],
        situacao[no_prazo|atencao|atrasado])
  └─ ViagemEscala (viagem_id, cidade_sigla, data_hora_prevista, data_hora_real?, ordem)
PosicaoEmbarcacao (embarcacao_id, lat, lng, timestamp, velocidade)
Escala (colaborador_id, viagem_id, funcao, status, notificado_em)
```

### A.5 Relações
- **Vendas:** capacidade por classe alimenta disponibilidade de passagem.
- **TMS/Encomendas/Veículos:** tudo é vinculado à viagem.
- **Cadastros:** colaboradores e embarcações.
- **Financeiro/BI:** rentabilidade por viagem.

---

## Parte B — Telas

> Estados padrão: **Vazio · Carregando · Erro · Sucesso**.

### B.1 Cadastro / lista de embarcações
- Lista: nome, tipo, capacidade, **status** (ativa/manutenção/alugada).
- Cadastro: dados, capacidade por classe e capacidade de carga.
- Lista inicial recebida do Lucas em 30/jun/2026: F/B Amazonas II, F/B Amazonas III, F/B Amazonas IV, F/B Amazonas V, F/B Amazonas VI e F/B Paru (cargas).
- Classes por embarcação recebidas: Rede, Rede Sala VIP, Camarote, Suíte Comum, Suíte Comum VIP, Suíte Master, Suíte Master VIP e Mega Suíte. Matriz detalhada em `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md`.
- *Estados:* embarcação em manutenção não recebe viagem.

### B.2 Cronograma de viagens
- Criação de viagem: número/código automático, FerryBoat, data/hora de saída, origem, **paradas/escalas (cidade + data/hora)**, número de passageiros em redes e camarotes disponíveis por classe conforme embarcação selecionada.
- Paradas/escalas devem ser preenchidas automaticamente conforme o FAQ 2026 recebido e documentado em `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`.
- Templates iniciais de cronograma vindos do FAQ:
  - Belém → Almeirim: Breves, Gurupá, Porto de Moz, Almeirim.
  - Almeirim → Belém: Porto de Moz, Gurupá, Breves, Belém.
  - Belém → Santarém: Breves, Gurupá, Almeirim, Prainha, Monte Alegre, Santarém.
  - Santarém → Belém, retorno de sábado: Prainha, Almeirim, Gurupá, Breves, Belém.
  - Santarém → Belém, retorno de segunda: Monte Alegre, Prainha, Almeirim, Gurupá, Breves, Belém.
- Front mockado pode usar esses templates; backend/cadastro definitivo deve validar divergências internas do FAQ (17h vs 18h e chegada de Santarém).
- Calendário/linha do tempo das viagens por embarcação.
- *Estados:* conflito de agenda da embarcação → alerta.

### B.3 Painel de rastreamento em tempo real
**Persona:** Operação/diretoria.
- Mapa com posição de cada embarcação ativa.
- Cumprimento do cronograma (próxima escala, ETA).
- *Estados:* sem sinal de GPS (último ponto conhecido + horário).

### B.4 Status de viagem
- Janela/lista por viagem com indicador: **no prazo** (verde), **atenção** (amarelo), **atrasado** (vermelho).
- Detalhe: previsto × real por escala.

### B.5 Escala de colaboradores
**Persona:** Operação.
- Alocação de colaboradores a uma viagem/período por função.
- **Notificação automática via WhatsApp** ao colaborador escalado.
- *Estados:* conflito de escala (colaborador em duas viagens) → bloqueio/alerta; confirmação de recebimento da notificação.

### B.6 Painel operacional da viagem (visão consolidada)
- Resumo da viagem: passageiros por classe, encomendas, cargas, veículos, status.
- Atalho para relatório de passageiros, controle de encomendas/carga, prestação de contas.
- Base para o BI de rentabilidade por viagem/embarcação/cidade.

---

## Pendências deste módulo
- 🔶 Fonte de rastreamento (GPS próprio vs. AIS) e provedor de mapa.
- 🔶 Provedor de WhatsApp para notificação de escala.
- Definir regra de cálculo de "atenção" vs. "atrasado" (tolerância em minutos/horas).
