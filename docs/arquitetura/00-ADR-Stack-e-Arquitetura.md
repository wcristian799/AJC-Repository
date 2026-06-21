# ADR 00 — Stack, Repositório e Arquitetura

> Documento de decisão de arquitetura (Architecture Decision Record). É o blueprint que o time abre no dia 1. Consolida as decisões tomadas com a diretoria e define o repositório, as fronteiras de módulo, a topologia de deploy e o caminho de evolução.

## 1. Stack consolidada (decisões fechadas)

| Camada | Escolha | Motivo curto |
|---|---|---|
| **Back** | **NestJS (TypeScript)** | Tipos ponta a ponta, modular, talento abundante, casa com pg-boss |
| **Front web** (back-office, PDV, totem) | **React + TypeScript** | Decisão do time; ecossistema e tipos compartilhados |
| **Apps de campo** (conferente, validação, portaria, entrega, agente) | **Ionic + Capacitor** (React) | Um código web → shell nativo; câmera, leitor, GPS background, impressora |
| **Banco** | **PostgreSQL** (+ PostGIS, JSONB) | Relacional forte p/ ERP/financeiro; PostGIS p/ geo; JSONB p/ config |
| **Fila / jobs** | **pg-boss** (sobre o Postgres) | Zero infra nova; job transacional com os dados; suficiente p/ o volume |
| **Tempo real (GPS)** | **Firebase** (Realtime DB/Firestore) | Desacopla do back; barato no volume de 3–7 barcos; offline nativo |
| **Sync offline** | Fila + idempotência por `client_uuid` (avaliar Firestore offline / PowerSync) | Offline é estado normal no campo |
| **Config / regras** | **Motor de configuração versionado** (JSONB + cache) | "Tudo configurável, zero hard-code" |
| **Hospedagem** | **Hostinger (VPS)** agora → **GCP/AWS** no futuro | Começar barato; arquitetura portável via Docker |

### Evolução planejada (cartas na manga, decididas por métrica, não por gosto)
- **MQTT próprio** substitui o Firebase quando a frota crescer para centenas de devices. Broker pronto (EMQX/Mosquitto) + serviço consumidor isolado.
- **Go** entra só se a medição mostrar gargalo num serviço específico (ex.: o consumidor MQTT, geração massiva de relatórios). Extração isolada, sem reescrever o resto.
- **Cloud gerenciada** (GCP/AWS) quando o tráfego/SLA justificar sair do VPS. Containers tornam a migração mecânica.

---

## 2. Decisão central: Monorepo + Monolito Modular

### 2.1 Por que monorepo
Um único repositório com back, fronts e código compartilhado. Ferramenta: **Nx** (orquestra build/test/deploy e entende o grafo de dependências entre pacotes).

**Por quê (alinhado ao que já decidimos):**
- **Tipos compartilhados de verdade.** O contrato de API, os enums (status de volume, classes de passagem, siglas de cidade) e os schemas de validação vivem num pacote `shared` consumido pelo back **e** por todos os fronts. O contrato deixa de ser documento que desatualiza e vira código. Esse foi um dos motivos de escolher TS ponta a ponta — o monorepo é o que materializa esse ganho.
- **Um PR atravessa as camadas.** Mudou uma regra de conferência? O mesmo PR ajusta back, app do conferente e tipos, com tudo testado junto.
- **Padrões e componentes únicos.** O design system da Fundação UX vira um pacote `ui` reutilizado pelos fronts.

### 2.2 Por que monolito modular (e não microserviços)
O back é **um processo NestJS** dividido em **módulos com fronteiras claras** — não uma sopa de serviços distribuídos.

**Por quê:**
- **Hostinger.** Você começa num VPS. Microserviços ali seriam custo e complexidade operacional sem retorno. Um processo + Postgres + workers cabe num VPS modesto.
- **Velocidade de MVP.** Sem rede entre serviços, sem orquestração; deploy simples.
- **Sem perder o futuro.** Como os módulos têm fronteiras explícitas (cada um expõe só sua interface), **extrair um módulo para serviço próprio depois é mecânico** — é exatamente assim que o serviço de telemetria (e um eventual serviço em Go) vai sair quando a métrica pedir. Monolito modular = "microserviços quando precisar, sem o custo agora".

