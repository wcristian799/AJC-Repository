/**
 * Seed mockado para o MVP AJC.
 * Toda tela do back-office lê daqui. Quando o backend NestJS no WSL estiver pronto,
 * substituir os hooks `useXxx()` por chamadas reais — a forma dos dados é igual.
 */

export const CIDADES = [
  { sigla: "BEL", nome: "Belém" },
  { sigla: "BRV", nome: "Breves" },
  { sigla: "GUR", nome: "Gurupá" },
  { sigla: "ALM", nome: "Almeirim" },
  { sigla: "PMZ", nome: "Porto de Moz" },
  { sigla: "PRA", nome: "Prainha" },
  { sigla: "MTA", nome: "Monte Alegre" },
  { sigla: "STM", nome: "Santarém" },
] as const;

export type Cidade = (typeof CIDADES)[number]["sigla"];

export type EmbarcacaoStatus = "ativa" | "manutencao" | "alugada";
export type EmbarcacaoTipo = "passeio_carga" | "carga";

export type Embarcacao = {
  id: string;
  nome: string;
  tipo: EmbarcacaoTipo;
  status: EmbarcacaoStatus;
  capRede: number;
  capVip: number;
  capCamarote: number;
  capCargaTon: number;
  ultimaViagem: string;
};

export const EMBARCACOES: Embarcacao[] = [
  { id: "EMB-01", nome: "Ferry Belém I",     tipo: "passeio_carga", status: "ativa",      capRede: 180, capVip: 40, capCamarote: 24, capCargaTon: 32, ultimaViagem: "BEL→STM 21/06" },
  { id: "EMB-02", nome: "Ferry Belém II",    tipo: "passeio_carga", status: "ativa",      capRede: 220, capVip: 60, capCamarote: 28, capCargaTon: 38, ultimaViagem: "BEL→BRV 22/06" },
  { id: "EMB-03", nome: "Ferry Belém III",   tipo: "passeio_carga", status: "ativa",      capRede: 160, capVip: 32, capCamarote: 18, capCargaTon: 28, ultimaViagem: "BEL→PRA 20/06" },
  { id: "EMB-04", nome: "Ferry Cargueiro V", tipo: "carga",         status: "ativa",      capRede:   0, capVip:  0, capCamarote:  0, capCargaTon: 84, ultimaViagem: "BEL→STM 19/06" },
  { id: "EMB-05", nome: "Ferry Belém IV",    tipo: "passeio_carga", status: "manutencao", capRede: 200, capVip: 48, capCamarote: 22, capCargaTon: 34, ultimaViagem: "BEL→MTA 02/06" },
  { id: "EMB-06", nome: "Ferry Tapajós",     tipo: "passeio_carga", status: "alugada",    capRede: 140, capVip: 24, capCamarote: 12, capCargaTon: 22, ultimaViagem: "—" },
  { id: "EMB-07", nome: "Ferry Marajó",      tipo: "passeio_carga", status: "alugada",    capRede: 160, capVip: 28, capCamarote: 16, capCargaTon: 24, ultimaViagem: "—" },
];

export type ViagemStatus = "planejada" | "em_curso" | "concluida" | "cancelada";
export type ViagemSituacao = "no_prazo" | "atencao" | "atrasado";

export type Viagem = {
  id: string;
  codigo: string;
  embarcacaoId: string;
  origem: Cidade;
  destino: Cidade;
  escalas: { cidade: Cidade; horaPrevista: string; horaReal?: string }[];
  saida: string;
  retorno: string;
  status: ViagemStatus;
  situacao?: ViagemSituacao;
  ocupacaoPct: number;
  cargaPct: number;
  volumes: number;
  passageiros: number;
};

export const VIAGENS: Viagem[] = [
  {
    id: "VIA-2026-0418", codigo: "V-0418", embarcacaoId: "EMB-01",
    origem: "BEL", destino: "STM",
    escalas: [
      { cidade: "BRV", horaPrevista: "22/06 02:00", horaReal: "22/06 02:14" },
      { cidade: "GUR", horaPrevista: "22/06 06:30", horaReal: "22/06 06:42" },
      { cidade: "PMZ", horaPrevista: "22/06 11:00" },
      { cidade: "STM", horaPrevista: "22/06 18:00" },
    ],
    saida: "21/06 19:00", retorno: "24/06 06:00",
    status: "em_curso", situacao: "atencao",
    ocupacaoPct: 78, cargaPct: 91, volumes: 312, passageiros: 198,
  },
  {
    id: "VIA-2026-0419", codigo: "V-0419", embarcacaoId: "EMB-02",
    origem: "BEL", destino: "BRV",
    escalas: [{ cidade: "BRV", horaPrevista: "22/06 09:00" }],
    saida: "22/06 06:00", retorno: "22/06 22:00",
    status: "em_curso", situacao: "no_prazo",
    ocupacaoPct: 54, cargaPct: 68, volumes: 124, passageiros: 142,
  },
  {
    id: "VIA-2026-0420", codigo: "V-0420", embarcacaoId: "EMB-04",
    origem: "BEL", destino: "STM",
    escalas: [
      { cidade: "GUR", horaPrevista: "23/06 08:00" },
      { cidade: "MTA", horaPrevista: "23/06 16:00" },
      { cidade: "STM", horaPrevista: "23/06 22:00" },
    ],
    saida: "22/06 20:00", retorno: "25/06 12:00",
    status: "em_curso", situacao: "atrasado",
    ocupacaoPct: 0, cargaPct: 96, volumes: 488, passageiros: 0,
  },
  {
    id: "VIA-2026-0421", codigo: "V-0421", embarcacaoId: "EMB-03",
    origem: "BEL", destino: "PRA",
    escalas: [{ cidade: "PRA", horaPrevista: "23/06 14:00" }],
    saida: "23/06 06:00", retorno: "24/06 02:00",
    status: "planejada",
    ocupacaoPct: 32, cargaPct: 28, volumes: 64, passageiros: 86,
  },
  {
    id: "VIA-2026-0417", codigo: "V-0417", embarcacaoId: "EMB-01",
    origem: "BEL", destino: "ALM",
    escalas: [{ cidade: "ALM", horaPrevista: "20/06 18:00", horaReal: "20/06 17:48" }],
    saida: "20/06 06:00", retorno: "21/06 14:00",
    status: "concluida", situacao: "no_prazo",
    ocupacaoPct: 88, cargaPct: 84, volumes: 268, passageiros: 178,
  },
];

export type Agente = {
  id: string;
  nome: string;
  cidade: Cidade;
  comissaoPct: number;
  clientes: number;
  volumeMes: number; // R$ captados
  ativo: boolean;
};

export const AGENTES: Agente[] = [
  { id: "AG-01", nome: "Marcos Pinheiro", cidade: "BRV", comissaoPct: 5, clientes: 38, volumeMes: 124_800, ativo: true },
  { id: "AG-02", nome: "Janaína Sousa",   cidade: "GUR", comissaoPct: 5, clientes: 24, volumeMes:  82_400, ativo: true },
  { id: "AG-03", nome: "Renato Lima",     cidade: "ALM", comissaoPct: 6, clientes: 31, volumeMes:  98_200, ativo: true },
  { id: "AG-04", nome: "Patrícia Alves",  cidade: "PMZ", comissaoPct: 5, clientes: 22, volumeMes:  71_500, ativo: true },
  { id: "AG-05", nome: "Cláudio Reis",    cidade: "PRA", comissaoPct: 5, clientes: 18, volumeMes:  56_300, ativo: true },
  { id: "AG-06", nome: "Helena Castro",   cidade: "MTA", comissaoPct: 6, clientes: 29, volumeMes: 102_700, ativo: true },
  { id: "AG-07", nome: "Túlio Barbosa",   cidade: "STM", comissaoPct: 6, clientes: 44, volumeMes: 168_400, ativo: true },
];

export type Cliente = {
  id: string;
  tipo: "PF" | "PJ";
  nome: string;
  documento: string;
  cidade: Cidade;
  agenteId: string;
  ultimoEnvio: string;
  totalMovimentado: number;
};

export const CLIENTES: Cliente[] = [
  { id: "CL-1001", tipo: "PJ", nome: "Comercial Ribeira Ltda.",     documento: "12.345.678/0001-09", cidade: "STM", agenteId: "AG-07", ultimoEnvio: "21/06", totalMovimentado: 84_500 },
  { id: "CL-1002", tipo: "PJ", nome: "Distribuidora Marajó",         documento: "33.221.118/0001-10", cidade: "BRV", agenteId: "AG-01", ultimoEnvio: "20/06", totalMovimentado: 62_300 },
  { id: "CL-1003", tipo: "PF", nome: "José Carvalho",                documento: "458.220.110-22",    cidade: "GUR", agenteId: "AG-02", ultimoEnvio: "19/06", totalMovimentado:  8_240 },
  { id: "CL-1004", tipo: "PJ", nome: "Ferragens Amazônia",           documento: "44.998.220/0001-11", cidade: "MTA", agenteId: "AG-06", ultimoEnvio: "22/06", totalMovimentado: 142_900 },
  { id: "CL-1005", tipo: "PF", nome: "Ana Maria Lopes",              documento: "302.811.554-09",    cidade: "ALM", agenteId: "AG-03", ultimoEnvio: "18/06", totalMovimentado:  3_120 },
  { id: "CL-1006", tipo: "PJ", nome: "Atacadão Santarém",            documento: "55.667.881/0001-22", cidade: "STM", agenteId: "AG-07", ultimoEnvio: "22/06", totalMovimentado: 218_400 },
  { id: "CL-1007", tipo: "PJ", nome: "Granel Tapajós S/A",           documento: "66.778.992/0001-33", cidade: "PMZ", agenteId: "AG-04", ultimoEnvio: "21/06", totalMovimentado: 96_200 },
  { id: "CL-1008", tipo: "PF", nome: "Roberto Mendes",               documento: "511.220.998-44",    cidade: "PRA", agenteId: "AG-05", ultimoEnvio: "20/06", totalMovimentado: 12_800 },
];

