# FAQ 2026 — paradas, horários, preços e regras públicas

> Fonte: `C:\Users\Administrador\Downloads\FAQ 2026.pdf`, recebido em 30/jun/2026. Extração textual feita do PDF de 7 páginas.
> Este documento resolve a pendência do **DOC FAQ** citada pelo Lucas para preenchimento automático das paradas de Nova Viagem e também traz a tabela pública de preços de passagem por destino/classe.

## Impacto no projeto

- **Nova Viagem / Navegação:** usar os trechos abaixo como templates de cronograma/paradas no front mockado.
- **Cadastros / Vendas:** usar a tabela de valores como referência inicial de preços de passagem por destino/classe.
- **Portal online:** o FAQ descreve a operação atual como venda presencial e reserva via central; isso **não revoga** a decisão de MVP do portal online. O portal é a evolução do processo, não o estado atual comunicado ao cliente.
- **Encomendas/veículos:** o FAQ não trouxe tabela de preço; só diz que encomenda é avaliada no setor e veículo depende de modelo/cilindrada/características.

## Atenções antes do backend definitivo

- Há divergência interna no PDF entre saída às **17h** e às **18h** em alguns trechos. Para front mockado, pode-se usar os templates; para backend/cadastro definitivo, validar com Lucas qual horário oficial entra na base.
- Há divergência de chegada em Santarém: em alguns pontos o PDF informa horário cravado, em outro "início da tarde".
- Em Santarém → Belém de sábado, a primeira parada em Prainha aparece como `00h (sábado)`, mas a saída é sábado às 16h; validar se o dia correto é domingo.
- O FAQ informa "horários sujeitos a alteração"; portanto horários devem ser cadastráveis/configuráveis, nunca hard-coded.

## Trechos, embarcações e cronogramas do FAQ

### Belém → Almeirim

- Embarcação indicada no FAQ completo: **Amazonas 05**.
- Saída de Belém: terça-feira. O PDF cita 17h em uma seção e 18h em outra.
- Paradas previstas:
  - Breves: quarta-feira, 09h.
  - Gurupá: quarta-feira, 20h.
  - Porto de Moz: quinta-feira, 08h.
  - Almeirim: chegada quinta-feira, 14h.

### Almeirim → Belém

- Saída de Almeirim: quinta-feira, 18h.
- Paradas previstas:
  - Porto de Moz: quinta-feira, 23h.
  - Gurupá: sexta-feira, 06h.
  - Breves: sexta-feira, 16h.
  - Belém: chegada sábado, 08h.

### Belém → Santarém — viagem de quarta

- Embarcação indicada: **Amazonas 06**.
- Saída de Belém: quarta-feira. O PDF cita 17h em uma seção e 18h em outra.
- Paradas previstas:
  - Breves: quinta-feira, 09h.
  - Gurupá: quinta-feira, 20h.
  - Almeirim: sexta-feira, 09h.
  - Prainha: sexta-feira, 17h.
  - Monte Alegre: sexta-feira, 23h.
  - Santarém: chegada sábado, 10h/início da tarde.

### Santarém → Belém — retorno de sábado

- Saída de Santarém: sábado, 16h.
- Paradas previstas:
  - Prainha: 00h, dia a validar.
  - Almeirim: domingo, 08h.
  - Gurupá: domingo, 16h.
  - Breves: segunda-feira, 02h.
  - Belém: chegada segunda-feira, 19h.

### Belém → Santarém — viagem de sexta

- Embarcação indicada: **Amazonas 04**.
- Saída de Belém: sexta-feira. O PDF cita 17h em uma seção e 18h em outra.
- Paradas previstas:
  - Breves: sábado, 09h.
  - Gurupá: sábado, 20h.
  - Almeirim: domingo, 09h.
  - Prainha: domingo, 17h.
  - Monte Alegre: domingo, 23h.
  - Santarém: chegada segunda-feira, 19h/início da tarde.

### Santarém → Belém — retorno de segunda

- Saída de Santarém: segunda-feira, 18h.
- Paradas previstas:
  - Monte Alegre: segunda-feira, 23h.
  - Prainha: terça-feira, 06h.
  - Almeirim: terça-feira, 11h.
  - Gurupá: terça-feira, 19h.
  - Breves: quarta-feira, 05h.
  - Belém: chegada quarta-feira, 19h.