> Regra de ouro: **módulos se falam por interfaces de serviço, nunca por acesso direto à tabela um do outro.** É isso que mantém a porta aberta para extrair serviços no futuro.

---

## 3. Estrutura do repositório

```
ajc/                                  (monorepo Nx)
├─ apps/
│  ├─ api/                            NestJS — o monolito modular (back)
│  ├─ web-console/                    React — back-office (ERP, financeiro, cadastros, CRM, navegação)
│  ├─ web-pdv/                        React — PDV de passagem e encomenda (caixa do porto) + totem
│  ├─ field-conferente/              Ionic+Capacitor — app do conferente (porto/balsa)
│  ├─ field-validacao/               Ionic+Capacitor — app de validação (bilheteiro)
│  ├─ field-portaria/                Ionic+Capacitor — app da portaria
│  ├─ field-entrega/                 Ionic+Capacitor — app de entrega (pode fundir c/ conferente)
│  └─ app-cliente/                    React (web) — site/app do passageiro (compra, NPS)
│
├─ libs/
│  ├─ shared/
│  │  ├─ domain-types/               enums, DTOs, tipos de entidade (compartilhado back↔front)
│  │  ├─ api-contract/               contratos de endpoint (tipados; fonte da verdade da API)
│  │  └─ validation/                 schemas de validação (zod) usados nos 2 lados
│  ├─ ui/                            design system da Fundação UX (componentes React)
│  ├─ ui-field/                      componentes de campo (ScanButton, CounterBadge, etc.)
│  ├─ offline-sync/                  cliente de fila/sync offline (usado pelos apps de campo)
│  └─ config-client/                 leitura do motor de configuração (cache + tipos)
│
├─ infra/
│  ├─ docker/                        Dockerfiles e docker-compose (VPS Hostinger)
│  ├─ migrations/                    migrações de banco (versionadas)
│  └─ seed/                          dados iniciais (siglas de cidade, perfis, etc.)
│
└─ docs/                             PRD, SPEC, módulos, UX, ROADMAP, este ADR
```

### 3.1 Módulos do back (`apps/api/src/modules/`)
Espelham os domínios do PRD, na ordem de dependência:

```
auth/           login, RBAC, sessão (incl. login offline dos apps de campo)
config/         MOTOR DE CONFIGURAÇÃO — regras/preços/termos versionados (ver §6)
cadastros/      usuários, perfis, fornecedores, colaboradores
clientes/       clientes e agentes (consumido por CRM e Vendas)
navegacao/      embarcações, viagens, escalas, cronograma, status
precos/         tabelas de preço (passagem/carga/encomenda) + reajuste em massa  [usa config/]
tms/            carga, volume, palete, eventos, etiqueta/UUID, conferência, entrega
vendas/         bilhetes/QR, validação, cortesia, gratuidade, NPS
encomendas/     despacho, declaração de conteúdo  [preço via precos/, 🔶 tabela pendente]
crm/            ficha 360º, histórico, cotações
caixa/          caixa financeiro mínimo do MVP (registra venda/despacho)
sync/           endpoints de sincronização offline (fila, idempotência)
notificacao/    WhatsApp/SMS/e-mail (atrás de interface; provedor 🔶)
telemetria/     ponte com Firebase (resumo de posição → Postgres)  [isolável → serviço/Go]
audit/          trilha de auditoria imutável (transversal)
```

**Fora do MVP** (módulos que entram nas fases seguintes, já com lugar reservado): `financeiro/` (completo), `veiculos/`, `pdv-fnb/`, `compras/`, `estoque/`.

---

## 4. Arquitetura em camadas (dentro de cada módulo)

