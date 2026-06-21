# Módulo TMS / Carga — SPEC + Detalhamento de Telas

> Módulo prioritário (60% do faturamento e maior brecha de controle). Objetivo central: **rastreabilidade física ponta a ponta + blindagem jurídica**. Cada volume que entra é bipado, etiquetado, fotografado, conferido duas vezes e entregue com prova.

---

## Parte A — SPEC técnica

### A.1 Princípios de arquitetura
- **Offline-first** nos apps de campo (porteiro, conferente porto, conferente balsa, entrega). Internet do porto/balsa/cidades é instável. Tudo é gravado localmente e sincronizado via fila; cada registro carrega `client_uuid` para idempotência (evita duplicar no reenvio).
- **Identidade física do volume = UUID.** O QR impresso na etiqueta codifica o UUID do volume. Todo bip lê esse UUID. O UUID nasce no recebimento e acompanha o volume até a entrega.
- **Trilha de auditoria imutável.** Todo evento (recebido, conferido, embarcado, 2º bipe, desembarcado, entregue) grava quem, quando, onde (GPS quando houver) e foto quando aplicável. É o coração do antifraude: nada "some" sem deixar rastro.
- **Foto como prova legal.** Fotos obrigatórias com carimbo de data/hora; armazenadas com hash para integridade.

### A.2 Entidades principais (modelo de dados de alto nível)

```
Embarcacao (id, nome, tipo[passeio_carga|carga], capacidade_carga, status[ativa|manutencao|alugada])
Viagem (id, embarcacao_id, origem, data_hora_saida, escalas[], status[planejada|em_curso|concluida])
  └─ ViagemEscala (viagem_id, cidade_sigla, data_hora_prevista_chegada, ordem)

Cliente (id, tipo[PF|PJ], nome, cpf_cnpj, contato, agente_id?)
Agente (id, nome, cidade_sigla, percentual_comissao)

Carga (id, viagem_id, cliente_remetente_id, destinatario_id, cidade_destino_sigla,
        tipo_recebimento[porto_balsa|direto], status, valor_declarado, valor_cobrado,
        nf_dc_id?, criado_por, criado_em)
  └─ Volume (id, carga_id, uuid, palete_id?, indice_volume, total_volumes, peso,
             status[recebido|conferido|embarcado|reconferido|desembarcado|entregue|divergente])
       └─ EventoVolume (volume_id, tipo, usuario_id, timestamp, gps?, foto_id?, obs)

Palete (id, codigo, proprietario[AJC|terceiro], terceiro_id?, status[livre|alocado|em_transito])
  └─ alocação: PaleteViagem (palete_id, viagem_id, cidade_destino_sigla)

NotaFiscalDC (id, tipo[NFe|NFCe|DC], numero, valor, arquivo_id, cliente_id,
              lancado_por, status[pendente|conferida|divergente])
DeclaracaoConteudo (id, carga_id, valor_declarado, descricao_informada, texto_termo,
                    assinatura_id, aceite_em, ip/dispositivo)

RegistroPortaria (id, placa, empresa, motorista?, tipo[veiculo_carga|veiculo_transporte|pessoa],
                  entrada_em, saida_em?, porteiro_id, foto_id?)

EntregaComprovante (id, volume_ids[], cidade_sigla, recebedor_agente_id, recebedor_nome, recebedor_doc,
                    recebedor_avulso[bool], justificativa?, assinatura_id,
                    foto1_id, foto2_id, gps, entregue_por_conferente_id, entregue_em)

PrestacaoContas (id, viagem_id, gerente_id, itens[], total_declarado, total_sistema,
                 divergencia, status[rascunho|enviada|conferida], anexos[])
```

### A.3 Máquina de estados do volume

```
                ┌──────────── divergente (em qualquer ponto) ───────────┐
                │                                                         │
recebido ──► conferido ──► embarcado ──► reconferido(2º bipe) ──► desembarcado ──► entregue
 (porto)      (coletor)    (na balsa)     (conferente balsa)      (balsa→terra)   (agente da cidade assina)

Cross-docking (carregamento direto na balsa, sem pátio):
recebido+embarcado ─────────────────────────────────► desembarcado ──► entregue
 (bipe do porto OU da balsa, com foto obrigatória)      (balsa→terra)   (agente da cidade assina)
```
- Cada transição exige o evento correspondente. Divergência (item a mais/menos, avaria) abre exceção e notifica o gerente.
- No **cross-docking** o volume é recebido e embarcado no mesmo ato (não há etapa de pátio nem 2º bipe separado); o bipe pode ser efetivado **pelo conferente do porto ou pelo conferente da balsa** — ver A.4.

