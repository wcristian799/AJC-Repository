# Modelo de Implantação Operacional — Sistema AJC

> Playbook para preparar, configurar, testar e colocar em operação o ERP/TMS da AJC.
>
> Este documento organiza a implantação por ondas e por setores. Ele cobre levantamento, cadastros, usuários, equipamentos, configurações, treinamento, testes, entrada em produção e acompanhamento.
>
> **Regra de uso:** nenhum setor entra em produção apenas porque a tela está disponível. A entrada ocorre quando dados, acessos, equipamentos, treinamento e cenários de aceite daquele setor estiverem concluídos.

## 1. Objetivo

Criar um processo repetível de implantação para a matriz, portos, agências e embarcações da AJC, garantindo:

- usuários corretos com o menor acesso necessário;
- cadastros e regras de negócio validados;
- equipamentos identificados, configurados e testados;
- operação offline e contingências conhecidas;
- preços, termos, capacidades, rotas e tolerâncias publicados no motor de configuração;
- trilha de auditoria e evidências funcionando;
- treinamento por função, com aceite do responsável de cada setor;
- entrada em produção controlada, preferencialmente por uma operação-piloto antes da expansão.

## 2. Como preencher e acompanhar

Usar os seguintes status em todas as listas:

| Status | Significado |
|---|---|
| Não iniciado | Ainda não houve levantamento ou execução |
| Em levantamento | AJC está reunindo ou validando informações |
| Configurando | Dados, acessos ou equipamentos estão sendo preparados |
| Em teste | Configuração concluída, aguardando teste operacional |
| Aprovado | Responsável do setor validou o cenário |
| Bloqueado | Depende de informação, fornecedor, credencial ou equipamento |
| Pós-MVP | Não faz parte da entrada inicial em produção |

Para cada item, registrar obrigatoriamente:

| Item | Responsável AJC | Responsável implantação | Prazo | Status | Evidência/observação |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## 3. Governança da implantação

### 3.1 Papéis que precisam ser nomeados

| Papel | Nome | Contato | Responsabilidade |
|---|---|---|---|
| Patrocinador/dono do projeto |  |  | Aprovar prioridades, regras e entrada em produção |
| Líder de implantação AJC |  |  | Centralizar informações e cobrar responsáveis |
| Líder técnico |  |  | Infraestrutura, sistema, integrações e suporte |
| Administrador do sistema |  |  | Usuários, perfis, configurações e cadastros globais |
| Responsável fiscal/contador |  |  | BP-e, certificado, SEFAZ e regras fiscais |
| Responsável financeiro |  |  | Caixas, formas de pagamento e títulos mínimos |
| Responsável comercial |  |  | Clientes, agentes, preços, contratos e comissões |
| Responsável de navegação |  |  | Embarcações, rotas, viagens, capacidades e escalas |
| Responsável TMS/carga |  |  | NF/DC, agendamento, conferência, paletes e entrega |
| Responsável por porto/agência |  |  | Pessoas, dispositivos, rotina e aceite local |
| Responsável por embarcação |  |  | Equipe de bordo, aparelhos, conferência e prestação |
| Encarregado LGPD/privacidade |  |  | Acesso, retenção e tratamento de dados pessoais |

### 3.2 Unidades que precisam ser mapeadas

Cadastrar todas as unidades que participarão da implantação, inclusive quando ainda não houver operação completa nelas.

| Unidade | Tipo | Cidade | Endereço | Responsável | Internet disponível | Operação prevista | Onda |
|---|---|---|---|---|---|---|---|
|  | Matriz/porto/agência/embarcação |  |  |  |  |  |  |

### 3.3 Estratégia recomendada de entrada em produção

1. Preparar infraestrutura, configurações globais e usuários administradores.
2. Implantar uma operação-piloto completa em Belém e uma viagem selecionada.
3. Acompanhar o ciclo ponta a ponta: criação da viagem, venda, carga, embarque, entrega e prestação de contas.
4. Corrigir falhas do piloto sem apagar ou alterar indevidamente registros auditáveis.
5. Expandir para as demais cidades/agências em ondas.
6. Somente depois estabilizar canais de autoatendimento e integrações externas de maior risco.

## 4. Onda 0 — Levantamento geral antes de configurar

### 4.1 Pessoas e operação

- [ ] Organograma real da AJC e responsáveis por setor.
- [ ] Lista de colaboradores ativos e terceirizados.
- [ ] Lista de agentes comerciais por cidade.
- [ ] Funções que cada pessoa executa na prática, inclusive acúmulo de funções.
- [ ] Turnos, escalas, folgas e substitutos.
- [ ] Quem pode criar, editar, aprovar, cancelar, conferir, entregar, vender e consultar.
- [ ] Pessoas que trabalharão no painel web e pessoas que usarão somente o mobile.
- [ ] Telefones e e-mails corporativos ou autorizados para recuperação e comunicação.
- [ ] Responsável por cada caixa, porto, embarcação, agência e equipamento.

### 4.2 Estrutura física e conectividade

- [ ] Levantamento de internet por unidade: provedor, velocidade, estabilidade e Wi-Fi.
- [ ] Cobertura 4G/5G das operadoras usadas nos portos, cidades e embarcações.
- [ ] Pontos de energia, tomadas, nobreaks, carregadores e locais seguros para equipamentos.
- [ ] Local de atendimento do PDV, balança, impressora e totem.
- [ ] Local de recebimento, etiquetagem, paletização e conferência de carga.
- [ ] Locais onde o sistema necessariamente precisará operar sem sinal.
- [ ] Responsável local por guardar, carregar e entregar cada celular de operação.

### 4.3 Documentos e dados atuais

- [ ] Planilhas e controles atuais de clientes, fornecedores, agentes e colaboradores.
- [ ] Tabelas vigentes de passagens, cargas, encomendas e veículos/máquinas.
- [ ] Rotas, horários, paradas e calendário operacional.
- [ ] Capacidades reais de passageiros e carga por embarcação.
- [ ] Modelos de NF/DC, termos, checklists, comprovantes e prestação de contas.
- [ ] Motivos de cortesia, tipos de gratuidade e documentos exigidos.
- [ ] Caixas existentes, responsáveis e saldos de abertura.
- [ ] Dados fiscais, bancários e contratos com fornecedores externos.
- [ ] Critérios de retenção de fotos, assinaturas e documentos.