export type VolumeStatus =
  | "recebido" | "conferido" | "embarcado" | "reconferido"
  | "desembarcado" | "entregue" | "divergente";

export type Volume = {
  id: string;
  uuid: string;
  cargaId: string;
  cliente: string;
  cidadeDestino: Cidade;
  peso: number;
  status: VolumeStatus;
  viagemId: string;
  paleteId?: string;
};

export const VOLUMES: Volume[] = [
  { id: "V-001", uuid: "a1b2-…-7710", cargaId: "C-2201", cliente: "Comercial Ribeira",   cidadeDestino: "STM", peso: 22, status: "entregue",    viagemId: "VIA-2026-0417", paleteId: "PAL-014" },
  { id: "V-002", uuid: "a1b2-…-7711", cargaId: "C-2201", cliente: "Comercial Ribeira",   cidadeDestino: "STM", peso: 18, status: "entregue",    viagemId: "VIA-2026-0417", paleteId: "PAL-014" },
  { id: "V-003", uuid: "c8d9-…-9120", cargaId: "C-2202", cliente: "Atacadão Santarém",   cidadeDestino: "STM", peso: 36, status: "embarcado",   viagemId: "VIA-2026-0418", paleteId: "PAL-021" },
  { id: "V-004", uuid: "c8d9-…-9121", cargaId: "C-2202", cliente: "Atacadão Santarém",   cidadeDestino: "STM", peso: 34, status: "embarcado",   viagemId: "VIA-2026-0418", paleteId: "PAL-021" },
  { id: "V-005", uuid: "e2f3-…-3380", cargaId: "C-2203", cliente: "Ferragens Amazônia",  cidadeDestino: "MTA", peso: 28, status: "conferido",   viagemId: "VIA-2026-0420" },
  { id: "V-006", uuid: "e2f3-…-3381", cargaId: "C-2203", cliente: "Ferragens Amazônia",  cidadeDestino: "MTA", peso: 30, status: "divergente",  viagemId: "VIA-2026-0420" },
  { id: "V-007", uuid: "g4h5-…-5588", cargaId: "C-2204", cliente: "Distribuidora Marajó", cidadeDestino: "BRV", peso: 12, status: "recebido",    viagemId: "VIA-2026-0419" },
  { id: "V-008", uuid: "g4h5-…-5589", cargaId: "C-2204", cliente: "Distribuidora Marajó", cidadeDestino: "BRV", peso: 14, status: "recebido",    viagemId: "VIA-2026-0419" },
];

export type Passagem = {
  id: string;
  qr: string;
  viagemId: string;
  classe: "Rede" | "Rede VIP" | "Camarote Royal" | "Cortesia" | "Gratuidade" | "Contrato";
  passageiro: string;
  documento: string;
  valor: number;
  status: "emitido" | "validado" | "usado" | "cancelado";
  canal: "site" | "pdv" | "totem" | "agente" | "contrato";
  /** assento/camarote nominal quando a classe usa trava por assento (Camarote Royal) */
  assento?: string;
};

export const PASSAGENS: Passagem[] = [
  { id: "PSG-9001", qr: "AJC-9001-X9", viagemId: "VIA-2026-0418", classe: "Rede",            passageiro: "Marcos Pinheiro", documento: "012.345.678-90", valor: 120, status: "usado",    canal: "site" },
  { id: "PSG-9002", qr: "AJC-9002-K2", viagemId: "VIA-2026-0418", classe: "Rede VIP",        passageiro: "Helena Castro",   documento: "112.345.678-90", valor: 180, status: "usado",    canal: "pdv"  },
  { id: "PSG-9003", qr: "AJC-9003-Z1", viagemId: "VIA-2026-0418", classe: "Camarote Royal",  passageiro: "Carlos Pereira",  documento: "212.345.678-90", valor: 480, status: "emitido",  canal: "site", assento: "R01" },
  { id: "PSG-9004", qr: "AJC-9004-A8", viagemId: "VIA-2026-0418", classe: "Gratuidade",      passageiro: "Maria Conceição (65)", documento: "312.345.678-90", valor: 0,   status: "usado",    canal: "pdv"  },
  { id: "PSG-9005", qr: "AJC-9005-B7", viagemId: "VIA-2026-0418", classe: "Cortesia",        passageiro: "Imprensa — convidado", documento: "—",            valor: 0,   status: "emitido",  canal: "agente" },
  { id: "PSG-9006", qr: "AJC-9006-C6", viagemId: "VIA-2026-0419", classe: "Rede",            passageiro: "Ana Maria Lopes",   documento: "412.345.678-90", valor: 60,  status: "emitido",  canal: "totem" },
  { id: "PSG-9007", qr: "AJC-9007-D5", viagemId: "VIA-2026-0418", classe: "Rede",            passageiro: "João Ferreira",     documento: "512.345.678-90", valor: 120, status: "usado",    canal: "site" },
  { id: "PSG-9008", qr: "AJC-9008-E4", viagemId: "VIA-2026-0418", classe: "Rede VIP",        passageiro: "Beatriz Nogueira",  documento: "612.345.678-90", valor: 180, status: "validado", canal: "agente" },
  { id: "PSG-9009", qr: "AJC-9009-F3", viagemId: "VIA-2026-0418", classe: "Camarote Royal",  passageiro: "Família Andrade",   documento: "712.345.678-90", valor: 480, status: "usado",    canal: "site", assento: "R04" },
  { id: "PSG-9010", qr: "AJC-9010-G2", viagemId: "VIA-2026-0418", classe: "Contrato",        passageiro: "Equipe Atacadão Santarém", documento: "55.667.881/0001-22", valor: 0, status: "emitido", canal: "contrato" },
  { id: "PSG-9011", qr: "AJC-9011-H1", viagemId: "VIA-2026-0418", classe: "Rede",            passageiro: "Sebastião Luz",     documento: "812.345.678-90", valor: 120, status: "emitido",  canal: "pdv"  },
  { id: "PSG-9012", qr: "AJC-9012-J9", viagemId: "VIA-2026-0418", classe: "Gratuidade",      passageiro: "Antônio Reis (PCD)", documento: "912.345.678-90", valor: 0,  status: "usado",    canal: "pdv"  },
  { id: "PSG-9013", qr: "AJC-9013-K8", viagemId: "VIA-2026-0419", classe: "Rede VIP",        passageiro: "Patrícia Alves",    documento: "302.811.554-09", valor: 90,  status: "usado",    canal: "site" },
  { id: "PSG-9014", qr: "AJC-9014-L7", viagemId: "VIA-2026-0419", classe: "Camarote Royal",  passageiro: "Roberto Mendes",    documento: "511.220.998-44", valor: 220, status: "emitido",  canal: "site", assento: "R03" },
  { id: "PSG-9015", qr: "AJC-9015-M6", viagemId: "VIA-2026-0419", classe: "Cortesia",        passageiro: "Autoridade local — convidado", documento: "—",   valor: 0,   status: "emitido",  canal: "agente" },
  { id: "PSG-9016", qr: "AJC-9016-N5", viagemId: "VIA-2026-0421", classe: "Rede",            passageiro: "José Carvalho",     documento: "458.220.110-22", valor: 95,  status: "emitido",  canal: "totem" },
  { id: "PSG-9017", qr: "AJC-9017-P4", viagemId: "VIA-2026-0421", classe: "Rede VIP",        passageiro: "Cláudio Reis",      documento: "111.222.333-44", valor: 140, status: "emitido",  canal: "site" },
];

export type Caixa = {
  id: string;
  tipo: "porto" | "encomenda" | "lanchonete" | "balsa" | "agente";
  referencia: string;
  saldo: number;
  entradasDia: number;
  saidasDia: number;
};

export const CAIXAS: Caixa[] = [
  { id: "CX-01", tipo: "porto",      referencia: "Caixa do Porto · Belém",       saldo: 28_420, entradasDia: 12_840, saidasDia: 2_120 },
  { id: "CX-02", tipo: "encomenda",  referencia: "Caixa de Encomendas",          saldo:  8_240, entradasDia:  4_120, saidasDia:   880 },
  { id: "CX-03", tipo: "balsa",      referencia: "Caixa · Ferry Belém I",        saldo:  4_180, entradasDia:  2_640, saidasDia:   420 },
  { id: "CX-04", tipo: "balsa",      referencia: "Caixa · Ferry Belém II",       saldo:  3_120, entradasDia:  1_980, saidasDia:   220 },
  { id: "CX-05", tipo: "agente",     referencia: "Agente · Santarém (Túlio)",    saldo:  6_840, entradasDia:  3_240, saidasDia: 1_120 },
  { id: "CX-06", tipo: "agente",     referencia: "Agente · Breves (Marcos)",     saldo:  3_420, entradasDia:  1_640, saidasDia:   320 },
  { id: "CX-07", tipo: "lanchonete", referencia: "Lanchonete · Ferry Belém I",   saldo:  1_280, entradasDia:    980, saidasDia:   120 },
];

export type Usuario = {
  id: string;
  nome: string;
  login: string;
  perfil: "Administrador" | "Financeiro" | "Comercial" | "Operação" | "PDV" | "Conferente" | "Price" | "Diretoria";
  ativo: boolean;
  cidade?: Cidade;
};