Padrão NestJS, consistente em todos os módulos:

```
Controller (HTTP/WS)  →  Service (regra de negócio)  →  Repository (acesso a dados)
        │                        │                              │
   valida DTO            aplica regras            Postgres (Prisma/TypeORM)
   (api-contract)        consulta config/         + pg-boss (enfileira na mesma transação)
```

- **Controller**: recebe request, valida com o schema do `api-contract`, delega.
- **Service**: regra de negócio. **Nunca** lê tabela de outro módulo direto — chama o service do outro módulo. Consulta o `config/` para qualquer valor configurável (preço, tolerância, termo).
- **Repository**: acesso ao Postgres. Enfileiramento de job (pg-boss) acontece **na mesma transação** do dado quando precisa de atomicidade.
- **Eventos de domínio**: mudanças relevantes (volume conferido, bilhete validado, entrega feita) emitem evento → `audit/` registra, `notificacao/` reage, BI consome.

---

## 5. Estratégia offline-first (o ponto mais difícil)

Offline é **estado normal** dos apps de campo. Desenho:

```
App de campo (Capacitor)
 ├─ Banco local no dispositivo (SQLite via Capacitor)  ← fonte de verdade local
 ├─ Toda ação grava local com client_uuid e entra na FILA DE SYNC
 ├─ OfflineBanner + SyncIndicator mostram a fila (UX da Fundação)
 └─ Ao ter rede → envia fila ao módulo sync/ do back
                    │
                    ▼
            sync/ no back
             ├─ idempotência por client_uuid (reenvio não duplica)
             ├─ aplica eventos na ordem; resolve conflito por regra de domínio
             └─ devolve estado canônico + confirma itens sincronizados
```

**Princípios:**
- **`client_uuid` em todo registro** (já estava nas specs do TMS) — reenviar é seguro.
- **O dispositivo nunca trava por falta de rede.** Conferência, validação, entrega seguem; sincronizam depois.
- **Conflitos resolvidos por regra de negócio**, não por "último a escrever ganha" cego. Ex.: um volume já entregue não volta a "em viagem".
- **Validação de QR offline**: o app baixa a lista de bilhetes da viagem antes do embarque; valida local; marca usado; sincroniza.
- **Avaliar PowerSync/ElectricSQL** (sync Postgres↔SQLite) vs. fila própria. Decisão técnica a confirmar num spike; o `libs/offline-sync` isola essa escolha do resto.

---

## 6. Motor de configuração ("tudo configurável, zero hard-code")

Requisito de primeira classe da diretoria. Nenhuma regra de negócio variável é `if` no código — é **dado versionado**.

### O que é configuração (exemplos)
- Preços (passagem/carga/encomenda) e o reajuste em massa ± X%
- Percentuais e regras de comissão de agentes
- Textos: termo de aceite de embarque, declaração de conteúdo, termo de veículos
- Tolerâncias: "atenção" vs "atrasado" (minutos)
- Cores de pulseira por classe
- Tamanhos/pesos de encomenda (P/M/G) e limites
- Tipos de gratuidade legal; limites de cortesia por viagem

### Como funciona
```
config/ (módulo)
 ├─ tabela de configs em JSONB, com VERSÃO, vigência e autor (auditoria)
 ├─ cada chave tem schema (validação) e valor versionado
 ├─ alteração nunca sobrescreve: cria nova versão (permite rollback)  ← já é o comportamento do reajuste de preço
 ├─ cache em memória (invalidado ao publicar nova versão)
 └─ config-client (lib) lê tipado nos fronts e no back
```
- **Versionamento + rollback** é nativo: o histórico de reajuste de preço da UX de Cadastros é um caso particular deste motor.
- **Pendências 🔶 não bloqueiam o MVP**: a chave existe, entra vazia/placeholder, e o valor é preenchido quando o cliente enviar (preço de encomenda, termos, comissão). O código já lê do motor.

---

## 7. Tempo real de GPS (desacoplado do back)

