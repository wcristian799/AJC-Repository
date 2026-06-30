# Product

## Register

product

## Users

Diretoria, comercial, gerente do porto, bilheteiro, conferente, porteiro e equipe de entregas da AJC. O uso acontece em back-office, porto, balsa e atendimento, muitas vezes com pressa, em ambiente ruidoso, com internet instavel e necessidade de prova operacional.

## Product Purpose

O web-console AJC e suas superficies de campo simulam o ERP/TMS de transporte fluvial para validar regras de operacao antes do backend definitivo. O produto controla viagens, carga, paletes, veiculos/maquinas, encomendas, passagens, caixa minimo e CRM, reduzindo vazamento de receita e risco juridico com rastreabilidade, QR, fotos, assinatura, auditoria e fluxos offline-first.

## Brand Personality

Operacional, premium e firme. A interface deve parecer cabine de comando de uma operacao seria: densa quando precisa, clara em campo, confiante para diretoria e sem cara de prototipo descartavel.

## Anti-references

Nao refazer o design system Crimson Prestige, nao mudar o login cinematografico sem pedido explicito, nao transformar o sistema em landing page, nao usar UI decorativa que atrapalhe leitura operacional, nao criar telas de campo dentro do painel de gestao quando a decisao e usar `/campo/*`.

## Design Principles

1. A reuniao/transcricao mais recente manda: feedback do cliente vira tela mockada antes do backend.
2. Operacao primeiro: o usuario deve conseguir conferir, bipar, vender, agendar e prestar contas sem interpretar enfeite.
3. Offline e estado normal: pendencia de sincronizacao deve ser informativa, nao tratada como falha.
4. Prova visivel: foto, assinatura, QR, etiqueta, status e auditoria precisam aparecer no fluxo onde a regra depende deles.
5. Consistencia preserva confianca: usar Crimson Prestige, shadcn/ui, primitives locais e a separacao `/app/*` vs `/campo/*`.

## Accessibility & Inclusion

Priorizar contraste alto, alvos grandes em apps de campo, estados textuais junto das cores, suporte a reduced motion e componentes responsivos sem texto estourando no mobile.