export const USUARIOS: Usuario[] = [
  { id: "U-001", nome: "Wellington Ferreira", login: "wellington@ajc",  perfil: "Diretoria",     ativo: true,  cidade: "BEL" },
  { id: "U-002", nome: "Ana Lima",            login: "ana.lima@ajc",    perfil: "Financeiro",    ativo: true,  cidade: "BEL" },
  { id: "U-003", nome: "João Souza",          login: "joao.souza@ajc",  perfil: "Conferente",    ativo: true,  cidade: "BEL" },
  { id: "U-004", nome: "Caixa 02",            login: "caixa02",         perfil: "PDV",           ativo: true,  cidade: "BEL" },
  { id: "U-005", nome: "Túlio Barbosa",       login: "tulio@ajc",       perfil: "Comercial",     ativo: true,  cidade: "STM" },
  { id: "U-006", nome: "Helena Castro",       login: "helena@ajc",      perfil: "Comercial",     ativo: true,  cidade: "MTA" },
  { id: "U-007", nome: "Lucas Andrade",       login: "lucas@ajc",       perfil: "Price",         ativo: true,  cidade: "BEL" },
  { id: "U-008", nome: "Operador Antigo",     login: "op.antigo",       perfil: "Operação",      ativo: false, cidade: "BEL" },
];

export const PERMISSOES = [
  "vendas.criar", "vendas.cancelar", "vendas.cortesia",
  "tms.conferir", "tms.entregar", "tms.divergencia",
  "cadastros.usuarios", "cadastros.precos", "cadastros.precos.reajuste",
  "financeiro.caixa", "financeiro.ap_ar",
  "navegacao.viagem.criar", "navegacao.viagem.encerrar",
] as const;

export type Permissao = (typeof PERMISSOES)[number];

export const MATRIZ_PERMISSOES: Record<Usuario["perfil"], Permissao[]> = {
  Administrador:  [...PERMISSOES],
  Diretoria:      ["financeiro.ap_ar", "financeiro.caixa"],
  Financeiro:     ["financeiro.caixa", "financeiro.ap_ar"],
  Comercial:      ["vendas.criar", "vendas.cancelar"],
  Operação:       ["navegacao.viagem.criar", "navegacao.viagem.encerrar"],
  PDV:            ["vendas.criar", "vendas.cortesia"],
  Conferente:     ["tms.conferir", "tms.entregar", "tms.divergencia"],
  Price:          ["cadastros.precos", "cadastros.precos.reajuste"],
};

export type PrecoPassagem = {
  trecho: string;
  rede: number; vip: number; camaroteRoyal: number;
};

export const PRECOS_PASSAGEM: PrecoPassagem[] = [
  { trecho: "BEL → STM", rede: 120, vip: 180, camaroteRoyal: 480 },
  { trecho: "BEL → BRV", rede:  60, vip:  90, camaroteRoyal: 220 },
  { trecho: "BEL → MTA", rede: 110, vip: 165, camaroteRoyal: 440 },
  { trecho: "BEL → PRA", rede:  95, vip: 140, camaroteRoyal: 380 },
  { trecho: "BEL → ALM", rede:  85, vip: 125, camaroteRoyal: 340 },
  { trecho: "BEL → PMZ", rede:  75, vip: 115, camaroteRoyal: 300 },
  { trecho: "BEL → GUR", rede:  70, vip: 105, camaroteRoyal: 280 },
];

export type PrecoCargaTier = {
  tier: string;
  descricao: string;
  percentual: number; // sobre valor declarado
};

export const PRECOS_CARGA: PrecoCargaTier[] = [
  { tier: "T1", descricao: "Carga seca leve (até 50 kg/m³)",         percentual: 4.0 },
  { tier: "T2", descricao: "Carga seca padrão (50–200 kg/m³)",       percentual: 5.5 },
  { tier: "T3", descricao: "Carga densa / industrial",                percentual: 7.0 },
  { tier: "T4", descricao: "Frigorificada / refrigerada",             percentual: 9.5 },
  { tier: "T5", descricao: "Perigosa / classificada (taxa especial)", percentual: 12.0 },
];

export type ContaItem = {
  id: string;
  descricao: string;
  parte: string;
  valor: number;
  vencimento: string;
  status: "a_vencer" | "vence_semana" | "vencida" | "pago" | "recebido";
};

export const CONTAS_PAGAR: ContaItem[] = [
  { id: "AP-1", descricao: "Combustível · Ferry Belém I", parte: "Petrobras Distribuidora", valor: 18_400, vencimento: "24/06", status: "vence_semana" },
  { id: "AP-2", descricao: "Manutenção motor",            parte: "Naval Reparos Ltda.",     valor: 42_800, vencimento: "30/06", status: "a_vencer" },
  { id: "AP-3", descricao: "Energia · sede Belém",        parte: "Equatorial",              valor:  6_240, vencimento: "20/06", status: "vencida" },
  { id: "AP-4", descricao: "Fornecedor lanchonete",       parte: "Distribuidora Pará",      valor:  3_120, vencimento: "18/06", status: "pago" },
];

export const CONTAS_RECEBER: ContaItem[] = [
  { id: "AR-1", descricao: "Faturamento contrato · Atacadão Santarém", parte: "Atacadão Santarém",  valor: 84_200, vencimento: "30/06", status: "a_vencer" },
  { id: "AR-2", descricao: "Frete cargas · junho",                     parte: "Ferragens Amazônia", valor: 32_800, vencimento: "25/06", status: "vence_semana" },
  { id: "AR-3", descricao: "Passagens · contrato Granel Tapajós",       parte: "Granel Tapajós",     valor: 12_400, vencimento: "15/06", status: "vencida" },
  { id: "AR-4", descricao: "Boleto · Comercial Ribeira",                parte: "Comercial Ribeira",  valor: 18_900, vencimento: "10/06", status: "recebido" },
];

export type Alerta = {
  id: string;
  tipo: "viagem" | "carga" | "financeiro" | "regulatorio" | "sistema";
  titulo: string;
  detalhe: string;
  severidade: "info" | "warning" | "danger";
  quando: string;
};

export const ALERTAS: Alerta[] = [
  { id: "AL-1", tipo: "viagem",      titulo: "V-0420 com atraso de 1h20",        detalhe: "EMB-04 não passou pela escala MTA no horário previsto.", severidade: "danger",  quando: "há 14 min" },
  { id: "AL-2", tipo: "carga",       titulo: "1 volume divergente em V-0420",    detalhe: "V-006 marcado por conferente Léo no porto de partida.",  severidade: "danger",  quando: "há 1h" },
  { id: "AL-3", tipo: "regulatorio", titulo: "MP solicitou relatório de gratuidades",  detalhe: "Prazo até 28/06. Cobertura: jan–jun.",          severidade: "warning", quando: "há 2h" },
  { id: "AL-4", tipo: "financeiro",  titulo: "Conta vencida · Equatorial R$ 6.240", detalhe: "Vencida em 20/06. Energia da sede.",                  severidade: "warning", quando: "há 6h" },
  { id: "AL-5", tipo: "sistema",     titulo: "App conferente desconectado",        detalhe: "Coletor #07 sem sincronizar há 12 min.",               severidade: "info",    quando: "há 12 min" },
];

/* ============================================================================
 * SUPERFÍCIES DE VENDA E CAMPO — portal público, PDV, totem, embarque, cliente.
 * Nomes prefixados (PORTAL_/VENDA_/ASSENTOS_/PULSEIRA_) para não colidir com o
 * restante do seed. Não renomear/remover exports acima.
 * Fonte: docs/modulos/02-Vendas-Passagens.md (Partes A, B e C).
 * ========================================================================== */

/** Classes vendáveis + cor da pulseira por classe (A.1). */
export type VendaClasseId = "rede" | "vip" | "camarote";

export type VendaClasse = {
  id: VendaClasseId;
  nome: string;
  subtitulo: string;
  /** chave em PrecoPassagem */
  precoKey: "rede" | "vip" | "camaroteRoyal";
  /** cor exibida no app de validação ao ler o QR */
  pulseira: { nome: string; hex: string };
  /** vantagens curtas para o card de seleção */
  perks: string[];
};

export const VENDA_CLASSES: VendaClasse[] = [
  {
    id: "rede",
    nome: "Rede",
    subtitulo: "Ao relento · sua rede no convés",
    precoKey: "rede",
    pulseira: { nome: "Verde", hex: "#1f9d57" },
    perks: ["Gancho de rede numerado", "Acesso à lanchonete", "Bagagem de mão"],
  },
  {
    id: "vip",
    nome: "Rede VIP",
    subtitulo: "Salão climatizado · ar-condicionado",
    precoKey: "vip",
    pulseira: { nome: "Azul", hex: "#2563eb" },
    perks: ["Ambiente com ar-condicionado", "Tomada individual", "Embarque prioritário"],
  },
  {
    id: "camarote",
    nome: "Camarote Royal",
    subtitulo: "Suíte privativa · cama e banheiro",
    precoKey: "camaroteRoyal",
    pulseira: { nome: "Dourada", hex: "#c8a24a" },
    perks: ["Suíte com até 2 camas", "Banheiro privativo", "Roupa de cama inclusa"],
  },
];

/** Cor da pulseira por nome de classe completo (usado no app de embarque). */
export const PULSEIRA_POR_CLASSE: Record<string, { nome: string; hex: string }> = {
  "Rede": { nome: "Verde", hex: "#1f9d57" },
  "Rede VIP": { nome: "Azul", hex: "#2563eb" },
  "Camarote Royal": { nome: "Dourada", hex: "#c8a24a" },
  "Cortesia": { nome: "Roxa", hex: "#8b5cf6" },
  "Gratuidade": { nome: "Roxa", hex: "#8b5cf6" },
  "Contrato": { nome: "Cinza", hex: "#64748b" },
};

