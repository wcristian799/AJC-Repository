# Modelo de Dados Canônico — MVP (ERP/TMS AJC)

> **Fonte da verdade para as migrations Postgres.** Consolida as entidades dispersas em pseudo-schema nos módulos (`docs/modulos/01..09`), no `SPEC.md` e no ADR de arquitetura. Cobre **apenas o MVP**: Fundação/Acesso, motor de config, cadastros, clientes/agentes, navegação-core, preços, TMS/carga, veículos/máquinas, vendas/passagens, CRM, caixa mínimo e auditoria.
>
> Fora de escopo (marcado com gancho onde houver): Financeiro completo, PDV F&B, Encomenda-com-preço, rastreamento avançado. Onde algo depende de informação pendente do cliente, está marcado com 🔶 e **não bloqueia** a criação da tabela (a coluna existe, entra vazia/placeholder).
>
> **Nota 2026-06-29:** a validação do cliente de 25/jun/2026 trouxe **Veículos/Máquinas para o MVP**. Este modelo/migrations ainda precisam ser atualizados antes do backend definitivo para materializar checklist, fotos, etiqueta, bipe de subida/descida e entrega de veículos.

---

## 1. Visão geral e convenções

### 1.1 Convenções de coluna (valem para toda tabela, salvo nota)

| Convenção | Regra |
|---|---|
| **PK** | `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` (extensão `pgcrypto`). |
| **Timestamps** | `criado_em timestamptz NOT NULL DEFAULT now()`; `atualizado_em timestamptz` atualizado por trigger em update. |
| **Auditoria de linha** | `criado_por uuid REFERENCES usuario(id)`; `atualizado_por uuid REFERENCES usuario(id)` nas entidades mutáveis por usuário. |
| **Soft-delete** | `excluido_em timestamptz NULL` nas entidades de cadastro/mestre (cliente, agente, embarcação, usuário, fornecedor, palete, tabela de preço). Tabelas de evento/append-only **não** têm soft-delete. |
| **Sync offline** | `client_uuid uuid` nas entidades geradas no campo (offline-first), com índice único para idempotência. Ver §8. |
| **Dinheiro** | `numeric(12,2)`. **Percentual** `numeric(5,2)`. **Peso (kg)** `numeric(10,3)`. |
| **Geo** | `geography(Point,4326)` (PostGIS) para posição/evento georreferenciado. Ver §9. |
| **Texto livre** | `text`; campos curtos com limite de negócio usam `varchar(n)`. |
| **JSON** | `jsonb` para estruturas variáveis (config, parâmetros de cotação, permissões). |

### 1.2 Princípios herdados das decisões fechadas
- **Identidade física = UUID + QR.** Volume de carga e bilhete carregam UUID/token âncora da rastreabilidade e do antifraude.
- **Auditoria imutável.** Todo evento operacional/financeiro grava quem/quando/onde/dispositivo (e GPS/foto quando aplicável) — §7.
- **Configurável > hard-code.** Preços, termos, tolerâncias, cores de pulseira e comissões vivem no **motor de config versionado** (§5) ou nas **tabelas de preço versionadas** (§6) — nunca em `if` no código.
- **Blobs fora do banco.** Fotos, assinaturas e arquivos de NF ficam em object storage; o banco guarda **referência (URL/chave) + hash**, nunca o binário — §9.
- **Módulos se falam por serviço, não por tabela alheia.** O schema é único, mas cada tabela "pertence" a um módulo (coluna *Módulo* nas seções). FKs cruzam fronteiras só onde o domínio exige.

### 1.3 Extensões Postgres necessárias
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis;    -- geography(Point,4326)
CREATE EXTENSION IF NOT EXISTS btree_gist; -- exclusões/índices compostos (vigência)
```

---

## 2. Enums e domínios

Modelados como `enum` Postgres quando o conjunto é fechado e estável; como **tabela de domínio** quando o cliente pode editar (cidades podem crescer; subtipos de camarote são 🔶). Os enums também vivem em `libs/shared/domain-types` (TS) — esta é a fonte da verdade no banco.

```sql
-- Acesso / pessoas
CREATE TYPE tipo_pessoa            AS ENUM ('PF','PJ');

-- Navegação
CREATE TYPE tipo_embarcacao        AS ENUM ('passeio_carga','carga');
CREATE TYPE status_embarcacao      AS ENUM ('ativa','manutencao','alugada');
CREATE TYPE status_viagem          AS ENUM ('planejada','em_curso','concluida');
CREATE TYPE situacao_viagem        AS ENUM ('no_prazo','atencao','atrasado');
CREATE TYPE status_escala          AS ENUM ('planejada','notificada','confirmada','cancelada');

-- TMS / Carga
CREATE TYPE tipo_recebimento_carga AS ENUM ('porto_balsa','direto');           -- (b) = cross-docking
CREATE TYPE status_carga           AS ENUM ('aberta','conferida','embarcada','entregue','divergente','cancelada');
CREATE TYPE status_volume          AS ENUM ('recebido','conferido','embarcado','reconferido','desembarcado','entregue','divergente');
CREATE TYPE tipo_evento_volume     AS ENUM ('recebido','conferido','embarcado','reconferido','desembarcado','entregue','divergencia');
CREATE TYPE proprietario_palete    AS ENUM ('AJC','terceiro');
CREATE TYPE status_palete          AS ENUM ('livre','alocado','em_transito');
CREATE TYPE tipo_documento_fiscal  AS ENUM ('NFe','NFCe','DC');               -- DC = Declaração de Conteúdo
CREATE TYPE status_documento_fiscal AS ENUM ('pendente','conferida','divergente');
CREATE TYPE tipo_registro_portaria AS ENUM ('veiculo_carga','veiculo_transporte','pessoa');
CREATE TYPE status_prestacao       AS ENUM ('rascunho','enviada','conferida');

-- Vendas / Passagens
-- Atualizado por material do Lucas em 30/jun/2026: classes reais por embarcação.
CREATE TYPE classe_passagem        AS ENUM ('rede','rede_sala_vip','camarote','suite_comum','suite_comum_vip','suite_master','suite_master_vip','mega_suite');
CREATE TYPE tipo_bilhete           AS ENUM ('online','pdv','totem','contrato','cortesia','gratuidade');
CREATE TYPE status_bilhete         AS ENUM ('emitido','validado','usado','cancelado','reembolsado');
CREATE TYPE tipo_gratuidade        AS ENUM ('idoso','pcd','crianca','outro');  -- 🔶 lista legal a confirmar