## 5. Onda 1 — Infraestrutura e segurança de produção

### 5.1 Ambiente do sistema

- [ ] Domínio do painel e portal publicados com HTTPS.
- [ ] API publicada e acessível somente pelos canais autorizados.
- [ ] Banco PostgreSQL/PostGIS de produção criado sem exposição pública da porta do banco.
- [ ] Worker de filas ativo.
- [ ] Migrations e seed canônico aplicados e registrados.
- [ ] Variáveis e segredos de produção configurados fora do código.
- [ ] CORS restrito aos domínios oficiais.
- [ ] Healthcheck e rotina de monitoramento definidos.
- [ ] Logs da API, worker e infraestrutura acessíveis à equipe autorizada.

### 5.2 Backup e recuperação

- [ ] Backup diário do PostgreSQL enviado para fora do VPS.
- [ ] Política de retenção definida.
- [ ] Teste real de restauração executado e documentado.
- [ ] Backup do armazenamento de arquivos definido.
- [ ] Responsável e procedimento para incidente de indisponibilidade.
- [ ] Contatos de escalonamento técnico registrados.

### 5.3 MinIO e arquivos

Antes da produção, ativar e testar os buckets previstos em `docs/infra/BUCKETS-PENDENTES.md`:

- [ ] `documentos-fiscais`.
- [ ] `declaracoes-conteudo-assinaturas`.
- [ ] `portaria-fotos`.
- [ ] `recebimento-fotos`.
- [ ] `entregas-comprovantes`.
- [ ] `prestacoes-anexos`.
- [ ] `veiculos-fotos-checklist`.
- [ ] `vendas-gratuidades-documentos`.
- [ ] Upload, download autorizado, hash SHA-256 e trilha de auditoria testados.
- [ ] Política de acesso, tamanho máximo, formatos permitidos, retenção e backup definidos.

### 5.4 Segurança e LGPD

- [ ] Política de senha e troca inicial definida.
- [ ] Usuário administrador de desenvolvimento substituído por contas nominais de produção.
- [ ] Acessos administrativos limitados e revisados.
- [ ] Processo de admissão, mudança de função e desligamento definido.
- [ ] Dados pessoais visíveis somente aos perfis necessários.
- [ ] Política de uso de celular pessoal versus aparelho corporativo definida.
- [ ] Procedimento para aparelho perdido, roubado ou trocado.
- [ ] Sessões revogadas em desligamentos e incidentes.
- [ ] Responsáveis por auditoria e investigação de eventos definidos.

## 6. Onda 2 — Cadastros e configurações globais

### 6.1 Usuários, perfis e permissões

Perfis-base existentes: Administrador, Financeiro, Comercial, Price, Conferente, Bilheteiro, Porteiro e Gerente. Eles são ponto de partida; a matriz real deve refletir a operação da AJC.

Para cada usuário:

- [ ] Nome completo.
- [ ] CPF do colaborador, quando aplicável.
- [ ] Login individual, nunca compartilhado entre pessoas.
- [ ] E-mail e telefone/WhatsApp.
- [ ] Perfil principal.
- [ ] Unidade, cidade, porto ou embarcação de atuação.
- [ ] Tipo de acesso: painel web, mobile de campo, PDV, totem administrativo ou mais de um.
- [ ] Permissões excepcionais justificadas.
- [ ] Data de início e, quando aplicável, expiração do acesso.
- [ ] Senha temporária entregue por canal seguro.
- [ ] Primeiro login realizado e validado.
- [ ] Treinamento e termo de responsabilidade concluídos.

#### Modelo de inventário de usuários

| Nome | Função real | Unidade | Perfil | Canais | Login | Mobile configurado | Treinado | Aprovado |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  | Web/mobile/PDV |  |  |  |  |

#### Matriz de acesso a validar

| Perfil/função | Ver | Criar | Editar | Aprovar/validar | Cancelar/resolver | Exportar | Observações |
|---|---|---|---|---|---|---|---|
| Administrador |  |  |  |  |  |  |  |
| Financeiro |  |  |  |  |  |  |  |
| Comercial/agente |  |  |  |  |  |  |  |
| Operador de caixa |  |  |  |  |  |  |  |
| Conferente do porto |  |  |  |  |  |  |  |
| Conferente da balsa |  |  |  |  |  |  |  |
| Bilheteiro |  |  |  |  |  |  |  |
| Porteiro |  |  |  |  |  |  |  |
| Gerente da embarcação |  |  |  |  |  |  |  |
| Diretoria |  |  |  |  |  |  |  |

### 6.2 Login dos usuários mobile

Executar em cada aparelho, com o usuário que realmente utilizará o dispositivo:

1. Identificar o aparelho no inventário patrimonial.
2. Atualizar sistema operacional e componentes de segurança.
3. Configurar bloqueio de tela, PIN e conta corporativa, quando houver.
4. Instalar/adicionar o app de campo homologado.
5. Autorizar câmera, arquivos, localização, Bluetooth e notificações somente conforme a função.
6. Informar a URL/ambiente oficial, sem apontar para desenvolvimento.
7. Realizar o primeiro login nominal.
8. Baixar uma viagem/lista operacional para uso offline.
9. Colocar o aparelho em modo avião e executar um cenário da função.
10. Restaurar a rede e confirmar sincronização sem duplicidade.
11. Registrar aparelho, usuário, versão do app e data do teste.
12. Ensinar logout, troca de turno, fila pendente e procedimento em caso de perda do aparelho.

> **Não usar uma única conta genérica para todos os celulares.** A auditoria depende de saber quem executou cada ação.

### 6.3 Cidades, portos, agentes e unidades