/** Uma viagem ofertada no portal/totem, com disponibilidade por classe. */
export type VendaOferta = {
  id: string;
  origem: Cidade;
  destino: Cidade;
  embarcacao: string;
  saida: string;     // "19:00"
  chegada: string;   // "ter 18:00"
  duracao: string;   // "~23h"
  /** disponibilidade por classe: vagas restantes / capacidade */
  disponibilidade: Record<VendaClasseId, { restantes: number; capacidade: number }>;
};

/** Gera ofertas determinísticas para um trecho. */
export const VENDA_OFERTAS: VendaOferta[] = [
  {
    id: "OF-01", origem: "BEL", destino: "STM", embarcacao: "Ferry Belém I",
    saida: "19:00", chegada: "ter 18:00", duracao: "~23h",
    disponibilidade: { rede: { restantes: 42, capacidade: 180 }, vip: { restantes: 8, capacidade: 40 }, camarote: { restantes: 3, capacidade: 24 } },
  },
  {
    id: "OF-02", origem: "BEL", destino: "STM", embarcacao: "Ferry Belém II",
    saida: "20:30", chegada: "ter 19:30", duracao: "~23h",
    disponibilidade: { rede: { restantes: 96, capacidade: 220 }, vip: { restantes: 22, capacidade: 60 }, camarote: { restantes: 0, capacidade: 28 } },
  },
  {
    id: "OF-03", origem: "BEL", destino: "STM", embarcacao: "Ferry Belém III",
    saida: "06:00", chegada: "qua 05:00", duracao: "~23h",
    disponibilidade: { rede: { restantes: 0, capacidade: 160 }, vip: { restantes: 4, capacidade: 32 }, camarote: { restantes: 6, capacidade: 18 } },
  },
];

/** Assentos/camarotes nominais (camarote usa trava por assento — C.4). */
export type AssentoStatus = "livre" | "ocupado" | "selecionado";
export type Assento = { id: string; label: string; status: AssentoStatus };

/** Grid de camarotes Royal (2 colunas × 6 fileiras). */
export const ASSENTOS_CAMAROTE: Assento[] = Array.from({ length: 12 }, (_, i) => {
  const ocupados = new Set([1, 4, 5, 9]);
  return {
    id: `C${i + 1}`,
    label: `R${String(i + 1).padStart(2, "0")}`,
    status: ocupados.has(i) ? "ocupado" : "livre",
  } as Assento;
});

/** Tipos legais de gratuidade (B.7 / A.1). */
export const VENDA_GRATUIDADES = [
  { id: "idoso", label: "Idoso (60+)", doc: "RG / documento com foto" },
  { id: "pcd", label: "PCD", doc: "Laudo médico ou cartão PCD" },
  { id: "crianca", label: "Criança de colo (até 2 anos)", doc: "Certidão de nascimento" },
  { id: "jovem", label: "ID Jovem (lei federal)", doc: "Carteira ID Jovem + CadÚnico" },
] as const;

/** Cortesias emitidas, para validar código no PDV (B.6). */
export const VENDA_CORTESIAS = [
  { codigo: "AJC-CORT-1042", motivo: "Imprensa — cobertura institucional", classe: "Rede VIP", usada: false },
  { codigo: "AJC-CORT-1043", motivo: "Parceria comercial — influência", classe: "Rede", usada: false },
  { codigo: "AJC-CORT-1044", motivo: "Relacionamento — autoridade local", classe: "Camarote Royal", usada: true },
] as const;

/** Formas de pagamento por canal. */
export type VendaPagamento = "credito" | "debito" | "pix" | "dinheiro";

/** "Minhas viagens" — bilhetes do cliente logado na área pública (C.6). */
export type ClienteBilhete = {
  id: string;
  qr: string;
  trecho: string;
  origem: Cidade;
  destino: Cidade;
  data: string;      // "25/06/2026"
  hora: string;      // "19:00"
  embarcacao: string;
  classe: string;
  assento?: string;
  passageiro: string;
  valor: number;
  status: "emitido" | "validado" | "usado" | "cancelado";
  quando: "ativo" | "passado";
};

export const CLIENTE_BILHETES: ClienteBilhete[] = [
  {
    id: "BIL-77120", qr: "AJC-77120-R9", trecho: "BEL → STM", origem: "BEL", destino: "STM",
    data: "25/06/2026", hora: "19:00", embarcacao: "Ferry Belém I", classe: "Rede VIP",
    passageiro: "Eduardo Vasconcellos", valor: 180, status: "emitido", quando: "ativo",
  },
  {
    id: "BIL-77121", qr: "AJC-77121-T4", trecho: "BEL → BRV", origem: "BEL", destino: "BRV",
    data: "28/06/2026", hora: "06:00", embarcacao: "Ferry Belém II", classe: "Camarote Royal",
    assento: "R03", passageiro: "Eduardo Vasconcellos", valor: 220, status: "emitido", quando: "ativo",
  },
  {
    id: "BIL-77004", qr: "AJC-77004-M1", trecho: "BEL → ALM", origem: "BEL", destino: "ALM",
    data: "20/06/2026", hora: "06:00", embarcacao: "Ferry Belém I", classe: "Rede",
    passageiro: "Eduardo Vasconcellos", valor: 85, status: "usado", quando: "passado",
  },
  {
    id: "BIL-76880", qr: "AJC-76880-P7", trecho: "BEL → MTA", origem: "BEL", destino: "MTA",
    data: "08/06/2026", hora: "20:00", embarcacao: "Ferry Belém III", classe: "Rede VIP",
    passageiro: "Eduardo Vasconcellos", valor: 165, status: "usado", quando: "passado",
  },
];

/** Lista de embarque (bilhetes a validar offline) — app do bilheteiro (B.5). */
export type EmbarqueBilhete = {
  qr: string;
  passageiro: string;
  documento: string;
  classe: "Rede" | "Rede VIP" | "Camarote Royal";
  assento?: string;
  validadoEm?: string; // se já validado: hora da 1ª validação
};

export const EMBARQUE_LISTA: EmbarqueBilhete[] = [
  { qr: "AJC-9001-X9", passageiro: "Marcos Pinheiro",   documento: "012.345.678-90", classe: "Rede" },
  { qr: "AJC-9002-K2", passageiro: "Helena Castro",     documento: "112.345.678-90", classe: "Rede VIP" },
  { qr: "AJC-9003-Z1", passageiro: "Carlos Pereira",    documento: "212.345.678-90", classe: "Camarote Royal", assento: "R01" },
  { qr: "AJC-9007-Q5", passageiro: "Ana Maria Lopes",   documento: "412.345.678-90", classe: "Rede" },
  { qr: "AJC-9008-W3", passageiro: "Roberto Mendes",    documento: "511.220.998-44", classe: "Rede VIP" },
  { qr: "AJC-9009-D2", passageiro: "José Carvalho",     documento: "458.220.110-22", classe: "Rede", validadoEm: "18:42" },
  { qr: "AJC-9010-L8", passageiro: "Patrícia Alves",    documento: "302.811.554-09", classe: "Camarote Royal", assento: "R02" },
];

/* ============ Vendas — canais e ocupação por classe ============ */

export type CanalVenda = {
  id: "portal" | "pdv" | "totem" | "agente" | "contrato";
  rotulo: string;
  descricao: string;
  bilhetes: number;
  receita: number;
  online: boolean;
};

export const CANAIS_VENDA: CanalVenda[] = [
  { id: "portal",   rotulo: "Portal online",   descricao: "Site + app · pagamento PIX/cartão",      bilhetes: 142, receita: 18_240, online: true },
  { id: "pdv",      rotulo: "PDV · porto",     descricao: "Caixa presencial · Belém",                bilhetes:  86, receita: 11_180, online: true },
  { id: "totem",    rotulo: "Totem",           descricao: "Autoatendimento · saguão",                bilhetes:  34, receita:  4_080, online: true },
  { id: "agente",   rotulo: "Agente comercial",descricao: "Captação nas 7 cidades",                  bilhetes:  58, receita:  7_540, online: false },
  { id: "contrato", rotulo: "Contrato",        descricao: "Corporativo · faturado no mês",           bilhetes:  21, receita:  9_660, online: true },
];

export type OcupacaoClasse = {
  classe: "Rede" | "Rede VIP" | "Camarote Royal";
  pulseira: string;
  ocupados: number;
  capacidade: number;
  preco: number;
};

export const OCUPACAO_CLASSE: OcupacaoClasse[] = [
  { classe: "Rede",           pulseira: "Verde",  ocupados: 168, capacidade: 220, preco: 120 },
  { classe: "Rede VIP",       pulseira: "Azul",   ocupados:  44, capacidade:  60, preco: 180 },
  { classe: "Camarote Royal", pulseira: "Dourada",ocupados:  19, capacidade:  28, preco: 480 },
];

/* ============ CRM — histórico de envios ============ */

export type HistoricoEnvio = {
  id: string;
  clienteId: string;
  data: string;
  trecho: string;
  volumes: number;
  conteudo: string;
  preco: number;
};

export const HISTORICO_ENVIOS: HistoricoEnvio[] = [
  { id: "HE-01", clienteId: "CL-1006", data: "22/06", trecho: "BEL → STM", volumes: 12, conteudo: "Mercearia · paletizada", preco: 4_280 },
  { id: "HE-02", clienteId: "CL-1006", data: "15/06", trecho: "BEL → STM", volumes:  9, conteudo: "Bebidas",                preco: 3_120 },
  { id: "HE-03", clienteId: "CL-1004", data: "22/06", trecho: "BEL → MTA", volumes:  6, conteudo: "Ferragens",              preco: 2_640 },
  { id: "HE-04", clienteId: "CL-1004", data: "08/06", trecho: "BEL → MTA", volumes:  8, conteudo: "Material de construção",  preco: 3_980 },
  { id: "HE-05", clienteId: "CL-1001", data: "21/06", trecho: "BEL → STM", volumes:  5, conteudo: "Eletrodomésticos",       preco: 2_180 },
  { id: "HE-06", clienteId: "CL-1002", data: "20/06", trecho: "BEL → BRV", volumes:  4, conteudo: "Variedades",             preco: 1_240 },
  { id: "HE-07", clienteId: "CL-1007", data: "21/06", trecho: "BEL → PMZ", volumes: 10, conteudo: "Grãos · sacaria",        preco: 3_640 },
];

