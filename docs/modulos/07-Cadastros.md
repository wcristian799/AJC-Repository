# Módulo Cadastros — SPEC + Detalhamento de Telas

> Dados-mestre do sistema. Inclui o **motor de preços** (passagem/encomenda/carga) com **reajuste em massa ± X%**, o **RBAC** (usuários e permissões) e os cadastros de pessoas (fornecedores, clientes, agentes, colaboradores) e escalas.
>
> Onde cada cadastro "mora" no menu é decisão de UX (flexível); o que importa é a **permissão por ação**. Sugestão de lar de cada cadastro indicada abaixo.

---

## Parte A — SPEC técnica

### A.1 Cadastros e onde vivem
| Cadastro | Lar sugerido | Perfil com acesso |
|---|---|---|
| Fornecedores | Compras/Financeiro | Financeiro |
| Usuários + permissões | Ajustes/Configuração | Administrador |
| Clientes | CRM | Comercial |
| Agentes comerciais | CRM | Comercial |
| Preços (passagem/encomenda/carga) | Cadastros/Price | Price |
| Colaboradores | Cadastros | RH/Admin |
| Escalas | Cadastros/Navegação | Operação |

### A.2 Motor de preços
- Três tabelas: **passagem** (por classe/subtipo/trecho), **encomenda** (P/M/G + percentual, por trecho 🔶), **carga** (tier = % de preço).
- **Reajuste em massa ± X%:** aplica percentual a todas as categorias de uma tabela de uma vez (sobe/desce X%).
- Histórico de versões de preço (auditoria de reajustes).

### A.3 RBAC
- Perfil → conjunto de permissões por módulo/ação.
- Cada usuário tem um perfil; cadastros e telas respeitam a permissão.

### A.4 Entidades
```
Usuario (id, nome, login, perfil_id, ativo)
Perfil (id, nome, permissoes[modulo.acao])
Fornecedor (id, nome, cnpj, contatos, categoria)
Colaborador (id, nome, funcao, cidade, contato_whatsapp)
Escala (id, colaborador_id, viagem_id/periodo, funcao, status)
TabelaPreco (id, tipo[passagem|encomenda|carga], versao, vigente_desde)
  └─ ItemPreco (tabela_id, chave[classe/tamanho/tier/trecho], valor/percentual)
```

---

## Parte B — Telas

> Estados padrão: **Vazio · Carregando · Erro · Sucesso**.

### B.1 Cadastro de usuários e permissões
- Lista de usuários (nome, perfil, status).
- Formulário: dados, perfil, ativar/desativar, reset de senha.
- **Gestão de perfis:** matriz de permissões por módulo/ação.
- *Estados:* login duplicado; usuário inativo.

### B.2 Cadastro de fornecedores
- Nome, CNPJ, contatos, categoria, dados bancários.
- Vínculo com contas a pagar e compras.

### B.3 Cadastro de clientes
*(Compartilhado com CRM B.1/B.2.)* Self-service também disponível (Vendas).

### B.4 Cadastro de agentes comerciais
- Nome, cidade, **percentual de comissão**, status.
- Vínculo com clientes alocados e relatório de comissão (Financeiro).

### B.5 Cadastro de preços — passagem
- Por classe (Rede/VIP/Camarote + subtipos) e trecho.
- **Botão de reajuste em massa ± X%** (sobe/desce todas as categorias).
- Pré-visualização do impacto antes de aplicar; histórico de versões.

### B.6 Cadastro de preços — encomenda
- Tabela fixa P/M/G por trecho + percentual acima de R$ 1.000 (🔶 valores).
- Reajuste em massa ± X%.

### B.7 Cadastro de preços — carga
- **Tier = % de preço** por trecho.
- Reajuste em massa ± X%.

### B.8 Cadastro de colaboradores
- Nome, função, cidade, contato (WhatsApp para notificação de escala).

### B.9 Cadastro de escalas
*(Compartilhado com Navegação.)*
- Alocação de colaborador a viagem/período e função.
- **Notificação de escala via WhatsApp** ao colaborador.
- *Estados:* conflito de escala (mesmo colaborador em duas viagens) → alerta.

---

## Pendências deste módulo
- 🔶 Valores das tabelas de preço de encomenda.
- 🔶 Regras de comissão (percentual por tipo) dos agentes.
- Definir matriz inicial de perfis × permissões.
