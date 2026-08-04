# Cadastro de cidades operacionais

## Objetivo

Permitir que uma cidade nova seja cadastrada no painel e passe a ser oferecida nas configurações de rota, sem seed, mock ou alteração manual no banco.

## Entrega

- Nova área **Cadastros › Cidades** com criação, edição, busca e filtros por situação.
- Campos reais: sigla operacional, nome, UF, cidade-base e situação.
- A lista em memória do painel é atualizada após salvar; a cidade fica imediatamente disponível nos seletores que consomem o cadastro de cidades.
- API real protegida por RBAC:
  - `GET /api/cadastros/cidades`
  - `POST /api/cadastros/cidades` — `cadastros.criar`
  - `PATCH /api/cadastros/cidades/:sigla` — `cadastros.editar`
- Criação e edição geram `audit_evento` na mesma transação do cadastro.

## Regras de integridade

- A sigla possui de 2 a 4 caracteres alfanuméricos, é normalizada em maiúsculas e não pode ser alterada depois da criação.
- Nome e UF são validados no servidor; sigla duplicada é rejeitada.
- Uma cidade não pode ser desativada enquanto estiver em viagem futura não cancelada ou em rota publicada ativa.
- A migration `0034_cidades_cadastro_operacional.sql` adiciona um UUID auditável à cidade e preserva `sigla` como chave operacional para não romper viagens, preços e documentos existentes.

## Como usar

1. Acesse **Cadastros › Cidades** e clique em **Nova cidade**.
2. Informe sigla, nome e UF; marque cidade-base somente quando aplicável.
3. Salve e acesse **Cadastros › Configurações operacionais › Navegação**.
4. Crie ou edite a rota, escolha a nova cidade como origem, destino ou parada e publique a configuração.
5. Configure os preços dos trechos aplicáveis antes de liberar vendas.

## Produção

Antes do novo cadastro, aplicar as migrations pendentes:

```bash
node infra/migrations/run.mjs
```

## Verificação executada

- Migration `0034` aplicada no banco local.
- Criação, edição e listagem verificadas contra API e PostgreSQL reais; registro de QA removido ao final.
- Build NestJS aprovado; 9 suítes e 33 testes aprovados.
- Build completo do front aprovado.
- Inspeção visual desktop e celular aprovada, sem overflow horizontal.
