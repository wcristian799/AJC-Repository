# Etapa 11 — Financeiro operacional

## Fonte e decisão vigente

Implementação baseada na Etapa 11 do documento `2026-07-09-validacao-core-todas-telas-diagramado.docx`. A solicitação mais recente retira conciliação bancária desta etapa e prioriza contas a pagar/receber, comissões condicionadas ao recebimento, rastreamento de faturas e DRE.

## Entrega de engenharia

- Migration `0040_financeiro_operacional_completo.sql` preserva os títulos legados da migration 0015 e adiciona competência, liquidação parcial, documentos, parcelas, plano de contas, centro de custo, viagem e histórico.
- Plano de contas e centros de custo são cadastros persistidos e editáveis. Nenhuma conta ou centro comercial foi inventado.
- A chave versionada `financeiro_operacao` publica regras de comissão, modo da DRE, rastreamento de faturas e categorias gerenciais.
- Contas a pagar e receber possuem filtros reais de período e busca, resumo agregado, lançamento e liquidação auditável.
- Liquidações parciais são registradas em `financeiro_titulo_liquidacao`; o título somente fica `pago`/`recebido` ao atingir o valor integral.
- Comissões usam os estados `em_aberto -> liberada -> pago`. A liberação exige conta a receber vinculada já recebida; o repasse exige comissão liberada.
- A DRE respeita o modo publicado em Cadastros: no regime de caixa usa somente valores liquidados; no regime de competência usa os títulos reconhecidos na competência, exceto cancelados. Lançamentos sem classificação aparecem como `Sem classificação` para saneamento.
- Faturas emitidas/recebidas podem ser registradas internamente com CNPJ, número, chave, datas, valor, vínculo ao título e evidência. Integração externa permanece desativada até contratação e credenciais reais.
- Conciliação bancária não foi apresentada na tela da Etapa 11, conforme solicitação do cliente.

## APIs

- `GET/POST /api/caixa/titulos`
- `PATCH /api/caixa/titulos/:id/liquidar`
- `GET /api/caixa/titulos/:id/historico`
- `GET /api/caixa/resumo`
- `GET/POST /api/caixa/comissoes`
- `PATCH /api/caixa/comissoes/:id/liberar`
- `PATCH /api/caixa/comissoes/:id/pagar`
- `PATCH /api/caixa/comissoes/:id/cancelar`
- `GET /api/caixa/dre`
- `GET/POST /api/caixa/faturas`
- `GET/POST /api/caixa/plano-contas`
- `GET/POST /api/caixa/centros-custo`

## Permissões

- `financeiro.ver`
- `financeiro.lancar`
- `financeiro.baixar`
- `financeiro.configurar`
- `financeiro.comissao_liberar`
- `financeiro.comissao_pagar`
- `financeiro.dre_ver`
- `financeiro.fatura_ver`
- `financeiro.fatura_lancar`

As permissões são atribuídas inicialmente somente ao Administrador. A distribuição para os perfis reais deve ser feita em Cadastros e exige novo login para renovar o token.

## Dependências de implantação

1. Aplicar a migration 0040 no ambiente.
2. Cadastrar/publicar o plano de contas e centros de custo oficiais enviados pela AJC/Lucas.
3. Definir percentuais e bases de comissão por agente.
4. Classificar os títulos legados que aparecem como `Sem classificação`.
5. Validar o modelo final da DRE com o responsável contábil.
6. Escolher e contratar provedor antes de ativar rastreamento externo de faturas.

## QA executado

- Migration aplicada no PostgreSQL local: 40/40.
- Build NestJS concluído.
- 15 suítes e 50 testes Jest concluídos.
- Build TanStack/Vite/Nitro/Vercel concluído.
- Healthcheck da API no WSL retornou `status=ok` e `db=up`.
- Smoke autenticado retornou HTTP 200 para títulos, resumo, DRE, comissões, faturas, plano de contas, centros de custo e configuração versionada.
- A inspeção visual automatizada não foi concluída porque o runtime do navegador integrado não encontrou os próprios assets; esse bloqueio não foi mascarado como aprovação visual.