- [ ] Validar as cidades iniciais: Belém, Breves, Gurupá, Almeirim, Porto de Moz, Prainha, Monte Alegre e Santarém.
- [ ] Confirmar siglas operacionais usadas nas etiquetas.
- [ ] Cadastrar endereço e responsável de cada porto/agência.
- [ ] Cadastrar agentes por cidade, contatos e situação.
- [ ] Definir clientes atendidos por cada agente.
- [ ] Definir caixas por cidade/canal.
- [ ] Definir horários locais, restrições e contatos de contingência.

### 6.4 Embarcações e capacidades

Para cada embarcação:

- [ ] Nome oficial e identificação interna.
- [ ] Tipo: passeio+carga ou carga.
- [ ] Status operacional.
- [ ] Capacidade total de carga.
- [ ] Classes disponíveis.
- [ ] Capacidade numérica real por classe.
- [ ] Subtipos de camarote/suítes.
- [ ] Cor de pulseira por classe.
- [ ] Fotos aprovadas para o portal.
- [ ] Celular responsável pelo GPS, se aplicável futuramente.
- [ ] Responsável pela embarcação.

### 6.5 Rotas, viagens, paradas e escalas

- [ ] Validar os templates do FAQ 2026 e suas divergências de horário.
- [ ] Confirmar ida, escalas, destino, retorno e fechamento previsto de cada ciclo.
- [ ] Definir antecedência mínima para abrir venda e carga.
- [ ] Definir quando a viagem deixa de aceitar venda/reserva/carga.
- [ ] Definir tolerância de atenção e atraso.
- [ ] Confirmar capacidade por viagem e exceções sazonais.
- [ ] Cadastrar colaboradores escaláveis e WhatsApp.
- [ ] Definir responsável por criar e editar viagens.
- [ ] Definir ação operacional auditada para mudança de status; o status não deve ser digitado livremente no formulário.

### 6.6 Motor de configuração

Todas as regras abaixo devem ser publicadas com versão, responsável, vigência e evidência de aprovação.

| Configuração | O que levantar/aprovar | Responsável | Status |
|---|---|---|---|
| Termo de aceite de embarque | Texto jurídico final e vigência |  |  |
| Declaração de conteúdo | Texto, cláusula, assinatura e limites |  |  |
| Termo de veículos/máquinas | Texto de envio e entrega |  |  |
| Tolerância de atraso | Minutos para no prazo/atenção/atrasado |  |  |
| Cores de pulseira | Cor por classe e embarcação |  |  |
| Limite de cortesia | Quantidade por viagem e autorizadores |  |  |
| Motivos de cortesia | Categorias e observação obrigatória |  |  |
| Tipos de gratuidade | Regras, documentos e relatório |  |  |
| Tamanhos de encomenda | P/M/G, pesos, limite fixo e percentual |  |  |
| Formas de pagamento | Por canal, parcelamento e acréscimos |  |  |
| Comissão de agente | Percentual, base, liberação e pagamento |  |  |
| Agenda de recebimento | Dias, horários, duração e capacidade por janela |  |  |
| Regras de reimpressão | Quem pode, motivo e auditoria |  |  |
| Retenção de arquivos | Prazo por foto, assinatura e documento |  |  |
| Notificações | Eventos, destinatários e modelos de mensagem |  |  |

> A agenda atualmente modelada usa janelas de 30 minutos, das 06h às 18h, com capacidade de 5 NF/DC por janela. Esses valores devem ser confirmados pela operação antes da produção e, se variarem por unidade, precisam virar configuração por unidade.

### 6.7 Tabelas de preço

- [ ] Passagens por origem, destino, intertrecho, embarcação/classe, subtipo e tarifa.
- [ ] Meia-passagem, isenções, contrato, cortesia e gratuidade.
- [ ] Encomendas por destino, tamanho/peso e percentual sobre valor declarado.
- [ ] Carga por cliente, destino, faixa/tier, peso, volume e condições comerciais.
- [ ] Veículos e máquinas por tipo, trecho e condição.
- [ ] Vigência, motivo, aprovador e versão de cada tabela.
- [ ] Processo de reajuste em massa e rollback por nova versão.
- [ ] Venda de teste para cada combinação crítica.

### 6.8 Cadastros comerciais e administrativos

- [ ] Clientes PF/PJ, CPF/CNPJ, contatos, endereço, cidade/UF e agente.
- [ ] Clientes contrato, forma de faturamento e limites aprovados.
- [ ] Fornecedores e categorias.
- [ ] Agentes comerciais, cidade, contato e regra de comissão.
- [ ] Colaboradores, CPF, função, cidade, contato e situação.
- [ ] Paletes próprios e de terceiros; códigos são gerados automaticamente pelo sistema.
- [ ] Caixas operacionais e responsáveis.
- [ ] Saldos de abertura e data de corte para a entrada em produção.

## 7. Onda 3 — Inventário e configuração de equipamentos

### 7.1 Inventário mestre

| ID patrimônio | Equipamento | Marca/modelo | Nº série/IMEI | Unidade | Função | Usuário responsável | Conectividade | Status |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  | Wi-Fi/4G/Bluetooth |  |

### 7.2 Equipamentos a levantar por local

#### Matriz/administrativo

- computadores ou notebooks;
- monitores e navegadores homologados;
- impressora comum, se relatórios físicos forem necessários;
- conexão principal e contingência;
- nobreak para equipamentos críticos.

#### PDV/bilheteria/porto

- computador ou tablet de atendimento;
- impressora térmica de recibo/bilhete, se utilizada;
- impressora térmica Bluetooth de etiqueta;
- balança, com modelo e forma de leitura;
- leitor por câmera/celular ou scanner, se adquirido;
- maquininha de cartão;
- gaveta/estrutura de caixa;
- roteador e internet de contingência;
- pulseiras físicas nas cores configuradas.

#### Campo e embarcação

- celulares comuns por função/turno;
- chips e planos de dados;
- capas de proteção, películas e alças;
- carregadores, cabos e power banks;
- impressoras Bluetooth e rolos de etiqueta;
- celular dedicado da embarcação para GPS futuro;
- local seguro para guarda e recarga.

#### Totem

- computador/tela touch;
- impressora compatível;
- leitor/meio de pagamento homologado;
- conexão e alimentação protegidas;
- acesso físico para manutenção;
- modo quiosque e reinício automático.