export type CotacaoCRM = {
  id: string;
  clienteId: string;
  tipo: "encomenda" | "carga" | "veiculo";
  trecho: string;
  valor: number;
  status: "aberta" | "convertida" | "expirada";
  validade: string;
};

export const COTACOES: CotacaoCRM[] = [
  { id: "COT-301", clienteId: "CL-1006", tipo: "carga",     trecho: "BEL → STM", valor: 4_280, status: "aberta",     validade: "vence 25/06" },
  { id: "COT-302", clienteId: "CL-1004", tipo: "veiculo",   trecho: "BEL → MTA", valor: 1_850, status: "aberta",     validade: "vence 24/06" },
  { id: "COT-303", clienteId: "CL-1001", tipo: "encomenda", trecho: "BEL → STM", valor:   320, status: "convertida", validade: "—" },
  { id: "COT-304", clienteId: "CL-1007", tipo: "carga",     trecho: "BEL → PMZ", valor: 3_640, status: "expirada",   validade: "expirou 18/06" },
];

/* ============ Cadastros / Navegação — colaboradores e escalas ============ */

export type Colaborador = {
  id: string;
  nome: string;
  funcao: "Comandante" | "Imediato" | "Maquinista" | "Marinheiro" | "Comissário" | "Bilheteiro";
  cidade: Cidade;
  whatsapp: string;
};

export const COLABORADORES: Colaborador[] = [
  { id: "COL-01", nome: "Raimundo Nonato", funcao: "Comandante",  cidade: "BEL", whatsapp: "(91) 98111-0001" },
  { id: "COL-02", nome: "Edilson Farias",  funcao: "Imediato",    cidade: "BEL", whatsapp: "(91) 98111-0002" },
  { id: "COL-03", nome: "Antônio Cardoso", funcao: "Maquinista",  cidade: "BEL", whatsapp: "(91) 98111-0003" },
  { id: "COL-04", nome: "Sebastião Luz",   funcao: "Marinheiro",  cidade: "STM", whatsapp: "(93) 98222-0004" },
  { id: "COL-05", nome: "Marta Ribeiro",   funcao: "Comissário",  cidade: "BEL", whatsapp: "(91) 98111-0005" },
  { id: "COL-06", nome: "Pedro Henrique",  funcao: "Bilheteiro",  cidade: "BRV", whatsapp: "(91) 98333-0006" },
];

export type EscalaStatus = "notificado" | "confirmado" | "pendente" | "conflito";

export type Escala = {
  id: string;
  colaboradorId: string;
  viagemId: string;
  funcao: Colaborador["funcao"];
  status: EscalaStatus;
  notificadoEm: string;
};

export const ESCALAS: Escala[] = [
  { id: "ESC-01", colaboradorId: "COL-01", viagemId: "VIA-2026-0418", funcao: "Comandante", status: "confirmado", notificadoEm: "21/06 12:10" },
  { id: "ESC-02", colaboradorId: "COL-02", viagemId: "VIA-2026-0418", funcao: "Imediato",   status: "confirmado", notificadoEm: "21/06 12:10" },
  { id: "ESC-03", colaboradorId: "COL-03", viagemId: "VIA-2026-0418", funcao: "Maquinista", status: "notificado", notificadoEm: "21/06 12:11" },
  { id: "ESC-04", colaboradorId: "COL-05", viagemId: "VIA-2026-0419", funcao: "Comissário", status: "pendente",   notificadoEm: "—" },
  { id: "ESC-05", colaboradorId: "COL-06", viagemId: "VIA-2026-0419", funcao: "Bilheteiro", status: "confirmado", notificadoEm: "22/06 05:30" },
  { id: "ESC-06", colaboradorId: "COL-04", viagemId: "VIA-2026-0420", funcao: "Marinheiro", status: "conflito",   notificadoEm: "22/06 18:40" },
];

export type Fornecedor = {
  id: string;
  nome: string;
  cnpj: string;
  categoria: "Combustível" | "Manutenção" | "Energia" | "Suprimentos" | "Serviços";
  contato: string;
  ativo: boolean;
};

export const FORNECEDORES: Fornecedor[] = [
  { id: "FOR-01", nome: "Petrobras Distribuidora", cnpj: "34.274.233/0001-02", categoria: "Combustível", contato: "comercial@br.com", ativo: true },
  { id: "FOR-02", nome: "Naval Reparos Ltda.",     cnpj: "11.222.333/0001-44", categoria: "Manutenção",  contato: "(91) 3344-5566",  ativo: true },
  { id: "FOR-03", nome: "Equatorial Pará",         cnpj: "04.895.728/0001-80", categoria: "Energia",     contato: "atende@equatorial",ativo: true },
  { id: "FOR-04", nome: "Distribuidora Pará",      cnpj: "22.333.444/0001-55", categoria: "Suprimentos", contato: "(91) 3222-1100",  ativo: true },
  { id: "FOR-05", nome: "Estaleiro Marajó",        cnpj: "33.444.555/0001-66", categoria: "Serviços",    contato: "(91) 3111-2233",  ativo: false },
];

/* ============================================================================
 * TMS / CARGA — telas operacionais (docs/modulos/01-TMS-Carga.md).
 * Mocks para: portaria (B.1), NF/DC (B.2/B.3), paletes (B.6), recebimento
 * direto / cross-docking (B.8), comprovante de entrega (B.9), prestação de
 * contas (B.10). Nomes únicos, prefixados. Não renomear/remover exports acima.
 * ========================================================================== */

/* ---- B.1 Portaria — registro de entrada/saída no porto ---- */
export type RegistroPortariaTipo = "veiculo_carga" | "veiculo_transporte" | "pessoa";

export type RegistroPortaria = {
  id: string;
  placa?: string;
  empresa: string;
  motorista?: string;
  tipo: RegistroPortariaTipo;
  entradaEm: string;     // "22/06 07:12"
  saidaEm?: string;      // se ainda no pátio: undefined
  permanencia: string;   // tempo decorrido / total no pátio
  porteiro: string;
  comFoto: boolean;
  sincronizado: boolean; // false = pendente de sincronizar (offline)
};

export const REGISTROS_PORTARIA: RegistroPortaria[] = [
  { id: "PORT-3001", placa: "QAB-1D23", empresa: "Transportes Tapajós", motorista: "Edivaldo Sena",  tipo: "veiculo_carga",      entradaEm: "22/06 06:48", permanencia: "2h14",  porteiro: "Raimundo Nonato", comFoto: true,  sincronizado: true },
  { id: "PORT-3002", placa: "OKL-7G88", empresa: "Distribuidora Marajó", motorista: "Cleber Pinto",   tipo: "veiculo_carga",      entradaEm: "22/06 07:30", permanencia: "1h32",  porteiro: "Raimundo Nonato", comFoto: true,  sincronizado: true },
  { id: "PORT-3003", placa: "NET-2C45", empresa: "Frete Norte Ltda.",    motorista: "Marcos Lira",    tipo: "veiculo_transporte", entradaEm: "22/06 08:05", permanencia: "57min", porteiro: "Raimundo Nonato", comFoto: false, sincronizado: false },
  { id: "PORT-3004", placa: undefined,  empresa: "Visitante — Lucas A.", motorista: undefined,        tipo: "pessoa",             entradaEm: "22/06 08:40", permanencia: "22min", porteiro: "Raimundo Nonato", comFoto: false, sincronizado: false },
  { id: "PORT-3005", placa: "JKM-9988", empresa: "Atacadão Santarém",    motorista: "Paulo Régis",    tipo: "veiculo_carga",      entradaEm: "21/06 16:10", saidaEm: "21/06 18:42", permanencia: "2h32",  porteiro: "Raimundo Nonato", comFoto: true, sincronizado: true },
  { id: "PORT-3006", placa: "RTA-5521", empresa: "Ferragens Amazônia",   motorista: "Sílvio Couto",   tipo: "veiculo_carga",      entradaEm: "21/06 14:00", saidaEm: "21/06 15:20", permanencia: "1h20",  porteiro: "Raimundo Nonato", comFoto: true, sincronizado: true },
];

/* ---- B.2 / B.3 NF / Declaração de Conteúdo ---- */
export type NotaDCTipo = "NFe" | "NFCe" | "DC";
export type NotaDCStatus = "pendente" | "conferida" | "divergente";

export type NotaDC = {
  id: string;
  tipo: NotaDCTipo;
  numero: string;        // número ou chave abreviada
  valor: number;
  clienteId: string;
  cliente: string;
  cargaId?: string;      // carga vinculada (undefined = ainda não vinculada)
  origem: "cliente" | "agente" | "manual";
  arquivo: string;       // nome do arquivo enviado
  status: NotaDCStatus;
  enviadoEm: string;
  lancadoPor?: string;
};

