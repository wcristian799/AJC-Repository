# Decisão de 05/ago/2026 — NF independente, ciclo da viagem e origens de veículos

## Pedido validado

1. O Gerente da Embarcação é quem inicia e encerra a viagem.
2. Lançar NF/DC não cria carga. O documento nasce livre e guarda o destino da futura carga.
3. A carga é criada depois, pela seleção de NF/DC livres em **Nova carga**; nesse momento são definidos viagem e volumes.
4. A origem do cadastro de Veículos/Máquinas é editável em Cadastros e não pode permanecer como enum fixo no código.

## Contrato implementado

### Lançamento fiscal

- `POST /api/tms/documentos` cria/localiza o cliente e persiste somente `documento_fiscal`.
- `carga_id` e `viagem_id` ficam nulos; nenhum registro de `carga` ou `volume` nasce nessa operação.
- O upload real, a extração de XML, o formulário revisável, o agendamento e o armazenamento MinIO permanecem.
- O destino é obrigatório e representa o destino da futura carga.

### Nova carga

- Exige uma ou mais NF/DC livres do cliente.
- Rejeita documentos de destinos diferentes, documento de outro cliente ou documento já vinculado.
- A viagem precisa estar planejada/em curso e conter o destino como origem, escala ou destino final.
- Peso, valor e total de volumes são recalculados no servidor pela soma dos documentos.
- O vínculo usa atualização condicional `WHERE carga_id IS NULL`; corrida entre operadores falha sem duplicar associação.
- Somente depois do vínculo são criados os volumes no estado `cadastrado`.

### Ciclo da viagem

- A migration adiciona `iniciada_em`, `iniciada_por`, `encerrada_em` e `encerrada_por`.
- `/campo/gerente` oferece `Iniciar viagem` para `planejada` e `Encerrar viagem` para `em_curso`.
- O endpoint exige `navegacao.operar_viagem`, usa `client_uuid` e grava `audit_evento`.
- Cancelamento continua administrativo, com motivo e `navegacao.editar`.

### Veículos/Máquinas

- `origem_cadastro` passou de enum para código textual validado contra a configuração ativa `veiculos_origens_cadastro`.
- Cadastros ganhou editor versionado para adicionar origens, renomear, ativar/desativar e escolher a padrão.
- A tela operacional não possui lista de demonstração nem opções hard-coded; se a configuração não carregar, o cadastro é bloqueado com orientação explícita.

## Legado e implantação

- A migration `0036_documento_independente_viagem_gerente_origens_veiculos.sql` não apaga cargas antigas criadas pelo fluxo anterior. Cargas antigas podem já possuir movimento físico e exigem auditoria assistida antes de eventual saneamento.
- Em cada ambiente, aplicar a migration e atribuir `navegacao.operar_viagem` ao perfil real de Gerente da Embarcação em Cadastros. O Administrador recebe a permissão automaticamente para implantação e suporte.
- A carga inicial das origens preserva `gerente_porto`, `pdv` e `comercial`, mas elas passam a ser dados editáveis, não condicionais do código.

## Critérios de aceite

- [x] Lançar NF/DC não cria carga, viagem ou volume.
- [x] NF/DC aparece livre para seleção posterior.
- [x] Nova carga exige documento livre e cria os volumes pela quantidade total das notas.
- [x] Destinos diferentes são bloqueados no front e no servidor.
- [x] Viagem incompatível é bloqueada no servidor.
- [x] Gerente inicia e encerra viagem pelo app de campo com auditoria.
- [x] Origem de Veículos é publicada em Cadastros e consumida pelo backend/front.
- [x] Lista demonstrativa de Veículos removida.
- [x] Migration aplicada e verificada no PostgreSQL local.
- [x] Build do backend e build SSR/Vercel do frontend concluídos.
