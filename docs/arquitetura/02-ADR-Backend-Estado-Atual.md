# ADR 02 — Backend NestJS: Estado Atual e Contratos

> Documento de referência do **estado atual** do back NestJS (Fase 2 — MVP funcional). É complementar ao `00-ADR-Stack-e-Arquitetura.md` (decisões) e ao `01-ADR-Spikes-Tecnicos.md` (escolhas técnicas). Aqui ficam: módulos implementados, migrations, endpoints públicos, como rodar e o que ainda falta.

**Ultima atualizacao:** 2026-07-03.

---

## 1. Stack e estrutura do back

- **Runtime:** Node 20.18 (WSL2 Ubuntu-22.04).
- **Framework:** NestJS 11 + TypeScript estrito.
- **Banco:** PostgreSQL 16.14 + PostGIS 3.6 (driver `pg` puro, sem ORM).
- **Fila:** pg-boss (sobre o mesmo Postgres).
- **Auth:** JWT (access + refresh) com sessão em cookie httpOnly + fallback via header para apps de campo.
- **Validação:** class-validator + class-transformer (DTOs com Swagger).
- **Testes:** Jest + ts-jest + `@nestjs/testing` + Supertest.

### 1.1 Estrutura de pastas (`apps/api/src/`)

```
apps/api/
├─ src/
│  ├─ main.ts                        bootstrap (porta via API_PORT, helmet, cors, validation pipe)
│  ├─ app.module.ts                  módulo raiz (importa todos os módulos + database + auth)
│  ├─ database/
│  │  └─ database.module.ts          pool pg + helper query()
│  └─ modules/
│     ├─ auth/                       login, refresh, me, logout, RBAC guard, session guard
│     ├─ config/                     motor de configuração versionado (JSONB)
│     ├─ cadastros/                  fornecedores, colaboradores, cidades, embarcacoes
│     ├─ precos/                     tabelas de preço (passagem/carga) + reajuste
│     ├─ navegacao/                  viagens, escalas, templates de rota, cronograma
│     ├─ tms/                        carga, volume, palete, eventos, etiqueta, conferencia, entrega
│     ├─ veiculos/                   veiculos/maquinas (envio, entrega, checklist)
│     ├─ encomendas/                 despacho, declaracao de conteudo
│     ├─ vendas/                     bilhetes, QR, validacao, cortesia, gratuidade, manifesto
│     ├─ caixa/                      caixa financeiro minimo do MVP (abrir, lancar, fechar)
│     ├─ crm/                        cliente 360, cotacoes, realocacoes
      operacao/: alertas operacionais do dashboard
│     ├─ portal/                     portal publico: viagens, pedido, reserva, pagamento stub, webhook
│     ├─ prestacao/                  prestacao de contas (modelo real gerentes am/vi)
│     └─ financeiro/                 AP/AR minimo (titulos)
├─ test/                             testes E2E (supertest)
├─ jest.config.ts
└─ package.json
```

---

## 2. Migrations (`infra/migrations/`)

SQL puro, controlado por `schema_migrations` + runner `infra/migrations/run.mjs`. **17 migrations aplicadas** (status 17/17).

