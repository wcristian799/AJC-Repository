# ADR 01 — Spikes Técnicos: Offline-Sync, Hardware de Campo e Hospedagem

> Resultado da investigação dos 3 pontos técnicos que o ADR 00 deixou em aberto (🔶). Cada seção traz a **conclusão**, a **recomendação** e o que precisa ser **provado num spike** antes de assumir como certo. Pesquisa feita pela equipe em jun/2026; planos/versões mudam — reconferir antes de contratar/codar.

---

## 1. Offline-Sync — como o app de campo sincroniza com o Postgres

### Conclusão
- **PowerSync** é o melhor encaixe: SQLite local nativo, fila de escrita pronta e resiliente, e — o ponto que mais importa — **o conflito é resolvido por regra de negócio no nosso NestJS** (não "last-write-wins" cego). Suporta Capacitor/React oficialmente; Postgres é o caso primário. Self-hosted via Docker (cabe no VPS) ou cloud (free até ~2GB sync/mês cobre dezenas de devices).
- **ElectricSQL está DESCARTADO para escrita.** O projeto sofreu um pivot (virou plataforma de "sync para agentes", domínio mudou para electric.ax) e hoje o sync é **só de leitura** (read-path via "shapes"). A escrita você faria toda na mão de qualquer jeito — não resolve nossa dor.
- **Fila própria (custom)** é um **Plano B viável** justamente porque nosso domínio é favorável: idempotência por `client_uuid` já está no design, volume é baixo, e a maioria das mutações (foto, assinatura, QR, conferência de volume) é **append-only** com pouquíssimo conflito real.

### Recomendação
**Plano A: PowerSync self-hosted** (soberania dos dados — relevante para dados financeiros — e cabe no VPS).
**Plano B: fila própria** com `@capacitor-community/sqlite` + endpoints NestJS idempotentes, se o spike mostrar que operar o serviço PowerSync (replicação lógica, Docker, sem dashboard no self-hosted) pesa mais que construir a fila simples.

> Decisão de CTO: **rodar o spike dos dois em paralelo (timeboxed 1–2 semanas)** e decidir com número de esforço real, não achismo. Esta é a **primeira investigação técnica do projeto** — define a lib `libs/offline-sync`.

### O que provar no spike
1. PowerSync self-hosted ponta a ponta: Docker + Postgres de teste + replicação lógica + SDK no app Capacitor + `uploadData()` chamando endpoint NestJS. Escrever offline → enfileirar → sincronizar ao voltar a rede.
2. **Idempotência real:** reenviar a mesma mutação (`client_uuid` repetido) e provar que o back não duplica (cortar a rede no meio do upload).
3. **Conflito por regra:** dois devices conferindo o mesmo volume → a regra no back decide certo.
4. **Blobs:** fotos/assinatura provavelmente vão por **upload separado** (storage), com referência no SQLite — confirmar estratégia.
5. **QR offline:** validação 100% local (token assinado embarcado), sem rede.
6. **Licença** exata do PowerSync self-hosted (checar repo `powersync-ja/powersync-service`) antes de comprometer.
7. Protótipo mínimo da **fila custom** em paralelo para comparar esforço.

### Riscos
- RxDB foi considerado, mas o plugin de replicação Postgres tende a ser **pago** — confirmar licença se cogitar.
- Bugs de sync são sutis e caros em dados financeiros (mutação perdida/duplicada/fora de ordem). Por isso o conflito tem que ser decidido por regra no back, nunca cego.

---

## 2. Hardware de campo — plugins Capacitor

Stack: Ionic + Capacitor (React/TS). **Decisões de hardware do cliente (jun/2026):**
- **Apps de campo rodam em CELULAR COMUM** (não coletor industrial). → elimina o risco do leitor laser Zebra/Honeywell; QR pela câmera resolve.
- **Impressão térmica deve considerar Bluetooth**, conforme validação do cliente em 25/jun/2026.
- **Aparelho da embarcação é um celular**.
- Modelo da **impressora de etiqueta** ainda a confirmar (🔶) — define protocolo (ESC-POS vs ZPL) e compatibilidade Bluetooth.