## Duração média informada

- Belém → Santarém: média de 60h.
- Belém → Breves: média de 14h.
- Belém → Gurupá: média de 26h.
- Belém → Monte Alegre: média de 48h.
- Belém → Almeirim: média de 36h.
- Belém → Prainha: média de 41h.
- Belém → Porto de Moz: média de 32h.

## Preços de passagem por destino/classe

> Valores do FAQ 2026. Devem entrar em tabela versionada de preços, com reajuste e vigência. Não hard-code no backend.

### Prainha

| Classe | Valor |
|---|---:|
| Rede inteira | R$ 240,00 |
| Rede meia | R$ 120,00 |
| Suíte comum fechada | R$ 920,00 |
| Suíte comum VIP (AMZ6) | R$ 970,00 |
| Suíte master (2 pessoas) | R$ 1.030,00 |
| Suíte master VIP (2 pessoas) | R$ 1.200,00 |
| Mega suíte (2 pessoas) | R$ 1.400,00 |

### Monte Alegre

| Classe | Valor |
|---|---:|
| Rede inteira | R$ 285,00 |
| Rede meia | R$ 142,00 |
| Suíte comum fechada | R$ 920,00 |
| Suíte comum VIP (AMZ6) | R$ 970,00 |
| Suíte master (2 pessoas) | R$ 1.030,00 |
| Suíte master VIP (2 pessoas) | R$ 1.200,00 |
| Mega suíte (2 pessoas) | R$ 1.400,00 |

### Santarém

| Classe | Valor |
|---|---:|
| Rede inteira | R$ 360,00 |
| Rede meia | R$ 180,00 |
| Suíte comum fechada | R$ 920,00 |
| Suíte comum VIP (AMZ6) | R$ 970,00 |
| Suíte master (2 pessoas) | R$ 1.030,00 |
| Suíte master VIP (2 pessoas) | R$ 1.200,00 |
| Mega suíte (2 pessoas) | R$ 1.400,00 |

### Breves

| Classe | Valor |
|---|---:|
| Rede inteira | R$ 100,00 |
| Rede meia | R$ 50,00 |
| Rede sala VIP inteira | R$ 140,00 |
| Rede sala VIP meia | R$ 70,00 |
| Camarote fechado | R$ 430,00 |
| Suíte comum fechada | R$ 540,00 |
| Suíte comum VIP (AMZ6) | R$ 590,00 |
| Suíte master (2 pessoas) | R$ 760,00 |
| Suíte master VIP (2 pessoas) | R$ 860,00 |
| Mega suíte (2 pessoas) | R$ 1.190,00 |

### Gurupá

| Classe | Valor |
|---|---:|
| Rede inteira | R$ 190,00 |
| Rede meia | R$ 95,00 |
| Rede sala VIP inteira | R$ 220,00 |
| Rede sala VIP meia | R$ 110,00 |
| Camarote fechado | R$ 540,00 |
| Suíte comum fechada | R$ 700,00 |
| Suíte comum VIP (AMZ6) | R$ 750,00 |
| Suíte master (2 pessoas) | R$ 860,00 |
| Suíte master VIP (2 pessoas) | R$ 970,00 |
| Mega suíte (2 pessoas) | R$ 1.190,00 |

### Almeirim

| Classe | Valor |
|---|---:|
| Rede inteira | R$ 225,00 |
| Rede meia | R$ 112,50 |
| Rede sala VIP inteira | R$ 250,00 |
| Rede sala VIP meia | R$ 125,00 |
| Camarote fechado | R$ 540,00 |
| Suíte comum fechada | R$ 700,00 |
| Suíte comum VIP (AMZ6) | R$ 750,00 |
| Suíte master (2 pessoas) | R$ 860,00 |
| Suíte master VIP (2 pessoas) | R$ 970,00 |
| Mega suíte (2 pessoas) | R$ 1.190,00 |

### Porto de Moz

| Classe | Valor |
|---|---:|
| Rede inteira | R$ 210,00 |
| Rede meia | R$ 105,00 |
| Rede sala VIP inteira | R$ 240,00 |
| Rede sala VIP meia | R$ 120,00 |
| Camarote fechado | R$ 540,00 |
| Suíte comum fechada | R$ 700,00 |
| Suíte comum VIP (AMZ6) | R$ 750,00 |
| Suíte master (2 pessoas) | R$ 860,00 |
| Suíte master VIP (2 pessoas) | R$ 970,00 |
| Mega suíte (2 pessoas) | R$ 1.190,00 |

