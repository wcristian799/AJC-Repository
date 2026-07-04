# Prompt - Backend MVP Completo AJC

Use este prompt para iniciar uma IA/agente sem contexto e mandar executar o backend funcional do MVP a partir do front aprovado.

## Prompt para copiar e colar

```text
Voce vai trabalhar no projeto AJC em:
C:\Users\Administrador\Desktop\Trabalho\AJC

OBJETIVO CENTRAL
Construir/fechar o backend funcional completo do MVP AJC em NestJS + PostgreSQL, usando o front aprovado em apps/web-console como contrato de comportamento. O front ja foi validado pelo cliente; nao redesenhe telas, nao troque o design system e nao reabra escopo. O trabalho e materializar no backend as regras, dados, endpoints, migrations, seeds, testes e integracao necessarios para o front operar com dados reais.

LEITURA OBRIGATORIA ANTES DE MEXER
1. AGENTS.md
2. docs/STATUS.md
3. docs/PRD.md
4. docs/SPEC.md
5. docs/fase-0/01-Modelo-de-Dados-MVP.md
6. docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md
7. docs/feedback/2026-06-25-validacao-core-telas.md
8. docs/feedback/2026-06-29-auditoria-transcricao-bruta-e-pendencias.md
9. docs/feedback/2026-06-29-modelo-prestacao-contas-gerentes-am-vi.md
10. docs/feedback/2026-06-29-certificado-digital-ajc-pfx.md
11. docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md
12. docs/feedback/2026-06-30-faq-2026-paradas-precos-passagens.md
13. docs/modulos/01-TMS-Carga.md a docs/modulos/09-Navegacao.md
14. docs/ux/00-Fundacao-DesignSystem-Navegacao-Acesso.md a docs/ux/05-UX-Navegacao-Core.md
15. apps/web-console/src/routes e apps/web-console/src/components/ops, porque o front aprovado e o contrato final.

REGRA DE OURO
O que esta na transcricao/feedback mais recente e no front aprovado manda. Se documento antigo divergir, corrija o documento antigo ou registre a divergencia; nao trate como conflito para rediscutir.

AMBIENTE E STACK
- Backend: apps/api, NestJS, TypeScript, pg Pool.
- Banco: PostgreSQL/PostGIS no WSL2 Ubuntu-22.04.
- DATABASE_URL dentro do WSL: postgresql://ajc:ajc_dev@localhost:5432/ajc
- Nao usar Docker Desktop nesta maquina.
- Nao usar ORM. Prisma/TypeORM estao fora desta rodada.
- Migrations em SQL puro: infra/migrations.
- Runner: infra/migrations/run.mjs com schema_migrations.
- Seed idempotente: infra/seed.
- Front: apps/web-console, TanStack Start + Bun. Se tocar front, rodar bun run build.

REGRAS NAO NEGOCIAVEIS
- Nao reverter mudancas existentes.
- Nao trocar stack.
- Nao redesenhar o front aprovado.
- Nao alterar o login cinematografico nem tokens do design system Crimson Prestige.
- Nada de valor de negocio hard-coded em codigo: precos, limites, tolerancias, termos, comissoes, cores de pulseira e regras configuraveis devem ir para banco/config/seed versionado.
- Toda mutacao operacional deve aceitar client_uuid quando fizer sentido.
- Eventos criticos devem gerar trilha de auditoria imutavel.
- Endpoints devem respeitar RBAC.
- PFX e sensivel: nao copiar, nao commitar, nao abrir/importar no repo, nao expor senha.
- Gateway real, BP-e/SEFAZ real, WhatsApp/SMS real, impressora Bluetooth real e GPS real devem ficar como adapters/stubs plugaveis enquanto faltarem fornecedor, credenciais ou modelo tecnico.
- Financeiro completo, Compras/DRE e PDV F&B completo ficam pos-MVP, salvo ganchos minimos ja modelados.

USE SUBAGENTS SE DISPONIVEIS

Subagent 1 - Auditoria de contrato front/backend
- Ler AGENTS.md, STATUS e docs de feedback.
- Auditar apps/web-console para mapear todas as telas e acoes que precisam de API.
- Listar endpoints necessarios por modulo.
- Cruzar o front aprovado com migrations atuais e apontar lacunas de schema.
- Identificar mocks, constantes locais de regra de negocio e botoes ainda visuais.
- Entregar checklist objetivo para implementacao, sem alterar codigo sozinho se o agente principal estiver coordenando.

Subagent 2 - Fundacao, Auth, RBAC, Config, Cadastros, Precos, Navegacao
- Implementar ou completar auth, sessoes, me, refresh/logout, hash de senha e guards.
- Implementar RBAC com perfis, permissoes e matriz perfil_permissao.
- Implementar config versionada e chaves de negocio.
- Implementar cadastros: clientes, agentes, fornecedores, colaboradores, usuarios/perfis quando aplicavel.
- Implementar precos versionados: passagem, carga/encomenda, reajuste em massa e matriz por trecho/classe.
- Implementar navegacao: embarcacoes, classes por embarcacao, viagens, paradas automaticas do FAQ, escalas, conflito de escala, capacidades.

Subagent 3 - TMS, Campo, Encomendas, Veiculos/Maquinas
- Implementar TMS/Nova Carga: pedido/venda = COD CLIENTE + NF/DC, UUID/QR, codigo de carga, viagem, origem/destino, cliente, upload metadata NF/DC, peso, valor, CIF/FOB e agenda.
- Implementar volumes, etiquetas, reimpressao stub, paletes MP/PD/PC, completo/parcial e eventos.
- Implementar portaria, recebimento, conferencia, cross-docking e entregas com foto/assinatura metadata.
- Implementar prestacao de contas baseada no modelo real recebido em 29/jun/2026.
- Implementar Veiculos/Maquinas no MVP: envio, checklist/fotos, etiqueta, bipe de subida/descida, entrega e auditoria.
- Implementar Encomendas: despacho, declaracao de conteudo/NF, assinatura, quem paga, valor declarado, cotacao/manual e precificacao configuravel.

Subagent 4 - Vendas, Caixa, Bilhetes, Portal, Pagamento e Fiscal
- Implementar PDV: caixa, multipagamento, passagem, cortesia, gratuidade, contrato, QR.
- Implementar bilhete: token/QR assinado, estados, validacao, bloqueio de QR duplicado, cancelamento/reembolso quando previsto.
- Implementar cortesias e gratuidades com limite, motivo, relatorio e consumo.
- Implementar manifesto por viagem, cidade/escala, classe e tipo de tarifa.
- Implementar portal MVP: busca, disponibilidade, reserva temporaria com TTL, pedido, pagamento, webhook idempotente, emissao de bilhete apos pagamento aprovado/stub, area do cliente.
- Implementar concorrencia sem overbooking com transacao PostgreSQL, lock e checagem atomica por viagem/classe.
- Implementar pagamento como adapter stub/local ate gateway real.
- Implementar fiscal/BP-e como adapter stub/plugavel e status de documento fiscal, sem SEFAZ real enquanto faltar senha/credenciamento/fornecedor.

Subagent 5 - Integracao front, testes e QA
- Conectar front aprovado ao backend sem redesenhar.
- Remover mocks operacionais e constantes locais de regra de negocio, substituindo por API/config.
- Manter fallback apenas para pendencia externa real e documentada.
- Criar ou atualizar cliente de API em apps/web-console/src/lib/ajc-api.ts.
- Rodar build/test da API e bun run build se tocar front.
- Fazer smoke dos fluxos principais.

ORDEM DE EXECUCAO
1. Sanity check
   - git status --short
   - ler AGENTS.md e docs/STATUS.md
   - inspecionar apps/api/src, infra/migrations, infra/seed, apps/web-console/src/routes e apps/web-console/src/components/ops
   - nao reverter alteracoes existentes

2. Planejamento curto e executavel
   - Atualizar ou criar SPEC/checklist de backend em docs/fase-2, se necessario.
   - Nao ficar preso em planejamento: depois do checklist, implementar.

3. Migrations e seeds
   - Criar migrations incrementais para lacunas reais.
   - Manter SQL puro.
   - Atualizar seeds idempotentes para operar o front aprovado.
   - Incluir dados minimos: perfis, permissoes, admin dev, cidades, embarcacoes oficiais, classes por embarcacao, rotas/paradas do FAQ, precos, configs e templates.

4. Fundacao de API
   - Padrao controller/service/repository usando pg Pool.
   - Helpers de transacao.
   - DTOs e validacao.
   - Tratamento de erro consistente.
   - AuditService.
   - Auth/RBAC antes dos modulos protegidos.

5. Fatias verticais
   - Auth/RBAC/Config/Cadastros/Precos.
   - Navegacao.
   - TMS/Carga/Paletes/Portaria/Prestacao.
   - Veiculos/Maquinas.
   - Vendas/Caixa/Bilhetes/Validacao.
   - Portal/Pedido/Reserva/Pagamento/Fiscal stub.
   - CRM/Encomendas/Cotacao.
   - Sync/offline minimo por client_uuid.

6. Integracao com o front aprovado
   - Mapear dados reais para o formato esperado pelas telas.
   - Preservar visual, rotas e UX.
   - Onde houver pendencia externa, mostrar estado configuravel/stub auditavel, nao fluxo falso.

7. Verificacao obrigatoria
   - No WSL:
     cd /mnt/c/Users/Administrador/Desktop/Trabalho/AJC
     DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc node infra/migrations/run.mjs --status
   - Aplicar migrations novas.
   - Rodar seed.
   - npm run build --workspace apps/api
   - npm test --workspace apps/api -- --runInBand
   - Subir API e validar GET /api/health.
   - Se tocar front:
     cd apps/web-console
     bun run build

8. Documentacao final
   - Atualizar docs/STATUS.md com feito, verificacoes e proximo passo.
   - Atualizar AGENTS.md se a frente ativa mudar.
   - Atualizar ADR ou SPEC se houver decisao estrutural.
   - Registrar pendencias externas sem tratar como bloqueio do MVP.

CRITERIOS DE ACEITE
- Backend NestJS compila.
- Testes passam.
- Migrations aplicam em banco controlado.
- Seed e idempotente.
- Auth/RBAC funcionando.
- API cobre fluxos principais do MVP aprovado.
- Front conectado nas acoes principais, sem redesenho.
- Portal funciona com pagamento/fiscal stub auditavel.
- Reserva/venda nao permite overbooking por classe.
- QR de bilhete bloqueia duplicidade.
- TMS gera carga, volume, etiqueta/status/eventos com client_uuid e auditoria.
- Veiculos/Maquinas tem fluxo de checklist, foto metadata, etiqueta, bipes e entrega.
- Prestacao de contas salva modelo real.
- docs/STATUS.md termina claro para a proxima sessao.

PENDENCIAS EXTERNAS QUE NAO DEVEM TRAVAR
- Senha/validade/uso do PFX.
- Credenciamento SEFAZ-PA e fornecedor/API fiscal.
- Gateway real de pagamento.
- Provedor WhatsApp/SMS.
- Modelo/protocolo da impressora Bluetooth.
- Cores oficiais finais das pulseiras.
- Capacidades numericas reais por classe/embarcacao se nao houver tabela oficial.
- Tabela definitiva de preco de encomenda e veiculos/maquinas.
- DRE, Financeiro completo e Compras.

ENTREGA ESPERADA
Entregue a maior parte possivel em uma pancada, mas sem fingir integracao externa real onde faltam credenciais ou fornecedor. Para esses pontos, entregue entidade, status, contrato, adapter stub, logs/auditoria e documentacao clara do que falta plugar.
```

## Estrategia

O pedido e "backend inteiro", mas a execucao correta e uma pancada coordenada por fatias verticais:

1. Fundacao e seguranca.
2. Dados mestre e configuracao.
3. Operacao interna: navegacao, TMS, veiculos, encomendas.
4. Receita: vendas, caixa, bilhetes.
5. Portal: pedido, reserva, pagamento, fiscal plugavel.
6. Integracao front/back e QA.

Isso evita endpoint solto e protege os fluxos criticos: estoque de vaga, pagamento, bilhete, carga, auditoria e prestacao.