Resumo da maturidade e risco por necessidade:

| # | Necessidade | Solução | Maturidade | Risco |
|---|---|---|---|---|
| 1 | QR / código de barras (câmera do celular) | `@capacitor-mlkit/barcode-scanning` | Alta (~352k/mês, ativo) | **Baixo** |
| 2 | Foto de conferência/entrega | `@capacitor/camera` (oficial) | Alta | Baixo (tratar cancel + process death) |
| 3 | **GPS em background** (celular da embarcação) | `@capacitor-community/background-geolocation` (free) ou `@transistorsoft/...` (pago p/ release Android) | Média/Alta | **ALTO** (único risco alto) |
| 4 | Impressão térmica / etiqueta | **Bluetooth** a partir do fluxo operacional definido; validar plugin/caminho por modelo de impressora | Média | Médio |
| 5 | Assinatura em tela | `signature_pad` + `<canvas>` (sem plugin nativo) | Alta | Baixo |
| 6 | SQLite offline | `@capacitor-community/sqlite` | Alta (~406k/mês) | Baixo |

### Único risco alto remanescente: GPS em background
Nenhum plugin garante 100% de continuidade — iOS/Android e OEMs (Xiaomi, Samsung, Huawei) matam apps em background mesmo com notificação persistente. Pode ser preciso o plugin **pago** (transistorsoft) ou, no limite, um **foreground service nativo Android dedicado** + buffer offline com reenvio. **Não bloqueia o MVP** (rastreamento é fase posterior); precisa de spike antes de prometer rastreamento confiável.

### Impressão Bluetooth — implicação de arquitetura
A etiqueta de carga/veículo e recibos operacionais devem considerar impressão térmica via **Bluetooth**, conforme transcrição de validação. Isso recoloca a impressão mobile no caminho técnico:
- Confirmar modelo da impressora e linguagem suportada (ESC-POS, ZPL ou SDK proprietário).
- Validar pareamento, reconexão, fila offline e reimpressão em celular comum.
- Definir se a impressão parte do app de campo, do PDV mobile/tablet ou de ambos, conforme fluxo de operação.
- Manter contingência operacional apenas se o hardware escolhido exigir, sem assumir isso como caminho principal.

### Spikes obrigatórios (reduzidos)
1. **GPS background:** teste de **horas**, tela bloqueada, em celulares reais. Medir gaps, bateria, entrega ao servidor. Decidir free vs pago vs nativo custom.
2. **Impressão Bluetooth:** POC imprimindo etiqueta (QR/UUID) a partir de celular comum, com pareamento/reconexão e fila offline. Depende do **modelo da impressora** (🔶) para protocolo e plugin.
3. Foto sob process death no Android (recuperação via `appRestoredResult`) em celular de baixa RAM.

---

## 3. Hospedagem — Hostinger agora, cloud depois

### Conclusão
- **Hostinger NÃO tem PostgreSQL gerenciado** (só MySQL no hPanel). Postgres só **self-managed em VPS**.
- **Cloud Hosting da Hostinger não roda Node.js** — para nosso stack, o caminho é **VPS KVM** (root, Docker e docker-compose liberados).
- Não existe produto "app platform + Postgres gerenciado" integrado (tipo Render/Railway) na Hostinger.

### Recomendação
**Começar com VPS Hostinger KVM 2 (2 vCPU / 8 GB)** rodando tudo via docker-compose: Postgres (+PostGIS) · api (NestJS) · worker (pg-boss) · Nginx (reverse proxy + TLS). KVM 1 (4 GB) é arriscado com Postgres + Node disputando RAM.

