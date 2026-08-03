const PRODUCTION_API_URL = "https://apiajc.byteintelligence.com.br/api";
// In development, keep requests same-origin and let Vite proxy them. This preserves
// production CORS restrictions while allowing faithful local browser QA.
const DEFAULT_API_URL = import.meta.env.DEV ? "/api" : PRODUCTION_API_URL;

export const AJC_API_URL = (import.meta.env.VITE_AJC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

export class AjcApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AjcApiError";
  }
}

const AUTH_STORAGE_KEY = "ajc.auth.v1";

async function request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const token = init?.auth ? getStoredAuth()?.accessToken : undefined;
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const res = await fetch(`${AJC_API_URL}${path}`, {
    ...init,
    headers: {
      ...(!isFormData ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? tryJson(text) : null;
  if (!res.ok) {
    const message =
      typeof body === "object" && body && "message" in body ? String(body.message) : text;
    throw new AjcApiError(message || "Falha ao chamar API AJC", res.status);
  }
  return body as T;
}

function tryJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export type AuthUserApi = {
  id: string;
  nome: string;
  login: string;
  email: string | null;
  perfilId: string;
  perfilNome: string;
  permissions: string[];
};

export type AuthSessionApi = {
  accessToken: string;
  refreshToken: string;
  expires: string;
  user: AuthUserApi;
};

export function getStoredAuth(): AuthSessionApi | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSessionApi;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setStoredAuth(session: AuthSessionApi | null) {
  if (!canUseStorage()) return;
  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function hasStoredAuth() {
  return Boolean(getStoredAuth()?.accessToken);
}

export async function loginAjc(input: { login: string; password: string; dispositivo?: string }) {
  const session = await request<AuthSessionApi>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setStoredAuth(session);
  return session;
}

export async function refreshAjc() {
  const current = getStoredAuth();
  if (!current?.refreshToken) throw new AjcApiError("Sessao expirada", 401);
  const session = await request<AuthSessionApi>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  setStoredAuth(session);
  return session;
}

export async function getMeAjc() {
  return request<AuthUserApi>("/auth/me", { auth: true });
}

export async function logoutAjc() {
  try {
    await request<{ ok: true }>("/auth/logout", { method: "POST", auth: true });
  } finally {
    setStoredAuth(null);
  }
}

export type EmbarcacaoApi = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  capacidadeCarga: number | null;
  capacidadePax: Record<string, unknown>;
};

export type SaveEmbarcacaoInput = {
  nome: string;
  tipo?: "passeio_carga" | "carga";
  status?: "ativa" | "manutencao" | "alugada";
  capacidadeCarga?: number | null;
  capacidadePax?: Record<string, unknown>;
};

export type NavegacaoEscalaApi = {
  id: string;
  cidadeSigla: string;
  ordem: number;
  dataHoraPrevista: string | null;
  dataHoraReal: string | null;
  observacao: string | null;
};

export type NavegacaoViagemApi = {
  id: string;
  codigo: string | null;
  embarcacaoId: string;
  embarcacaoNome: string;
  origemSigla: string;
  destinoSigla: string | null;
  dataHoraSaida: string;
  dataHoraRetorno: string | null;
  status: string;
  situacao: string | null;
  capacidadePaxDisponivel: Record<string, unknown>;
  observacoes: string | null;
  rotaTemplateId: string | null;
  configVersaoId: string | null;
  configVersao: number | null;
  cicloUuid: string | null;
  motivoCancelamento: string | null;
  escalas: NavegacaoEscalaApi[];
};

export type NavegacaoEscalaColaboradorApi = {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorWhatsapp: string | null;
  colaboradorFuncaoBase: string | null;
  cidadeSigla: string | null;
  viagemId: string | null;
  viagemCodigo: string | null;
  embarcacaoNome: string | null;
  origemSigla: string | null;
  destinoSigla: string | null;
  dataHoraSaida: string | null;
  dataHoraRetorno: string | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  funcao: string | null;
  status: "planejada" | "notificada" | "confirmada" | "cancelada" | "conflito" | string;
  statusOriginal: string;
  notificadoEm: string | null;
  confirmadoEm: string | null;
  conflito: boolean;
};

export type RotaTemplateApi = {
  id: string;
  nome: string;
  origemSigla: string;
  destinoSigla: string;
  diaSemana: number;
  horaSaida: string;
  ativo: boolean;
  observacao?: string;
  requerRevisao?: boolean;
  embarcacaoPadraoId?: string | null;
  rotaRetornoId?: string | null;
  configVersaoId: string;
  configVersao: number;
  paradas: Array<{ cidadeSigla: string; offsetMinutos: number; permanenciaMinutos?: number }>;
};

export type CreateViagemApiInput = {
  embarcacaoId: string;
  origemSigla: string;
  destinoSigla?: string;
  dataHoraSaida: string;
  dataHoraRetorno?: string;
  capacidadePaxDisponivel?: Record<string, unknown>;
  observacoes?: string;
  rotaTemplateId: string;
  configVersaoId: string;
  cicloUuid?: string;
  clientUuid?: string;
  escalas: Array<{ cidadeSigla: string; dataHoraPrevista?: string; observacao?: string }>;
};

export type UpdateViagemApiInput = Partial<Omit<CreateViagemApiInput, "clientUuid">> & {
  status?: "planejada" | "em_curso" | "concluida" | "cancelada";
  situacao?: "no_prazo" | "atencao" | "atrasado" | null;
  dataHoraRetorno?: string | null;
  observacoes?: string | null;
};

export function listNavegacaoViagens() {
  return request<NavegacaoViagemApi[]>("/navegacao/viagens", { auth: true });
}

export function listNavegacaoTemplatesRotas() {
  return request<RotaTemplateApi[]>("/navegacao/templates-rotas", { auth: true });
}

export function listNavegacaoEscalasColaboradores() {
  return request<NavegacaoEscalaColaboradorApi[]>("/navegacao/escalas-colaboradores", {
    auth: true,
  });
}

export function notifyNavegacaoEscalas(input: { escalaIds: string[]; clientUuid?: string }) {
  return request<NavegacaoEscalaColaboradorApi[]>("/navegacao/escalas-colaboradores/notificar", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function createNavegacaoViagem(input: CreateViagemApiInput) {
  return request<NavegacaoViagemApi>("/navegacao/viagens", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updateNavegacaoViagem(id: string, input: UpdateViagemApiInput) {
  return request<NavegacaoViagemApi>(`/navegacao/viagens/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function transitionNavegacaoViagem(
  id: string,
  input: { acao: "iniciar" | "concluir" | "cancelar"; motivo?: string; clientUuid?: string },
) {
  return request<NavegacaoViagemApi>(`/navegacao/viagens/${id}/transicoes`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listEmbarcacoes() {
  return request<EmbarcacaoApi[]>("/cadastros/embarcacoes", { auth: true });
}

export function createEmbarcacao(input: SaveEmbarcacaoInput) {
  return request<EmbarcacaoApi>("/cadastros/embarcacoes", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updateEmbarcacao(id: string, input: SaveEmbarcacaoInput) {
  return request<EmbarcacaoApi>(`/cadastros/embarcacoes/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export type UsuarioCadastroApi = {
  id: string;
  nome: string;
  login: string;
  email: string | null;
  perfilId: string;
  perfilNome: string;
  ativo: boolean;
};

export type PerfilCadastroApi = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  permissions: string[];
};

export type CidadeApi = {
  sigla: string;
  nome: string;
  uf: string;
  isBase: boolean;
  ativo: boolean;
};

export type FornecedorApi = {
  id: string;
  nome: string;
  cnpj: string | null;
  categoria: string | null;
  contatos: unknown[];
  ativo: boolean;
};

export type ColaboradorApi = {
  id: string;
  nome: string;
  funcao: string | null;
  cidadeSigla: string | null;
  contatoWhatsapp: string | null;
  ativo: boolean;
};

export type AgenteApi = {
  id: string;
  nome: string;
  cidadeSigla: string;
  percentualComissao: number | null;
  ativo: boolean;
};

export type ClienteApi = {
  id: string;
  codigo: string;
  tipo: "PF" | "PJ" | string;
  nome: string;
  cpfCnpj: string | null;
  cidadeSigla: string | null;
  agenteId: string | null;
  contatos: unknown[];
};

export type SaveClienteInput = {
  tipo?: "PF" | "PJ";
  nome?: string;
  cpfCnpj?: string | null;
  cidadeSigla?: string | null;
  agenteId?: string | null;
  contatos?: unknown[];
  motivoRealocacao?: string;
};

export type SaveFornecedorInput = {
  nome: string;
  cnpj?: string | null;
  categoria?: string | null;
  contatos?: unknown[];
  dadosBancarios?: Record<string, unknown> | null;
};

export type SaveColaboradorInput = {
  nome: string;
  funcao?: string | null;
  cidadeSigla?: string | null;
  contatoWhatsapp?: string | null;
};

export type SaveUsuarioInput = {
  nome: string;
  login: string;
  email?: string | null;
  perfilId: string;
  password?: string;
  ativo?: boolean;
};

export type SavePerfilInput = {
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
  permissions?: string[];
};

export type CrmCotacaoApi = {
  id: string;
  tipo: "encomenda" | "carga" | "veiculo" | string;
  clienteId: string;
  clienteNome: string;
  agenteId: string | null;
  agenteNome: string | null;
  origemSigla: string | null;
  destinoSigla: string | null;
  parametros: Record<string, unknown>;
  valorEstimado: number | null;
  validade: string | null;
  status: "aberta" | "convertida" | "expirada" | string;
  convertidaCargaId: string | null;
  cargaCodigo: string | null;
  criadoEm: string;
};

export type CrmHistoricoClienteApi = {
  cargas: Array<{
    id: string;
    codigo: string | null;
    categoria: string;
    trecho: string;
    valor: number | null;
    pesoTotal: number | null;
    volumes: number;
    criadoEm: string;
  }>;
  bilhetes: Array<{
    id: string;
    codigo: string;
    classe: string;
    trecho: string;
    valor: number | null;
    status: string;
    saida: string;
    embarcacaoNome: string;
  }>;
};

export type PrecoPassagemMatrizApi = {
  trecho: string;
  origemSigla: string;
  destinoSigla: string;
  classes: Record<string, number>;
};

export type PrecoItemApi = {
  id: string;
  tipo: string;
  versao: number;
  classe: string | null;
  subtipo: string | null;
  tamanho: string | null;
  origemSigla: string | null;
  destinoSigla: string | null;
  valor: number | null;
  percentual: number | null;
};

export function listCidades() {
  return request<CidadeApi[]>("/cadastros/cidades", { auth: true });
}

export function listUsuariosCadastro() {
  return request<UsuarioCadastroApi[]>("/cadastros/usuarios", { auth: true });
}

export function listPerfisCadastro() {
  return request<PerfilCadastroApi[]>("/cadastros/perfis", { auth: true });
}

export function createUsuarioCadastro(input: SaveUsuarioInput) {
  return request<UsuarioCadastroApi>("/cadastros/usuarios", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updateUsuarioCadastro(id: string, input: Partial<SaveUsuarioInput>) {
  return request<UsuarioCadastroApi>(`/cadastros/usuarios/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function createPerfilCadastro(input: SavePerfilInput) {
  return request<PerfilCadastroApi>("/cadastros/perfis", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updatePerfilCadastro(id: string, input: Partial<SavePerfilInput>) {
  return request<PerfilCadastroApi>(`/cadastros/perfis/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listFornecedores() {
  return request<FornecedorApi[]>("/cadastros/fornecedores", { auth: true });
}

export function createFornecedor(input: SaveFornecedorInput) {
  return request<FornecedorApi>("/cadastros/fornecedores", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listColaboradores() {
  return request<ColaboradorApi[]>("/cadastros/colaboradores", { auth: true });
}

export function createColaborador(input: SaveColaboradorInput) {
  return request<ColaboradorApi>("/cadastros/colaboradores", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listAgentes() {
  return request<AgenteApi[]>("/cadastros/agentes", { auth: true });
}

export function listClientes() {
  return request<ClienteApi[]>("/cadastros/clientes", { auth: true });
}

export function createCliente(input: SaveClienteInput) {
  return request<ClienteApi>("/cadastros/clientes", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updateCliente(id: string, input: SaveClienteInput) {
  return request<ClienteApi>(`/cadastros/clientes/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listCrmCotacoes() {
  return request<CrmCotacaoApi[]>("/crm/cotacoes", { auth: true });
}

export function createCrmCotacao(input: {
  tipo: "encomenda" | "carga" | "veiculo";
  clienteId: string;
  agenteId?: string | null;
  origemSigla?: string | null;
  destinoSigla?: string | null;
  parametros?: Record<string, unknown>;
  valorEstimado?: number | null;
  validade?: string | null;
}) {
  return request<CrmCotacaoApi>("/crm/cotacoes", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function getCrmHistoricoCliente(id: string) {
  return request<CrmHistoricoClienteApi>(`/crm/clientes/${id}/historico`, { auth: true });
}

export function listPrecosPassagemMatriz() {
  return request<PrecoPassagemMatrizApi[]>("/precos/passagem/matriz", { auth: true });
}

export type ConfigValueApi = {
  chave: string;
  categoria: string | null;
  descricao: string | null;
  versao: number;
  valor: unknown;
  vigenteDesde: string;
  publicadoEm: string;
};

export function getConfigValue(chave: string) {
  return request<ConfigValueApi>(`/config/${encodeURIComponent(chave)}`, { auth: true });
}

export function listConfigValues() {
  return request<ConfigValueApi[]>("/config", { auth: true });
}

export function publishConfigValue(chave: string, valor: unknown) {
  return request<ConfigValueApi>(`/config/${encodeURIComponent(chave)}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ valor }),
  });
}

export function listPrecos(params?: { tipo?: string }) {
  const search = new URLSearchParams();
  if (params?.tipo) search.set("tipo", params.tipo);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<PrecoItemApi[]>(`/precos${suffix}`, { auth: true });
}

export type ReajustePrecoApiResponse = {
  tabela: {
    id: string;
    tipo: string;
    versao: number;
    motivo: string | null;
    percentualReajuste: number | null;
    origemVersaoId: string | null;
  };
  itens: PrecoItemApi[];
  matriz?: PrecoPassagemMatrizApi[];
};

export function reajustarTabelaPrecos(
  tipo: "passagem" | "encomenda" | "carga",
  input: { percentual: number; motivo?: string },
) {
  return request<ReajustePrecoApiResponse>(`/precos/${tipo}/reajustes`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export type TmsCargaApi = {
  id: string;
  codigo: string | null;
  numero_pedido: string | null;
  categoria: "carga" | "encomenda" | string;
  status: string;
  viagem_id?: string;
  destinatario_nome?: string | null;
  valor_declarado: number | null;
  valor_cobrado: number | null;
  peso_total: number | null;
  cidade_origem_sigla: string | null;
  cidade_destino_sigla: string;
  tipo_recebimento: string | null;
  observacoes?: string | null;
  criado_em: string;
  viagem_codigo: string;
  remetente_nome: string;
  total_volumes: number;
  tipo_unitizacao?: "AVULSA" | "MP" | "PD" | "PC";
};

export type CreateEncomendaInput = {
  viagemId: string;
  clienteRemetenteId: string;
  destinatarioNome?: string;
  cidadeOrigemSigla?: string;
  cidadeDestinoSigla: string;
  valorDeclarado?: number;
  valorCobrado?: number;
  pesoTotal?: number;
  totalVolumes?: number;
  numeroDocumento?: string;
  observacoes?: string;
  clientUuid?: string;
  documento?: {
    tipo: "NFe" | "NFCe" | "DC";
    numero?: string;
    valor?: number;
    arquivoUrl?: string;
    arquivoHash?: string;
    origem?: "cliente" | "agente" | "manual";
  };
};

export type CreateTmsCargaInput = CreateEncomendaInput & {
  categoria?: "carga" | "encomenda";
  tipoRecebimento?: "porto_balsa" | "direto";
  numeroPedido?: string;
  documentoIds?: string[];
};

export type TmsAgendamentoSlotApi = {
  inicio: string;
  fim: string;
  capacidade: number;
  ocupadas: number;
  disponiveis: number;
  bloqueada: boolean;
  intervaloMinutos: number;
  atualizacaoSegundos: number;
};

export type TmsVolumeApi = {
  id: string;
  carga_id: string;
  indice_volume: number;
  total_volumes: number;
  uuid: string;
  peso: string | number | null;
  status: string;
  palete_id: string | null;
  criado_em: string;
  carga_codigo: string;
  cidade_destino_sigla: string;
  categoria: string;
  palete_codigo: string | null;
};

export type TmsControleConfigApi = {
  versao: number;
  schemaVersion: 1;
  timezone: string;
  atualizacaoSegundos: number;
  diasPassadosPadrao: number;
  diasFuturosPadrao: number;
  itensPorPagina: number;
  maximoPorPagina: number;
  limiteExportacao: number;
  limiteEventosPorVolume: number;
  limiteDivergenciasPainel: number;
};

export type TmsControleViagemApi = {
  id: string;
  codigo: string | null;
  embarcacao_id: string;
  embarcacao_nome: string;
  origem_sigla: string;
  destino_sigla: string | null;
  data_hora_saida: string;
  data_hora_retorno: string | null;
  status: "planejada" | "em_curso" | "concluida" | "cancelada";
  situacao: string | null;
  cargas: number;
  volumes: number;
  recebidos: number;
  embarcados: number;
  entregues: number;
  divergentes: number;
  valor_declarado: number | null;
  valor_cobrado: number | null;
  cargas_sem_valor_declarado: number;
  cargas_sem_valor_cobrado: number;
  progresso_percentual: number;
  escalas: Array<{
    id: string;
    ordem: number;
    cidadeSigla: string;
    dataHoraPrevista: string;
    dataHoraReal: string | null;
  }>;
};

export type TmsControleTotaisApi = {
  viagens: number;
  volumes: number;
  recebidos: number;
  embarcados: number;
  entregues: number;
  divergentes: number;
  valorDeclarado: number | null;
  valorCobrado: number | null;
  cargasSemValorDeclarado: number;
  cargasSemValorCobrado: number;
};

export type TmsControleParams = {
  busca?: string;
  embarcacaoId?: string;
  cidadeSigla?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
  porPagina?: number;
};

export type TmsControleResponseApi = {
  items: TmsControleViagemApi[];
  total: number;
  totals: TmsControleTotaisApi;
  filtros: Required<Pick<TmsControleParams, "dataInicio" | "dataFim" | "pagina" | "porPagina">> & TmsControleParams;
  paginacao: { pagina: number; porPagina: number; total: number; paginas: number };
  configuracao: TmsControleConfigApi;
  atualizadoEm: string;
  exportacao?: { limite: number; truncada: boolean };
};

export type TmsControleVolumeApi = {
  id: string;
  uuid: string;
  indice_volume: number;
  total_volumes: number;
  peso: number | null;
  status: string;
  criado_em: string;
  atualizado_em: string;
  carga_id: string;
  carga_codigo: string | null;
  numero_pedido: string | null;
  cidade_destino_sigla: string;
  valor_declarado: number | null;
  valor_cobrado: number | null;
  cliente_id: string;
  cliente_codigo: string | null;
  cliente_nome: string;
  eventos_total: number;
  ultimo_evento: TmsControleVolumeEventApi | null;
};

export type TmsControleVolumeEventApi = {
  id: string;
  tipo: string;
  observacao?: string | null;
  obs?: string | null;
  ocorrido_em?: string;
  ocorridoEm?: string;
  criado_em?: string;
  usuario_id?: string;
  usuario_nome?: string;
  usuarioNome?: string;
  foto_url?: string | null;
  fotoUrl?: string | null;
  foto_hash?: string | null;
  fotoHash?: string | null;
  gps: unknown | null;
};

export type TmsControleVolumesResponseApi = {
  viagem: { id: string; codigo: string | null; embarcacaoNome: string };
  items: TmsControleVolumeApi[];
  divergencias: Array<TmsControleVolumeApi & { observacao: string | null }>;
  paginacao: { pagina: number; porPagina: number; total: number; paginas: number };
  atualizadoEm: string;
};

export type TmsDocumentoApi = {
  id: string;
  tipo: "NFe" | "NFCe" | "DC" | string;
  pagamento?: "CIF" | "FOB" | string | null;
  numero: string | null;
  valor: number | null;
  cliente_id: string | null;
  carga_id: string | null;
  arquivo_url: string | null;
  arquivo_hash: string | null;
  status: "pendente" | "conferida" | "divergente" | string;
  origem: "cliente" | "agente" | "manual" | string | null;
  agendado_para?: string | null;
  viagem_id?: string | null;
  viagem_codigo?: string | null;
  remetente_nome?: string | null;
  remetente_documento?: string | null;
  remetente_telefone?: string | null;
  chave_acesso?: string | null;
  arquivo_nome?: string | null;
  arquivo_mime?: string | null;
  tipo_unitizacao?: "AVULSA" | "MP" | "PD" | "PC" | null;
  criado_em: string;
  atualizado_em: string;
  carga_codigo: string | null;
  numero_pedido: string | null;
  tipo_recebimento: string | null;
  cidade_origem_sigla: string | null;
  cidade_destino_sigla: string | null;
  peso_total: number | null;
  total_volumes?: number | null;
  destinatario_nome?: string | null;
  destinatario_documento?: string | null;
  destinatario_telefone?: string | null;
  cliente_nome: string | null;
  lancado_por_nome: string | null;
};

export type TmsDocumentoAnaliseApi = {
  uploadId: string;
  arquivo: { nome: string; mime: string; hash: string; bytes: number };
  extraido: {
    tipo: "NFe" | "NFCe" | "DC";
    numero?: string;
    chaveAcesso?: string;
    valor?: number;
    pesoTotal?: number;
    totalVolumes?: number;
    pagamento?: "CIF" | "FOB";
    remetente: { nome?: string; documento?: string; telefone?: string };
    destinatario: { nome?: string; documento?: string; telefone?: string };
    xmlLido: boolean;
  };
  cliente: { id: string; codigo: string; nome: string } | null;
  clienteSeraCriado: boolean;
};

export type CreateTmsDocumentoInput = {
  uploadId: string;
  viagemId: string;
  clienteRemetenteId?: string;
  remetenteNome: string;
  remetenteDocumento?: string;
  remetenteTelefone?: string;
  tipo: "NFe" | "NFCe" | "DC";
  pagamento?: "CIF" | "FOB";
  numero: string;
  cidadeOrigemSigla?: string;
  cidadeDestinoSigla?: string;
  valor?: number;
  pesoTotal?: number;
  totalVolumes?: number;
  destinatarioNome?: string;
  destinatarioDocumento?: string;
  destinatarioTelefone?: string;
  agendadoPara?: string;
  tipoUnitizacao?: "AVULSA" | "MP" | "PD" | "PC";
  clientUuid?: string;
};

export type EncomendaDeclaracaoApi = {
  id: string;
  carga_id: string;
  valor_declarado: number | null;
  descricao_informada: string | null;
  config_termo_versao_id: string | null;
  assinatura_url: string | null;
  assinatura_hash: string | null;
  aceite_em: string | null;
  dispositivo: string | null;
  ip: string | null;
  carga_codigo: string | null;
  categoria: string;
  destinatario_nome: string | null;
  carga_valor_declarado: number | null;
  observacoes: string | null;
  remetente_nome: string | null;
};

export type SaveEncomendaDeclaracaoInput = {
  descricaoInformada?: string;
  valorDeclarado?: number;
  assinaturaUrl: string;
  assinaturaHash: string;
  dispositivo?: string;
  aceiteEm?: string;
};

export type TmsPaleteApi = {
  id: string;
  codigo: string;
  proprietario: "AJC" | "terceiro" | string;
  status: "livre" | "alocado" | "em_transito" | string;
  tipo_unitizacao: "MP" | "PD" | "PC" | null;
  estado_composicao: "vazio" | "parcial" | "completo";
  ativo: boolean;
  proprietario_nome: string;
  proprietario_tipo: "AJC" | "cliente" | "fornecedor" | string;
  proprietario_documento: string | null;
  cliente_proprietario_id: string | null;
  fornecedor_proprietario_id: string | null;
  local_operacional_id: string | null;
  local_nome: string | null;
  local_tipo: string | null;
  local_cidade_sigla: string | null;
  viagem_id: string | null;
  cidade_destino_sigla: string | null;
  viagem_codigo: string | null;
  documentos: number;
  cargas: number;
  volumes: number;
  ultima_conferencia_em: string | null;
};

export type CreateTmsPaleteInput = {
  proprietario: "AJC" | "terceiro";
  clienteProprietarioId?: string;
  fornecedorProprietarioId?: string;
  localOperacionalId: string;
  ativo?: boolean;
};

export type TmsPaleteOwnerApi = { chave: string; tipo: "AJC" | "cliente" | "fornecedor"; id: string | null; nome: string; documento: string | null };
export type TmsLocalOperacionalApi = { id: string; codigo: string; nome: string; tipo: "porto" | "patio" | "embarcacao" | "outro"; cidade_sigla: string | null; cidade_nome: string | null; embarcacao_id: string | null; embarcacao_nome: string | null; ativo: boolean };
export type TmsPaletesResponseApi = { items: TmsPaleteApi[]; paginacao: { pagina: number; porPagina: number; total: number; paginas: number } };

export type AllocateTmsPaleteInput = {
  viagemId: string;
  cidadeDestinoSigla: string;
  volumeIds?: string[];
  clientUuid?: string;
};

export type TmsEtiquetaApi = {
  id: string;
  volume_id: string | null;
  palete_id: string | null;
  conferencia_id: string | null;
  etiqueta_original_id: string | null;
  tipo: "impressao" | "reimpressao" | string;
  status: string;
  protocolo: string;
  printer_model: string | null;
  printer_mac: string | null;
  payload: Record<string, unknown>;
  solicitado_por: string | null;
  client_uuid: string | null;
  criado_em: string;
  volume_uuid: string;
  indice_volume: number;
  total_volumes: number;
  carga_codigo: string;
  cidade_destino_sigla: string;
  categoria: string;
  palete_codigo: string | null;
  solicitado_por_nome: string | null;
  alvo_tipo?: "palete" | "volume";
  alvo_codigo?: string;
  viagem_codigo?: string | null;
  justificativa?: string | null;
};
export type TmsEtiquetaTargetApi = { id:string;codigo:string;conferencia_id:string;viagem_id?:string;viagem_codigo:string;cidade_destino_sigla:string;possui_etiqueta:boolean;tipo_unitizacao?:"MP"|"PD"|"PC";estado_composicao?:string;status:string;local_nome?:string;documentos?:number;volumes?:number;indice_volume?:number;total_volumes?:number;carga_codigo?:string;cliente_nome?:string };

export type PrintTmsEtiquetaInput = {
  tipo?: "impressao" | "reimpressao";
  printerModel?: string;
  printerMac?: string;
  clientUuid?: string;
};

export type TmsConferenciaDocumentoApi = { id: string; tipo: string; numero: string | null; status: string; carga_id: string; carga_codigo: string; cidade_destino_sigla: string; tipo_unitizacao: string; cliente_codigo: string; cliente_nome: string; quantidade_declarada: number; quantidade_alocada: number; quantidade_restante: number };
export type TmsConferenciaVolumeApi = { uuid: string; status: "alocado" | "recebido"; indice: number; total: number };
export type TmsConferenciaItemApi = { id: string; documentoFiscalId: string; tipo: string; numero: string | null; cargaId: string; cargaCodigo: string; clienteNome: string; destino: string; quantidadeDeclarada: number; quantidadeInformada: number; quantidadeConferida: number; divergencia: boolean; justificativa: string | null; volumes: TmsConferenciaVolumeApi[] | null };
export type TmsConferenciaApi = { id: string; viagem_id: string; viagem_codigo: string; palete_id: string | null; palete_codigo: string | null; local_operacional_id: string; local_nome: string; tipo_unitizacao: "AVULSA" | "MP" | "PD" | "PC"; status: "aberta" | "fechada" | "divergente" | "cancelada"; estado_composicao: "parcial" | "completo" | null; conferente_nome: string; evidencias: Array<{url:string;hash:string;nome?:string;mime?:string}>; aberta_em: string; fechada_em: string | null; itens: TmsConferenciaItemApi[] };
export type TmsConferenciaResumoApi = { id: string; viagem_id: string; viagem_codigo: string; palete_id: string | null; palete_codigo: string | null; tipo_unitizacao: string; status: string; estado_composicao: string | null; local_nome: string; conferente_nome: string; documentos: number; volumes_informados: number; volumes_conferidos: number; aberta_em: string; fechada_em: string | null };

export type TmsPortariaApi = {
  id: string;
  placa: string | null;
  empresa: string;
  motorista_nome: string | null;
  tipo: string;
  entrada_em: string;
  saida_em: string | null;
  foto_url: string | null;
};

export type TmsEntregaApi = {
  id: string;
  protocolo: string | null;
  viagem_id: string | null;
  cidade_sigla: string;
  recebedor_nome: string | null;
  recebedor_doc: string | null;
  entregue_em: string;
  volumes: number;
};

export type PrestacaoContasItensApi = {
  caixaInicial?: number;
  receitasBordo?: Array<{ rotulo: string; especie: number; pix: number }>;
  cozinhaDias?: Array<{ dia: string; cafe: number; almoco: number; jantar: number }>;
  lanchonete?: { especie: number; pix: number };
  internet?: { especie: number; pix: number };
  passagensAgencias?: Array<{
    cidade: string;
    especie: number;
    pixConta: number;
    comissaoPct?: number;
  }>;
  fretesAgencias?: Array<{ cidade: string; especie: number; pixConta: number }>;
  despesas?: Array<{ descricao: string; valor: number }>;
  redondas?: Array<{ nome: string; funcao: string; valor: number }>;
  assinatura?: { local?: string; responsavel?: string };
  [key: string]: unknown;
};

export type PrestacaoContasApi = {
  id: string;
  viagem_id: string;
  gerente_id: string;
  gerente_nome: string;
  total_declarado: number | null;
  total_sistema: number | null;
  divergencia: number | null;
  status: "rascunho" | "enviada" | "conferida" | string;
  itens: PrestacaoContasItensApi | null;
  anexos: unknown[];
  criado_em: string;
  atualizado_em: string;
  viagem_codigo: string;
  data_hora_saida: string;
  data_hora_retorno: string | null;
  origem_sigla: string;
  destino_sigla: string | null;
  embarcacao_nome: string;
  passageiros: number;
  cargas: number;
  encomendas: number;
  veiculos: number;
};

export type CreateTmsPortariaInput = {
  placa?: string;
  empresa: string;
  motoristaNome?: string;
  tipo?: "veiculo_carga" | "veiculo_transporte" | "pessoa";
  fotoUrl?: string;
  clientUuid?: string;
};

export type CreateTmsEntregaInput = {
  viagemId?: string;
  cidadeSigla: string;
  volumeIds: string[];
  recebedorNome?: string;
  recebedorDoc?: string;
  recebedorAvulso?: boolean;
  justificativa?: string;
  assinaturaUrl?: string;
  assinaturaHash?: string;
  foto1Url?: string;
  foto2Url?: string;
  foto1Hash?: string;
  foto2Hash?: string;
  clientUuid?: string;
};

export type VeiculoEnvioApi = {
  id: string;
  codigo: string;
  tipo: "veiculo" | "maquina" | string;
  viagem_id: string | null;
  viagem_codigo?: string | null;
  origem_cadastro: string;
  status: string;
  placa: string | null;
  modelo: string;
  remetente_nome: string | null;
  remetente_documento: string | null;
  remetente_telefone: string | null;
  destinatario_nome: string | null;
  destinatario_documento: string | null;
  destinatario_telefone: string | null;
  cidade_origem_sigla: string | null;
  cidade_destino_sigla: string | null;
  valor_frete: string | number | null;
};

export type CreateVeiculoEnvioInput = {
  tipo: "veiculo" | "maquina";
  viagemId?: string;
  origemCadastro?: "pdv" | "comercial" | "gerente_porto";
  placa?: string;
  modelo: string;
  remetenteNome?: string;
  remetenteDocumento?: string;
  remetenteTelefone?: string;
  destinatarioNome?: string;
  destinatarioDocumento?: string;
  destinatarioTelefone?: string;
  cidadeOrigemSigla?: string;
  cidadeDestinoSigla?: string;
  valorFrete?: number;
  clientUuid?: string;
};

export function listTmsCargas(params?: { categoria?: "carga" | "encomenda" }) {
  const search = new URLSearchParams();
  if (params?.categoria) search.set("categoria", params.categoria);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<TmsCargaApi[]>(`/tms/cargas${suffix}`, { auth: true });
}

export function listTmsAgendamentoDisponibilidade(data: string) {
  return request<TmsAgendamentoSlotApi[]>(
    `/tms/agendamentos/disponibilidade?data=${encodeURIComponent(data)}`,
    { auth: true },
  );
}

export function createTmsCarga(input: CreateTmsCargaInput) {
  return request<TmsCargaApi>("/tms/cargas", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listEncomendas() {
  return request<TmsCargaApi[]>("/encomendas", { auth: true });
}

export function createEncomenda(input: CreateEncomendaInput) {
  return request<TmsCargaApi>("/encomendas", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listEncomendaDeclaracoes() {
  return request<EncomendaDeclaracaoApi[]>("/encomendas/declaracoes", { auth: true });
}

export function saveEncomendaDeclaracao(cargaId: string, input: SaveEncomendaDeclaracaoInput) {
  return request<EncomendaDeclaracaoApi>(`/encomendas/${cargaId}/declaracao-conteudo`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listTmsVolumes() {
  return request<TmsVolumeApi[]>("/tms/volumes", { auth: true });
}

function tmsControleQuery(params: TmsControleParams = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return search.toString() ? `?${search.toString()}` : "";
}

export function listTmsControleViagens(params: TmsControleParams = {}) {
  return request<TmsControleResponseApi>(`/tms/controle-viagens${tmsControleQuery(params)}`, { auth: true });
}

export function exportTmsControleViagens(params: Omit<TmsControleParams, "pagina" | "porPagina"> = {}) {
  return request<TmsControleResponseApi>(`/tms/controle-viagens/exportacao${tmsControleQuery(params)}`, { auth: true });
}

export function listTmsControleVolumes(viagemId: string, params: Pick<TmsControleParams, "busca" | "cidadeSigla" | "status" | "pagina" | "porPagina"> = {}) {
  return request<TmsControleVolumesResponseApi>(`/tms/controle-viagens/${viagemId}/volumes${tmsControleQuery(params)}`, { auth: true });
}

export function listTmsControleVolumeEventos(volumeId: string) {
  return request<{ volume: { id: string; uuid: string; carga_codigo: string | null }; items: TmsControleVolumeEventApi[]; limite: number }>(
    `/tms/controle-viagens/volumes/${volumeId}/eventos`,
    { auth: true },
  );
}

export function listTmsEtiquetas(data?: string) {
  return request<{ data: string; timezone: string; items: TmsEtiquetaApi[] }>(`/tms/etiquetas${data ? `?data=${encodeURIComponent(data)}` : ""}`, { auth: true });
}
export function listTmsEtiquetaTargets(tipo:"palete"|"volume",busca?:string){return request<TmsEtiquetaTargetApi[]>(`/tms/etiquetas-alvos?tipo=${tipo}${busca?`&busca=${encodeURIComponent(busca)}`:""}`,{auth:true});}

export function printTmsEtiqueta(volumeId: string, input: PrintTmsEtiquetaInput) {
  return request<TmsEtiquetaApi>(`/tms/volumes/${volumeId}/etiquetas`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function printTmsTargetEtiqueta(input: PrintTmsEtiquetaInput & { alvoTipo: "palete" | "volume"; alvoId: string; conferenciaId?: string; justificativa?: string; etiquetaOriginalId?: string }) {
  return request<TmsEtiquetaApi>("/tms/etiquetas", { method: "POST", auth: true, body: JSON.stringify(input) });
}

export function confirmTmsEtiqueta(id: string, sucesso: boolean, erro?: string) {
  return request<TmsEtiquetaApi>(`/tms/etiquetas/${id}/confirmacao`, { method: "POST", auth: true, body: JSON.stringify({ sucesso, erro }) });
}

export function listTmsDocumentos() {
  return request<TmsDocumentoApi[]>("/tms/documentos", { auth: true });
}

export function analyzeTmsDocumento(file: File) {
  const body = new FormData();
  body.append("arquivo", file);
  return request<TmsDocumentoAnaliseApi>("/tms/documentos/analisar", {
    method: "POST",
    auth: true,
    body,
  });
}

export function createTmsDocumento(input: CreateTmsDocumentoInput) {
  return request<TmsDocumentoApi>("/tms/documentos", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function conferirTmsDocumento(
  id: string,
  input: { status: "conferida" | "divergente"; observacao?: string; clientUuid?: string },
) {
  return request<TmsDocumentoApi>(`/tms/documentos/${id}/conferencia`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listTmsPaletes(params: { busca?: string; status?: string; proprietario?: string; localId?: string; pagina?: number; porPagina?: number } = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") search.set(key, String(value)); });
  return request<TmsPaletesResponseApi>(`/tms/paletes${search.size ? `?${search}` : ""}`, { auth: true });
}

export function createTmsPalete(input: CreateTmsPaleteInput) {
  return request<TmsPaleteApi>("/tms/paletes", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updateTmsPalete(id: string, input: CreateTmsPaleteInput) {
  return request<TmsPaleteApi>(`/tms/paletes/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(input) });
}

export function listTmsPaleteOwners() { return request<TmsPaleteOwnerApi[]>("/tms/paletes/proprietarios", { auth: true }); }
export function listTmsLocaisOperacionais(includeInactive = false) { return request<TmsLocalOperacionalApi[]>(`/tms/locais-operacionais${includeInactive ? "?incluirInativos=true" : ""}`, { auth: true }); }
export function createTmsLocalOperacional(input: Omit<TmsLocalOperacionalApi,"id"|"cidade_nome"|"embarcacao_nome">) { return request<TmsLocalOperacionalApi>("/tms/locais-operacionais", { method:"POST", auth:true, body:JSON.stringify({codigo:input.codigo,nome:input.nome,tipo:input.tipo,cidadeSigla:input.cidade_sigla,embarcacaoId:input.embarcacao_id,ativo:input.ativo}) }); }
export function updateTmsLocalOperacional(id:string,input:Omit<TmsLocalOperacionalApi,"id"|"cidade_nome"|"embarcacao_nome">) { return request<TmsLocalOperacionalApi>(`/tms/locais-operacionais/${id}`, { method:"PATCH", auth:true, body:JSON.stringify({codigo:input.codigo,nome:input.nome,tipo:input.tipo,cidadeSigla:input.cidade_sigla,embarcacaoId:input.embarcacao_id,ativo:input.ativo}) }); }

export function allocateTmsPalete(id: string, input: AllocateTmsPaleteInput) {
  return request<TmsPaleteApi>(`/tms/paletes/${id}/alocacoes`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function releaseTmsPalete(id: string, input: { localOperacionalId: string; motivo: string; clientUuid?: string }) {
  return request<TmsPaletesResponseApi>(`/tms/paletes/${id}/liberar`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listTmsConferenciaDocumentos(viagemId:string,busca?:string) { return request<TmsConferenciaDocumentoApi[]>(`/tms/conferencias/documentos-disponiveis?viagemId=${encodeURIComponent(viagemId)}${busca ? `&busca=${encodeURIComponent(busca)}` : ""}`, {auth:true}); }
export function listTmsConferencias(params:{viagemId?:string;status?:string;paleteId?:string}={}) { const q=new URLSearchParams(); if(params.viagemId)q.set("viagemId",params.viagemId);if(params.status)q.set("status",params.status);if(params.paleteId)q.set("paleteId",params.paleteId);return request<TmsConferenciaResumoApi[]>(`/tms/conferencias${q.size?`?${q}`:""}`,{auth:true}); }
export function getTmsConferencia(id:string) { return request<TmsConferenciaApi>(`/tms/conferencias/${id}`,{auth:true}); }
export function openTmsConferencia(input:{viagemId:string;paleteId?:string;localOperacionalId:string;cidadeDestinoSigla:string;tipoUnitizacao:"AVULSA"|"MP"|"PD"|"PC";clientUuid?:string}) { return request<TmsConferenciaApi>("/tms/conferencias",{method:"POST",auth:true,body:JSON.stringify(input)}); }
export function addTmsConferenciaItem(id:string,input:{documentoFiscalId:string;quantidadeInformada:number;justificativa?:string;clientUuid?:string}) { return request<TmsConferenciaApi>(`/tms/conferencias/${id}/itens`,{method:"POST",auth:true,body:JSON.stringify(input)}); }
export function scanTmsConferenciaVolume(id:string,input:{volumeUuid:string;clientUuid?:string}) { return request<TmsConferenciaApi>(`/tms/conferencias/${id}/volumes/receber`,{method:"POST",auth:true,body:JSON.stringify(input)}); }
export function closeTmsConferencia(id:string,input:{estadoComposicao?:"parcial"|"completo";evidencias?:Array<{url:string;hash:string;nome?:string;mime?:string}>;observacao?:string;clientUuid?:string}) { return request<TmsConferenciaApi>(`/tms/conferencias/${id}/fechar`,{method:"POST",auth:true,body:JSON.stringify(input)}); }
export async function uploadTmsConferenciaEvidencia(file:File) { const body=new FormData();body.append("arquivo",file);return request<{url:string;hash:string;nome:string;mime:string;bytes:number}>("/tms/conferencias/evidencias",{method:"POST",auth:true,body}); }

export function listTmsPortaria() {
  return request<TmsPortariaApi[]>("/tms/portaria", { auth: true });
}

export function listTmsEntregas() {
  return request<TmsEntregaApi[]>("/tms/entregas", { auth: true });
}

export function listTmsPrestacoes() {
  return request<PrestacaoContasApi[]>("/tms/prestacoes", { auth: true });
}

export function saveTmsPrestacao(input: {
  viagemId: string;
  totalDeclarado?: number;
  status?: "rascunho" | "enviada" | "conferida";
  itens?: PrestacaoContasItensApi;
  anexos?: unknown[];
}) {
  return request<PrestacaoContasApi>("/tms/prestacoes", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function createTmsPortaria(input: CreateTmsPortariaInput) {
  return request<TmsPortariaApi>("/tms/portaria", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function addTmsVolumeEvent(
  id: string,
  input: { tipo: string; obs?: string; clientUuid?: string },
) {
  return request<unknown>(`/tms/volumes/${id}/eventos`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function createTmsEntrega(input: CreateTmsEntregaInput) {
  return request<TmsEntregaApi>("/tms/entregas", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listVeiculosEnvios() {
  return request<VeiculoEnvioApi[]>("/veiculos", { auth: true });
}

export function createVeiculoEnvio(input: CreateVeiculoEnvioInput) {
  return request<VeiculoEnvioApi>("/veiculos", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export type BilheteApi = {
  id: string;
  codigo: string;
  qr_token: string;
  viagem_id: string;
  viagem_codigo: string;
  origem_sigla: string;
  destino_sigla: string | null;
  data_hora_saida: string;
  embarcacao_nome: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  passageiro_nome: string | null;
  passageiro_documento: string | null;
  classe: string;
  subtipo: string | null;
  tipo: "online" | "pdv" | "totem" | "contrato" | "cortesia" | "gratuidade" | string;
  canal: string | null;
  assento: string | null;
  preco_pago: number | null;
  status: "emitido" | "validado" | "usado" | "cancelado" | string;
  validado_em: string | null;
  criado_em: string;
  forma_pagamento: string | null;
};

export type CreateBilheteApiInput = {
  viagemId: string;
  clienteId?: string;
  passageiroNome?: string;
  passageiroDocumento?: string;
  classe: string;
  subtipo?: string;
  tipo?: "online" | "pdv" | "totem" | "contrato" | "cortesia" | "gratuidade";
  canal?: string;
  itemPrecoId?: string;
  precoPago?: number;
  assento?: string;
  caixaId?: string;
  formaPagamento?:
    | "dinheiro"
    | "pix"
    | "cartao_credito"
    | "cartao_debito"
    | "contrato"
    | "cortesia"
    | "gratuidade";
  cortesiaCodigo?: string;
  gratuidadeTipo?: "idoso" | "pcd" | "crianca" | "outro";
  documentoUrl?: string;
  observacoes?: string;
  emitirBpe?: boolean;
  clientUuid?: string;
};

export type CortesiaApi = {
  id: string;
  codigo: string;
  viagem_id: string;
  viagem_codigo: string;
  classe: string | null;
  motivo: string | null;
  observacoes: string | null;
  concedido_por_nome: string;
  criado_em: string;
  status: "usada" | "nao_usada" | string;
};

export type GratuidadeApi = {
  id: string;
  bilhete_id: string;
  bilhete_codigo: string;
  passageiro_nome: string | null;
  passageiro_documento: string | null;
  viagem_id: string;
  viagem_codigo: string;
  tipo_legal: string;
  documento_url: string | null;
  criado_em: string;
};

export type ManifestoApi = {
  viagemId: string;
  resumo: Record<string, { total: number; receita: number }>;
  bilhetes: BilheteApi[];
};

export type VendasResumoApi = {
  canais: Array<{
    id: string;
    canal: string;
    bilhetes: number;
    receita: number;
    online: boolean;
  }>;
  ocupacao: Array<{
    classe: string;
    capacidade: number;
    ocupados: number;
    receita: number;
  }>;
  agentes: Array<{
    id: string;
    nome: string;
    cidadeSigla: string;
    clientes: number;
    bilhetes: number;
    volumeMes: number;
    comissaoPct: number | null;
  }>;
};

export type ValidarBilheteApiResult = {
  resultado: "valido" | "ja_validado" | "bloqueado";
  bilhete: BilheteApi;
};

export type CaixaApi = {
  id: string;
  tipo: string;
  referencia: string | null;
  status: string;
  aberto_em: string;
  fechado_em: string | null;
  valor_abertura: number;
  valor_fechamento: number | null;
  operador_nome: string;
  entradas_dia: number;
  saidas_dia: number;
  saldo: number;
};

export type CaixaMovimentoApi = {
  id: string;
  caixa_id: string;
  tipo: string;
  forma_pagamento: string | null;
  valor: number;
  bilhete_id: string | null;
  carga_id: string | null;
  criado_por: string;
  client_uuid: string | null;
  criado_em: string;
  observacao: string | null;
  bilhete_codigo: string | null;
  carga_codigo: string | null;
};

export type FinanceiroTituloApi = {
  id: string;
  tipo: "receber" | "pagar";
  descricao: string;
  parte_nome: string;
  vencimento: string;
  valor: number;
  status: "aberto" | "vence_semana" | "vencida" | "pago" | "recebido" | "cancelado" | string;
  origem: string;
  observacao: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
  agente_id: string | null;
  caixa_movimento_id: string | null;
  carga_id: string | null;
  bilhete_id: string | null;
  cotacao_id: string | null;
  client_uuid: string | null;
  criado_em: string;
  atualizado_em: string | null;
  cliente_nome: string | null;
  fornecedor_nome: string | null;
  agente_nome: string | null;
  caixa_movimento_valor: number | null;
  carga_codigo: string | null;
  bilhete_codigo: string | null;
};

export type CreateFinanceiroTituloInput = {
  tipo: "receber" | "pagar";
  descricao: string;
  parteNome: string;
  vencimento: string;
  valor: number;
  status?: "aberto" | "vence_semana" | "vencida" | "pago" | "recebido" | "cancelado";
  origem?: string;
  observacao?: string;
  clienteId?: string;
  fornecedorId?: string;
  agenteId?: string;
  caixaMovimentoId?: string;
  cargaId?: string;
  bilheteId?: string;
  cotacaoId?: string;
  clientUuid?: string;
};

export type OperacaoAlertaApi = {
  id: string;
  titulo: string;
  detalhe: string;
  severidade: "info" | "warning" | "danger";
  status: "aberto" | "resolvido" | "cancelado" | string;
  origem: string;
  modulo: string | null;
  entidade: string | null;
  entidade_id: string | null;
  client_uuid: string | null;
  criado_por: string | null;
  resolvido_por: string | null;
  criado_em: string;
  resolvido_em: string | null;
  atualizado_em: string;
  criado_por_nome: string | null;
  resolvido_por_nome: string | null;
};

export type SaveOperacaoAlertaInput = {
  titulo: string;
  detalhe: string;
  severidade?: "info" | "warning" | "danger";
  modulo?: string | null;
  entidade?: string | null;
  entidadeId?: string | null;
  clientUuid?: string | null;
};

export type UpdateOperacaoAlertaInput = Partial<SaveOperacaoAlertaInput> & {
  status?: "aberto" | "resolvido" | "cancelado";
};

export type OperacaoRelatorioDiaApi = {
  data: string;
  geradoEm: string;
  periodo: { inicio: string; fim: string };
  viagens: {
    total: number;
    planejadas: number;
    emCurso: number;
    concluidas: number;
    canceladas: number;
    detalhe: Array<{
      id: string;
      codigo: string | null;
      embarcacaoNome: string;
      origemSigla: string;
      destinoSigla: string | null;
      dataHoraSaida: string;
      status: string;
      bilhetes: number;
      volumes: number;
      receita: number;
    }>;
  };
  vendas: {
    bilhetesEmitidos: number;
    bilhetesValidados: number;
    bilhetesCancelados: number;
    receita: number;
  };
  tms: {
    cargas: number;
    encomendas: number;
    volumes: number;
    pesoTotal: number;
    valorDeclarado: number;
  };
  caixa: {
    caixasAbertos: number;
    movimentos: number;
    entradas: number;
    saidas: number;
    saldoMovimentos: number;
  };
  alertas: {
    abertos: number;
    criticos: number;
    resolvidosDia: number;
  };
};

export function listBilhetes(params?: { viagemId?: string }) {
  const search = new URLSearchParams();
  if (params?.viagemId) search.set("viagemId", params.viagemId);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<BilheteApi[]>(`/vendas/bilhetes${suffix}`, { auth: true });
}

export function getVendasResumo() {
  return request<VendasResumoApi>("/vendas/resumo", { auth: true });
}

export function createBilhete(input: CreateBilheteApiInput) {
  return request<BilheteApi>("/vendas/bilhetes", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function validarBilhete(
  idOrQr: string,
  input?: { qrToken?: string; dispositivo?: string; clientUuid?: string; validadoEm?: string },
) {
  return request<ValidarBilheteApiResult>(
    `/vendas/bilhetes/${encodeURIComponent(idOrQr)}/validar`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(input ?? {}),
    },
  );
}

export function getManifesto(viagemId: string) {
  return request<ManifestoApi>(`/vendas/manifesto/${viagemId}`, { auth: true });
}

export function listCortesias(params?: { viagemId?: string }) {
  const search = new URLSearchParams();
  if (params?.viagemId) search.set("viagemId", params.viagemId);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<CortesiaApi[]>(`/vendas/cortesias${suffix}`, { auth: true });
}

export function createCortesia(input: {
  viagemId: string;
  classe?: string;
  motivo?: string;
  observacoes?: string;
  clientUuid?: string;
}) {
  return request<CortesiaApi>("/vendas/cortesias", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listGratuidades(params?: { viagemId?: string }) {
  const search = new URLSearchParams();
  if (params?.viagemId) search.set("viagemId", params.viagemId);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<GratuidadeApi[]>(`/vendas/gratuidades${suffix}`, { auth: true });
}

export function listCaixas() {
  return request<CaixaApi[]>("/caixa", { auth: true });
}

export function listCaixaMovimentos(caixaId: string) {
  return request<CaixaMovimentoApi[]>(`/caixa/${caixaId}/movimentos`, { auth: true });
}

export function abrirCaixa(input: { tipo?: string; referencia?: string; valorAbertura?: number }) {
  return request<CaixaApi>("/caixa/abrir", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listFinanceiroTitulos(params?: { tipo?: "receber" | "pagar" }) {
  const search = new URLSearchParams();
  if (params?.tipo) search.set("tipo", params.tipo);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<FinanceiroTituloApi[]>(`/caixa/titulos${suffix}`, { auth: true });
}

export function createFinanceiroTitulo(input: CreateFinanceiroTituloInput) {
  return request<FinanceiroTituloApi>("/caixa/titulos", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function listOperacaoAlertas(params?: { status?: "aberto" | "resolvido" | "cancelado" }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<OperacaoAlertaApi[]>(`/operacao/alertas${suffix}`, { auth: true });
}

export function getOperacaoRelatorioDia(params?: { data?: string }) {
  const search = new URLSearchParams();
  if (params?.data) search.set("data", params.data);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<OperacaoRelatorioDiaApi>(`/operacao/relatorio-dia${suffix}`, { auth: true });
}

export function createOperacaoAlerta(input: SaveOperacaoAlertaInput) {
  return request<OperacaoAlertaApi>("/operacao/alertas", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updateOperacaoAlerta(id: string, input: UpdateOperacaoAlertaInput) {
  return request<OperacaoAlertaApi>(`/operacao/alertas/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export type PortalClasseApi = {
  classe: string;
  label: string;
  capacidade: number;
  ocupados: number;
  restantes: number;
  preco: number;
};

export type PortalViagemApi = {
  id: string;
  codigo: string;
  origem: string;
  destino: string;
  embarcacao: string;
  saida: string;
  chegada: string | null;
  classes: PortalClasseApi[];
};

export type PortalPedidoApi = {
  id: string;
  codigo: string;
  status: string;
  valor_total: number;
  expira_em: string;
  viagem_codigo: string;
  origem_sigla: string;
  destino_sigla: string;
  data_hora_saida: string;
  embarcacao_nome: string;
  reservas: Array<{
    classe: string;
    subtipo?: string | null;
    assento?: string | null;
    quantidade: number;
    valor_unitario: number;
  }>;
  pagamentos: PortalPagamentoApi[];
  bilhetes: PortalBilheteApi[];
};

export type PortalPagamentoApi = {
  id: string;
  gateway_payment_id?: string;
  gatewayPaymentId?: string;
  metodo: "pix" | "cartao_credito" | "cartao_debito";
  status: string;
  valor: number;
  checkout?: {
    gatewayPaymentId: string;
    pixCopiaCola: string | null;
  };
};

export type PortalBilheteApi = {
  id: string;
  codigo: string;
  qr_token: string;
  passageiro_nome: string;
  passageiro_documento: string | null;
  classe: string;
  subtipo?: string | null;
  assento?: string | null;
  preco_pago: number | null;
  status: "emitido" | "validado" | "usado" | "cancelado" | string;
  origem_sigla?: string;
  destino_sigla?: string;
  data_hora_saida?: string;
  embarcacao_nome?: string;
};

export type PortalClienteInput = {
  nome?: string;
  documento?: string;
  email?: string;
  whatsapp?: string;
};

export function listPortalViagens(params: { origem: string; destino: string; data?: string }) {
  const search = new URLSearchParams();
  search.set("origem", params.origem);
  search.set("destino", params.destino);
  if (params.data) search.set("data", params.data);
  return request<PortalViagemApi[]>(`/portal/viagens?${search.toString()}`);
}

export function createPortalPedido(input: {
  viagemId: string;
  itens: Array<{ classe: string; quantidade: number; assento?: string | null }>;
  cliente: PortalClienteInput;
  termoAceito: boolean;
  clientUuid: string;
}) {
  return request<PortalPedidoApi>("/portal/pedidos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createPortalPagamento(
  codigo: string,
  metodo: "pix" | "cartao_credito" | "cartao_debito",
) {
  return request<PortalPagamentoApi>(`/portal/pedidos/${codigo}/pagamentos`, {
    method: "POST",
    body: JSON.stringify({ metodo }),
  });
}

export function approvePortalPagamentoStub(input: {
  pedidoCodigo: string;
  gatewayPaymentId?: string | null;
}) {
  return request<{ pedido: PortalPedidoApi }>("/portal/webhooks/stub", {
    method: "POST",
    body: JSON.stringify({
      eventId: `front-${input.pedidoCodigo}-${Date.now()}`,
      pedidoCodigo: input.pedidoCodigo,
      gatewayPaymentId: input.gatewayPaymentId ?? undefined,
      status: "aprovado",
    }),
  });
}

export function listClienteBilhetes(params: { documento?: string; email?: string }) {
  const search = new URLSearchParams();
  if (params.documento) search.set("documento", params.documento);
  if (params.email) search.set("email", params.email);
  return request<PortalBilheteApi[]>(`/portal/cliente/bilhetes?${search.toString()}`);
}