### 7.3 Configuração da impressora térmica Bluetooth

O modelo da impressora ainda precisa ser confirmado. Ele define ESC-POS, ZPL ou SDK proprietário. Depois da escolha, executar para cada impressora:

1. Registrar modelo, número de série, unidade e responsável.
2. Confirmar largura, tamanho e material da etiqueta.
3. Confirmar suporte a QR Code legível e linguagem de impressão.
4. Parear com o celular/tablet autorizado.
5. Configurar a impressora dentro do app.
6. Imprimir etiqueta de carga com cidade, palete, volume e QR/UUID.
7. Imprimir etiqueta de veículo/máquina.
8. Testar leitura do QR imediatamente após a impressão.
9. Testar desligamento, reconexão e troca de turno.
10. Testar impressão sem internet.
11. Testar fila pendente e reimpressão do mesmo UUID.
12. Confirmar que reimprimir não cria novo volume nem novo identificador.
13. Definir estoque mínimo de rolos, responsável e reposição.
14. Registrar uma impressora reserva ou contingência por local crítico.

#### Registro de impressoras

| ID | Unidade | Modelo | Protocolo | Celulares pareados | Etiqueta homologada | Reserva | Último teste | Status |
|---|---|---|---|---|---|---|---|---|
|  |  |  | ESC-POS/ZPL/SDK |  |  |  |  |  |

### 7.4 Câmera, QR, foto e assinatura

- [ ] Permissão de câmera concedida somente ao app correto.
- [ ] QR de bilhete lido em luz forte, baixa luz e tela quebrada/escura.
- [ ] QR de etiqueta lido após impressão, dobra e manuseio normal.
- [ ] Busca manual por nome/CPF testada como contingência do bilheteiro.
- [ ] Foto com data/hora, hash e GPS quando disponível.
- [ ] Duas fotos obrigatórias de entrega testadas.
- [ ] Assinatura em tela testada com dedo e caneta capacitiva.
- [ ] Recuperação após fechamento inesperado do app testada.
- [ ] Upload posterior das evidências offline confirmado.

### 7.5 Balança

O sistema admite peso informado manualmente; integração automática depende do modelo/protocolo da balança.

- [ ] Levantar marca, modelo, capacidade e precisão.
- [ ] Verificar saída serial, USB, Bluetooth ou API.
- [ ] Definir se o MVP usará digitação manual conferida ou integração.
- [ ] Realizar calibração e registrar responsável.
- [ ] Testar pesos próximos aos limites P/M/G.
- [ ] Definir procedimento para balança indisponível.

### 7.6 Teste offline por equipamento

Para cada celular de campo:

- [ ] login e carga inicial com internet;
- [ ] download da viagem/lista necessária;
- [ ] modo avião;
- [ ] leitura de QR;
- [ ] registro de conferência/validação/entrega;
- [ ] captura de foto e assinatura, conforme a função;
- [ ] impressão local, quando aplicável;
- [ ] visualização da fila pendente;
- [ ] retorno da rede;
- [ ] sincronização sem perda ou duplicidade;
- [ ] conferência do evento no painel e na auditoria.

## 8. Onda 4 — Implantação por setor/módulo

## 8.1 Administração do sistema e Cadastros

### Levantar

- responsáveis por aprovar usuários, perfis, preços e configurações;
- processo de admissão, alteração e desligamento;
- cadastros legados e qualidade dos dados;
- quem pode publicar nova versão de regra/preço.

### Configurar/cadastrar

- perfis, permissões e usuários;
- cidades, unidades, fornecedores, colaboradores e agentes;
- configurações versionadas e tabelas de preço;
- rotina de auditoria e revisão periódica de acesso.

### Treinar e testar

- criar, editar, desativar e reativar usuários;
- alterar perfil e confirmar perda/ganho de acesso;
- publicar configuração e preço com nova versão;
- consultar auditoria da alteração.

### Critério de aceite

Administrador da AJC consegue manter usuários e regras sem depender de alteração no código, e um usuário sem permissão não consegue executar ação restrita.

## 8.2 Navegação e Operação

### Levantar

- embarcações, classes, capacidades e status;
- rotas, paradas, horários e retorno;
- responsáveis por criar e editar viagem;
- tripulação e escalas;
- tolerâncias de atraso e forma de apontamento operacional.

### Configurar/cadastrar

- frota e capacidades por classe;
- cores de pulseira;
- templates de rota;
- colaboradores e escalas;
- viagem-piloto completa, com saída e retorno.

### Equipamentos

- computador/tablet do setor;
- celular do responsável da embarcação;
- conexão e contingência.

### Treinar e testar

- criar e editar viagem;
- validar paradas automáticas e capacidades;
- impedir retorno anterior à saída;
- notificar escala pelo stub sem fingir envio real;
- baixar relatório do dia;
- verificar impacto da viagem em Vendas, TMS e Embarque.

### Critério de aceite

Uma viagem completa fica disponível corretamente para venda, carga, escalas e apps de campo, sem capacidade ou horário inconsistente.

## 8.3 Comercial e CRM

### Levantar

- agentes por cidade e carteira de clientes;
- dados obrigatórios de PF/PJ;
- contratos, condições especiais e preços por cliente;
- regras de cotação e comissão;
- processo de realocação de cliente.

### Configurar/cadastrar

- agentes e colaboradores comerciais;
- clientes e contatos;
- vínculo cliente–agente;
- tabelas e exceções comerciais aprovadas;
- usuários e permissões do Comercial.

### Equipamentos

- computador no escritório/agência;
- tablet ou celular para uso responsivo, se necessário;
- internet e canal de contingência.

### Treinar e testar

- criar e editar cliente;
- localizar código único do cliente;
- realocar cliente;
- criar cotação de carga/encomenda;
- consultar histórico 360 e criar novo envio a partir do histórico;
- exportar dados autorizados.

### Critério de aceite

O comercial consegue cadastrar, consultar e cotar sem criar clientes duplicados e respeitando preços/regras aprovados.

## 8.4 Vendas de passagens — PDV

### Levantar

