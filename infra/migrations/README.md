# Migrations — Schema MVP AJC (PostgreSQL 16 + PostGIS)

SQL puro (sem ORM), fiel ao modelo de dados canônico em
[`docs/fase-0/01-Modelo-de-Dados-MVP.md`](../../docs/fase-0/01-Modelo-de-Dados-MVP.md).
Os arquivos são numerados e devem rodar **em ordem** — respeitam as FKs (pais antes de filhos)
conforme a §15 do modelo.

## Ordem dos arquivos

| Arquivo | Cobre | §|
|---|---|---|
| `0001_extensions.sql` | `pgcrypto`, `postgis`, `btree_gist` | §1.3 |
| `0002_enums.sql` | Todos os `CREATE TYPE` (enums) | §2 |
| `0003_fundacao_acesso.sql` | função `set_atualizado_em`, `cidade`, `perfil`, `permissao`, `perfil_permissao`, `colaborador`, `usuario`, `sessao`, `fornecedor` | §2.1, §3 |
| `0004_clientes_config_precos_navegacao.sql` | `agente`, `cliente`, `cliente_agente_historico`, `config_chave`, `config_versao`, `tabela_preco`, `item_preco`, `embarcacao`, `viagem`, `viagem_escala`, `posicao_embarcacao`, `escala_colaborador` | §4, §5, §6, §7 |
| `0005_tms.sql` | `palete`, `carga`, `carga_recebimento`, `volume`, `evento_volume`, `palete_viagem`, `documento_fiscal`, `declaracao_conteudo`, `registro_portaria`, `entrega_comprovante`, `entrega_volume`, `prestacao_contas` | §8 |
| `0006_vendas_caixa_crm_audit.sql` | `caixa`, `bilhete`, `caixa_movimento`, `cortesia`, `gratuidade`, `termo_aceite`, `nps`, `cotacao`, `audit_evento` | §9, §10, §11 |
| `0007_constraints_adiadas.sql` | FKs circulares: `item_preco→embarcacao`, `bilhete→caixa_movimento` | §15 nota † |
| `0008_schema_migrations_e_classes_8.sql` | tabela `schema_migrations`, ajuste do enum `classe_passagem` para as 8 classes reais recebidas do Lucas | feedback 30/jun |
| `0009_veiculos_maquinas.sql` | schema MVP de Veículos/Máquinas: envio, fotos/checklist e eventos/bipes append-only | validação 25/jun |
| `0010_navegacao_operacional.sql` | ajustes para o front aprovado: `viagem.codigo`, destino, capacidade disponível por classe, `client_uuid`, observação de escala e `status_viagem.cancelada` | Fase 2 |
| `0011_tms_operacional.sql` | ajustes para Nova Carga/Encomendas: `carga.codigo`, pedido, categoria, origem, peso total e origem do documento fiscal | Fase 2 |
| `0012_vendas_caixa_operacional.sql` | snapshots operacionais de bilhete/caixa para PDV, manifesto, area do cliente e app de embarque | Fase 2 |
| `0013_portal_pedido_pagamento_fiscal.sql` | Pedido, Reserva, Pagamento/Webhook stub e Documento Fiscal stub para portal online MVP | Fase 2 |
| `0014_prestacao_contas_operacional.sql` | unicidade operacional de prestação de contas por viagem/gerente | Fase 2 |
| `0015_financeiro_titulos_minimos.sql` | títulos AP/AR mínimos para o caixa financeiro do MVP, sem antecipar Compras/DRE | Fase 2 |

## Convenções aplicadas (§1.1)

