# Aplicativos de campo — Etapas 14, 15, 16, 17 e 20

## Resultado de engenharia

A operação de campo passa a ser uma suíte única, autenticada e orientada por RBAC. O catálogo vem do banco e contém sete postos: Porteiro, Encomendas, Conferente Porto, Conferente Navegação, Gerente Embarcação, CRM Comercial e Bilheteria Digital. A Etapa 20 é o mapa integrador, não um aplicativo adicional.

O painel administrativo continua em `/app/*`; o campo permanece em `/campo/*`. O pacote Capacitor em `apps/campo-mobile` abre somente a suíte de campo e será o APK/AAB único. Nome, descrição, ordem, ativação, perfis, usuários, contextos, regras de evidência, offline, checklists e recebível automático são administráveis; rotas e identificadores de segurança continuam estruturais.

## Fluxos entregues

- Portaria real: empresa pesquisável em clientes/fornecedores, porto/pátio cadastrado, placa, motorista, foto MinIO configurável, bloqueio de placa duplicada, entrada, saída, pátio, filtros, paginação, relatório, idempotência e auditoria.
- Conferente Porto: mantém o fluxo real de conferência física, NF/DC, AVULSA/MP/PD/PC, paletes, evidências e fila offline.
- Conferente Navegação: embarque e cross-docking usam os volumes/cargas reais. O primeiro evento `embarcado` dispara a regra financeira descrita abaixo.
- Entregas compartilhadas: o leitor resolve UUID de volume, código de carga/encomenda, palete e veículo/máquina. Carga/encomenda/palete reutilizam a prova legal real e atualizam os volumes. Veículo/máquina exige checklist próprio.
- Veículos/máquinas: checklist versionado por recebimento, embarque e entrega, com itens, avarias, medidores, fotos, recebedor, assinatura, evento, status e auditoria.
- Gerente da Embarcação: mantém início/encerramento auditado da viagem e prestação de contas real; entregas permanecem módulo compartilhado da operação.
- CRM Comercial: `pedido_envio` é separado da carga física. O comercial registra intenção, trecho, cliente, tipo e valor estimado sem criar carga antes da documentação/operação.
- Encomendas: lista real para balcão e acompanhamento; criação completa, cotação, documento, declaração, pagamento e rastreamento continuam usando os contratos reais do módulo.
- Bilheteria Digital: agrupa PDV real e validação de embarque offline-first, preservando permissões independentes. O leitor usa a câmera traseira e decodificação QR real; busca por nome, documento ou código permanece como contingência quando a câmera não está disponível.

## Conta a Receber no embarque

No primeiro bipe `embarcado` de qualquer volume, o PostgreSQL localiza a carga e cria exatamente um `financeiro_titulo` de tipo `receber`, origem `embarque_carga`, no valor de `carga.valor_cobrado`. O título referencia cliente, carga e viagem e a tabela `financeiro_titulo_documento_fiscal` vincula todas as NF/DC da carga.

O índice parcial único impede duplicação por novos volumes ou reenvio offline. A transação de embarque é bloqueada quando o frete está vazio/zero e `bloquearSemValor=true`. Ativação, prazo, plano de contas e centro de custo vêm da configuração versionada `tms_contas_receber_embarque` em Cadastros. O valor declarado das mercadorias nunca é usado como frete.

## Configurações e produção

- Migration obrigatória: `0041_aplicativos_campo_operacionais.sql`.
- Configurações: `campo_operacao`, `campo_portaria`, `campo_entregas`, `veiculos_checklists` e `tms_contas_receber_embarque`.
- Buckets ativos: `portaria-fotos`, `recebimento-fotos`, `entregas-comprovantes` e `veiculos-fotos-checklist`.
- Após aplicar a migration, conceder as permissões de cada aplicativo/ação aos perfis reais e renovar os tokens.
- Definir `AJC_CAMPO_URL` antes de sincronizar/assinar o aplicativo Android.
- Câmera comum já usa captura web/nativa. Impressora Bluetooth e GPS background permanecem bloqueados até hardware/plugin homologado; o sistema não finge integração.

## QA executado

- migration 0041 aplicada no PostgreSQL e seed canônico reaplicado com banco contendo vendas;
- teste SQL transacional com dois volumes da mesma carga: um único AR de R$ 6.120,00 e vínculos NF/DC, seguido de rollback;
- build NestJS verde;
- 15 suítes e 50 testes Jest verdes;
- build cliente + SSR + Nitro/Vercel verde;
- TypeScript e build Vite do pacote móvel verdes;
- projeto Android gerado e plugins Capacitor sincronizados.
- leitor de QR compilado no cliente/SSR com encerramento seguro da câmera após leitura ou saída da tela; a permissão física deve ser homologada no aparelho Android real.

## Bloqueios externos explícitos

O fluxo não contém câmera, Bluetooth, GPS, push ou provedor de mensagens falsos. Câmera/object storage funcionam com MinIO e permissões do aparelho. Bluetooth, GPS background, push e WhatsApp/SMS só entram em produção depois de credenciais, hardware e homologação reais.