export const NOTAS_DC: NotaDC[] = [
  { id: "DOC-5001", tipo: "NFe",  numero: "35240612…0017", valor: 84_500, clienteId: "CL-1001", cliente: "Comercial Ribeira",  cargaId: "C-2201", origem: "cliente", arquivo: "nfe-35240612.pdf", status: "conferida",  enviadoEm: "21/06 09:14", lancadoPor: "Ana Lima" },
  { id: "DOC-5002", tipo: "NFe",  numero: "35240612…0042", valor: 142_900, clienteId: "CL-1004", cliente: "Ferragens Amazônia", cargaId: "C-2203", origem: "agente",  arquivo: "nf-ferragens.pdf", status: "divergente", enviadoEm: "22/06 07:50", lancadoPor: "Ana Lima" },
  { id: "DOC-5003", tipo: "DC",   numero: "DC-2026-0188",  valor:  3_120, clienteId: "CL-1005", cliente: "Ana Maria Lopes",    origem: "cliente", arquivo: "declaracao-foto.jpg", status: "pendente", enviadoEm: "22/06 08:22" },
  { id: "DOC-5004", tipo: "NFCe", numero: "35240612…0099", valor: 12_800, clienteId: "CL-1008", cliente: "Roberto Mendes",     origem: "cliente", arquivo: "nfce-print.pdf",     status: "pendente", enviadoEm: "22/06 08:35" },
  { id: "DOC-5005", tipo: "NFe",  numero: "35240612…0103", valor: 218_400, clienteId: "CL-1006", cliente: "Atacadão Santarém", cargaId: "C-2202", origem: "cliente", arquivo: "nfe-atacadao.xml", status: "conferida",  enviadoEm: "21/06 17:40", lancadoPor: "Ana Lima" },
  { id: "DOC-5006", tipo: "DC",   numero: "DC-2026-0190",  valor:  8_240, clienteId: "CL-1003", cliente: "José Carvalho",      origem: "agente",  arquivo: "dc-jose.pdf",        status: "pendente", enviadoEm: "22/06 09:01" },
];

/* ---- B.6 Paletes — cadastro e alocação ---- */
export type PaleteProprietario = "AJC" | "terceiro";
export type PaleteStatus = "livre" | "alocado" | "em_transito";

export type Palete = {
  id: string;
  codigo: string;
  proprietario: PaleteProprietario;
  terceiro?: string;          // identificação do dono quando terceiro
  status: PaleteStatus;
  viagemId?: string;          // alocação
  cidadeDestino?: Cidade;
  volumes: number;            // volumes atualmente no palete
};

export const PALETES: Palete[] = [
  { id: "PAL-014", codigo: "AJC-014", proprietario: "AJC",      status: "em_transito", viagemId: "VIA-2026-0417", cidadeDestino: "STM", volumes: 2 },
  { id: "PAL-021", codigo: "AJC-021", proprietario: "AJC",      status: "alocado",     viagemId: "VIA-2026-0418", cidadeDestino: "STM", volumes: 2 },
  { id: "PAL-022", codigo: "AJC-022", proprietario: "AJC",      status: "livre",       volumes: 0 },
  { id: "PAL-101", codigo: "TER-101", proprietario: "terceiro", terceiro: "Atacadão Santarém",  status: "alocado",     viagemId: "VIA-2026-0418", cidadeDestino: "STM", volumes: 6 },
  { id: "PAL-102", codigo: "TER-102", proprietario: "terceiro", terceiro: "Ferragens Amazônia", status: "em_transito", viagemId: "VIA-2026-0420", cidadeDestino: "MTA", volumes: 4 },
  { id: "PAL-103", codigo: "TER-103", proprietario: "terceiro", terceiro: "Distribuidora Marajó", status: "livre",     volumes: 0 },
];

/* ---- B.8 Recebimento direto / cross-docking ---- */
export type RecebimentoDireto = {
  id: string;
  viagemId: string;
  rotulo: string;          // "Recebimento 1", "Recebimento 2"...
  conferente: string;      // quem efetivou (porto ou balsa)
  perfil: "Conferente porto" | "Conferente balsa";
  volumes: number;
  pesoTotal: number;
  fotoOk: boolean;         // foto obrigatória do lote
  efetivadoEm: string;
  sincronizado: boolean;
};

export const RECEBIMENTOS_DIRETOS: RecebimentoDireto[] = [
  { id: "RCD-7001", viagemId: "VIA-2026-0420", rotulo: "Recebimento 1", conferente: "João Souza",      perfil: "Conferente porto", volumes: 8,  pesoTotal: 240, fotoOk: true,  efetivadoEm: "22/06 19:40", sincronizado: true },
  { id: "RCD-7002", viagemId: "VIA-2026-0420", rotulo: "Recebimento 2", conferente: "Sebastião Luz",   perfil: "Conferente balsa", volumes: 5,  pesoTotal: 160, fotoOk: true,  efetivadoEm: "22/06 20:15", sincronizado: true },
  { id: "RCD-7003", viagemId: "VIA-2026-0420", rotulo: "Recebimento 3", conferente: "Sebastião Luz",   perfil: "Conferente balsa", volumes: 3,  pesoTotal: 96,  fotoOk: false, efetivadoEm: "22/06 20:48", sincronizado: false },
  { id: "RCD-7004", viagemId: "VIA-2026-0418", rotulo: "Recebimento 1", conferente: "João Souza",      perfil: "Conferente porto", volumes: 6,  pesoTotal: 198, fotoOk: true,  efetivadoEm: "21/06 18:20", sincronizado: true },
];

/* ---- B.9 Comprovante de entrega (desembarque balsa → terra) ---- */
export type ComprovanteEntrega = {
  id: string;
  protocolo: string;
  viagemId: string;
  cidadeDestino: Cidade;
  volumeIds: string[];
  volumes: number;
  recebedorNome: string;
  recebedorDoc: string;
  recebedorAvulso: boolean;
  justificativa?: string;
  fotos: number;          // 0..2
  assinaturaOk: boolean;
  conferente: string;
  entregueEm: string;
  notificado: boolean;    // WhatsApp/SMS disparado
  sincronizado: boolean;
};

export const COMPROVANTES_ENTREGA: ComprovanteEntrega[] = [
  { id: "ENT-9001", protocolo: "AJC-ENT-77120", viagemId: "VIA-2026-0417", cidadeDestino: "STM", volumeIds: ["V-001", "V-002"], volumes: 2, recebedorNome: "Túlio Barbosa", recebedorDoc: "012.345.678-90", recebedorAvulso: false, fotos: 2, assinaturaOk: true, conferente: "Sebastião Luz", entregueEm: "21/06 19:05", notificado: true, sincronizado: true },
  { id: "ENT-9002", protocolo: "AJC-ENT-77098", viagemId: "VIA-2026-0417", cidadeDestino: "ALM", volumeIds: ["V-100"], volumes: 1, recebedorNome: "Renato Lima", recebedorDoc: "302.811.554-09", recebedorAvulso: false, fotos: 2, assinaturaOk: true, conferente: "Sebastião Luz", entregueEm: "20/06 18:10", notificado: true, sincronizado: true },
  { id: "ENT-9003", protocolo: "AJC-ENT-77150", viagemId: "VIA-2026-0418", cidadeDestino: "STM", volumeIds: ["V-003", "V-004"], volumes: 2, recebedorNome: "Carla (sobrinha do agente)", recebedorDoc: "778.221.009-55", recebedorAvulso: true, justificativa: "Agente Túlio em viagem; recebedor autorizado por telefone.", fotos: 1, assinaturaOk: false, conferente: "Sebastião Luz", entregueEm: "—", notificado: false, sincronizado: false },
];

/* ---- B.10 Prestação de contas do gerente da embarcação ---- */
export type PrestacaoStatus = "rascunho" | "enviada" | "conferida";

export type PrestacaoItem = {
  rotulo: string;
  declarado: number;   // lançado pelo gerente
  sistema: number;     // apurado pelo sistema
};

export type PrestacaoContas = {
  id: string;
  viagemId: string;
  gerente: string;
  status: PrestacaoStatus;
  itens: PrestacaoItem[];
  passageiros: number;
  encomendas: number;
  cargas: number;
  veiculos: number;
  totalDeclarado: number;
  totalSistema: number;
  anexos: number;
  atualizadoEm: string;
};

export const PRESTACOES_CONTAS: PrestacaoContas[] = [
  {
    id: "PC-4001", viagemId: "VIA-2026-0417", gerente: "Raimundo Nonato", status: "conferida",
    itens: [
      { rotulo: "Receita passagens",  declarado: 21_400, sistema: 21_400 },
      { rotulo: "Receita carga",      declarado: 18_900, sistema: 18_900 },
      { rotulo: "Receita encomendas", declarado:  4_120, sistema:  4_120 },
      { rotulo: "Combustível",        declarado: -8_200, sistema: -8_200 },
      { rotulo: "Despesas de bordo",  declarado: -1_640, sistema: -1_640 },
    ],
    passageiros: 178, encomendas: 32, cargas: 14, veiculos: 3,
    totalDeclarado: 34_580, totalSistema: 34_580, anexos: 4, atualizadoEm: "21/06 22:10",
  },
  {
    id: "PC-4002", viagemId: "VIA-2026-0418", gerente: "Raimundo Nonato", status: "enviada",
    itens: [
      { rotulo: "Receita passagens",  declarado: 23_760, sistema: 23_760 },
      { rotulo: "Receita carga",      declarado: 32_400, sistema: 34_800 },
      { rotulo: "Receita encomendas", declarado:  5_240, sistema:  5_240 },
      { rotulo: "Combustível",        declarado: -9_400, sistema: -9_400 },
      { rotulo: "Despesas de bordo",  declarado: -2_100, sistema: -1_980 },
    ],
    passageiros: 198, encomendas: 41, cargas: 18, veiculos: 5,
    totalDeclarado: 49_900, totalSistema: 52_420, anexos: 2, atualizadoEm: "22/06 09:30",
  },
  {
    id: "PC-4003", viagemId: "VIA-2026-0420", gerente: "Edilson Farias", status: "rascunho",
    itens: [
      { rotulo: "Receita passagens",  declarado: 0,      sistema: 0 },
      { rotulo: "Receita carga",      declarado: 41_200, sistema: 41_200 },
      { rotulo: "Receita encomendas", declarado:  2_800, sistema:  2_800 },
      { rotulo: "Combustível",        declarado: -11_200, sistema: -11_200 },
    ],
    passageiros: 0, encomendas: 12, cargas: 22, veiculos: 8,
    totalDeclarado: 32_600, totalSistema: 32_600, anexos: 0, atualizadoEm: "22/06 21:05",
  },
];