**Ressalva crítica — backup:** o VPS só faz backup **semanal**. Para um ERP/TMS isso é pouco. Configurar **`pg_dump` diário** (formato `-Fc`), **enviar para fora do VPS** (object storage: S3/GCS/Backblaze), e idealmente **WAL archiving + PITR** (pgBackRest/WAL-G). Testar restauração — backup não testado não conta.

**Alternativa se a operação for crítica desde o dia 1:** colocar **só o Postgres** num gerenciado externo (Neon/Supabase) e manter api+worker no VPS. Já entrega PITR/backups automáticos e adianta o desacoplamento que facilita a migração futura.

### Segurança (obrigatório)
- Nginx na frente com **TLS** (Let's Encrypt). Abrir só 80/443 e SSH por chave.
- **NÃO expor a porta 5432** do Postgres à internet — só na rede interna do docker-compose.
- pg-boss usa o **mesmo Postgres** (schema `pgboss`) — sem Redis/broker separado. Worker aponta para a mesma instância.

### Migração futura indolor para GCP Cloud SQL / AWS RDS
1. Postgres **padrão**, versão alinhada com a do gerenciado (ex.: 15/16); evitar extensões exóticas. pg-boss usa recursos padrão. ✅
2. App desacoplado por **`DATABASE_URL`** (env) — migrar = trocar a connection string.
3. **Migrations versionadas** (Prisma/TypeORM) recriam o schema em qualquer lugar.
4. Não depender de superuser nem de filesystem do host (Cloud SQL/RDS restringem isso).
5. Corte com downtime mínimo via **logical replication** (publisher VPS → subscriber cloud) ou AWS DMS / GCP DMS.
6. Documentar extensões (`uuid-ossp`, `pgcrypto`, `postgis`) para habilitar no gerenciado.

---

## 4. Consolidado — o que destrava o quê

| Decisão | Status | Bloqueia? |
|---|---|---|
| Offline-sync = PowerSync (plano B: fila própria) | a confirmar no **spike** | É o 1º spike; define `libs/offline-sync` |
| QR, foto, assinatura, SQLite (celular comum) | resolvido (plugins maduros) | Não |
| GPS background (celular da embarcação) | **risco alto** — spike + talvez plugin pago/nativo | Não bloqueia MVP; bloqueia rastreamento (fase posterior) |
| Impressão térmica Bluetooth | precisa POC por modelo de impressora | Não bloqueia desenho de tela, mas bloqueia implementação real de impressão |
| Hostinger VPS KVM 2 + Docker | resolvido | Não |
| Backup diário + PITR | ação de setup | Antes de ir a produção |

### Próximas ações recomendadas (ordem)
1. **Spike de offline-sync** (PowerSync vs fila própria) — antes de escrever o TMS.
2. **Provisionar VPS KVM 2** + docker-compose base + backup diário.
3. **Confirmar modelo da impressora de etiqueta** (🔶) — fechar protocolo (ESC-POS/ZPL/SDK), compatibilidade Bluetooth e POC de impressão.
4. Spike de **GPS background** roda em paralelo (só afeta o rastreamento, fase posterior).

---

## Fontes
- PowerSync: https://www.powersync.com/ · https://docs.powersync.com/architecture/client-architecture · https://docs.powersync.com/self-hosting/getting-started
- ElectricSQL (pivot): https://electric.ax/
- @capacitor-community/sqlite: https://github.com/capacitor-community/sqlite
- ML Kit barcode: https://github.com/capawesome-team/capacitor-mlkit
- Capacitor Camera: https://capacitorjs.com/docs/apis/camera
- Background Geolocation: https://github.com/capacitor-community/background-geolocation · https://github.com/transistorsoft/capacitor-background-geolocation
- Zebra DataWedge (Capgo): npm `@capgo/capacitor-zebra-datawedge`
- Hostinger: https://www.hostinger.com/vps-hosting · https://www.hostinger.com/cloud-hosting