| # | Arquivo | Conteúdo |
|---|---|---|
| 0001 | `extensions.sql` | `postgis`, `pgcrypto`, `uuid-ossp` |
| 0002 | `enums.sql` | enums globais (status_volume, tipo_recebimento, etc.) |
| 0003 | `fundacao_acesso.sql` | `pessoa`, `usuario`, `perfil`, `permissao`, `sessao` |
| 0004 | `clientes_config_precos_navegacao.sql` | `cliente`, `agente`, `config_*`, `tabela_preco`, `item_preco`, `embarcacao`, `viagem`, `viagem_escala` |
| 0005 | `tms.sql` | `carga`, `volume`, `palete`, `evento_volume`, `nota_fiscal_dc`, `registro_portaria`, `entrega_comprovante` |
| 0006 | `vendas_caixa_crm_audit.sql` | `bilhete`, `caixa_movimento`, `crm_interacao`, `audit_evento` |
| 0007 | `constraints_adiadas.sql` | constraints diferidas para performance |
| 0008 | `schema_migrations_e_classes_8.sql` | tabela `schema_migrations`; 8 classes de passagem |
| 0009 | `veiculos_maquinas.sql` | `veiculo`, `veiculo_evento`, `checklist_envio`, `checklist_entrega` |
| 0010 | `navegacao_operacional.sql` | `viagem_colaborador`, `escala`, templates de rota operacionais |
| 0011 | `tms_operacional.sql` | campos operacionais em carga/volume/palete (timestamps de bipe, gps) |
| 0012 | `vendas_caixa_operacional.sql` | campos em bilhete/caixa (forma_pagamento multipagamento, observacoes) |
| 0013 | `portal_pedido_pagamento_fiscal.sql` | `portal_pedido`, `portal_reserva`, `portal_pagamento`, `portal_webhook_evento`, `bilhete_documento_fiscal` |
| 0014 | `prestacao_contas_operacional.sql` | `prestacao_contas`, `prestacao_item` (modelo real) |
| 0015 | `financeiro_titulos_minimos.sql` | `financeiro_titulo` (AP/AR) |
| 0016 | `etiqueta_impressao.sql` | `etiqueta_impressao` (fila/auditoria de impressao e reimpressao) |
| 0017 | `alerta_operacional.sql` | `alerta_operacional` (alertas cadastraveis do dashboard) |

### 2.1 Como aplicar

```bash
# Dentro do WSL2 (Postgres nativo no Linux)
DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc \
  node infra/migrations/run.mjs --status

DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc \
  node infra/migrations/run.mjs

# Baseline em banco novo
DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc \
  node infra/migrations/run.mjs --baseline
```

---

## 3. Endpoints públicos (contratos consumidos pelo front)

A camada `apps/web-console/src/lib/ajc-api.ts` é o cliente TS que consome esses endpoints. Detalhes do contrato (tipos) ficam no próprio `ajc-api.ts` (espelho dos DTOs do back).

### 3.1 Auth

| Método | Path | Auth | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | público | Login (login_corporativo + senha) → access + refresh |
| POST | `/api/auth/refresh` | refresh | Renova access token |
| GET | `/api/auth/me` | session | Dados do usuário autenticado |
| POST | `/api/auth/logout` | session | Invalida sessão |

### 3.2 Navegação

| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/api/navegacao/viagens` | session | Lista viagens (com filtros) |
| POST | `/api/navegacao/viagens` | session | Cria viagem (Nova Viagem com campos do Lucas/FAQ, capacidades por classe e idempotencia por `client_uuid`) |
| GET | `/api/navegacao/templates-rotas` | session | Templates de rota |
| GET | `/api/navegacao/escalas-colaboradores` | session | Escala de colaboradores por viagem |
| POST | `/api/navegacao/escalas-colaboradores/notificar` | session | Marca escalas pendentes como notificadas, registra `audit_evento` com `tipo_evento=notificar_whatsapp_stub` e deixa o envio real de WhatsApp/SMS para provedor futuro |
| GET | `/api/cadastros/embarcacoes` | session | Lista embarcacoes |
| POST | `/api/cadastros/embarcacoes` | session | Cria embarcacao auditada com tipo/status/capacidades por classe |

### 3.3 TMS / Carga

| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/api/tms/cargas` | session | Lista cargas |
| GET | `/api/tms/volumes` | session | Lista volumes |
| GET | `/api/tms/etiquetas` | session | Lista impressoes/reimpressoes de etiqueta |
| POST | `/api/tms/volumes/:id/etiquetas` | session | Registra impressao/reimpressao auditavel com adapter Bluetooth stub, protocolo ETIQ/RETIQ unico, retry em colisao e idempotencia por `client_uuid` |
| GET | `/api/tms/paletes` | session | Lista paletes |
| POST | `/api/tms/paletes` | session | Cadastra palete AJC/terceiro |
| POST | `/api/tms/paletes/:id/alocacoes` | session | Aloca palete livre em viagem + cidade destino |
| POST | `/api/tms/paletes/:id/liberar` | session | Libera palete retornado para nova alocacao |
| GET | `/api/tms/portaria` | session | Registros de portaria |
| GET | `/api/tms/entregas` | session | Comprovantes de entrega |
| GET | `/api/tms/documentos` | session | NFe/NFCe/DC para `NotasTab` |
| POST | `/api/tms/documentos/:id/conferencia` | session | Marca documento como conferido/divergente com auditoria |
| POST | `/api/tms/cargas` | session | Nova carga e lancamento manual NF/NFCe/DC (campos Lucas), idempotente por `client_uuid`, criando `carga`, `documento_fiscal`, volumes e `audit_evento` |
| POST | `/api/tms/volumes/:id/eventos` | session | Bipe/etiqueta (offline-sync) |