/* ---- B.5 Etiqueta — cidades válidas para o seletor de preview ---- */
export const ETIQUETA_CIDADES = CIDADES.map((c) => c.sigla);

/* ============================================================================
 * ENCOMENDAS — despacho PDV/balcão, Declaração de Conteúdo, cotação, controle
 * por viagem e rastreamento (docs/modulos/03-Encomendas.md).
 * Núcleo: precificação por tamanho/valor (A.1) e DC com cláusula de exclusão
 * de responsabilidade (A.2). Nomes prefixados ENCOMENDA_/PRECOS_ENCOMENDA/
 * ENCOMENDAS/DECLARACOES_CONTEUDO. Não renomear/remover exports acima.
 * ========================================================================== */

export type EncomendaTamanho = "P" | "M" | "G";

/** Tamanhos com peso máximo (A.1). */
export const ENCOMENDA_TAMANHOS: { id: EncomendaTamanho; label: string; pesoMax: number }[] = [
  { id: "P", label: "P · até 10 kg", pesoMax: 10 },
  { id: "M", label: "M · até 20 kg", pesoMax: 20 },
  { id: "G", label: "G · até 30 kg", pesoMax: 30 },
];

/** Limite de valor declarado que separa preço fixo (P/M/G) de percentual (A.1). */
export const ENCOMENDA_LIMITE_FIXO = 1000;

/**
 * Tabela de preços por trecho. 🔶 VALORES PENDENTES (Lucas) — placeholders.
 * A MECÂNICA está implementada; só os números entram como configuração depois.
 *  - p/m/g: preço FIXO por tamanho quando valor declarado ≤ R$ 1.000.
 *  - percentual: aplicado sobre o valor declarado quando > R$ 1.000.
 */
export type PrecoEncomenda = {
  trecho: string; // "BEL → STM"
  p: number;
  m: number;
  g: number;
  percentual: number; // % sobre valor declarado
};

export const PRECOS_ENCOMENDA: PrecoEncomenda[] = [
  { trecho: "BEL → STM", p: 35, m: 55, g: 80, percentual: 6.0 },
  { trecho: "BEL → BRV", p: 20, m: 32, g: 48, percentual: 4.5 },
  { trecho: "BEL → MTA", p: 32, m: 50, g: 72, percentual: 5.5 },
  { trecho: "BEL → PRA", p: 28, m: 44, g: 64, percentual: 5.0 },
  { trecho: "BEL → ALM", p: 26, m: 40, g: 58, percentual: 5.0 },
  { trecho: "BEL → PMZ", p: 24, m: 38, g: 54, percentual: 4.8 },
  { trecho: "BEL → GUR", p: 22, m: 34, g: 50, percentual: 4.5 },
];

export const ENCOMENDA_TRECHOS = PRECOS_ENCOMENDA.map((p) => p.trecho);

/** Resultado da precificação (A.1) — guarda o modo aplicado para destaque na UI. */
export type PrecoEncomendaResultado = {
  preco: number;
  modo: "fixo" | "percentual";
  /** percentual aplicado quando modo = "percentual" */
  percentual?: number;
};

/**
 * Regra de precificação A.1:
 *   preço = (valor_declarado <= 1000) ? tabela_fixa[tamanho][trecho]
 *                                     : valor_declarado * percentual[trecho]
 * Se o trecho não existir na tabela, cai no primeiro (defensivo).
 */
export function calcularPrecoEncomenda(args: {
  trecho: string;
  tamanho: EncomendaTamanho;
  valorDeclarado: number;
}): PrecoEncomendaResultado {
  const tabela = PRECOS_ENCOMENDA.find((p) => p.trecho === args.trecho) ?? PRECOS_ENCOMENDA[0];
  if (args.valorDeclarado <= ENCOMENDA_LIMITE_FIXO) {
    const preco = args.tamanho === "P" ? tabela.p : args.tamanho === "M" ? tabela.m : tabela.g;
    return { preco, modo: "fixo" };
  }
  return {
    preco: Math.round(args.valorDeclarado * (tabela.percentual / 100)),
    modo: "percentual",
    percentual: tabela.percentual,
  };
}

/** Sugere o menor tamanho que comporta o peso lido (B.1 — erro: peso acima do tamanho). */
export function sugerirTamanhoPorPeso(peso: number): EncomendaTamanho {
  if (peso <= 10) return "P";
  if (peso <= 20) return "M";
  return "G";
}

/** Máquina de estados do volume da encomenda (B.5) — reaproveita o fluxo TMS. */
export type EncomendaStatus =
  | "recebido" | "conferido" | "embarcado" | "em_viagem" | "desembarcado" | "entregue";

export const ENCOMENDA_FLUXO: EncomendaStatus[] = [
  "recebido", "conferido", "embarcado", "em_viagem", "desembarcado", "entregue",
];

export type EncomendaPagador = "remetente" | "destinatario";

export type Encomenda = {
  id: string;
  codigo: string;          // protocolo curto (etiqueta)
  remetenteId: string;
  remetente: string;
  destinatario: string;
  destinatarioContato: string;
  trecho: string;          // "BEL → STM"
  tamanho: EncomendaTamanho;
  peso: number;
  valorDeclarado: number;
  valorCobrado: number;
  modoPreco: "fixo" | "percentual";
  quemPaga: EncomendaPagador;
  dcId: string;
  status: EncomendaStatus;
  viagemId: string;
  conteudo: string;
  criadoEm: string;
  notificado: boolean;     // WhatsApp/SMS disparado
  sincronizado: boolean;   // false = enfileirado offline
};

export const ENCOMENDAS: Encomenda[] = [
  { id: "ENC-8001", codigo: "AJC-ENC-8001", remetenteId: "CL-1001", remetente: "Comercial Ribeira", destinatario: "Mercado São José", destinatarioContato: "(93) 98111-2233", trecho: "BEL → STM", tamanho: "M", peso: 17, valorDeclarado: 640, valorCobrado: 55,  modoPreco: "fixo",       quemPaga: "remetente",   dcId: "DC-9001", status: "em_viagem",    viagemId: "VIA-2026-0418", conteudo: "Peças de vestuário",       criadoEm: "21/06 09:40", notificado: true,  sincronizado: true },
  { id: "ENC-8002", codigo: "AJC-ENC-8002", remetenteId: "CL-1006", remetente: "Atacadão Santarém", destinatario: "Loja Center BR", destinatarioContato: "(93) 98222-7788", trecho: "BEL → STM", tamanho: "P", peso: 6,  valorDeclarado: 4_200, valorCobrado: 252, modoPreco: "percentual", quemPaga: "destinatario", dcId: "DC-9002", status: "embarcado",    viagemId: "VIA-2026-0418", conteudo: "Eletrônicos (declarado)",  criadoEm: "21/06 10:12", notificado: true,  sincronizado: true },
  { id: "ENC-8003", codigo: "AJC-ENC-8003", remetenteId: "CL-1003", remetente: "José Carvalho",     destinatario: "Maria Carvalho", destinatarioContato: "(91) 98333-1100", trecho: "BEL → GUR", tamanho: "P", peso: 4,  valorDeclarado: 180,   valorCobrado: 22,  modoPreco: "fixo",       quemPaga: "remetente",   dcId: "DC-9003", status: "conferido",    viagemId: "VIA-2026-0419", conteudo: "Documentos e remédios",   criadoEm: "22/06 07:55", notificado: false, sincronizado: true },
  { id: "ENC-8004", codigo: "AJC-ENC-8004", remetenteId: "CL-1004", remetente: "Ferragens Amazônia", destinatario: "Construrápido MTA", destinatarioContato: "(93) 98444-5566", trecho: "BEL → MTA", tamanho: "G", peso: 28, valorDeclarado: 920,   valorCobrado: 72,  modoPreco: "fixo",       quemPaga: "remetente",   dcId: "DC-9004", status: "recebido",     viagemId: "VIA-2026-0420", conteudo: "Ferramentas manuais",     criadoEm: "22/06 08:30", notificado: false, sincronizado: false },
  { id: "ENC-8005", codigo: "AJC-ENC-8005", remetenteId: "CL-1002", remetente: "Distribuidora Marajó", destinatario: "Empório Breves", destinatarioContato: "(91) 98555-9900", trecho: "BEL → BRV", tamanho: "M", peso: 15, valorDeclarado: 2_800, valorCobrado: 126, modoPreco: "percentual", quemPaga: "destinatario", dcId: "DC-9005", status: "recebido",     viagemId: "VIA-2026-0419", conteudo: "Cosméticos (declarado)",  criadoEm: "22/06 08:48", notificado: false, sincronizado: true },
  { id: "ENC-8006", codigo: "AJC-ENC-8006", remetenteId: "CL-1001", remetente: "Comercial Ribeira", destinatario: "Túlio Barbosa",  destinatarioContato: "(93) 98666-3344", trecho: "BEL → STM", tamanho: "G", peso: 26, valorDeclarado: 750,   valorCobrado: 80,  modoPreco: "fixo",       quemPaga: "remetente",   dcId: "DC-9006", status: "entregue",     viagemId: "VIA-2026-0417", conteudo: "Utensílios domésticos",   criadoEm: "20/06 14:05", notificado: true,  sincronizado: true },
  { id: "ENC-8007", codigo: "AJC-ENC-8007", remetenteId: "CL-1007", remetente: "Granel Tapajós",    destinatario: "Posto Central PMZ", destinatarioContato: "(93) 98777-1212", trecho: "BEL → PMZ", tamanho: "M", peso: 19, valorDeclarado: 1_650, valorCobrado: 79,  modoPreco: "percentual", quemPaga: "remetente",   dcId: "DC-9007", status: "desembarcado", viagemId: "VIA-2026-0418", conteudo: "Peças automotivas",       criadoEm: "21/06 11:20", notificado: true,  sincronizado: true },
  { id: "ENC-8008", codigo: "AJC-ENC-8008", remetenteId: "CL-1008", remetente: "Roberto Mendes",    destinatario: "Cleide Mendes",  destinatarioContato: "(93) 98888-4545", trecho: "BEL → PRA", tamanho: "P", peso: 8,  valorDeclarado: 320,   valorCobrado: 28,  modoPreco: "fixo",       quemPaga: "destinatario", dcId: "DC-9008", status: "conferido",    viagemId: "VIA-2026-0421", conteudo: "Roupas e calçados",       criadoEm: "22/06 09:05", notificado: false, sincronizado: true },
];

