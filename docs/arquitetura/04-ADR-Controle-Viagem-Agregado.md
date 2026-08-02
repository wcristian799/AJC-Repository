# ADR 04 — Controle por viagem agregado no servidor

- **Status:** aceita e implementada
- **Data:** 02/ago/2026
- **Escopo:** TMS B.11 — Controle de carga por viagem

## Contexto

A implementação anterior recebia listas genéricas de viagens, cargas e volumes no navegador e fazia os cruzamentos localmente. Além de depender dos limites dessas listas, ela estimava valor declarado por peso, estimava valor cobrado por percentual fixo, mostrava progresso constante e não oferecia busca real, divergências nem AuditTrail. Em produção, isso produziria totais silenciosamente incompletos e informação financeira inventada.

## Decisão

O PostgreSQL passa a ser a fonte do agregado B.11 por meio de `TmsControlRepository` e dos endpoints `/api/tms/controle-viagens*`. A consulta filtra e pagina viagens primeiro, agrega cargas uma única vez e deriva o funil físico dos volumes e de `evento_volume`.

O funil é cumulativo:

- recebido: todo volume físico cadastrado na carga ativa;
- embarcado: estado atual embarcado/posterior ou evidência histórica de evento embarcado/posterior;
- entregue: estado atual entregue ou evento entregue;
- divergente: estado atual aberto `divergente`.

Valores monetários nulos continuam nulos. A resposta informa também quantas cargas não possuem cada valor; nenhuma estimativa é permitida. O drill-down de volumes, o painel de divergências e a trilha por volume têm consultas e paginação próprias.

## Configuração

A migration `0027_tms_controle_viagem_config.sql` publica a chave versionada `tms_controle_viagem`. O backend valida sua estrutura antes de publicar. O editor correspondente fica em Cadastros › Configuração operacional e controla:

- fuso operacional e intervalo de atualização;
- dias anteriores/futuros do período inicial;
- itens e máximo por página;
- limite de exportação;
- limites de eventos por volume e divergências destacadas.

## Consequências

- Totais não dependem de listas auxiliares truncadas no front.
- Busca, filtros e exportações usam exatamente a mesma regra do painel.
- Crescimento para milhares de clientes/volumes permanece paginado.
- A UI preserva o último resultado se uma atualização falhar e explicita dados ausentes.
- Alterar parâmetros não requer deploy, mas cria uma nova `config_versao` auditável.
- O endpoint exige `tms.ver`; mutações físicas continuam nos endpoints operacionais existentes e em sua trilha de auditoria.