### A.4 Dois modelos de recebimento (RF-4)
- **(a) Porto + Balsa:** carga recebida e conferida no porto → etiquetada/paletizada → embarcada → **2º bipe** na balsa. Fluxo padrão.
- **(b) Carregamento direto (cross-docking):** carga embarcada direto na balsa, sem passar pelo pátio do porto. **Permite múltiplos recebimentos** (vários lotes/horários) na mesma viagem.

> **Quem efetiva o bipe de carregamento direto:** o recebimento/bipe do cross-docking pode ser feito **tanto pelo conferente do porto quanto pelo conferente da balsa**. Ou seja, o recebimento de carregamento direto não é exclusivo de um perfil — quem estiver no ponto onde a carga embarca direto registra o recebimento. O evento grava qual perfil/usuário efetivou (auditoria). Foto de recebimento é **obrigatória** nos dois modelos e por qualquer um dos dois conferentes.

### A.5 Integrações
- **WhatsApp/SMS** (notificação de entrega a remetente e destinatário).
- **Impressora de etiquetas** (térmica) para QR/UUID.
- **Coletor/Palm** com câmera e leitor (app nativo ou PWA com acesso à câmera).
- **Balança** (no PDV de encomendas; ver módulo Vendas/Encomendas).
- **GPS** do dispositivo para georreferência dos eventos.

### A.6 Regras-chave
- Nenhum volume embarca sem etiqueta com UUID e sem foto de recebimento — **inclusive no cross-docking** (a etiquetagem/foto ocorre no ato do recebimento direto na balsa).
- Todo volume sob risco legal exige **NF ou Declaração de Conteúdo** vinculada antes do embarque.
- Divergência entre nº de volumes declarado e bipado **bloqueia** o fechamento da carga até resolução pelo gerente.
- O recebimento de **carregamento direto / cross-docking** pode ser efetivado pelo conferente do porto **ou** da balsa; todo evento grava o usuário/perfil que o registrou.
- Prestação de contas do gerente é **cruzada automaticamente** com o contas a receber (módulo Financeiro).

---

## Parte B — Telas e Apps

> Legenda de estados usada em todas as telas: **Vazio** (sem dados) · **Carregando** · **Erro** · **Sucesso** · **Offline** (dado em fila, ainda não sincronizado).

### B.1 App Portaria — Registro de entrada/saída no porto
**Persona:** Porteiro (turno fixo, 1 entrada/saída no porto). **Plataforma:** App mobile, offline-first.

**Objetivo:** registrar quem entra e sai do porto (veículos de carga, veículos para transporte, pessoas) para eliminar o "não sei de quem é esse caminhão".

**Campos / componentes:**
- Botão grande **"Registrar entrada"** e **"Registrar saída"**.
- Captura de **placa** (campo texto + sugestão por OCR da câmera, opcional).
- **Empresa** (autocomplete com cadastro; permite digitar nova).
- **Tipo:** veículo de carga / veículo para transporte / pessoa.
- **Motorista/nome** (opcional).
- **Foto** (opcional na entrada, recomendada).
- Data/hora **automáticas** (carimbo do dispositivo).

**Ações:** registrar entrada → fica "no pátio"; registrar saída → seleciona da lista de "no pátio" e fecha o registro.

**Estados:**
- *Vazio:* "Nenhum veículo no pátio agora."
- *Offline:* registro salvo localmente, badge "pendente de sincronizar".
- *Erro:* placa em formato inválido → validação inline.

**Lista "No pátio agora":** placa, empresa, tipo, hora de entrada, tempo decorrido. Toque → detalhes + botão "Registrar saída".

---

### B.2 Upload de NF / Declaração de Conteúdo (cliente e agente)
**Persona:** Cliente ou agente comercial. **Plataforma:** Web/App.

**Objetivo:** permitir que o cliente/agente suba a NF/DC antes ou no momento do envio.

**Campos:** seleção da carga/envio relacionado; tipo de documento (NF-e / NFC-e / Declaração de Conteúdo); upload de arquivo (PDF/foto) ou número da chave de NF-e; valor.

**Estados:** *Vazio* (nenhum doc enviado) · *Carregando* (upload) · *Erro* (arquivo grande/ inválido) · *Sucesso* ("Documento enviado, aguardando conferência").

---

### B.3 Lançamento de NF/DC — ADM Notas
**Persona:** ADM Notas (back-office). **Plataforma:** Web.

**Objetivo:** lançar/validar as NF/DC que entram, vinculando-as às cargas.