- **PK**: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` (cidade usa `sigla` como PK natural).
- **Timestamps**: `criado_em timestamptz NOT NULL DEFAULT now()`; `atualizado_em timestamptz` mantido por trigger `set_atualizado_em()` (definida em `0003`).
- **Soft-delete**: `excluido_em timestamptz NULL` só em mestres (cliente, agente, embarcacao, usuario, fornecedor, palete, tabela_preco… conforme doc). Tabelas de evento/append-only não têm.
- **Auditoria de linha**: `criado_por` / `atualizado_por` → `usuario(id)`.
- **Sync offline (§12)**: `client_uuid uuid` nas 9 tabelas de campo (`carga`, `volume`, `evento_volume`, `carga_recebimento`, `registro_portaria`, `entrega_comprovante`, `bilhete`, `caixa_movimento`, `audit_evento`) — cada uma com índice único parcial `ux_<tabela>_client_uuid ... WHERE client_uuid IS NOT NULL`.
- **Índices únicos parciais**: `config_versao` (1 versão ativa por chave), `tabela_preco` (1 versão ativa por tipo), `cliente.cpf_cnpj` (vivos), `entrega_comprovante.protocolo`, etc.
- **GiST**: `posicao_embarcacao.posicao` (`geography(Point,4326)`).
- **Dinheiro** `numeric(12,2)`, **percentual** `numeric(5,2)`, **peso** `numeric(10,3)`.

## Idempotência

- `CREATE EXTENSION IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
- Enums (`CREATE TYPE` não tem `IF NOT EXISTS` no PG16): cada um em bloco `DO ... EXCEPTION WHEN duplicate_object`.
- FKs adiadas (`0007`): `ADD CONSTRAINT` em bloco `DO` que ignora `duplicate_object`.
- Triggers: `DROP TRIGGER IF EXISTS` antes do `CREATE TRIGGER`.

Rodar a suíte novamente sobre um banco já migrado não deve gerar erro.

## Como aplicar

Pré-requisito: PostgreSQL 16 + PostGIS + btree_gist. Nesta máquina, o banco roda nativo no WSL2; **não usar Docker Desktop**.

O caminho atual é o runner Node com controle em `schema_migrations`:

```bash
cd infra/migrations
DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc node run.mjs --status
DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc node run.mjs
```

Como o `pg` está instalado em `apps/api`, o runner ancora a resolução por padrão nesse pacote. Se o layout mudar, use `PG_REQUIRE_BASE`.

```bash
PG_REQUIRE_BASE=/caminho/para/package-com-pg \
DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc \
node run.mjs --status
```

O loop manual com `psql` continua útil apenas para diagnóstico ou bootstrap controlado:

```bash
# Variáveis de conexão
export PGHOST=localhost PGPORT=5432 PGUSER=ajc PGDATABASE=ajc
export PGPASSWORD=...    # ou use ~/.pgpass

# Aplica todas as migrations em ordem, parando no primeiro erro
cd infra/migrations
for f in $(ls -1 *.sql | sort); do
  echo ">>> aplicando $f"
  psql -v ON_ERROR_STOP=1 -f "$f" || { echo "FALHOU em $f"; exit 1; }
done
```

Via container (compose já de pé):

```bash
for f in $(ls -1 infra/migrations/*.sql | sort); do
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U ajc -d ajc < "$f"
done
```

> Desde `0008`, existe controle em `schema_migrations`. As migrations 0001-0008 foram registradas via `--baseline` porque já estavam aplicadas manualmente no banco de dev. Novas migrations devem ser aplicadas pelo runner.

## Auditoria imutável (produção)

`audit_evento` é append-only. Em produção, revogar `UPDATE`/`DELETE` da role da aplicação
(ver comentário no topo de `0006`):

```sql
REVOKE UPDATE, DELETE ON audit_evento FROM <app_role>;
GRANT  INSERT, SELECT ON audit_evento TO   <app_role>;
```

## Pontos de interpretação (ver `-- NOTA` / `-- 🔶` nos arquivos)

- **`palete.terceiro_id`** (🔶 cliente vs. fornecedor): deixado como `uuid` **sem FK** por ser polimórfico. Decisão técnica pendente (§17).
- **`palete_viagem`**: "1 palete não pode estar em 2 viagens" é validado em serviço — a §8.5 não define coluna de status de alocação para um índice parcial determinístico.
- **Seeds** (cidades, perfis, matriz RBAC, chaves de config) **não** entram aqui; são dados, não schema. Ver §2.1 e §17 do modelo.
