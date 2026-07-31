# ADR 03 — Navegação configurável e ciclo operacional

**Status:** aceito em 31/jul/2026
**Contexto:** Etapa 02 da validação de telas + FAQ 2026 recebido do cliente.

## Decisão

Rotas, frequências, horários e intertrechos pertencem ao motor de configuração versionado, na chave `navegacao_rotas_horarios`. O FAQ é somente a fonte da primeira versão de dados; não é fallback de código.

Cada sentido é uma viagem independente. Ida e volta podem compartilhar `ciclo_uuid`, formando um ciclo operacional sem misturar status, horários, tripulação, lotação ou auditoria dos dois sentidos.

Ao planejar uma viagem, o sistema grava `rota_template_id`, `config_versao_id` e as datas previstas de cada escala. Esse snapshot impede que a publicação posterior de uma rota altere silenciosamente viagens existentes.

## Invariantes

- Nova viagem exige rota/template pertencente a uma versão publicada.
- Somente embarcação ativa pode ser planejada.
- A mesma embarcação não pode ocupar períodos sobrepostos em viagens não canceladas.
- Somente viagem planejada pode ter rota, embarcação ou horários editados.
- Status muda por ação operacional auditável: `planejada → em_curso → concluida`; cancelamento parte de `planejada` ou `em_curso` e exige motivo.
- Capacidade ausente continua ausente; o sistema não transforma ocupação por cabine, classe suportada ou valor de exemplo em lotação.
- Divergências da fonte são dados visíveis (`requerRevisao`), resolvidos por publicação de nova versão no painel.

## Consequências

O calendário pode agrupar viagens reais por embarcação e período, enquanto o detalhe mantém a versão de origem e a linha do tempo dos intertrechos. Alterações de programação passam por Cadastros com histórico, autoria e confirmação explícita.

O cadastro de cidades continua sendo a fonte das siglas válidas; o cadastro de embarcações continua sendo a fonte de disponibilidade, classes e capacidades. Integridade, auditoria e máquina de estados permanecem no código porque são controles estruturais, não parâmetros comerciais.