**Componentes:**
- Fila de documentos **pendentes** (enviados por clientes/agentes + lançamento manual).
- Formulário: tipo, número/chave, valor, cliente, carga vinculada.
- Ação de **etiquetar por volume da conferência** e **por palete** (gera os volumes a serem bipados).
- Marcar como **conferida** ou **divergente**.

**Estados:** fila vazia · carregando · erro de validação de chave NF-e · sucesso.

---

### B.4 App Conferente (Porto) — Recebimento e conferência no coletor
**Persona:** Conferente do porto. **Plataforma:** Coletor/Palm (app nativo ou PWA com câmera), offline-first. **Tela central do antifraude.**

**Objetivo:** receber a carga conferindo volume a volume contra a NF/DC, etiquetar e fotografar.

**Fluxo de tela:**
1. **Selecionar viagem/carga** (lista de cargas previstas para embarcar).
2. **Escolher modelo de recebimento:** Porto+Balsa ou Carregamento direto (este permite múltiplos recebimentos).
3. **Conferir volumes:**
   - Para cada volume: informar/confirmar dados, **tirar foto obrigatória**, alocar a um **palete** (próprio ou de terceiro), e **imprimir etiqueta** com QR/UUID.
   - Contador "Conferidos X / Y declarados" sempre visível.
4. **Foto de recebimento obrigatória** (do lote/palete, ângulo de cima e do meio — padrão de 2 fotos).
5. **Fechar conferência** → só habilita se X = Y ou se a divergência for justificada (abre exceção ao gerente).

**Componentes:** leitor de QR/código; câmera; campo de peso (se houver balança); seletor de palete; botão imprimir etiqueta.

**Estados:**
- *Divergente:* "Faltam 2 volumes" ou "1 volume a mais que o declarado" → destaque vermelho, exige ação.
- *Offline:* conferência segue normalmente; sincroniza depois.
- *Sucesso:* "Carga conferida — N volumes, peso total X."

---

### B.5 Etiqueta de carga (modelo de impressão)
**Objetivo:** etiqueta física padronizada por volume.

**Conteúdo obrigatório:**
- **CIDADE:** sigla (BEL, BRV, GUR, ALM, PMZ, PRA, MTA, STM).
- **PALETE:** código do palete usado.
- **VOLUME:** índice/total (ex.: 1/2, 2/2 ou 1/3, 2/3, 3/3).
- **QR Code** com o **UUID** do volume.
- (Recomendado) remetente/destinatário abreviado e nº da carga.

**Observação técnica:** layout para impressora térmica; UUID é a chave de todos os bips subsequentes.

---

### B.6 Cadastro e alocação de paletes
**Persona:** Conferente / operação. **Plataforma:** Web + coletor.

- **Cadastro de paletes de terceiros:** código, proprietário (terceiro), identificação.
- **Alocação de paletes:** vincular palete a uma viagem e cidade destino; status (livre / alocado / em trânsito).
- Lista filtrável por status, proprietário, viagem.

**Estados:** vazio · em trânsito (não pode realocar) · erro (palete já alocado a outra viagem).

---

### B.7 App Conferente da Balsa — 2º bipe (reconferência)
**Persona:** Conferente da balsa. **Plataforma:** Coletor/Palm, offline-first.

**Objetivo:** reconferir no embarque tudo que foi conferido no porto — segunda barreira antifraude.

**Fluxo:** seleciona a viagem → bipa cada volume que sobe → sistema compara com o que foi conferido no porto.
- **Match:** volume passa a `reconferido/embarcado`.
- **Não previsto:** volume bipado que não estava na carga → alerta "volume não consta".
- **Faltante ao fechar:** lista volumes esperados que não foram bipados.

**Estados:** progresso "Embarcados X / Y" · divergência destacada · offline · fechamento com resumo.

> O conferente da balsa atua em **três modos**: (1) **2º bipe / reconferência** desta tela, para carga que já foi conferida no porto; (2) **recebimento de carregamento direto / cross-docking** (tela B.8), para carga que embarca direto na balsa sem ter passado pelo pátio; e (3) **entrega no desembarque** (tela B.9), registrando a descida da carga balsa→terra com assinatura do agente de carga da cidade. Todos disponíveis no mesmo app.

---

### B.8 Recebimento — Carregamento direto / cross-docking (múltiplos recebimentos)
**Persona:** Conferente do porto **ou** conferente da balsa (ambos podem efetivar este recebimento). **Plataforma:** Coletor.

**Objetivo:** suportar carga que embarca direto na balsa, em vários lotes/horários, sem passar pelo pátio.

**Componentes:** mesma base do B.4, mas com **lista de recebimentos** da viagem (Recebimento 1, 2, 3…), cada um com sua foto obrigatória e seus volumes. Total consolidado por viagem. O recebimento e o embarque acontecem no mesmo ato (não há 2º bipe separado para esses volumes).

