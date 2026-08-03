# Etapa 05 — Aplicativos de campo e prestação de contas

## Entrega

- Login exclusivo em `/campo/login`, independente do login cinematográfico do painel.
- Hub `/campo` mostra somente aplicativos autorizados pelo perfil do usuário.
- Acesso direto às rotas de campo, PDV e Bilheteiro é bloqueado quando falta a permissão específica.
- Cadastros › Perfis e permissões passou a consumir o catálogo completo do banco, incluindo apps atuais e futuros.
- Novo app `/campo/gerente` para o gerente identificar viagem/embarcação, lançar receitas e despesas, salvar rascunho, enviar e emitir PDF.
- TMS › Prestação de contas virou a superfície administrativa de comparação, PDF e conferência.
- Cadastros › Configurações operacionais ganhou regras versionadas para formas de pagamento, receitas, despesas, intertrechos e comissões de agência.

## Regra operacional

O gerente pode editar apenas o próprio rascunho. O envio bloqueia alterações. A administração só pode conferir uma prestação enviada. Cada mudança de estado gera `audit_evento`; o rascunho usa `client_uuid` para idempotência e guarda a versão exata da configuração usada.

Receitas aceitam as formas de pagamento publicadas. Frete intertrecho exige um trecho cadastrado; receita de agência exige uma comissão cadastrada. Toda despesa identifica categoria, escopo (cidade ou viagem), descrição e valor. Uma viagem sem lançamentos só pode ser enviada após confirmação explícita de ausência de movimento.

## RBAC

Permissões de acesso: `campo.porteiro`, `campo.conferente_porto`, `campo.conferente_navegacao`, `campo.entregas`, `campo.bilheteiro`, `campo.pdv`, `campo.gerente_embarcacao` e os pontos reservados `campo.encomendas`/`campo.crm_comercial`.

Permissões de negócio: `prestacao.ver`, `prestacao.lancar`, `prestacao.conferir` e `prestacao.configurar`. Para um gerente, atribuir ao perfil ao menos `campo.gerente_embarcacao` e `prestacao.lancar`. A conferência administrativa exige `prestacao.ver` e a ação exige `prestacao.conferir`.

## Deploy

Executar `node infra/migrations/run.mjs` para aplicar `0031_campo_rbac_prestacao_contas.sql`, publicar API e front juntos e solicitar novo login aos usuários já conectados, pois as permissões ficam registradas no token da sessão.

## QA

- Migration local aplicada: 31/31.
- Backend Nest compilado no WSL.
- Jest: 7 suítes e 23 testes aprovados.
- Front TanStack/Vite/Nitro/Vercel compilado.
- Smoke autenticado dos endpoints de permissões, prestações, configuração, viagens e cidades: HTTP 200.
- Inspeção no navegador: login, hub, app do gerente em desktop/mobile, matriz de permissões, configuração operacional e conferência TMS; sem overflow horizontal.