## Observações de classe e acomodação

- Camarote: beliche sem banheiro.
- Suíte simples/comum: beliche com banheiro.
- Suíte master: cama de casal + banheiro.
- Suíte master VIP: cama de casal + banheiro + frigobar + área privativa; fica na parte superior/convés.
- Mega suíte: cama de casal + banheiro + área privativa + frigobar.
- Todas as suítes têm capacidade para 2 pessoas.
- Suíte comum VIP aparece vinculada à embarcação Amazonas 06.
- Algumas observações do FAQ restringem rede VIP/camarote/suítes específicas a viagens ou embarcações específicas; cruzar com a matriz do Lucas antes do cadastro definitivo.

## Venda, reserva, meia e formas de pagamento

- Operação atual do FAQ: venda de passagem presencial no porto.
- Reservas via central; o FAQ diz que passagens de rede e camarote não estão sujeitas à reserva.
- Formas de pagamento: dinheiro, PIX, crédito e débito.
- Parcelamento: até 2x com acréscimo da máquina.
- Meia passagem: estudante, ID Jovem e INTERPASS mediante agendamento pela central.
- Crianças de 0 a 5 anos: isento.
- Crianças de 6 a 11 anos: meia passagem.
- Idoso a partir de 60 anos: meia passagem no FAQ. Validar juridicamente/regulatório antes de consolidar a regra final de gratuidade/meia no backend.

## Encomendas, veículos, alimentação e internet

- Encomenda pode ser deixada em um dia para viajar no dia seguinte.
- Encomenda é despachada no setor de encomendas.
- Valor de encomenda é definido após avaliação da mercadoria; o FAQ **não** entrega tabela de preço de encomendas.
- Frete de carros/motos depende de modelo do veículo, cilindrada da moto e outras características; o FAQ **não** entrega tabela de preço de veículos.
- Refeitório a bordo: refeições entre R$ 18,00 e R$ 30,00; aceita PIX, dinheiro e cartão de crédito.
- Wi-Fi a bordo: fornecedor Moby Tecnologia Marítima; planos informados:
  - 1 hora: R$ 5,00.
  - 5 horas: R$ 15,00.
  - Toda viagem/diária: R$ 35,00.

## Endereços dos portos

- Belém: Porto Amazonas, Av. Bernardo Sayão nº 4620, Guamá, Belém.
- Santarém: Porto DER, R. Dom João VI, 3351, Prainha, Santarém-PA.
- Monte Alegre: Terminal Hidroviário Argemiro Baía da Costa, Av. Pres. Getúlio Vargas nº 1204, Cidade Baixa, Monte Alegre-PA.
- Porto de Moz: Terminal Hidroviário Pedro Ivo Lessa Pontes, Porto de Moz.
- Prainha: Terminal Hidroviário de Prainha, porto em frente à COMAN e cartório, próximo ao prédio do centro cultural.
- Almeirim: Terminal Hidroviário de Almeirim, Av. Beira Rio nº 586-624, Almeirim-PA.
- Breves: Terminal Hidroviário de Passageiros e Cargas de Breves, Av. Pres. Getúlio Vargas nº 472-522, Breves-PA.
- Gurupá: Terminal Hidroviário de Gurupá, Av. Santo Antônio s/n.

## Pendências baixadas por este FAQ

- DOC FAQ para preenchimento automático de paradas.
- Trechos/rotas públicas principais.
- Preços de passagem por destino e classe.
- Formas de pagamento atuais de passagem.
- Regras públicas de meia/isento conforme comunicação atual.
- Endereços dos portos por cidade.

## Pendências que continuam

- Validar divergências de horário do próprio PDF antes do cadastro definitivo.
- Capacidades numéricas reais por classe/embarcação, caso existam em tabela separada.
- Tabela de preço de encomendas.
- Tabela/regra de preço para veículos/máquinas.
- Texto oficial de termo de embarque.
- Cores oficiais de pulseira por classe.
- Gateway de pagamento e fiscal/BP-e do portal.