-- CRM
CREATE TYPE tipo_cotacao           AS ENUM ('encomenda','carga','veiculo');
CREATE TYPE status_cotacao         AS ENUM ('aberta','convertida','expirada');

-- Preços
CREATE TYPE tipo_tabela_preco      AS ENUM ('passagem','encomenda','carga');

-- Caixa
CREATE TYPE status_caixa           AS ENUM ('aberto','fechado');
CREATE TYPE tipo_movimento_caixa   AS ENUM ('venda_passagem','despacho_carga','sangria','suprimento','outro');
CREATE TYPE forma_pagamento        AS ENUM ('dinheiro','pix','cartao_credito','cartao_debito','contrato','cortesia','gratuidade');

-- Auditoria
CREATE TYPE acao_audit             AS ENUM ('criar','atualizar','excluir','transicao_status','validar','conferir','entregar','login','config_publicar','reajuste_preco');
```

### 2.1 Domínio editável: cidade (siglas)
Tabela em vez de enum — as 8 conhecidas entram via seed, mas o conjunto pode crescer.

| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `sigla` | `varchar(4)` PK | não | — | BEL, BRV, GUR, ALM, PMZ, PRA, MTA, STM |
| `nome` | `varchar(120)` | não | — | Belém, Breves, Gurupá, Almeirim, Porto de Moz, Prainha, Monte Alegre, Santarém |
| `uf` | `char(2)` | não | `'PA'` | |
| `is_base` | `boolean` | não | `false` | Belém = base/origem |
| `ativo` | `boolean` | não | `true` | |

> Seed inicial: `BEL` Belém (base), `BRV` Breves, `GUR` Gurupá, `ALM` Almeirim, `PMZ` Porto de Moz, `PRA` Prainha, `MTA` Monte Alegre, `STM` Santarém.

---

## 3. Fundação / Acesso (módulos `auth/`, `cadastros/`)

### 3.1 `perfil`  *(módulo: auth/cadastros)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | gen_random_uuid() | |
| `nome` | varchar(60) | não | — | Comercial, Price, Administrador, Financeiro, Conferente, Porteiro, Bilheteiro, Gerente |
| `descricao` | text | sim | — | |
| `ativo` | boolean | não | true | |
| `criado_em` / `atualizado_em` | timestamptz | | | |

- Único: `(nome)`.

### 3.2 `permissao`  *(módulo: auth)* — catálogo de ações RBAC (`modulo.acao`)
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `modulo` | varchar(40) | não | — | tms, vendas, crm, precos, cadastros, navegacao, caixa… |
| `acao` | varchar(40) | não | — | criar, editar, validar, conferir, entregar, reajustar… |
| `descricao` | text | sim | | |

- Único: `(modulo, acao)`.

### 3.3 `perfil_permissao`  *(módulo: auth)* — matriz N:N perfil × permissão
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `perfil_id` | uuid | não | FK `perfil(id)` ON DELETE CASCADE |
| `permissao_id` | uuid | não | FK `permissao(id)` ON DELETE CASCADE |

- PK composta `(perfil_id, permissao_id)`. 🔶 Matriz inicial perfis × permissões a definir (seed).

### 3.4 `usuario`  *(módulo: auth/cadastros)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `nome` | varchar(160) | não | — | |
| `login` | varchar(60) | não | — | único |
| `email` | varchar(160) | sim | — | |
| `senha_hash` | text | não | — | argon2/bcrypt; nunca texto puro |
| `perfil_id` | uuid | não | — | FK `perfil(id)` |
| `colaborador_id` | uuid | sim | — | FK `colaborador(id)` (operador de campo ligado a colaborador) |
| `ativo` | boolean | não | true | |
| `ultimo_login_em` | timestamptz | sim | | |
| `criado_por` / `atualizado_por` | uuid | sim | | FK `usuario(id)` (auto-ref) |
| `criado_em` / `atualizado_em` / `excluido_em` | timestamptz | | | soft-delete |

- Único: `(login)`; índice `(perfil_id)`.

### 3.5 `sessao`  *(módulo: auth)* — sessões/refresh; suporta login offline dos apps de campo
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `usuario_id` | uuid | não | — | FK `usuario(id)` |
| `dispositivo` | varchar(120) | sim | — | id do device de campo |
| `refresh_hash` | text | não | — | |
| `expira_em` | timestamptz | não | — | sessão longa + PIN no campo |
| `revogada_em` | timestamptz | sim | — | |
| `criado_em` | timestamptz | não | now() | |

- Índice `(usuario_id)`, `(expira_em)`.

### 3.6 `fornecedor`  *(módulo: cadastros)* — gancho p/ Financeiro (fase posterior)
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `id` | uuid PK | não | |
| `nome` | varchar(160) | não | |
| `cnpj` | varchar(18) | sim | |
| `categoria` | varchar(60) | sim | |
| `contatos` | jsonb | sim | `[{tipo,valor}]` |
| `dados_bancarios` | jsonb | sim | 🔶 usado por contas a pagar — *fase posterior* |
| `ativo` | boolean | não | default true |
| timestamps + `excluido_em` | | | soft-delete |

### 3.7 `colaborador`  *(módulo: cadastros)*
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `id` | uuid PK | não | |
| `nome` | varchar(160) | não | |
| `funcao` | varchar(60) | sim | conferente, porteiro, bilheteiro, gerente… |
| `cidade_sigla` | varchar(4) | sim | FK `cidade(sigla)` |
| `contato_whatsapp` | varchar(20) | sim | usado na notificação de escala |
| `ativo` | boolean | não | default true |
| timestamps + `excluido_em` | | | soft-delete |

---

## 4. Clientes e Agentes (módulo `clientes/`, consumido por CRM e Vendas)

### 4.1 `agente`  *(módulo: clientes)* — 1 agente comercial por cidade
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `nome` | varchar(160) | não | — | |
| `cidade_sigla` | varchar(4) | não | — | FK `cidade(sigla)` |
| `percentual_comissao` | numeric(5,2) | sim | — | 🔶 regras de comissão pendentes (diretoria) |
| `ativo` | boolean | não | true | |
| timestamps + `excluido_em` | | | | soft-delete |

- Índice `(cidade_sigla)`.

### 4.2 `cliente`  *(módulo: clientes)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `tipo` | tipo_pessoa | não | — | PF/PJ |
| `nome` | varchar(160) | não | — | |
| `cpf_cnpj` | varchar(18) | sim | — | validado; LGPD: acesso logado, mascarado em listas |
| `cidade_sigla` | varchar(4) | sim | — | FK `cidade(sigla)` |
| `agente_id` | uuid | sim | — | FK `agente(id)` — base da comissão/split |
| `contatos` | jsonb | sim | `[]` | `[{tipo:whatsapp|email|tel, valor}]` |
| `senha_hash` | text | sim | — | autocadastro self-service (site/app) |
| `aceite_lgpd_em` | timestamptz | sim | — | termos de uso/privacidade |
| `criado_por` / `atualizado_por` | uuid | sim | | |
| timestamps + `excluido_em` | | | | soft-delete |

- Único parcial: `(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL AND excluido_em IS NULL`.
- Índices: `(agente_id)`, `(cidade_sigla)`, `(nome)`.

### 4.3 `cliente_agente_historico`  *(módulo: crm)* — realocação de cliente entre agentes (B.3 CRM)
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `id` | uuid PK | não | |
| `cliente_id` | uuid | não | FK `cliente(id)` |
| `agente_anterior_id` | uuid | sim | FK `agente(id)` |
| `agente_novo_id` | uuid | não | FK `agente(id)` |
| `motivo` | text | sim | |
| `realocado_por` | uuid | não | FK `usuario(id)` |
| `criado_em` | timestamptz | não | append-only |

---

## 5. Motor de configuração versionado (módulo `config/`)

"Tudo configurável, zero hard-code." Toda regra variável é **dado versionado em JSONB**, com vigência e autor. Alteração **nunca sobrescreve**: cria nova versão (rollback nativo). Pendências 🔶 entram como chave vazia/placeholder sem bloquear.

### 5.1 `config_chave`  *(módulo: config)* — catálogo das chaves configuráveis
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `chave` | varchar(120) | não | — | ex.: `termo_embarque`, `declaracao_conteudo`, `tolerancia_atraso`, `cores_pulseira`, `limite_cortesia_viagem`, `comissao_agente` |
| `categoria` | varchar(60) | sim | — | termos, tolerancias, vendas, tms… |
| `descricao` | text | sim | — | |
| `schema_json` | jsonb | sim | — | JSON Schema de validação do valor |
| `ativo` | boolean | não | true | |
| timestamps | | | | |

- Único: `(chave)`.

### 5.2 `config_versao`  *(módulo: config)* — valor versionado de cada chave
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `chave_id` | uuid | não | — | FK `config_chave(id)` |
| `versao` | integer | não | — | incremental por chave |
| `valor` | jsonb | não | `'{}'` | conteúdo configurado (texto do termo, mapa de cores, número de tolerância…) |
| `vigente_desde` | timestamptz | não | now() | |
| `vigente_ate` | timestamptz | sim | — | NULL = vigente; preenchido ao publicar a próxima versão |
| `ativo` | boolean | não | true | exatamente uma versão ativa por chave |
| `autor_id` | uuid | não | — | FK `usuario(id)` (auditoria) |
| `publicado_em` | timestamptz | não | now() | |

- Único: `(chave_id, versao)`.
- Índice único parcial: `(chave_id) WHERE ativo` — garante 1 versão vigente por chave.
- Cache em memória no back, invalidado ao publicar nova versão.

> **Reuso pelo reajuste de preço:** o versionamento de preços (§6) segue o mesmo princípio, mas mora em tabelas relacionais próprias (consultas por classe/trecho/tier exigem colunas, não JSONB).

---

## 6. Preços versionados + reajuste em massa (módulo `precos/`)

Três tipos de tabela: **passagem** (classe/subtipo/trecho), **carga** (tier = % de preço por trecho) e **encomenda** (P/M/G + percentual — 🔶 valores pendentes, Lucas). Cada publicação é uma **versão**; o reajuste ± X% cria nova versão aplicando o percentual a todos os itens.

### 6.1 `tabela_preco`  *(módulo: precos)* — cabeçalho versionado
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `tipo` | tipo_tabela_preco | não | — | passagem / encomenda / carga |
| `versao` | integer | não | — | incremental por tipo |
| `vigente_desde` | timestamptz | não | now() | |
| `vigente_ate` | timestamptz | sim | — | NULL = vigente |
| `ativo` | boolean | não | true | 1 versão vigente por tipo |
| `motivo` | varchar(160) | sim | — | "reajuste anual", "correção" |
| `percentual_reajuste` | numeric(5,2) | sim | — | preenchido quando a versão nasceu de reajuste em massa (±X%) |
| `origem_versao_id` | uuid | sim | — | FK auto-ref `tabela_preco(id)` — versão de onde o reajuste partiu |
| `criado_por` | uuid | não | — | FK `usuario(id)` |
| `criado_em` | timestamptz | não | now() | |

- Único: `(tipo, versao)`; índice único parcial `(tipo) WHERE ativo`.

### 6.2 `item_preco`  *(módulo: precos)* — linhas da tabela
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `tabela_id` | uuid | não | — | FK `tabela_preco(id)` ON DELETE CASCADE |
| `classe` | classe_passagem | sim | — | só `tipo=passagem` |
| `subtipo` | varchar(60) | sim | — | subtipo de camarote (ex.: Royal) 🔶 |
| `tamanho` | char(1) | sim | — | P/M/G — só `tipo=encomenda` 🔶 |
| `tier` | varchar(40) | sim | — | tier de carga (= % de preço) — só `tipo=carga` |
| `origem_sigla` | varchar(4) | sim | — | FK `cidade(sigla)` — trecho origem |
| `destino_sigla` | varchar(4) | sim | — | FK `cidade(sigla)` — trecho destino |
| `embarcacao_id` | uuid | sim | — | FK `embarcacao(id)` — preço específico de barco (ex.: Rede VIP da emb. 5) |
| `valor` | numeric(12,2) | sim | — | preço absoluto |
| `percentual` | numeric(5,2) | sim | — | quando o preço é % (carga tier; encomenda acima de R$1.000) |
| `criado_em` | timestamptz | não | now() | |

- Índice: `(tabela_id)`, `(tabela_id, classe, origem_sigla, destino_sigla)`.
- O **bilhete/carga** referencia o `item_preco` aplicado (snapshot do preço pago fica na própria venda — ver §10/§11).

---

## 7. Navegação-core (módulo `navegacao/`)

### 7.1 `embarcacao`  *(módulo: navegacao)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `nome` | varchar(120) | não | — | |
| `tipo` | tipo_embarcacao | não | — | passeio_carga / carga |
| `capacidade_carga` | numeric(10,3) | sim | — | kg ou m³ (definir unidade no seed) |
| `capacidade_pax` | jsonb | sim | `'{}'` | capacidade por classe real da embarcação; ver `docs/feedback/2026-06-30-lucas-campos-navegacao-tms.md` |
| `status` | status_embarcacao | não | `'ativa'` | ativa/manutencao/alugada — em manutenção não recebe viagem |
| timestamps + `excluido_em` | | | | soft-delete |

### 7.2 `viagem`  *(módulo: navegacao)* — eixo central; quase tudo se vincula a viagem
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `embarcacao_id` | uuid | não | — | FK `embarcacao(id)` |
| `origem_sigla` | varchar(4) | não | — | FK `cidade(sigla)` |
| `data_hora_saida` | timestamptz | não | — | |
| `data_hora_retorno` | timestamptz | sim | — | |
| `status` | status_viagem | não | `'planejada'` | planejada/em_curso/concluida |
| `situacao` | situacao_viagem | sim | — | no_prazo/atencao/atrasado (calculada vs. posição real; tolerância via config) |
| `criado_por` | uuid | sim | — | |
| timestamps | | | | |

- Índices: `(embarcacao_id)`, `(data_hora_saida)`, `(status)`.
- Restrição de agenda (conflito de embarcação) validada em serviço; opcional exclusão via `btree_gist` por sobreposição de período.

### 7.3 `viagem_escala`  *(módulo: navegacao)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `viagem_id` | uuid | não | — | FK `viagem(id)` ON DELETE CASCADE |
| `cidade_sigla` | varchar(4) | não | — | FK `cidade(sigla)` |
| `ordem` | smallint | não | — | sequência da escala |
| `data_hora_prevista` | timestamptz | sim | — | chegada prevista |
| `data_hora_real` | timestamptz | sim | — | chegada real (alimenta situação) |

- Único: `(viagem_id, ordem)`; índice `(viagem_id)`.

### 7.4 `posicao_embarcacao`  *(módulo: navegacao/telemetria)* — **resumo** de GPS (não cada ping)
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `embarcacao_id` | uuid | não | — | FK `embarcacao(id)` |
| `viagem_id` | uuid | sim | — | FK `viagem(id)` |
| `posicao` | geography(Point,4326) | não | — | PostGIS — lat/lng |
| `velocidade` | numeric(6,2) | sim | — | nós/km/h |
| `capturado_em` | timestamptz | não | — | |

- Índice GiST `(posicao)`; índice `(embarcacao_id, capturado_em)`.
- **Tempo real não passa pelo back** (vai a Firebase). Job pg-boss resume a cada X min e grava aqui (histórico/auditoria de cronograma). Detalhe no ADR §7.

### 7.5 `escala_colaborador`  *(módulos: navegacao + cadastros, compartilhada)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `colaborador_id` | uuid | não | — | FK `colaborador(id)` |
| `viagem_id` | uuid | sim | — | FK `viagem(id)` (ou período) |
| `periodo_inicio` / `periodo_fim` | timestamptz | sim | — | escala por período quando não há viagem fixa |
| `funcao` | varchar(60) | sim | — | função na viagem |
| `status` | status_escala | não | `'planejada'` | planejada/notificada/confirmada/cancelada |
| `notificado_em` | timestamptz | sim | — | WhatsApp 🔶 provedor |
| `confirmado_em` | timestamptz | sim | — | confirmação de recebimento |
| timestamps | | | | |

- Índice `(colaborador_id, viagem_id)`; conflito de escala (mesmo colaborador em 2 viagens) validado em serviço.

---

## 8. TMS / Carga (módulo `tms/`) — coração do antifraude, offline-first

### 8.1 `carga`  *(módulo: tms)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `viagem_id` | uuid | não | — | FK `viagem(id)` |
| `cliente_remetente_id` | uuid | não | — | FK `cliente(id)` |
| `destinatario_id` | uuid | sim | — | FK `cliente(id)` |
| `destinatario_nome` | varchar(160) | sim | — | quando destinatário não é cliente cadastrado |
| `cidade_destino_sigla` | varchar(4) | não | — | FK `cidade(sigla)` |
| `tipo_recebimento` | tipo_recebimento_carga | não | — | porto_balsa / direto (cross-docking) |
| `status` | status_carga | não | `'aberta'` | |
| `valor_declarado` | numeric(12,2) | sim | — | |
| `valor_cobrado` | numeric(12,2) | sim | — | preço aplicado (snapshot) |
| `item_preco_id` | uuid | sim | — | FK `item_preco(id)` — tier/trecho aplicado 🔶 preço de carga |
| `agente_id` | uuid | sim | — | FK `agente(id)` — quem agenciou (comissão) |
| `client_uuid` | uuid | sim | — | **sync**: único parcial |
| `criado_por` / `atualizado_por` | uuid | sim | | FK `usuario(id)` |
| timestamps | | | | |

- Índices: `(viagem_id)`, `(cliente_remetente_id)`, `(cidade_destino_sigla)`, `(status)`.
- Único parcial: `(client_uuid) WHERE client_uuid IS NOT NULL` (idempotência de sync).

### 8.2 `volume`  *(módulo: tms)* — UUID = identidade física (QR)
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | gen_random_uuid() | **é o UUID impresso no QR da etiqueta** |
| `carga_id` | uuid | não | — | FK `carga(id)` ON DELETE CASCADE |
| `palete_id` | uuid | sim | — | FK `palete(id)` |
| `indice_volume` | smallint | não | — | ex.: 1 de "1/2" |
| `total_volumes` | smallint | não | — | ex.: 2 de "1/2" |
| `peso` | numeric(10,3) | sim | — | kg |
| `status` | status_volume | não | `'recebido'` | máquina de estados §8.x |
| `recebimento_id` | uuid | sim | — | FK `carga_recebimento(id)` — lote do cross-docking |
| `client_uuid` | uuid | sim | — | **sync** |
| `criado_em` / `atualizado_em` | timestamptz | | | |

- Índices: `(carga_id)`, `(palete_id)`, `(status)`.
- Único parcial: `(client_uuid) WHERE client_uuid IS NOT NULL`.

**Máquina de estados do volume** (cada transição = um `evento_volume`):
```
                  ┌─────── divergente (em qualquer ponto) ───────┐
recebido → conferido → embarcado → reconferido → desembarcado → entregue
Cross-docking: recebido+embarcado ───────────────► desembarcado → entregue
```

### 8.3 `evento_volume`  *(módulo: tms)* — **append-only**, trilha física por volume
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `volume_id` | uuid | não | — | FK `volume(id)` |
| `tipo` | tipo_evento_volume | não | — | recebido/conferido/embarcado/reconferido/desembarcado/entregue/divergencia |
| `usuario_id` | uuid | não | — | FK `usuario(id)` — quem efetivou (perfil porto/balsa registrado) |
| `gps` | geography(Point,4326) | sim | — | georreferência do evento (quando houver) |
| `foto_url` | text | sim | — | referência ao storage (não o binário) — §9 |
| `foto_hash` | varchar(64) | sim | — | hash de integridade da foto |
| `obs` | text | sim | — | |
| `client_uuid` | uuid | sim | — | **sync** |
| `ocorrido_em` | timestamptz | não | now() | carimbo do dispositivo |
| `criado_em` | timestamptz | não | now() | recebido no servidor |

- Índices: `(volume_id, ocorrido_em)`, `(tipo)`.
- Único parcial: `(client_uuid) WHERE client_uuid IS NOT NULL`.

### 8.4 `palete`  *(módulo: tms)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `codigo` | varchar(40) | não | — | impresso na etiqueta |
| `proprietario` | proprietario_palete | não | `'AJC'` | AJC / terceiro |
| `terceiro_id` | uuid | sim | — | FK `cliente(id)` ou `fornecedor(id)` (dono terceiro) 🔶 decidir alvo |
| `status` | status_palete | não | `'livre'` | livre/alocado/em_transito |
| timestamps + `excluido_em` | | | | |

- Único: `(codigo)`.

### 8.5 `palete_viagem`  *(módulo: tms)* — alocação palete↔viagem↔cidade
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `id` | uuid PK | não | |
| `palete_id` | uuid | não | FK `palete(id)` |
| `viagem_id` | uuid | não | FK `viagem(id)` |
| `cidade_destino_sigla` | varchar(4) | não | FK `cidade(sigla)` |
| `alocado_em` | timestamptz | não | default now() |

- Único parcial: `(palete_id) WHERE` alocação ativa — um palete não pode estar em duas viagens (validado em serviço).

### 8.6 `carga_recebimento`  *(módulo: tms)* — lotes do cross-docking (múltiplos recebimentos por viagem)
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `viagem_id` | uuid | não | — | FK `viagem(id)` |
| `carga_id` | uuid | sim | — | FK `carga(id)` |
| `ordem` | smallint | não | — | Recebimento 1, 2, 3… |
| `conferente_id` | uuid | não | — | FK `usuario(id)` — porto OU balsa (auditoria) |
| `foto_url` | text | sim | — | foto obrigatória do lote (storage) |
| `foto_hash` | varchar(64) | sim | — | |
| `client_uuid` | uuid | sim | — | **sync** |
| `criado_em` | timestamptz | não | now() | |

- Índice `(viagem_id, ordem)`; único parcial `(client_uuid)`.

### 8.7 `documento_fiscal`  *(módulo: tms)* — NF-e/NFC-e/Declaração de Conteúdo
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `tipo` | tipo_documento_fiscal | não | — | NFe/NFCe/DC |
| `numero` | varchar(60) | sim | — | número ou chave NF-e |
| `valor` | numeric(12,2) | sim | — | |
| `cliente_id` | uuid | sim | — | FK `cliente(id)` |
| `carga_id` | uuid | sim | — | FK `carga(id)` |
| `arquivo_url` | text | sim | — | PDF/foto no storage |
| `arquivo_hash` | varchar(64) | sim | — | |
| `status` | status_documento_fiscal | não | `'pendente'` | pendente/conferida/divergente |
| `lancado_por` | uuid | sim | — | FK `usuario(id)` (ADM Notas) |
| timestamps | | | | |

- Índice `(carga_id)`, `(status)`.

### 8.8 `declaracao_conteudo`  *(módulo: tms)* — termo + assinatura
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `id` | uuid PK | não | |
| `carga_id` | uuid | não | FK `carga(id)` |
| `valor_declarado` | numeric(12,2) | sim | |
| `descricao_informada` | text | sim | conteúdo declarado |
| `config_termo_versao_id` | uuid | sim | FK `config_versao(id)` — versão do texto do termo aceito 🔶 texto pendente |
| `assinatura_url` | text | sim | imagem da assinatura no storage |
| `assinatura_hash` | varchar(64) | sim | |
| `aceite_em` | timestamptz | sim | |
| `dispositivo` | varchar(120) | sim | |
| `ip` | inet | sim | |

### 8.9 `registro_portaria`  *(módulo: tms)* — entrada/saída no porto
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `placa` | varchar(10) | sim | — | veículos |
| `empresa` | varchar(160) | sim | — | autocomplete |
| `motorista_nome` | varchar(160) | sim | — | |
| `tipo` | tipo_registro_portaria | não | — | veiculo_carga/veiculo_transporte/pessoa |
| `entrada_em` | timestamptz | não | now() | carimbo do dispositivo |
| `saida_em` | timestamptz | sim | — | NULL = "no pátio" |
| `porteiro_id` | uuid | não | — | FK `usuario(id)` |
| `foto_url` | text | sim | — | storage |
| `client_uuid` | uuid | sim | — | **sync** |
| `criado_em` | timestamptz | não | now() | |

- Índices: `(saida_em)` (lista "no pátio" = NULL), `(placa)`. Único parcial `(client_uuid)`.

### 8.10 `entrega_comprovante`  *(módulo: tms)* — desembarque balsa→terra (encerra custódia AJC)
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `viagem_id` | uuid | sim | — | FK `viagem(id)` |
| `cidade_sigla` | varchar(4) | não | — | FK `cidade(sigla)` |
| `recebedor_agente_id` | uuid | sim | — | FK `agente(id)` — agente de carga da cidade |
| `recebedor_nome` | varchar(160) | sim | — | |
| `recebedor_doc` | varchar(20) | sim | — | |
| `recebedor_avulso` | boolean | não | false | true exige `justificativa` |
| `justificativa` | text | sim | — | quando não é o agente da cidade |
| `assinatura_url` | text | sim | — | assinatura em tela (storage) |
| `assinatura_hash` | varchar(64) | sim | — | |
| `foto1_url` / `foto2_url` | text | sim | — | 2 fotos obrigatórias (90°) |
| `foto1_hash` / `foto2_hash` | varchar(64) | sim | — | |
| `gps` | geography(Point,4326) | sim | — | |
| `protocolo` | varchar(40) | sim | — | nº do protocolo digital gerado |
| `entregue_por_conferente_id` | uuid | não | — | FK `usuario(id)` |
| `entregue_em` | timestamptz | não | now() | |
| `client_uuid` | uuid | sim | — | **sync** |

- Índice `(viagem_id)`, `(cidade_sigla)`. Único parcial `(client_uuid)`, `(protocolo)`.

### 8.11 `entrega_volume`  *(módulo: tms)* — N:N comprovante↔volume (um comprovante cobre vários volumes)
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `entrega_id` | uuid | não | FK `entrega_comprovante(id)` ON DELETE CASCADE |
| `volume_id` | uuid | não | FK `volume(id)` |

- PK composta `(entrega_id, volume_id)`.

> 🔶 **Última milha (agente→destinatário na cidade): fase posterior.** O gancho fica em `entrega_comprovante`; um novo registro/etapa com foto+assinatura do destinatário final entra se o cliente confirmar que deve ficar no escopo.

### 8.12 `prestacao_contas`  *(módulo: tms)* — gerente da embarcação; cruza com Financeiro (fase posterior)
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `viagem_id` | uuid | não | — | FK `viagem(id)` |
| `gerente_id` | uuid | não | — | FK `usuario(id)` |
| `total_declarado` | numeric(12,2) | sim | — | lançado pelo gerente |
| `total_sistema` | numeric(12,2) | sim | — | calculado |
| `divergencia` | numeric(12,2) | sim | — | declarado − sistema |
| `status` | status_prestacao | não | `'rascunho'` | rascunho/enviada/conferida |
| `itens` | jsonb | sim | `'[]'` | receitas/despesas lançadas (modelo real recebido em 29/jun/2026; ver feedback de prestação de contas) |
| `anexos` | jsonb | sim | `'[]'` | `[{url,hash}]` fotos/comprovantes no storage |
| timestamps | | | | |

- Índice `(viagem_id)`, `(status)`.

> 🔶 **Cruzamento automático com contas a receber = fase posterior** (Financeiro completo). A prestação fica pronta para ser consumida.

---

## 9. Vendas / Passagens (módulos `vendas/`, `caixa/`)

### 9.1 `bilhete`  *(módulo: vendas)* — QR único por passageiro/viagem
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `viagem_id` | uuid | não | — | FK `viagem(id)` |
| `cliente_id` | uuid | sim | — | FK `cliente(id)` (venda avulsa pode não ter) |
| `passageiro_nome` | varchar(160) | sim | — | quando avulso |
| `classe` | classe_passagem | não | — | rede/rede_sala_vip/camarote/suite_* conforme matriz recebida |
| `subtipo` | varchar(60) | sim | — | manter apenas se houver variação comercial extra além das classes recebidas |
| `tipo` | tipo_bilhete | não | — | online/pdv/totem/contrato/cortesia/gratuidade |
| `item_preco_id` | uuid | sim | — | FK `item_preco(id)` — tarifa aplicada |
| `preco_pago` | numeric(12,2) | sim | — | snapshot; 0 em cortesia/gratuidade |
| `qr_token` | varchar(120) | não | — | token assinado, não sequencial, único |
| `status` | status_bilhete | não | `'emitido'` | emitido→validado→usado; cancelado/reembolsado |
| `validado_em` | timestamptz | sim | — | embarque |
| `validado_por` | uuid | sim | — | FK `usuario(id)` (bilheteiro) |
| `validado_gps` | geography(Point,4326) | sim | — | local da 1ª validação |
| `caixa_movimento_id` | uuid | sim | — | FK `caixa_movimento(id)` (venda PDV) |
| `client_uuid` | uuid | sim | — | **sync** (validação offline) |
| `criado_por` / `criado_em` / `atualizado_em` | | | | |

- Único: `(qr_token)`; único parcial `(client_uuid) WHERE client_uuid IS NOT NULL`.
- Índices: `(viagem_id, classe)` (contador embarcados/capacidade), `(cliente_id)`, `(status)`.
- **Anti-fraude:** validação só uma vez por viagem; reuso mostra hora/local da 1ª (de `validado_em`/`validado_gps`).

### 9.2 `cortesia`  *(módulo: vendas)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `codigo` | varchar(40) | não | — | gerado |
| `viagem_id` | uuid | não | — | FK `viagem(id)` |
| `classe` | classe_passagem | sim | — | |
| `motivo` | text | sim | — | influência/relacionamento |
| `concedido_por` | uuid | não | — | FK `usuario(id)` |
| `bilhete_id` | uuid | sim | — | FK `bilhete(id)` quando consumida |
| `criado_em` | timestamptz | não | now() | |

- Único: `(codigo)`; índice `(viagem_id)`. Limite/contador por viagem via config (`limite_cortesia_viagem`).

### 9.3 `gratuidade`  *(módulo: vendas)* — relatório regulatório
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `id` | uuid PK | não | |
| `bilhete_id` | uuid | não | FK `bilhete(id)` |
| `tipo_legal` | tipo_gratuidade | não | idoso/pcd/… 🔶 lista legal |
| `documento_url` | text | sim | comprovante no storage |
| `documento_hash` | varchar(64) | sim | |
| `registrado_por` | uuid | não | FK `usuario(id)` |
| `criado_em` | timestamptz | não | |

### 9.4 `termo_aceite`  *(módulo: vendas)* — aceite de embarque
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `id` | uuid PK | não | |
| `bilhete_id` | uuid | não | FK `bilhete(id)` |
| `config_termo_versao_id` | uuid | sim | FK `config_versao(id)` — versão do texto 🔶 |
| `aceito_em` | timestamptz | não | |
| `ip` | inet | sim | |
| `dispositivo` | varchar(120) | sim | |

### 9.5 `nps`  *(módulo: vendas)* — pesquisa pós-viagem
| Coluna | Tipo | Null | Notas |
|---|---|---|---|
| `id` | uuid PK | não | |
| `viagem_id` | uuid | não | FK `viagem(id)` |
| `cliente_id` | uuid | sim | FK `cliente(id)` |
| `nota` | smallint | sim | 0–10 (CHECK) |
| `comentario` | text | sim | |
| `respondido_em` | timestamptz | sim | |
| `criado_em` | timestamptz | não | |

### 9.6 `caixa`  *(módulo: caixa)* — caixa mínimo do MVP
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `operador_id` | uuid | não | — | FK `usuario(id)` |
| `aberto_em` | timestamptz | não | now() | |
| `fechado_em` | timestamptz | sim | — | |
| `valor_abertura` | numeric(12,2) | não | 0 | |
| `valor_fechamento` | numeric(12,2) | sim | — | |
| `status` | status_caixa | não | `'aberto'` | aberto/fechado |

- Índice `(operador_id, status)`.

### 9.7 `caixa_movimento`  *(módulo: caixa)* — registra venda/despacho
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `caixa_id` | uuid | não | — | FK `caixa(id)` |
| `tipo` | tipo_movimento_caixa | não | — | venda_passagem/despacho_carga/sangria/suprimento/outro |
| `forma_pagamento` | forma_pagamento | sim | — | dinheiro/pix/cartão/contrato/cortesia/gratuidade |
| `valor` | numeric(12,2) | não | — | |
| `bilhete_id` | uuid | sim | — | FK `bilhete(id)` |
| `carga_id` | uuid | sim | — | FK `carga(id)` (despacho) |
| `criado_por` | uuid | não | — | FK `usuario(id)` |
| `client_uuid` | uuid | sim | — | **sync** (PDV pode operar offline) |
| `criado_em` | timestamptz | não | now() | |

- Índice `(caixa_id)`, único parcial `(client_uuid)`.

> 🔶 **Conciliação bancária, contas a receber/pagar e faturamento de contrato/mensal = Financeiro completo (fase posterior).** O caixa mínimo só registra entradas de venda/despacho.

---

## 10. CRM (módulo `crm/`)

### 10.1 `cotacao`  *(módulo: crm)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | | |
| `tipo` | tipo_cotacao | não | — | encomenda/carga/veiculo |
| `cliente_id` | uuid | não | — | FK `cliente(id)` |
| `agente_id` | uuid | sim | — | FK `agente(id)` (comissão) |
| `origem_sigla` / `destino_sigla` | varchar(4) | sim | — | FK `cidade(sigla)` — trecho |
| `parametros` | jsonb | sim | `'{}'` | tamanho/peso/tier conforme tipo |
| `valor_estimado` | numeric(12,2) | sim | — | carga/veículo usam tabela pronta; encomenda 🔶 |
| `validade` | timestamptz | sim | — | |
| `status` | status_cotacao | não | `'aberta'` | aberta/convertida/expirada |
| `convertida_carga_id` | uuid | sim | — | FK `carga(id)` quando vira despacho |
| `criado_por` / timestamps | | | | |

- Índice `(cliente_id)`, `(agente_id)`, `(status)`.

> **Histórico de envios** (CRM B.4): *view/consulta derivada* de `carga` + `volume` + `caixa_movimento` por `cliente_id` (data, trecho, nº de volumes, preço praticado). Não é tabela própria — evita duplicação. Veículos/Máquinas devem alimentar esse histórico no MVP assim que o modelo for atualizado; Encomenda-com-preço alimenta em fase posterior.

---

## 11. Auditoria (módulo `audit/`) — append-only, transversal

### 11.1 `audit_evento`  *(módulo: audit)*
| Coluna | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| `id` | uuid PK | não | gen_random_uuid() | |
| `entidade` | varchar(60) | não | — | nome da tabela/agregado (`bilhete`, `volume`, `config_versao`…) |
| `entidade_id` | uuid | sim | — | id do registro afetado |
| `acao` | acao_audit | não | — | criar/atualizar/excluir/transicao_status/validar/conferir/entregar/login/config_publicar/reajuste_preco |
| `usuario_id` | uuid | sim | — | FK `usuario(id)` (quem) |
| `perfil` | varchar(60) | sim | — | perfil no momento (snapshot) |
| `ocorrido_em` | timestamptz | não | now() | quando |
| `dispositivo` | varchar(120) | sim | — | onde (device de campo) |
| `gps` | geography(Point,4326) | sim | — | onde (geo) |
| `dados_antes` | jsonb | sim | — | estado anterior |
| `dados_depois` | jsonb | sim | — | estado novo |
| `client_uuid` | uuid | sim | — | **sync** (eventos gerados offline) |

- Índices: `(entidade, entidade_id)`, `(usuario_id, ocorrido_em)`, `(acao)`.
- **Imutável:** sem UPDATE/DELETE (garantido por permissão de role do banco + ausência de trigger de update). Inserção via serviço a cada evento de domínio relevante (conferência, validação, entrega, financeiro, publicação de config, reajuste de preço).

> Distinção: `evento_volume` é a trilha **operacional física** do volume (parte do fluxo de negócio); `audit_evento` é a trilha **transversal** de quem-mexeu-em-quê (genérica). Eventos de volume também emitem `audit_evento`.

---

## 12. Estratégia de sync offline

Tabelas geradas no campo (apps Capacitor offline-first) carregam `client_uuid uuid` + índice **único parcial** para idempotência. Reenvio não duplica; conflito resolvido por regra de domínio no back (ex.: volume `entregue` não volta a `embarcado`).

**Tabelas com `client_uuid`:** `carga`, `volume`, `evento_volume`, `carga_recebimento`, `registro_portaria`, `entrega_comprovante`, `bilhete`, `caixa_movimento`, `audit_evento`.

Padrão de índice (repetido em cada uma):
```sql
CREATE UNIQUE INDEX ux_<tabela>_client_uuid
  ON <tabela>(client_uuid) WHERE client_uuid IS NOT NULL;
```

Fluxo (ADR §5): device grava local (SQLite) → fila → módulo `sync/` aplica por `client_uuid`, ordena eventos, resolve conflito, devolve estado canônico. A escolha PowerSync vs. fila própria é isolada em `libs/offline-sync` (spike) e **não muda este schema**.

---

## 13. PostGIS e blobs

**PostGIS (`geography(Point,4326)`):** `posicao_embarcacao.posicao` (resumo de GPS, não cada ping — Firebase é a fonte em tempo real; job pg-boss resume para o Postgres), e o campo `gps` em `evento_volume`, `entrega_comprovante`, `bilhete.validado_gps`, `audit_evento`. Índices GiST onde há consulta espacial/painel.

**Blobs fora do banco:** fotos (recebimento, entrega, portaria), assinaturas e arquivos de NF/DC ficam em **object storage**; o banco guarda apenas `*_url` (referência/chave) + `*_hash` (varchar(64), integridade legal da prova). Nenhum binário em coluna `bytea`.

---

## 14. Diagrama textual das relações principais

```
cidade(sigla) ──< viagem.origem / escala / carga.destino / agente / cliente / trecho de preço

perfil 1──< usuario        perfil *──* permissao (perfil_permissao)
usuario 1──< sessao
colaborador 1──< usuario   colaborador *──< escala_colaborador >── viagem

agente 1──< cliente        cliente 1──< cliente_agente_historico
config_chave 1──< config_versao        (motor de config, JSONB versionado)
tabela_preco 1──< item_preco           (preços versionados; reajuste = nova versão)

embarcacao 1──< viagem 1──< viagem_escala
embarcacao 1──< posicao_embarcacao
viagem 1──< escala_colaborador

viagem 1──< carga 1──< volume *──1 palete
                          volume 1──< evento_volume      (trilha física, append-only)
                          volume *──* entrega_comprovante (via entrega_volume)
viagem 1──< carga_recebimento (cross-docking; lotes) 1──< volume
carga 1──1 declaracao_conteudo      carga *──< documento_fiscal
palete *──* viagem (palete_viagem)
viagem 1──< registro_portaria        viagem 1──1 prestacao_contas

viagem 1──< bilhete >──? cliente     bilhete 1──1 termo_aceite
bilhete 1──1 gratuidade              cortesia >──? bilhete
viagem 1──< nps
caixa 1──< caixa_movimento >──? bilhete / carga

cliente 1──< cotacao >──? agente >──? carga(convertida)

(transversal)  audit_evento ──► qualquer entidade (entidade + entidade_id)
```

---

## 15. Ordem de criação das tabelas (ordem das migrations)

Respeita as FKs (pais antes de filhos). Cada bloco pode ser uma migration.

```
0.  extensões: pgcrypto, postgis, btree_gist
1.  enums (todos os CREATE TYPE da §2)
2.  cidade
3.  perfil
4.  permissao
5.  perfil_permissao            (→ perfil, permissao)
6.  colaborador                 (→ cidade)
7.  usuario                     (→ perfil, colaborador, auto-ref)
8.  sessao                      (→ usuario)
9.  fornecedor
10. agente                      (→ cidade)
11. cliente                     (→ cidade, agente)
12. cliente_agente_historico    (→ cliente, agente, usuario)
13. config_chave
14. config_versao               (→ config_chave, usuario)
15. tabela_preco                (→ usuario, auto-ref)
16. item_preco                  (→ tabela_preco, cidade, embarcacao*)   *FK adicionada após 17
17. embarcacao
18. viagem                      (→ embarcacao, cidade, usuario)
19. viagem_escala               (→ viagem, cidade)
20. posicao_embarcacao          (→ embarcacao, viagem)
21. escala_colaborador          (→ colaborador, viagem)
22. palete                      (→ cliente/fornecedor 🔶)
23. carga                       (→ viagem, cliente, cidade, item_preco, agente, usuario)
24. carga_recebimento           (→ viagem, carga, usuario)
25. volume                      (→ carga, palete, carga_recebimento)
26. evento_volume               (→ volume, usuario)
27. palete_viagem               (→ palete, viagem, cidade)
28. documento_fiscal            (→ cliente, carga, usuario)
29. declaracao_conteudo         (→ carga, config_versao)
30. registro_portaria           (→ usuario)
31. entrega_comprovante         (→ viagem, cidade, agente, usuario)
32. entrega_volume              (→ entrega_comprovante, volume)
33. prestacao_contas            (→ viagem, usuario)
34. caixa                       (→ usuario)
35. bilhete                     (→ viagem, cliente, item_preco, usuario, caixa_movimento†)
36. caixa_movimento             (→ caixa, bilhete, carga, usuario)
37. cortesia                    (→ viagem, bilhete, usuario)
38. gratuidade                  (→ bilhete, usuario)
39. termo_aceite                (→ bilhete, config_versao)
40. nps                         (→ viagem, cliente)
41. cotacao                     (→ cliente, agente, cidade, carga)
42. audit_evento                (→ usuario)   [transversal, por último]
```

> † `bilhete.caixa_movimento_id` ↔ `caixa_movimento.bilhete_id` é dependência circular: criar uma das FKs como `ALTER TABLE ... ADD CONSTRAINT` após ambas as tabelas existirem (migration 36/após). Mesmo padrão para `item_preco.embarcacao_id` (criar tabela em 16 sem a FK; adicionar a FK depois de 17).

---

## 16. Notas de escopo (ganchos para fases posteriores)

- **Financeiro completo:** contas a pagar/receber, conciliação bancária, faturamento de contrato/mensal, comissão fechada do agente. Ganchos: `fornecedor.dados_bancarios`, `prestacao_contas` (cruzamento), `caixa_movimento`, `agente.percentual_comissao`.
- **Veículos/Máquinas (RF-5):** agora é MVP pela validação do cliente. Atualizar o modelo antes do backend definitivo com tabelas próprias para checklist de embarque/entrega, fotos, etiqueta, bipe de subida/descida e termo de aceite. Gancho atual existente: `cotacao.tipo='veiculo'`.
- **Encomenda-com-preço:** mecânica/tabela de preço P/M/G + percentual (🔶 Lucas). Ganchos: `item_preco.tamanho/percentual`, `cotacao.tipo='encomenda'`, despacho no PDV (`caixa_movimento.tipo='despacho_carga'` reaproveita `carga`/`volume`).
- **PDV F&B, Compras, Estoque:** sem tabelas no MVP.
- **Rastreamento avançado/telemetria MQTT:** `posicao_embarcacao` é o resumo; a fonte em tempo real (Firebase→MQTT) é externa e isolável.
- **Última milha de entrega:** 🔶 confirmar com cliente; gancho em `entrega_comprovante`.

---

## 17. Pendências 🔶 que afetam o modelo (não bloqueiam)

| Item | Onde no schema | Dono |
|---|---|---|
| Texto do termo de embarque | `config_versao` (chave `termo_embarque`) | AJC |
| Modelo de declaração de conteúdo | `config_versao` (`declaracao_conteudo`) + `declaracao_conteudo` | Lucas |
| Valores de preço de encomenda | `item_preco` (tamanho/percentual) | Lucas |
| Regras de comissão de agentes | `agente.percentual_comissao` / config | Diretoria |
| Cores de pulseira por classe | `config_versao` (`cores_pulseira`) | AJC |
| Tolerância atenção/atrasado | `config_versao` (`tolerancia_atraso`) | AJC |
| Subtipos de camarote (Royal…) | `item_preco.subtipo`, `bilhete.subtipo` | AJC |
| Lista legal de gratuidade | enum `tipo_gratuidade` | AJC/jurídico |
| Matriz inicial perfis × permissões | seed de `perfil_permissao` | Admin |
| Dono terceiro de palete (cliente vs. fornecedor) | `palete.terceiro_id` | decisão técnica |
| Unidade de capacidade de carga | `embarcacao.capacidade_carga` | AJC |
```
