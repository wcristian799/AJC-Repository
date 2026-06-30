# Campos Recebidos do Lucas — Navegação e TMS

> Recebido na conversa em 30/jun/2026.
>
> Este material baixa pendências abertas da reunião sobre **Botão Nova Viagem**, **lista/classes de embarcações** e **Botão Nova Carga**. Ele deve orientar o próximo ajuste do front mockado em `apps/web-console`.

## Navegação — Botão Nova Viagem

Campos do fluxo:

- Número da viagem: código gerado automaticamente pelo sistema.
- FerryBoat: selecionar em lista/caixa de seleção.
- Data e hora da saída.
- Paradas: inserir local/cidade, data e hora das paradas.
- Paradas devem ter preenchimento automático conforme **DOC FAQ**.
- Número de passageiros disponível em redes: numeral preenchido manualmente.
- Número de camarotes disponíveis: por classe, de acordo com a embarcação selecionada.

Atualização: o **DOC FAQ** foi recebido depois como `C:\Users\Administrador\Downloads\FAQ 2026.pdf` e consolidado em `docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md`. Ele resolve a fonte de paradas automáticas para o front mockado, mas contém divergências internas de horário que devem ser validadas antes do backend definitivo.

## Lista de Embarcações

- F/B AMAZONAS II.
- F/B AMAZONAS III.
- F/B AMAZONAS IV.
- F/B AMAZONAS V.
- F/B AMAZONAS VI.
- F/B PARU (CARGAS).

## Classes Por Embarcação

| Classe | Ocupação | Embarcações |
|---|---:|---|
| Rede | 1 pessoa | Amazonas II, Amazonas III, Amazonas IV, Amazonas V, Amazonas VI |
| Rede Sala VIP | 1 pessoa | Amazonas V |
| Camarote | 2 pessoas | Amazonas V |
| Suíte Comum | 2 pessoas | Amazonas II, Amazonas III, Amazonas IV, Amazonas V, Amazonas VI |
| Suíte Comum VIP | 2 pessoas | Amazonas VI |
| Suíte Master | 2 pessoas | Amazonas II, Amazonas III, Amazonas IV, Amazonas V, Amazonas VI |
| Suíte Master VIP | 2 pessoas | Amazonas II, Amazonas III, Amazonas IV, Amazonas V, Amazonas VI |
| Mega Suíte | 2 pessoas | Amazonas II, Amazonas III, Amazonas IV, Amazonas V, Amazonas VI |

## TMS — Botão Nova Carga

Campos do fluxo:

- Número do pedido e venda: `COD CLIENTE + NUMERO DE NF/DC`.
- UUID de carga / QR Code: gerado automaticamente pelo sistema.
- Código de carga: gerado automaticamente pelo sistema.
- Selecionar viagem.
- Origem.
- Destino.
- Cliente: puxar da NF/DC ou preencher manualmente.
- Upload de nota/DC.
- Peso: puxar da NF/DC ou preencher manualmente.
- Valor de nota/DC: puxar da NF/DC ou preencher manualmente.

## Impacto no Front

Atualizar:

- `apps/web-console/src/routes/app.navegacao.tsx`: painel/modal de Nova Viagem com os campos acima, lista de embarcações e classes/capacidade condicionais por embarcação.
- `apps/web-console/src/routes/app.tms.tsx` e/ou `apps/web-console/src/components/ops/tms/NotasTab.tsx`: fluxo de Nova Carga com geração visual/mock de pedido, UUID/QR, código de carga, NF/DC, viagem, origem/destino, cliente, peso e valor.

## Pendências Que Continuam

- Validar divergências internas de horário do FAQ 2026 antes do cadastro definitivo.
- Valores/capacidades numéricas reais por embarcação/classe, caso existam em tabela separada.
- Campos detalhados do lançamento manual NF/DC, se forem diferentes do fluxo Nova Carga.
- Regras finais do botão/fluxo Etiquetar por volume.
- Campos de Cadastro de palete.
