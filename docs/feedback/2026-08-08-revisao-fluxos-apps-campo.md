# Revisão operacional dos aplicativos de campo

Data: 08/08/2026 · estado: implementado em engenharia, aguardando publicação da migration 0042.

## Decisões confirmadas

- **CRM Comercial não é o aplicativo do Agente.** O CRM Comercial continua sendo uma superfície interna para equipe comercial. O novo **Agente Comercial** é o app responsivo `/campo/agente`, dedicado à carteira da agência.
- Um agente acessa apenas a conta explicitamente vinculada em **Cadastros › Agentes**. O vínculo é único, auditado, e o app nunca aceita que o aparelho escolha outro agente.
- Captação feita pelo agente cria um `pedido_envio` comercial, com origem travada na cidade da sua agência. Não cria carga, viagem, NF/DC, volume ou palete. A carga física continua nascendo no TMS depois da seleção de NF/DC livres.
- **Conferente do Porto** monta a composição física: seleciona viagem, local, destino, a modalidade AVULSA/MP/PD/PC, palete e NF/DC reais. MP e PD conservam a regra de uma única carga; PC aceita composição de cargas/NF/DC diferentes do mesmo contexto. AVULSA exige etiqueta e bipe individual por volume.
- **Conferente de Navegação** opera embarque/cross-docking: escolhe viagem/embarcação, local e destino antes de tocar na carga. A leitura muda o volume diretamente de `cadastrado` para `embarcado` apenas no cross-docking; no fluxo por porto, exige `conferido` antes de embarcar.
- **Bipar palete** identifica o ativo físico, não dá baixa em mercadoria. A leitura procura o código no banco e valida atividade, local, viagem/destino, status e tipo MP/PD/PC. A baixa de volume continua sendo o bipe de volume/etiqueta dentro da conferência ou embarque.

## Entregas

1. Migration `0042_app_agente_e_bipagem_palete.sql` associa uma conta de usuário a um agente ativo (`agente.usuario_id` único), cria `campo.agente` e publica o app no catálogo de campo.
2. Cadastros passou a ter a aba **Agentes**, para cadastrar/editar cidade, usuário vinculado, status e percentual de referência.
3. `/campo/agente` mostra somente carteira, pedidos e cotações do agente autenticado; exibe captação do mês e comissão explicitamente como estimativa.
4. O formulário de captação é realmente persistido, idempotente e força o `agente_id` do login no servidor.
5. Recebimento/paletização ganhou um leitor de código de palete. A seleção por lista permanece como alternativa para contingência, mas a tela não afirma mais que “bipa” quando não há leitura.
6. A composição permite selecionar várias NF/DC. A regra de MP/PD/PC continua validada pela API — o cliente não pode burlar a semântica física pela interface.

## Operação após deploy

1. Aplicar a migration 0042 antes de subir a API.
2. Em Cadastros › Perfis e permissões, conceder `campo.agente` ao perfil de Agente Comercial e renovar o login do usuário.
3. Em Cadastros › Agentes, criar/editar o agente, escolher a cidade e associar o usuário que fará login.
4. Acessar `/campo`: o card **Agente Comercial** aparece somente para o perfil autorizado. Sem vínculo de conta, a tela informa o ajuste necessário — não mostra dados de outro agente.

## QA executado

- Migration local aplicada: 42 migrations registradas.
- Build NestJS: aprovado.
- Build SSR TanStack/Vite/Nitro: aprovado.
- A inspeção de interface local foi bloqueada pelo servidor de desenvolvimento por uma incompatibilidade já presente do módulo `use-sync-external-store`; o build de produção, que é o caminho de publicação, não apresenta a falha. A navegação visual autenticada deve ser repetida no preview/deployment com API e sessão reais.