**Notas/NF-DC:** `NotasTab` agora usa `/api/tms/cargas` para lancamento manual de NF/NFCe/DC e `/api/tms/volumes/:id/etiquetas` para etiquetar todos os volumes da carga/documento. A geracao de protocolo de etiqueta consulta `etiqueta_impressao`, nao `carga`, para evitar colisao entre CG/ETIQ/RETIQ.
### 3.4 Veículos/Máquinas

| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/api/veiculos` | session | Lista veículos |
| POST | `/api/veiculos` | session | Novo envio (PDV/Comercial/Gerente), idempotente por `client_uuid`, com evento inicial e `audit_evento` |
| POST | `/api/veiculos/:id/eventos` | session | Checklist/bipe |

### 3.5 Vendas / PDV / Caixa / Bilhetes

| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/api/vendas/resumo` | session | Agregados de vendas (KPIs) |
| GET | `/api/vendas/bilhetes` | session | Lista bilhetes |
| GET | `/api/vendas/manifesto` | session | Manifesto de passageiros |
| POST | `/api/vendas/bilhetes` | session | Emite bilhete (PDV/gestao com multipagamento, idempotencia por `client_uuid` e bloqueio de overbooking por classe quando a viagem tem capacidade configurada) |
| POST | `/api/vendas/bilhetes/:id/validar` | session | Valida QR no embarque (offline-first; preserva validadoEm capturado offline) |
| POST | `/api/vendas/cortesia` | session | Cria cortesia (com motivo/categoria) |
| GET | `/api/caixa/porto` | session | Caixa do porto |
| POST | `/api/caixa/abrir` | session | Abre caixa |
| POST | `/api/caixa/fechar` | session | Fecha caixa |

### 3.6 Portal público

| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/api/portal/viagens` | público | Busca viagens (origem/destino/data) |
| POST | `/api/portal/pedidos` | público | Cria pedido + reserva (TTL, sem overbooking) |
| GET | `/api/portal/pedidos/:codigo` | público | Consulta pedido |
| POST | `/api/portal/pedidos/:codigo/pagamentos` | público | Cria pagamento (stub PIX/cartão) |
| POST | `/api/portal/webhooks/stub` | público (assinatura) | Webhook idempotente |
| GET | `/api/portal/cliente/bilhetes` | público | Bilhetes por CPF/CNPJ ou e-mail |

### 3.7 Cadastros / CRM / Financeiro / Prestação

| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET/POST | `/api/cadastros/fornecedores` | session | CRUD fornecedores |
| GET/POST | `/api/cadastros/colaboradores` | session | CRUD colaboradores (CPF obrigatório) |
| GET | `/api/crm/clientes` | session | Lista clientes |
| POST | `/api/crm/clientes` | session | Cria cliente |
| POST | `/api/crm/cotacoes` | session | Cria cotação |
| POST | `/api/crm/realocacoes` | session | Realoca cliente |
| GET | `/api/financeiro/titulos` | session | Lista títulos (AP/AR) |
| POST | `/api/financeiro/titulos` | session | Cria título |
| GET | `/api/prestacao` | session | Lista prestações |
| POST | `/api/prestacao` | session | Cria prestação (modelo real) |

### 3.8 Operacao / Alertas

| Metodo | Path | Auth | Descricao |
|---|---|---|---|
| GET | `/api/operacao/alertas?status=aberto` | session | Lista alertas operacionais por status |
| POST | `/api/operacao/alertas` | session | Cria alerta manual com severidade/modulo e `client_uuid` |
| PATCH | `/api/operacao/alertas/:id` | session | Atualiza ou resolve/cancela alerta com auditoria |
---

## 4. Motor de configuração

- **Tabela:** `config_*` (JSONB versionado, com vigência + autor).
- **Acesso:** módulo `config/` expõe `configClient.get(chave)` com cache em memória.
- **Uso:** preços, comissões, termos, tolerâncias — **zero hard-code** nas regras de negócio.
- **Reajuste:** "criar nova versão" é o padrão; rollback é nativo.

---

## 5. Como rodar o back localmente

```bash
# 1. Subir Postgres no WSL (já tem Postgres 16.14 + PostGIS nativo)
#    Script: infra/verify-wsl.sh

