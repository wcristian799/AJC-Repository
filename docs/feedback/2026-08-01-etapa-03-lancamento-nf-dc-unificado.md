# Etapa 03 - Lancamento unificado de NF/DC

Registro da decisao posterior ao documento vivo de 09/jul, recebida em 01/ago/2026.

## Alteracoes confirmadas pelo cliente

- Descontinuar integralmente `Upload do cliente / agente (B.2)`.
- Trocar `Lancar manual` por `Lancar NF/DC` e `Lancamento manual de NF/DC` por `Lancamento de NF/DC`.
- Remover `documento avulso sem carga/viagem`: o lancamento cria/vincula carga e viagem.
- Remover `Etiquetar por volume` da area de Notas; etiquetagem fica no fluxo proprio.
- Upload e a primeira acao. XML preenche automaticamente o que existir.
- Cliente existente e selecionado por CPF/CNPJ; cliente inexistente e criado dentro do mesmo fluxo, sem exigir ida previa ao cadastro.
- Nenhum arquivo ficticio ou URL `manual-upload://` e permitido.
- A origem persistida pelo novo fluxo e `operacao`; a migration `0026_documento_fiscal_origem_operacao.sql` amplia o constraint historico sem voltar a classificar o lancamento como manual.

## Regra de paletes fechada

A nota nao escolhe palete. MP/PD/PC, palete e parcial/completo sao definidos pelo conferente no recebimento fisico. Ver `docs/arquitetura/03-ADR-Lancamento-NF-e-Unitizacao-Paletes.md`.