**Regras:**
- Disponível para os dois perfis de conferente (porto e balsa); o app oferece a opção "Carregamento direto" independentemente de quem está logado.
- Cada recebimento grava **qual conferente** o efetivou (trilha de auditoria).
- Foto de recebimento **obrigatória** em cada lote.

**Estados:** lista de recebimentos da viagem · foto pendente (bloqueia fechamento do lote) · offline · total consolidado.

---

### B.9 Comprovante de entrega (desembarque balsa → terra)
**Persona:** **Conferente da balsa**. **Plataforma:** App mobile/coletor, offline-first.

**Objetivo:** registrar a entrega com prova legal e disparar notificação. **A entrega (escopo da AJC) se conclui quando a mercadoria desce da balsa para a terra, com assinatura do agente de carga da cidade de destino** — é o ponto que encerra a custódia da AJC sobre o volume.

**Fluxo:**
1. Bipa/seleciona os volumes que descem da balsa.
2. **2 fotos obrigatórias** (padrão 90°: de cima e do meio do palete/volume).
3. Nome + documento do **recebedor = agente de carga da cidade** (autocompleta pelo cadastro de agentes; permite recebedor avulso com justificativa).
4. **Assinatura em tela** do agente de carga (protocolo digital, modelo tipo Mercado Livre/Shopee).
5. Confirmar → volume passa a `entregue`, gera **protocolo digital** e dispara **WhatsApp/SMS** a remetente e destinatário.

**Estados:**
- *Faltam fotos/assinatura:* botão confirmar desabilitado.
- *Recebedor não é o agente da cidade:* exige justificativa (auditoria).
- *Offline:* entrega registrada localmente; notificação enviada ao sincronizar.
- *Sucesso:* protocolo nº XXX gerado; comprovante disponível para compartilhar.

> **Custódia x última milha:** este comprovante encerra a responsabilidade de transporte da AJC (balsa → agente da cidade). A entrega final do agente ao destinatário (última milha na cidade) é uma etapa posterior — 🔶 confirmar com o cliente se ela também deve ser registrada no sistema (com nova foto/assinatura do destinatário) ou se fica fora do escopo da AJC.

---

### B.10 Prestação de contas do gerente da embarcação
**Persona:** Gerente da embarcação. **Plataforma:** Web/App. *(Digitalizar o modelo atual em papel — 🔶 pendente do cliente.)*

**Objetivo:** consolidar o resultado financeiro/operacional da viagem e permitir o **cruzamento automático com o contas a receber**.

**Componentes:**
- Resumo da viagem: passageiros, encomendas, cargas, veículos.
- Itens lançados pelo gerente (receitas/despesas da viagem) vs. itens do sistema.
- **Divergência** destacada (declarado vs. sistema).
- Anexos (fotos, comprovantes).
- Status: rascunho → enviada → conferida.

**Estados:** rascunho editável · enviada (bloqueada) · divergência sinalizada para o financeiro.

---

### B.11 Controle de carga por viagem (visão operação/diretoria)
**Persona:** Operação, gerência, diretoria. **Plataforma:** Web.

**Objetivo:** visão em tempo real do que está em cada viagem.

**Componentes:** por viagem — total de volumes (recebidos/embarcados/entregues), valor declarado, valor cobrado, divergências abertas, status dos volumes. Filtros por embarcação, cidade destino, período. Base para o BI de rentabilidade por viagem/embarcação/cidade.

---

## Parte C — Telas relacionadas a Veículos (RF-5)

### C.1 Checklist digital de embarque de veículo
**Persona:** Vistoriador. **Plataforma:** App mobile.
- Dados do veículo (placa, modelo, cliente, cidade destino).
- Checklist de avarias com **fotos por ângulo** (frente, traseira, laterais, teto, interior).
- Marcação de avarias preexistentes sobre o diagrama do veículo.
- Assinatura do responsável que entrega o veículo.

### C.2 Termo de aceite de envio de veículos
- Texto do termo (🔶 a definir) + aceite/assinatura em tela, vinculado ao checklist.

---

## Pendências deste módulo
- 🔶 Modelo de **declaração de conteúdo** + cláusula de exclusão de responsabilidade (Lucas).
- 🔶 Modelo atual de **prestação de contas** em papel para digitalizar.
- 🔶 Texto do **termo de aceite de veículos**.
- 🔶 Regras de **preço/tamanho/trecho** que afetam a precificação da carga/encomenda no recebimento.
- Confirmar especificação do **coletor/Palm** (modelo, SO) para decidir app nativo vs. PWA.
