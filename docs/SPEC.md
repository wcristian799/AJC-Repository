# SPEC Técnica Global — Sistema ERP/TMS AJC

> Arquitetura, modelo de dados compartilhado, integrações e premissas que valem para todos os módulos. SPECs detalhadas por módulo ficam em `docs/modulos/`.

## 1. Premissas e princípios

- **Offline-first nos apps de campo.** Portaria, conferente (porto e balsa), validação de QR e entrega operam em locais com internet instável. Gravam local e sincronizam por fila, com `client_uuid` para idempotência.
- **Identidade física = UUID + QR.** Volumes de carga e bilhetes de passagem têm identificador único codificado em QR; é a âncora da rastreabilidade e do antifraude.
- **Auditoria imutável.** Todo evento operacional e financeiro grava autor, timestamp, dispositivo e GPS/foto quando aplicável.
- **Configurável > hard-coded.** Preços, termos (aceite de embarque, declaração de conteúdo, aceite de veículos), cores de pulseira, tamanhos de encomenda e tiers de carga são dados, não código — porque várias tabelas/textos ainda estão pendentes (🔶) e mudam por reajuste.
- **Multi-embarcação e multi-cidade** desde o início; preparado para 3 → 6–7 embarcações.

## 2. Arquitetura proposta (alto nível)

```
┌─────────────────────────────────────────────────────────────┐
│  Clientes                                                     │
│  • Web back-office (ERP/Financeiro/Cadastros/CRM/Navegação)   │
│  • Site/App cliente (compra passagem, encomenda, NPS)         │
│  • PDV / Totem (porto)                                        │
│  • Apps de campo (Portaria, Conferente, Validação, Entrega)   │
│    → offline-first, fila de sincronização                     │
└───────────────┬───────────────────────────────────────────────┘
                │ API (REST/GraphQL) + auth por perfil
┌───────────────┴───────────────────────────────────────────────┐
│  Backend (serviços por domínio)                               │
│  Vendas · Encomendas · TMS · Veículos · Financeiro · CRM ·    │
│  Navegação · Cadastros · PDV F&B                              │
│  • Trilha de auditoria  • Motor de preços  • Fila de eventos  │
└───────────────┬───────────────────────────────────────────────┘
                │
┌───────────────┴───────────────────────────────────────────────┐
│  Integrações: Pagamento · WhatsApp/SMS/e-mail · Impressora     │
│  térmica · Balança · GPS/rastreamento · NF-e/NFS-e · Banco     │
│  (conciliação) · Rastreio NF/boleto no CNPJ (🔶 a validar)     │
└────────────────────────────────────────────────────────────────┘
```

> A escolha de stack específica fica em aberto até alinhamento com a equipe de engenharia. As premissas acima (offline-first, auditoria, configurabilidade) são os requisitos que a stack precisa atender.

## 3. Domínios e relações centrais

```
Embarcacao 1───* Viagem 1───* ViagemEscala(cidade)
Viagem 1───* Bilhete        (passageiros)
Viagem 1───* Carga 1───* Volume *───1 Palete
Viagem 1───* RegistroPortaria (entrada/saída no porto)
Viagem 1───1 PrestacaoContas ──cruza──► Financeiro (Contas a Receber)
Cliente *───1 Agente (comissão)
Carga 1───1 DeclaracaoConteudo / NotaFiscalDC
Volume 1───* EventoVolume (recebido→...→entregue)  ← trilha de auditoria
```

## 4. Perfis de acesso (RBAC)

Cada usuário tem um perfil; permissões por módulo/ação. Exemplos citados na reunião:
- **Comercial:** cadastro de clientes + agentes comerciais.
- **Price:** cadastro de preços (passagem/encomenda/carga).
- **Administrador:** cadastro de usuários e configurações.
- **Financeiro:** fornecedores, contas, conciliação.
- **Conferente / Porteiro / Bilheteiro / Gerente:** apps de campo conforme função.

Onde um cadastro "mora" no menu é flexível (decisão de UX durante o desenvolvimento), mas a **permissão por ação** é o que controla o acesso.

## 5. Integrações — situação

| Integração | Uso | Status |
|---|---|---|
| Gateway de pagamento | Venda online/PDV/totem | A definir provedor |
| WhatsApp / SMS / e-mail | QR, NPS, notificação de entrega, escala | A definir provedor |
| Impressora térmica | Etiqueta de carga, QR de passagem | Hardware a confirmar |
| Balança | Peso no PDV de encomendas | Hardware a confirmar |
| GPS / rastreamento | Posição da embarcação, georreferência de eventos | A definir fonte (AIS/GPS próprio) |
| NF-e / NFS-e | Faturamento | Padrão fiscal BR |
| Banco | Conciliação bancária | Por banco |
| Rastreio NF/boleto no CNPJ | Financeiro | 🔶 Investigar API |
| Coletor / Palm | Conferência | Modelo a confirmar (define nativo vs. PWA) |

## 6. Requisitos não-funcionais (resumo)
Ver PRD §7. Destaques: offline-first, auditabilidade, captura de mídia com carimbo, LGPD, performance de relatórios por viagem, disponibilidade em picos sazonais.

## 7. Pendências globais (🔶)
Consolidadas do cliente — ver também cada módulo:
- Tabela/mecânica de preços de encomendas (Lucas).
- Termo de aceite de embarque (AJC).
- Modelo de declaração de conteúdo + cláusula de exclusão (Lucas).
- Modelo de prestação de contas em papel (digitalizar).
- Termo de aceite de veículos.
- Regras de comissão de agentes.
- Viabilidade da API de rastreio NF/boleto no CNPJ.
- Especificação do coletor e da impressora térmica.
- Gateway de pagamento e provedor de WhatsApp/SMS.