- operadores e caixas;
- formas de pagamento e possibilidade de multipagamento;
- política de emissão de BP-e no balcão;
- tipos de tarifa, cortesias, gratuidades e contratos;
- capacidade e bloqueio de venda;
- processo de cancelamento/estorno, se aplicável.

### Configurar/cadastrar

- usuários operadores;
- caixas e saldos de abertura;
- preços por trecho/classe;
- meios de pagamento por canal;
- motivos e limites de cortesia;
- tipos e documentos de gratuidade;
- termo de aceite vigente.

### Equipamentos

- computador/tablet;
- impressora, se o processo usar comprovante físico;
- maquininha de cartão;
- balança para despacho de encomendas;
- conexão de contingência.

### Treinar e testar

- venda normal por classe;
- multipagamento;
- venda de meia/contrato;
- cortesia dentro e acima do limite;
- gratuidade com documento;
- tentativa de overbooking;
- emissão e leitura do QR;
- reenvio da mesma operação sem duplicar bilhete;
- fechamento e conferência do caixa.

### Critério de aceite

Venda gera bilhete único, respeita capacidade/preço, registra pagamento e aparece corretamente no manifesto e no caixa.

## 8.5 Portal público, área do cliente e totem

### Levantar

- gateway escolhido, contrato, taxas e credenciais;
- PIX, cartão, parcelamento e prazo de expiração da reserva;
- política de cancelamento e atendimento;
- emissão fiscal automática;
- textos públicos, política de privacidade e suporte;
- fotos das embarcações;
- hardware e meios de pagamento do totem.

### Configurar

- domínio e identidade pública;
- viagens e preços publicados;
- gateway e webhook, quando contratado;
- BP-e/fiscal, quando credenciado;
- e-mail/WhatsApp, quando houver provedor;
- timeout e limpeza do totem.

### Treinar e testar

- compra completa do início ao QR;
- concorrência na última vaga;
- pagamento aprovado, pendente, recusado e expirado;
- webhook repetido sem duplicidade;
- recuperação/compartilhamento do bilhete;
- totem fora de serviço por falha de hardware;
- atendimento ao cliente com pedido localizado.

### Critério de aceite

Só liberar pagamento real quando gateway, webhook, conciliação mínima, suporte e fiscal estiverem homologados. Até lá, o fluxo permanece stub auditável e não deve ser apresentado como integração real.

## 8.6 TMS administrativo — NF/DC, agenda e Nova Carga

### Levantar

- equipe ADM Notas;
- dados obrigatórios do documento e destinatário;
- formatos de arquivo aceitos;
- regra de agendamento por porto;
- cliente responsável e vínculo da NF/DC;
- regra de origem/destino, peso, volumes e valor;
- critérios de conferida/divergente.

### Configurar/cadastrar

- usuários e permissões;
- clientes e cidades;
- agenda de recebimento;
- armazenamento de documentos;
- viagens disponíveis;
- tabelas/regras de carga.

### Equipamentos

- computador do ADM Notas;
- scanner apenas se documentos em papel precisarem ser digitalizados;
- conexão estável para anexos.

### Treinar e testar

- lançar NF/DC avulsa com destinatário completo;
- anexar documento e conferir hash;
- reservar janela disponível e bloquear excesso;
- selecionar cliente e várias NF/DC livres;
- criar carga derivada dos documentos;
- impedir vínculo de documento de outro cliente ou já utilizado;
- marcar documento como conferido/divergente;
- etiquetar volumes ligados ao documento.

### Critério de aceite

Nenhuma carga entra no fluxo sem cliente, documento válido, agenda aplicável e rastreabilidade dos volumes.

## 8.7 Portaria

### Levantar

- porteiros e turnos;
- tipos de veículo de carga que entram no porto;
- empresas/transportadoras frequentes;
- campos obrigatórios e necessidade de foto;
- procedimento para saída e exceções.

### Configurar/cadastrar

- usuários Porteiro;
- unidade/porto;
- aparelhos;
- armazenamento de fotos;
- lista inicial de veículos no pátio na data de corte, se houver.

### Equipamentos

- celular comum com câmera e 4G/Wi-Fi;
- carregador/power bank;
- proteção adequada ao ambiente.

### Treinar e testar

- registrar entrada com placa, empresa, data/hora e foto;
- consultar veículos no pátio;
- registrar saída selecionando uma entrada existente;
- tentar saída duplicada;
- operar offline e sincronizar;
- gerar relatório por data/empresa.

### Critério de aceite

Todo veículo de carga presente no pátio aparece em tempo real ou como evento pendente de sincronização, e a saída sempre referencia uma entrada válida.

## 8.8 Conferência no porto

### Levantar

- conferentes e turnos;
- fluxo com palete e sem palete;
- regras de completo/parcial;
- responsabilidade por divergências;
- quando a foto é obrigatória;
- local de impressão e reposição de etiquetas.

### Configurar/cadastrar

- usuários Conferente;
- celulares e impressoras pareadas;
- paletes próprios/de terceiros;
- viagens e documentos liberados;
- fila offline e armazenamento de fotos.

### Equipamentos

- celular comum com câmera;
- impressora térmica Bluetooth;
- rolos de etiqueta e reserva;
- balança, quando usada;
- power bank e conexão de contingência.

### Treinar e testar

- selecionar viagem e NF/DC;
- alocar documento e volumes em palete;
- registrar palete completo/parcial;
- conferir mercadoria avulsa volume a volume;
- imprimir e ler todas as etiquetas;
- registrar divergência;
- reimprimir o mesmo UUID com motivo;
- trabalhar offline e sincronizar sem duplicar eventos.

### Critério de aceite

Cada volume/palete possui identidade física legível e histórico de quem conferiu, embarcou, imprimiu ou reimprimiu.

## 8.9 Bipe de embarque na embarcação

### Levantar

- conferentes por embarcação/viagem;
- ponto físico do embarque;
- tratamento de volume não esperado, duplicado ou divergente;
- responsável por autorizar exceção.

### Configurar/cadastrar

- usuários e viagem;
- lista local de volumes esperados;
- aparelho da balsa;
- contingência offline.

### Equipamentos

