# Auditoria — Transcrição Bruta x Consolidação de Feedback

> Fonte auditada em 2026-06-29:
> `C:\Users\Administrador\Desktop\texto.txrt.txt`
>
> Comparado contra:
> - `docs/feedback/2026-06-25-validacao-core-telas.md`
> - `docs/fase-1/01-SPEC-Tarefas-Ajustes-Front-Pos-Validacao.md`
> - materiais recebidos em 29/jun/2026: modelo de prestação de contas e PFX.
> - atualização posterior em 30/jun/2026: campos do Lucas e FAQ 2026.

## Resultado

A consolidação de 25/jun cobre os pontos principais da reunião e o documento de pauta colado ao final da transcrição bruta. A transcrição bruta confirma a ordem e as decisões já registradas:

- Front mockado primeiro; backend depois.
- TMS/Navegação e apps de campo como prioridade.
- Veículos/Máquinas entram agora.
- Portal online é MVP, mas fica por último.
- Financeiro completo, Compras e DRE são etapa posterior/sistema maior.
- Bilheteiro estava aprovado/sem ressalvas.

## Nuances Encontradas no Bruto Que Precisam Ficar Registradas

### Apps internos

Foi discutido que apps internos provavelmente **não devem ir para Play Store**; a preferência verbal foi instalar diretamente/distribuir internamente. Isso não altera o front web agora, mas impacta a futura estratégia de empacotamento dos apps de campo.

### Portaria

Além de placa e empresa, a fala cita **foto** na entrada/registro do veículo de carga no porteiro. Tratar como requisito recomendado no front mockado e confirmar se será obrigatório no app final.

### Comissão/cobrança sobre carga

A transcrição traz regra adicional de negócio:

- Toda carga precisa ter valor declarado.
- Toda carga precisa registrar o valor cobrado.
- Nenhuma carga sobe sem etiqueta.
- Nenhuma carga sobe sem cobrança.
- Todas as etiquetas devem gerar cobrança.
- Sobre o montante de cobrança de carga, foi mencionada comissão de **2%**.
- Deve existir relatório separado por viagem, deixando claro de onde veio cada valor/comissão.

Essa regra não bloqueia o front atual, mas deve ser considerada no futuro desenho de backend/financeiro e pode aparecer como mock/indicador no front se couber.

## Pendências Do Cliente/Lucas Após Materiais Recebidos

### Não bloqueantes para finalizar o front mockado

- Validar divergências internas de horário do FAQ 2026 antes do cadastro definitivo.
- Capacidades numéricas reais por classe/embarcação, se houver tabela separada.
- Regra/visualização final de **Calendário/Cronograma longo**.
- Campos detalhados de **lançamento manual NF/DC**.
- Regras finais do botão/fluxo **Etiquetar por volume**.
- Campos de **Cadastro de palete**.
- Tabelas de **preço de carga** por cliente/destino.
- Tabela/regra de preço de **veículos/máquinas**.
- Tabela/mecânica de **preço de encomendas**.
- Dados/campos definitivos de **cadastro de novos clientes**.
- Campos definitivos de **cotação**.
- Classes/categorias de **fornecedores**.
- Modelo de **plano de contas / centro de custo**.
- Planilha/modelo de **DRE**.
- Fotos das **embarcações** para o portal.
- Modelo final de **Declaração de Conteúdo**.
- Termo de aceite de **embarque**.
- Termo de aceite/checklist final de **veículos**, se houver texto formal além do modelo Frota Martins.
- Modelo/checklist Frota Martins de **devolução/caução** para checklist de envio/entrega de veículos e despesas.
- Modelo/protocolo da **impressora Bluetooth**.
- Definição sobre **foto na portaria** ser obrigatória ou apenas recomendada.
- Estratégia de distribuição dos **apps internos**: instalação direta/MDM/Play Store privada.

### Parcialmente resolvidas

- **Modelo de prestação de contas:** recebido em 29/jun/2026; falta só refinar `PrestacaoTab` no front.
- **Certificado digital:** PFX recebido em 29/jun/2026; ainda falta senha, validade/uso, credenciamento SEFAZ-PA e fornecedor/API fiscal.
- **Nova viagem / embarcações / Nova carga:** campos recebidos em 30/jun/2026; falta implementar no front.
- **DOC FAQ/paradas e preços de passagem:** FAQ 2026 recebido em 30/jun/2026; falta validar divergências internas de horário antes do backend definitivo.

### Bloqueantes apenas para backend/produção, não para front mockado

- Gateway de pagamento do portal.
- Fluxo BP-e/SEFAZ-PA completo: senha/validade do PFX, credenciamento, ambiente de homologação/produção, fornecedor/API fiscal.
- Modelo definitivo de banco/backend do portal: Pedido, Reserva, Pagamento, webhook e documento fiscal plugável.
- Escolha final do caminho de offline-sync/PowerSync para apps de campo.

## Conclusão

Não apareceu uma pendência nova que bloqueie o ajuste do front mockado. Para o próximo agente de front, o caminho continua:

1. Refinar `PrestacaoTab` pelo modelo real recebido.
2. Refinar Nova Viagem/Nova Carga com campos do Lucas e templates/preços do FAQ 2026.
3. Fazer QA visual/navegação do core interno.
4. Ajustar `/portal` por último, sem implementar backend real.