/** Versão vigente do termo da DC. 🔶 texto integral pendente (Lucas). */
export const DC_TERMO_VERSAO = "DC-TERMO-v1-rascunho";

export type DeclaracaoConteudo = {
  id: string;
  encomendaId: string;
  descricao: string;
  valorDeclarado: number;
  textoTermoVersao: string;
  assinaturaOk: boolean;
  aceiteEm: string;     // carimbo data/hora
  dispositivo: string;  // dispositivo de captura
};

export const DECLARACOES_CONTEUDO: DeclaracaoConteudo[] = [
  { id: "DC-9001", encomendaId: "ENC-8001", descricao: "Peças de vestuário", valorDeclarado: 640,   textoTermoVersao: DC_TERMO_VERSAO, assinaturaOk: true,  aceiteEm: "21/06 09:41", dispositivo: "PDV-Balcão-01" },
  { id: "DC-9002", encomendaId: "ENC-8002", descricao: "Eletrônicos (declarado)", valorDeclarado: 4_200, textoTermoVersao: DC_TERMO_VERSAO, assinaturaOk: true,  aceiteEm: "21/06 10:13", dispositivo: "PDV-Balcão-01" },
  { id: "DC-9003", encomendaId: "ENC-8003", descricao: "Documentos e remédios", valorDeclarado: 180, textoTermoVersao: DC_TERMO_VERSAO, assinaturaOk: true,  aceiteEm: "22/06 07:56", dispositivo: "PDV-Balcão-02" },
  { id: "DC-9004", encomendaId: "ENC-8004", descricao: "Ferramentas manuais", valorDeclarado: 920,  textoTermoVersao: DC_TERMO_VERSAO, assinaturaOk: false, aceiteEm: "—",           dispositivo: "PDV-Balcão-02" },
  { id: "DC-9005", encomendaId: "ENC-8005", descricao: "Cosméticos (declarado)", valorDeclarado: 2_800, textoTermoVersao: DC_TERMO_VERSAO, assinaturaOk: true,  aceiteEm: "22/06 08:49", dispositivo: "PDV-Balcão-01" },
  { id: "DC-9006", encomendaId: "ENC-8006", descricao: "Utensílios domésticos", valorDeclarado: 750, textoTermoVersao: DC_TERMO_VERSAO, assinaturaOk: true,  aceiteEm: "20/06 14:06", dispositivo: "PDV-Balcão-01" },
  { id: "DC-9007", encomendaId: "ENC-8007", descricao: "Peças automotivas", valorDeclarado: 1_650,  textoTermoVersao: DC_TERMO_VERSAO, assinaturaOk: true,  aceiteEm: "21/06 11:21", dispositivo: "PDV-Balcão-02" },
  { id: "DC-9008", encomendaId: "ENC-8008", descricao: "Roupas e calçados", valorDeclarado: 320,    textoTermoVersao: DC_TERMO_VERSAO, assinaturaOk: true,  aceiteEm: "22/06 09:06", dispositivo: "PDV-Balcão-02" },
];

/**
 * Cláusula de exclusão de responsabilidade (A.2). 🔶 TEXTO PENDENTE (Lucas) —
 * placeholder. Os pontos abaixo foram confirmados em reunião e devem constar.
 */
export const DC_CLAUSULAS: string[] = [
  "O reembolso, em qualquer hipótese, fica limitado ao VALOR DECLARADO informado pelo remetente nesta Declaração de Conteúdo.",
  "A transportadora NÃO abre o volume para verificar o conteúdo; o conteúdo aqui declarado é de inteira responsabilidade do remetente.",
  "Caso órgão de controle ou força policial abra o volume e o conteúdo divirja do declarado, a responsabilidade é TOTALMENTE do remetente.",
  "A Declaração de Conteúdo assinada fica anexada à carga e disponível para auditoria e autoridades.",
];

export const DC_TERMO_PLACEHOLDER =
  "🔶 Texto integral do termo pendente (Lucas). Esta é uma versão de rascunho para navegação. " +
  "Ao assinar, o remetente declara que as informações de conteúdo e valor são verdadeiras e aceita as cláusulas abaixo.";

/* ============================================================================
 * VENDAS — Gerador de cortesias (B.6) e Manifesto de passageiros (B.8).
 * Nomes únicos, prefixados. Não renomear/remover exports acima.
 * Fonte: docs/modulos/02-Vendas-Passagens.md (B.6, B.8).
 * ========================================================================== */

/* ---- B.6 Gerador de cortesias ---- */

/** Motivos de cortesia (influência/relacionamento) — configurável em Cadastros. */
export const CORTESIA_MOTIVOS = [
  { id: "imprensa", label: "Imprensa — cobertura institucional" },
  { id: "influencia", label: "Parceria comercial — influência" },
  { id: "relacionamento", label: "Relacionamento — autoridade local" },
  { id: "diretoria", label: "Convidado da diretoria" },
] as const;

export type CortesiaMotivoId = (typeof CORTESIA_MOTIVOS)[number]["id"];

/** Classes elegíveis para cortesia (mesma nomenclatura das passagens). */
export const CORTESIA_CLASSES = ["Rede", "Rede VIP", "Camarote Royal"] as const;
export type CortesiaClasse = (typeof CORTESIA_CLASSES)[number];

export type CortesiaStatus = "usada" | "nao_usada";

export type CortesiaEmitida = {
  id: string;
  codigo: string;          // código gerado por viagem
  viagemId: string;
  classe: CortesiaClasse;
  motivo: string;          // rótulo do motivo
  concedidoPor: string;    // quem emitiu (comercial/diretoria)
  emitidaEm: string;       // "22/06 10:12"
  status: CortesiaStatus;  // usada / não usada
};

export const CORTESIAS_EMITIDAS: CortesiaEmitida[] = [
  { id: "CRT-1042", codigo: "AJC-CORT-1042", viagemId: "VIA-2026-0418", classe: "Rede VIP",       motivo: "Imprensa — cobertura institucional", concedidoPor: "Wellington Ferreira", emitidaEm: "21/06 16:40", status: "nao_usada" },
  { id: "CRT-1043", codigo: "AJC-CORT-1043", viagemId: "VIA-2026-0418", classe: "Rede",           motivo: "Parceria comercial — influência",    concedidoPor: "Túlio Barbosa",       emitidaEm: "21/06 17:05", status: "usada" },
  { id: "CRT-1044", codigo: "AJC-CORT-1044", viagemId: "VIA-2026-0418", classe: "Camarote Royal", motivo: "Relacionamento — autoridade local",  concedidoPor: "Wellington Ferreira", emitidaEm: "21/06 18:20", status: "nao_usada" },
  { id: "CRT-1045", codigo: "AJC-CORT-1045", viagemId: "VIA-2026-0419", classe: "Rede VIP",       motivo: "Convidado da diretoria",             concedidoPor: "Wellington Ferreira", emitidaEm: "22/06 05:50", status: "usada" },
  { id: "CRT-1046", codigo: "AJC-CORT-1046", viagemId: "VIA-2026-0419", classe: "Rede",           motivo: "Relacionamento — autoridade local",  concedidoPor: "Helena Castro",       emitidaEm: "22/06 06:10", status: "nao_usada" },
  { id: "CRT-1047", codigo: "AJC-CORT-1047", viagemId: "VIA-2026-0421", classe: "Rede",           motivo: "Parceria comercial — influência",    concedidoPor: "Helena Castro",       emitidaEm: "22/06 09:30", status: "nao_usada" },
];

/** Limite de cortesias por viagem (configurável em Cadastros). */
export type CortesiaLimite = { viagemId: string; limite: number };

export const CORTESIA_LIMITES: CortesiaLimite[] = [
  { viagemId: "VIA-2026-0418", limite: 4 },
  { viagemId: "VIA-2026-0419", limite: 2 },
  { viagemId: "VIA-2026-0420", limite: 3 },
  { viagemId: "VIA-2026-0421", limite: 5 },
];

/** Limite padrão quando a viagem não tem configuração específica. */
export const CORTESIA_LIMITE_PADRAO = 3;

/* ---- B.8 Manifesto de passageiros por viagem ---- */

/** Tipo de tarifa derivado da classe da passagem (paga/cortesia/gratuidade/contrato). */
export type TipoTarifa = "paga" | "cortesia" | "gratuidade" | "contrato";

export function tipoTarifaDaClasse(classe: Passagem["classe"]): TipoTarifa {
  if (classe === "Cortesia") return "cortesia";
  if (classe === "Gratuidade") return "gratuidade";
  if (classe === "Contrato") return "contrato";
  return "paga";
}

export const TIPO_TARIFA_LABEL: Record<TipoTarifa, string> = {
  paga: "Paga",
  cortesia: "Cortesia",
  gratuidade: "Gratuidade",
  contrato: "Contrato",
};