- celular com câmera;
- carregador/power bank;
- proteção e local de guarda.

### Treinar e testar

- baixar lista antes da saída;
- bipar volume/palete esperado;
- bloquear ou alertar duplicidade;
- tratar volume de outra viagem;
- finalizar conferência com pendências;
- sincronizar após período sem internet.

### Critério de aceite

O manifesto físico embarcado pode ser conciliado com o esperado, e qualquer falta/sobra fica registrada antes da partida ou como exceção auditada.

## 8.10 Encomendas

### Levantar

- dados obrigatórios de remetente e destinatário;
- quem paga: remetente ou destinatário;
- tabela final de preço e limites P/M/G;
- cobrança acima do valor declarado limite;
- texto final da declaração de conteúdo;
- fluxo alternativo com NF;
- responsabilidade por assinatura.

### Configurar/cadastrar

- preços de encomenda;
- tamanhos/pesos e percentual;
- declaração de conteúdo versionada;
- usuários de despacho;
- caixas/contas a receber conforme quem paga;
- bucket de assinatura e documentos.

### Equipamentos

- PDV/computador;
- balança;
- tela touch/tablet ou celular para assinatura;
- impressora de etiqueta.

### Treinar e testar

- despacho com DC assinada;
- despacho com NF;
- impedir confirmação sem assinatura/evidência;
- preço por tamanho e por percentual;
- remetente pagante gerando caixa;
- destinatário pagante gerando contas a receber;
- etiqueta e controle por viagem.

### Critério de aceite

100% das encomendas possuem NF ou DC válida, remetente/destinatário completos, valor declarado, responsável financeiro e prova de aceite.

## 8.11 Veículos e máquinas

### Levantar

- tipos de veículos e máquinas aceitos;
- placa obrigatória para veículos e identificação de máquinas;
- preço por trecho/tipo;
- checklist de envio e entrega;
- fotos obrigatórias por etapa;
- texto do termo de aceite;
- responsáveis por cadastro, vistoria, subida, descida e entrega.

### Configurar/cadastrar

- tabela de preços;
- checklists e termos;
- usuários e permissões;
- armazenamento de fotos;
- viagens disponíveis.

### Equipamentos

- celular com câmera;
- impressora térmica Bluetooth;
- iluminação adequada para fotos;
- conexão/contingência.

### Treinar e testar

- cadastro por PDV/Comercial/Gerente do Porto;
- bloqueio de veículo sem placa;
- checklist e fotos de origem;
- etiqueta;
- bipe de subida e descida;
- checklist, fotos e aceite de entrega;
- reenvio offline sem duplicar o envio.

### Critério de aceite

O estado do veículo/máquina fica comprovado antes e depois do transporte, com responsáveis, fotos, checklists e movimentações auditadas.

## 8.12 Entrega de carga, encomenda e veículo/máquina

### Levantar

- entregadores/agentes e cidades;
- pessoa autorizada a receber;
- política para recebedor divergente;
- quantidade e tipo de fotos;
- notificações e contingência sem sinal.

### Configurar/cadastrar

- usuários de entrega;
- aparelho e permissões;
- armazenamento de comprovantes;
- modelos de protocolo/mensagem;
- provedor WhatsApp/SMS, quando contratado.

### Equipamentos

- celular com câmera e assinatura em tela;
- power bank;
- chip/plano de dados.

### Treinar e testar

- selecionar tipo de entrega;
- bipar item antes de concluir;
- tirar duas fotos obrigatórias;
- colher assinatura e identificação do recebedor;
- registrar GPS/data/hora;
- gerar protocolo;
- concluir offline e enviar notificação somente ao sincronizar;
- impedir entrega sem evidências.

### Critério de aceite

Nenhum item é marcado como entregue sem bipe, evidências obrigatórias, recebedor e protocolo auditável.

## 8.13 Bilheteiro e embarque de passageiros

### Levantar

- bilheteiros, turnos e portões;
- cores físicas de pulseira disponíveis;
- viagem selecionada e momento de baixar a lista;
- procedimento para QR ilegível e passageiro sem aparelho;
- tratamento de QR usado, vencido ou de outra viagem.

### Configurar/cadastrar

- usuários Bilheteiro;
- celulares;
- cores por classe;
- lista offline da viagem;
- pulseiras e estoque.

### Equipamentos

- celular com câmera;
- carregador/power bank;
- pulseiras por cor;
- proteção contra chuva/queda.

### Treinar e testar

- validar QR válido;
- bloquear segunda leitura;
- bloquear QR de outra viagem;
- buscar por nome/CPF;
- conferir classe e cor da pulseira;
- operar offline;
- sincronizar mantendo a hora capturada no aparelho.

### Critério de aceite

O mesmo bilhete não permite dois embarques e o bilheteiro identifica rapidamente passageiro, classe e pulseira mesmo sem internet.

## 8.14 Gerente da embarcação e prestação de contas

### Levantar

- gerentes e substitutos;
- receitas a bordo, cozinha, lanchonete, internet, passagens e fretes por agência;
- despesas, gratificações e cidades relacionadas;
- comissão, saldo e documentos comprobatórios;
- período, caixa e assinatura do responsável.

### Configurar/cadastrar

- usuários Gerente;
- embarcação/viagem;
- categorias do modelo real recebido;
- caixas e responsáveis;
- armazenamento de anexos.

### Equipamentos

- computador, tablet ou celular;
- conexão para anexos, com possibilidade de preenchimento em contingência;
- digitalização/foto de comprovantes quando necessário.

### Treinar e testar

- abrir prestação da viagem;
- lançar receitas e despesas por categoria/cidade;
- anexar comprovantes;
- calcular receita, despesa, comissão e saldo;
- assinar/identificar responsável;
- emitir relatório;
- conferir reflexo no caixa/financeiro mínimo.

### Critério de aceite

A prestação fecha com valores explicáveis, anexos e responsável, e pode ser comparada aos dados de vendas, carga e caixa da viagem.

## 8.15 Financeiro mínimo e caixas

> No MVP entram caixa e lançamentos AP/AR mínimos. Plano de contas completo, conciliação, Compras, DRE, estoque e fechamento completo de comissões permanecem em fase posterior.

