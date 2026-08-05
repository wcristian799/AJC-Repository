# Fluxo operacional simplificado de volumes

**Decisão confirmada:** 04/ago/2026
**Escopo:** TMS/Carga, Encomendas, apps de campo, controle por viagem, paletes, APIs, banco e documentação.

## Máquina de estados oficial

Fluxo padrão:

`cadastrado -> conferido -> embarcado -> entregue`

Cross-docking / recebimento direto na embarcação:

`cadastrado -> embarcado -> entregue`

`divergente` é um estado de exceção usado para extravio, avaria ou diferença total/parcial identificada em qualquer ponto aplicável.

## Significado operacional

- `cadastrado`: NF/DC e volumes existem no sistema, sem movimentação física.
- `conferido`: o conferente do porto realizou o primeiro bipe e a conferência física.
- `embarcado`: o conferente da embarcação realizou o bipe de embarque. No cross-docking, esse é o primeiro bipe físico.
- `entregue`: o bipe final e a prova de entrega foram concluídos.
- `divergente`: a operação possui exceção aberta que exige tratamento auditado.

## Estados descontinuados

`recebido`, `reconferido` e `desembarcado` não fazem parte do fluxo operacional vigente. A migration 0035:

- converte o estado atual `recebido` em `conferido`;
- converte os estados atuais `reconferido` e `desembarcado` em `embarcado`;
- impede novos volumes com estados descontinuados;
- mantém eventos antigos somente na trilha imutável, apresentados na interface com a semântica atual.

## Regras de transição

- Fluxo comum: somente `cadastrado -> conferido -> embarcado -> entregue`.
- Cross-docking: `cadastrado -> embarcado -> entregue` quando a carga está marcada como recebimento direto.
- A entrega só pode ser concluída para volume `embarcado`.
- O ciclo de palete só pode ser liberado depois que todos os seus volumes estiverem `entregue`.
- Toda mutação gera evento/auditoria e respeita `client_uuid` quando originada no campo.

## Superfícies corrigidas

- Controle por viagem: KPI e funil `Conferidos / Embarcados / Entregues`.
- Filtro de volumes: somente cadastrado, conferido, embarcado, entregue e divergente.
- Conferente do Porto: bipe produz `conferido`.
- Conferente da Embarcação: bipe produz `embarcado`, incluindo cross-docking direto.
- Entregas: exige volume embarcado e registra evento `entregue` com protocolo.
- Entregas: le o UUID real, identifica o recebedor e envia duas fotos mais assinatura ao bucket privado `entregas-comprovantes`, todas com SHA-256; nao ha bipe ou evidencia simulados.
- Exportações, rastreamento e histórico traduzem eventos legados sem reintroduzir estados antigos.

## Deploy

Publicar API e frontend do mesmo commit e executar:

```bash
node infra/migrations/run.mjs
```

A migration esperada é `0035_tms_fluxo_volume_simplificado.sql`.
