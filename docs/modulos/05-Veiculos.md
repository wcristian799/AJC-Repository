# Módulo Veículos — SPEC + Detalhamento de Telas

> Transporte de veículos (carros) entre cidades. Valor alto em jogo: clientes entregam carros de até R$ 600 mil "na chave". Núcleo: **checklist digital de vistoria com prova fotográfica** e **termo de aceite** — proteção mútua contra disputa por avarias.
>
> Nota: parte do recebimento de veículos no pátio também aparece em `01-TMS-Carga.md` (Portaria). Este documento foca no fluxo específico do veículo embarcado.
>
> Decisão vigente pós-validação do cliente (25/jun/2026): **Veículos/Máquinas entram agora no MVP**, com envio por PDV/Comercial/Gerente do Porto, checklist/fotos, etiqueta, bipe de subida/descida e checklist de entrega.

---

## Parte A — SPEC técnica

### A.1 Fluxo do veículo
```
Entrada no porto (Portaria) → Vistoria/Checklist (fotos + avarias) → Termo de aceite
   → Embarque na balsa → Travessia → Desembarque → Vistoria de saída (opcional) → Entrega
```

### A.2 Princípios
- **Foto é prova.** Vistoria registra estado do veículo na entrega à AJC e na devolução ao cliente; comparação resolve disputas.
- **Diagrama de avarias** padronizado (frente, traseira, laterais, teto, interior).
- **Termo de aceite** vincula cliente ao estado registrado e às regras de transporte.

### A.3 Entidades
```
Veiculo (id, placa, modelo, cor, cliente_id, cidade_destino_sigla)
ChecklistEmbarque (id, veiculo_id, viagem_id, itens[], avarias[], fotos[], vistoriador_id,
                   assinatura_cliente_id, criado_em)
  └─ Avaria (posicao_diagrama, tipo[risco|amassado|quebrado|faltante], foto_id, obs)
TermoAceiteVeiculo (id, veiculo_id, versao_termo, aceito_em, dispositivo)
```

### A.4 Relações
- **Portaria (TMS):** registro de entrada/saída do veículo no porto.
- **Navegação:** vínculo com a viagem/embarcação.
- **Financeiro:** valor do frete do veículo (tabela pronta) entra no faturamento/caixa.

---

## Parte B — Telas

> Estados padrão: **Vazio · Carregando · Erro · Sucesso · Offline**.

### B.1 Checklist digital de embarque
**Persona:** Conferente (o mesmo que recebe carga). **Plataforma:** App de campo, offline-first.

> Atualizado pós-validação 2026-06-25: o checklist de veículo/máquina **não é app separado** — fica embutido no app de campo que o conferente já usa (recebimento/conferência), para o conferente não precisar logar no TMS à toa. Recebimento de veículos/máquinas é uma função a mais dentro do mesmo fluxo.

**Fluxo:**
1. **Dados do veículo:** placa, modelo, cor, cliente (CPF/CNPJ), cidade destino, viagem.
2. **Diagrama de avarias:** toca no ponto do diagrama para marcar avaria (tipo + foto + observação).
3. **Fotos obrigatórias por ângulo:** frente, traseira, lateral esquerda, lateral direita, teto, interior, painel/odômetro.
4. **Itens do checklist:** combustível, pneus, retrovisores, presença de objetos, etc. (lista configurável).
5. **Assinatura do cliente** que entrega o veículo.
6. Confirma → gera checklist + abre termo de aceite (B.2).

**Componentes:** diagrama interativo do veículo; câmera com contador de fotos obrigatórias; campo de odômetro.

**Estados:**
- *Fotos faltando:* confirmar bloqueado, indica quais ângulos faltam.
- *Offline:* salvo e enfileirado.
- *Sucesso:* checklist nº gerado.

### B.2 Termo de aceite de envio de veículos
- Texto do termo (🔶 a definir) + regras de transporte.
- Aceite/assinatura em tela, vinculado ao checklist e ao veículo.
- Gera PDF anexado.
- *Estado:* sem aceite → veículo não liberado para embarque.

### B.3 Vistoria de desembarque/entrega (opcional)
- Mesma estrutura do B.1 para registrar estado na devolução.
- **Comparação lado a lado** com a vistoria de embarque (avarias novas em destaque).
- Assinatura do recebedor + protocolo (reaproveita comprovante de entrega do TMS).

### B.4 Pátio de veículos / lista
**Persona:** Operação.
- Veículos por status: aguardando vistoria · vistoriado · embarcado · entregue.
- Filtros por viagem, cidade, cliente.
- Acesso rápido ao checklist e termo de cada veículo.

---

## Pendências deste módulo
- 🔶 Texto do termo de aceite de veículos.
- Definir lista padrão de itens do checklist e ângulos obrigatórios de foto.
- Questões de pátio (organização/permanência) — a detalhar mais adiante, conforme reunião.