### Levantar

- caixas por canal, cidade e embarcação;
- responsáveis e saldos de abertura;
- formas de pagamento;
- contas bancárias necessárias ao processo mínimo;
- títulos iniciais a migrar;
- processo de fechamento e divergência.

### Configurar/cadastrar

- caixas;
- usuários Financeiro e operadores;
- formas de pagamento;
- saldos/data de corte;
- títulos AP/AR necessários;
- vínculo com prestação e vendas conforme disponível.

### Equipamentos

- computadores do financeiro/tesouraria;
- acesso seguro e conexão estável;
- impressora comum somente se exigida pelo processo.

### Treinar e testar

- abertura/movimento/consulta de caixa;
- lançamento AP e AR;
- filtros por período/status;
- venda refletida no resumo;
- destinatário pagante gerando AR;
- exportação/relatório autorizado;
- tratamento de divergência.

### Critério de aceite

Os movimentos mínimos do MVP podem ser rastreados até sua origem e não são confundidos com o escopo financeiro completo ainda não implantado.

## 8.16 Diretoria e acompanhamento operacional

### Levantar

- indicadores prioritários;
- responsáveis por alertas;
- rotina de reunião diária/semanal;
- relatórios obrigatórios.

### Configurar/cadastrar

- usuários de consulta;
- alertas operacionais e responsáveis;
- filtros/unidades de interesse.

### Treinar e testar

- consultar dashboard;
- criar e resolver alerta;
- baixar relatório do dia;
- conferir vendas, TMS, caixa e ocupação;
- rastrear um evento até o usuário responsável.

### Critério de aceite

A diretoria acompanha a operação sem precisar alterar dados e consegue identificar rapidamente pendências e responsáveis.

## 9. Onda 5 — Migração e saneamento de dados

### 9.1 Definir o que será migrado

| Cadastro/dado | Fonte atual | Volume | Responsável pela limpeza | Data de corte | Importar ou cadastrar manualmente | Validado por |
|---|---|---|---|---|---|---|
| Clientes |  |  |  |  |  |  |
| Fornecedores |  |  |  |  |  |  |
| Colaboradores |  |  |  |  |  |  |
| Agentes |  |  |  |  |  |  |
| Embarcações/rotas |  |  |  |  |  |  |
| Preços |  |  |  |  |  |  |
| Caixas/títulos |  |  |  |  |  |  |

### 9.2 Regras de saneamento

- remover duplicidades antes da importação;
- validar CPF/CNPJ, telefone e cidade;
- não importar usuários desligados como ativos;
- identificar clientes sem agente;
- preservar origem e data do dado migrado;
- registrar totais antes/depois;
- testar a importação em ambiente de homologação;
- obter aceite do dono do dado antes da produção.

## 10. Onda 6 — Homologação ponta a ponta

Executar pelo menos os cenários abaixo na viagem-piloto:

### 10.1 Passageiro

- [ ] Criar viagem e publicar capacidade/preço.
- [ ] Vender no PDV.
- [ ] Comprar no portal em modo homologado/stub.
- [ ] Gerar QR e comprovante.
- [ ] Validar embarque online e offline.
- [ ] Bloquear QR já usado.
- [ ] Conferir manifesto por cidade e classe.

### 10.2 Carga

- [ ] Cadastrar cliente e NF/DC.
- [ ] Agendar recebimento.
- [ ] Criar carga com documentos selecionados.
- [ ] Registrar entrada do veículo no porto.
- [ ] Conferir e etiquetar volumes/paletes.
- [ ] Executar o bipe de embarque na embarcação.
- [ ] Registrar entrega com fotos e assinatura.
- [ ] Consultar controle por viagem e auditoria.

### 10.3 Encomenda

- [ ] Cadastrar remetente/destinatário.
- [ ] Calcular preço.
- [ ] Assinar DC ou anexar NF.
- [ ] Registrar quem paga.
- [ ] Etiquetar, embarcar e entregar.

### 10.4 Veículo/máquina

- [ ] Cadastrar envio.
- [ ] Registrar checklist/fotos.
- [ ] Imprimir etiqueta.
- [ ] Bipar subida/descida.
- [ ] Fazer checklist e aceite de entrega.

### 10.5 Fechamento

- [ ] Fechar/consultar caixas.
- [ ] Preencher prestação de contas.
- [ ] Consultar relatório do dia.
- [ ] Conferir alertas e trilha de auditoria.
- [ ] Confirmar ausência de duplicidades após sincronização offline.

## 11. Onda 7 — Treinamento

### 11.1 Modelo recomendado

1. Treinar primeiro administradores e líderes de setor.
2. Treinar cada função somente nas tarefas que ela executa.
3. Usar cenário real da viagem-piloto, não apresentação genérica.
4. Exigir prática individual no aparelho/equipamento real.
5. Aplicar checklist de competência e registrar presença.
6. Identificar multiplicadores locais em cada cidade/embarcação.
7. Entregar guia rápido de contingência e contatos de suporte.

### 11.2 Registro de treinamento

| Participante | Função | Unidade | Conteúdo | Equipamento usado | Data | Avaliação prática | Aprovado por |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

### 11.3 Competências mínimas por usuário de campo

- entrar com o próprio login;
- selecionar a viagem/unidade correta;
- identificar o estado online/offline;
- executar a tarefa principal;
- entender fila pendente e sincronização;
- não repetir ação apenas porque a resposta demorou;
- reconhecer erro, divergência e bloqueio;
- acionar suporte com ID/protocolo e evidência;
- cuidar do aparelho, bateria, impressora e insumos;
- encerrar turno conforme o procedimento.

## 12. Onda 8 — Corte e entrada em produção

### 12.1 Checklist de prontidão