```
Barco (Capacitor, GPS background)
   │  escreve posição a cada 30–60s
   ▼
Firebase (Realtime DB/Firestore)  ──push──►  web-console (painel ao vivo, mapa)
   │
   └─ job pg-boss (a cada X min) → telemetria/ resume posição → Postgres (histórico/auditoria)
```
- A posição **não passa pelo back** em tempo real → poupa o VPS.
- Postgres guarda só **resumo** (para "cumpriu o cronograma?" e auditoria), não cada ping.
- `telemetria/` é o módulo isolável: quando virar MQTT próprio (+ talvez Go), troca-se a fonte sem tocar no resto.

---

## 8. Topologia de deploy

### 8.1 Agora — Hostinger (VPS), tudo em Docker
```
VPS Hostinger
 ├─ container: api (NestJS) — HTTP + WebSocket
 ├─ container: worker (pg-boss) — jobs: sync, notificações, relatórios, resumo GPS
 ├─ container: postgres (+ PostGIS)         [ou Postgres gerenciado, se disponível]
 ├─ container: web-console / web-pdv / app-cliente (estáticos via Nginx)
 └─ Nginx (reverse proxy + TLS)

Externos: Firebase (GPS), provedores de WhatsApp/SMS/pagamento (🔶), impressora (no local)
Apps de campo: instalados nos dispositivos (Capacitor), falam com a api por HTTPS
```
- **api** e **worker** são o mesmo código, processos diferentes (web vs jobs) — separa carga.
- Backups automáticos do Postgres + migrações versionadas.

### 8.2 Futuro — GCP/AWS (quando o tráfego/SLA pedir)
- Containers migram quase 1:1: api/worker em serviço gerenciado de containers, Postgres gerenciado (Cloud SQL/RDS), estáticos em CDN.
- Aqui é onde um módulo (ex.: `telemetria/` em Go, ou MQTT próprio) pode virar serviço independente.
- **A portabilidade vem do Docker + monolito modular**: nada no MVP amarra você à Hostinger.

---

## 9. Segurança e auditoria (transversais)
- **RBAC** em todos os endpoints (perfil × módulo × ação — ver UX Cadastros).
- **Trilha de auditoria imutável** (`audit/`): quem/quando/onde/foto para todo evento crítico (núcleo antifraude).
- **TLS** em tudo; segredos fora do código (variáveis de ambiente/secret manager).
- **LGPD**: CPF/dados sensíveis com acesso logado; mascaramento em listas (já previsto na UX de CRM).
- **Login offline** dos apps de campo: credencial em cache seguro no dispositivo, sessão longa + PIN.

---

## 10. Ordem de construção (alinhada ao grafo de dependência do MVP)

```
1. Fundação técnica: monorepo Nx, libs/shared, auth/, config/, audit/, infra Docker
2. cadastros/ + clientes/ + precos/        (dados-mestre + motor de config na prática)
3. navegacao/ (core)                        (viagens — dependência de tudo)
4. tms/ + sync/ + offline-sync (lib)        (o coração antifraude, offline)
5. vendas/ + caixa/ + app-cliente            (receita de passagem + PDV)
6. crm/                                      (consome o que já existe)
7. telemetria/ + Firebase                    (rastreamento; pode ir em paralelo)
```
Cada etapa entrega valor utilizável e respeita as dependências. Back e front da mesma etapa caminham juntos, guiados pelo `api-contract`.

---

## 11. Pendências que afetam arquitetura (🔶)
- Spike de **offline-sync**: PowerSync/Electric vs. fila própria (decide o `libs/offline-sync`).
- Especificação do **coletor/Palm e impressora térmica** (confirma plugins Capacitor).
- Provedores: **pagamento, WhatsApp/SMS** (definem adapters de `notificacao/` e do checkout).
- Postgres **gerenciado vs. container** na Hostinger (depende do plano contratado).
- Confirmar **Firestore vs. Realtime DB** no spike de tempo real.