# 2. Aplicar migrations
cd /mnt/c/Users/Administrador/Desktop/Trabalho/AJC
DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc \
  node infra/migrations/run.mjs

# 3. Subir API
cd apps/api
npm install
npm run seed                 # dados iniciais (siglas, perfis, templates)
API_PORT=3000 npm run start:dev

# 4. Testes
npm test -- --runInBand
```

**Verificação rápida:**
```bash
curl http://localhost:3000/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"login_corporativo":"gerente.am","senha":"demo"}'
```

---

## 6. Pendências externas (🔶)

Não bloqueiam o MVP funcional, mas precisam ser resolvidas para ir a produção:

| Pendência | Impacto | Onde |
|---|---|---|
| Gateway PIX/cartão real | Checkout do portal | `docs/fase-2/01-PROMPT-Backend-MVP-Completo.md` |
| BP-e real (fornecedor/API) | Emissão fiscal | `docs/feedback/2026-06-29-certificado-digital-ajc-pfx.md` |
| Senha/validade/uso do PFX | Assinatura A1 | mesmo doc acima |
| Credenciamento SEFAZ-PA | BP-e autorizado | mesma nota |
| Provedor WhatsApp/SMS | Notificações | ADR 00 §11 |
| Spike offline-sync (PowerSync vs. fila) | `libs/offline-sync` | ADR 01 |

---

## 7. O que já está pronto vs. o que falta

### ✅ Pronto (rodando em dev)
- Auth/RBAC/sessão com JWT + refresh
- Motor de configuração
- Cadastros (fornecedores, colaboradores, cidades, embarcações)
- Preços (tabela + item + reajuste)
- Navegação (viagens + escalas + templates + Nova Viagem)
- TMS (carga, volume, palete, etiqueta, eventos, portaria, entregas)
- Veículos (envio, entrega, checklist Frota Martins)
- Vendas (bilhetes, QR, cortesia, gratuidade, manifesto, multipagamento)
- Caixa (abrir, lançar, fechar)
- Bilhetes (emissão, validação, fila offline de embarque, BP-e stub)
- CRM (cliente, cotação, realocação, 360)
- Operacao (alertas cadastraveis do dashboard)
- Encomendas (despacho, declaração de conteúdo)
- Prestação de contas (modelo real gerentes am/vi)
- Portal público (busca, pedido, reserva, pagamento stub, webhook, bilhete)
- Financeiro leve (AP/AR com comissão de agente)

### 🔶 Pendente (próximas fatias)
- **Integrar front mockado removendo mocks** por módulo quando há endpoint real (ordem: `/campo/*` → `/pos` → `/totem` → `/embarque` → `/app/cadastros`).
- **Implementar gateway PIX/cartão real** (adapter plugável já existe).
- **Implementar BP-e real** (stub já existe; trocar pelo fornecedor quando credenciamento sair).
- **GPS tempo real** (Firebase bridge → pg-boss resume).
- **Apps de campo Capacitor** (após MVP web).

---

## 8. Convenções do código

- **DTOs no Swagger:** todo endpoint documentado em `/api/docs` (Swagger UI).
- **Naming:** `snake_case` no banco, `camelCase` no TS (mapeado nos DTOs).
- **Erros:** `HttpException` com payload `{ error: { code, message, details? } }`.
- **Auditoria:** `audit/` intercepta eventos críticos (volume conferido, bilhete validado, entrega feita).
- **Idempotência:** todo POST sensível aceita `client_uuid` (header `X-Client-Uuid`); reenvio retorna o resultado original.
- **Transações:** `pg.Pool.connect()` + `BEGIN/COMMIT`; jobs do pg-boss enfileiram **na mesma transação** quando precisa de atomicidade.

- GET /api/operacao/relatorio-dia: relatorio operacional do dia com viagens, vendas, TMS, caixa e alertas.