- [ ] Responsáveis e escala de suporte definidos.
- [ ] Backup e restauração testados.
- [ ] Domínios, API, banco, worker e storage saudáveis.
- [ ] Usuários nominais ativos e acessos revisados.
- [ ] Dados mestres e preços aprovados.
- [ ] Viagem-piloto criada com capacidade correta.
- [ ] Celulares carregados, atualizados e testados.
- [ ] Impressoras pareadas e com insumos/reserva.
- [ ] Listas offline baixadas.
- [ ] Caixas e saldos de abertura conferidos.
- [ ] Plano de contingência comunicado.
- [ ] Critérios de abortar/adiar o go-live definidos.
- [ ] Donos dos setores assinaram o aceite.

### 12.2 Plano do dia do corte

| Horário | Ação | Responsável | Evidência | Plano B |
|---|---|---|---|---|
|  | Validar infraestrutura |  |  |  |
|  | Conferir usuários/aparelhos |  |  |  |
|  | Abrir caixas/operação |  |  |  |
|  | Acompanhar primeira venda |  |  |  |
|  | Acompanhar primeira carga |  |  |  |
|  | Acompanhar embarque |  |  |  |
|  | Fechar operação e conciliar |  |  |  |

### 12.3 Contingência

- indisponibilidade do painel web;
- indisponibilidade da API;
- falta de internet no porto/embarcação;
- celular perdido, sem bateria ou quebrado;
- impressora sem conexão ou sem papel;
- balança indisponível;
- pagamento indisponível;
- QR ilegível;
- storage temporariamente indisponível;
- conflito ou item duplicado na sincronização.

Para cada cenário, registrar:

| Cenário | Como operar temporariamente | O que não pode ser feito | Como reconciliar depois | Quem autoriza |
|---|---|---|---|---|
|  |  |  |  |  |

## 13. Onda 9 — Operação assistida e estabilização

### 13.1 Período recomendado

- acompanhamento intensivo da viagem-piloto;
- suporte reforçado nos primeiros dias de cada nova cidade;
- reunião diária curta durante a estabilização;
- revisão semanal de indicadores, falhas e adoção.

### 13.2 Indicadores de implantação

| Indicador | Meta inicial | Resultado | Ação |
|---|---|---|---|
| Usuários treinados/aprovados | 100% dos escalados |  |  |
| Volumes com etiqueta e QR | 100% |  |  |
| Encomendas com NF/DC e aceite | 100% |  |  |
| Entregas com evidências | 100% |  |  |
| Bilhetes validados sem duplicidade | 100% |  |  |
| Eventos offline sincronizados | 100% |  |  |
| Equipamentos críticos disponíveis | 100% + contingência |  |  |
| Prestações fechadas | 100% das viagens |  |  |
| Incidentes sem responsável | 0 |  |  |

### 13.3 Registro de incidente/melhoria

| Data | Unidade | Setor | Descrição | Impacto | Contorno | Causa | Ação definitiva | Responsável | Prazo | Status |
|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |

## 14. Dependências externas e itens que não podem ser tratados como prontos

| Dependência | Situação atual | O que falta para produção | Bloqueia qual frente |
|---|---|---|---|
| Gateway PIX/cartão | Adapter/stub auditável | Escolher fornecedor, contratar, credenciais, webhook e homologação | Pagamento real no portal |
| BP-e/SEFAZ-PA | Stub; PFX recebido | Senha, validade/uso, credenciamento, fornecedor/API e homologação fiscal | Emissão fiscal real |
| WhatsApp/SMS | Stub | Provedor, contrato, templates, credenciais e consentimentos | Notificações reais |
| Impressora Bluetooth | Fluxo previsto | Modelo, protocolo, aquisição e POC em aparelho real | Impressão física homologada |
| Offline-sync completo | Estratégia PowerSync/plano B | Spike e homologação nos apps Capacitor | Campo nativo plenamente offline |
| GPS em background | Risco alto/pós-MVP | Spike prolongado em celulares reais | Rastreamento em tempo real |
| MinIO nos fluxos | Buckets inventariados como pendentes | Ativar buckets e ligar uploads reais | Evidências/documentos reais |
| Preços de veículos/máquinas | Pendente de validação | Tabela e aprovação comercial | Cobrança automática |
| Regras finais de comissão | Pendente da diretoria | Base, gatilho, percentuais e estados | Comissão definitiva |
| Financeiro completo/Compras/DRE | Pós-MVP | Projeto e implantação próprios | Não bloqueia MVP operacional |

## 15. Ordem recomendada das ondas

| Ordem | Onda | Resultado esperado |
|---|---|---|
| 1 | Governança e levantamento | Responsáveis, unidades, processos, dados e equipamentos conhecidos |
| 2 | Infraestrutura e segurança | Ambiente de produção recuperável e protegido |
| 3 | Cadastros/configurações globais | Regras, usuários, frota, rotas, preços e unidades aprovados |
| 4 | Equipamentos | Celulares, impressoras, balanças e conexões homologados |
| 5 | Navegação + Cadastros | Viagem-piloto correta e disponível aos demais módulos |
| 6 | Vendas + CRM + Financeiro mínimo | Receita e clientes operando com controle |
| 7 | TMS + Encomendas + Veículos + Campo | Rastreabilidade física ponta a ponta |
| 8 | Prestação + Diretoria | Fechamento e acompanhamento da viagem |
| 9 | Homologação e treinamento | Pessoas aprovadas em cenários reais |
| 10 | Go-live piloto e expansão | Entrada controlada por cidade/embarcação |

## 16. Termo de aceite por setor

| Setor/unidade | Escopo validado | Dados aprovados | Usuários aprovados | Equipamentos aprovados | Treinamento concluído | Pendências aceitas | Responsável AJC | Data/assinatura |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## 17. Regra de conclusão da implantação

A implantação de uma unidade/setor somente pode ser marcada como concluída quando:

1. o responsável do setor estiver nomeado;
2. usuários e permissões estiverem aprovados;
3. cadastros e configurações usados pelo setor estiverem publicados;
4. equipamentos reais estiverem inventariados e testados;
5. cenários online, offline e de erro tiverem sido executados;
6. treinamento prático estiver registrado;
7. plano de contingência estiver comunicado;
8. pendências externas estiverem explicitamente aceitas, sem simular integração inexistente;
9. o responsável AJC tiver assinado o aceite do setor;
10. a documentação e o registro da implantação estiverem atualizados.
