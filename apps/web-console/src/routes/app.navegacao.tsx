import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Ship, Plus, CalendarRange, Send, AlertTriangle, Clock, X } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, StatusChip, ViagemStatusChip, ViagemSituacaoChip,
  DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton,
} from "@/components/ops/primitives";
import { ShimmerBar } from "@/components/ops/motion-bits";
import {
  AjcApiError,
  type EmbarcacaoApi,
  type NavegacaoEscalaColaboradorApi,
  type NavegacaoViagemApi,
  type RotaTemplateApi,
  createEmbarcacao,
  listEmbarcacoes,
  createNavegacaoViagem,
  updateEmbarcacao,
  updateNavegacaoViagem,
  listNavegacaoEscalasColaboradores,
  listNavegacaoTemplatesRotas,
  listNavegacaoViagens,
  notifyNavegacaoEscalas,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/app/navegacao")({
  head: () => ({ meta: [{ title: "Navegação · AJC Suite" }] }),
  component: Navegacao,
});

type Tab = "operacao" | "viagens" | "capacidade" | "escalas" | "embarcacoes";
type ViagemStatus = "planejada" | "em_curso" | "concluida" | "cancelada";
type ViagemSituacao = "no_prazo" | "atencao" | "atrasado";

type ViagemView = {
  id: string;
  codigo: string;
  embarcacaoId: string;
  embarcacaoNome: string;
  origem: string;
  destino: string;
  saida: string;
  retorno: string;
  status: ViagemStatus;
  situacao?: ViagemSituacao;
  ocupacaoPct: number;
  cargaPct: number;
  passageiros: number;
  volumes: number;
  escalas: Array<{ cidade: string; horaPrevista: string; horaReal?: string | null }>;
  capacidadePaxDisponivel: Record<string, unknown>;
};

type RotaView = {
  id: string;
  rotulo: string;
  origemSigla: string;
  destinoSigla: string;
  embarcacao: string;
  saida: string;
  paradas: string[];
};

/** Lista oficial de embarcações (Lucas, 30/jun) — substitui os nomes-fantasia do mock antigo. */
const FROTA_LUCAS = [
  "F/B Amazonas II",
  "F/B Amazonas III",
  "F/B Amazonas IV",
  "F/B Amazonas V",
  "F/B Amazonas VI",
  "F/B Paru (cargas)",
] as const;

/** Classes por embarcação (matriz do Lucas). Capacidade numérica real ainda pendente. */
const CLASSES_POR_EMBARCACAO: Record<string, string[]> = {
  "F/B Amazonas II": ["Rede", "Suíte Comum", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Amazonas III": ["Rede", "Suíte Comum", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Amazonas IV": ["Rede", "Suíte Comum", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Amazonas V": ["Rede", "Rede Sala VIP", "Camarote", "Suíte Comum", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Amazonas VI": ["Rede", "Suíte Comum", "Suíte Comum VIP", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Paru (cargas)": [],
};
const CLASSE_API_BY_LABEL: Record<string, string> = {
  "Rede": "rede",
  "Rede Sala VIP": "rede_sala_vip",
  "Rede VIP": "rede_sala_vip",
  "Camarote": "camarote",
  "SuÃ­te Comum": "suite_comum",
  "Suite Comum": "suite_comum",
  "SuÃ­te Comum VIP": "suite_comum_vip",
  "Suite Comum VIP": "suite_comum_vip",
  "SuÃ­te Master": "suite_master",
  "Suite Master": "suite_master",
  "SuÃ­te Master VIP": "suite_master_vip",
  "Suite Master VIP": "suite_master_vip",
  "Mega SuÃ­te": "mega_suite",
  "Mega Suite": "mega_suite",
};

/** Templates de cronograma/paradas do FAQ 2026 — alimentam o preenchimento automático das paradas. */
const CLASSES_FORM_EMBARCACAO = [
  "Rede",
  "Rede Sala VIP",
  "Camarote",
  "Suite Comum",
  "Suite Comum VIP",
  "Suite Master",
  "Suite Master VIP",
  "Mega Suite",
];

const ROTAS_FAQ: { id: string; rotulo: string; origemSigla: string; destinoSigla: string; embarcacao: string; saida: string; paradas: string[] }[] = [
  {
    id: "bel-alm", rotulo: "Belém → Almeirim", embarcacao: "F/B Amazonas V",
    origemSigla: "BEL", destinoSigla: "ALM",
    saida: "Terça · 17h/18h (validar)",
    paradas: ["Breves · qua 09h", "Gurupá · qua 20h", "Porto de Moz · qui 08h", "Almeirim · qui 14h (chegada)"],
  },
  {
    id: "bel-stm-qua", rotulo: "Belém → Santarém (quarta)", embarcacao: "F/B Amazonas VI",
    origemSigla: "BEL", destinoSigla: "STM",
    saida: "Quarta · 17h/18h (validar)",
    paradas: ["Breves · qui 09h", "Gurupá · qui 20h", "Almeirim · sex 09h", "Prainha · sex 17h", "Monte Alegre · sex 23h", "Santarém · sáb 10h/início tarde"],
  },
  {
    id: "bel-stm-sex", rotulo: "Belém → Santarém (sexta)", embarcacao: "F/B Amazonas IV",
    origemSigla: "BEL", destinoSigla: "STM",
    saida: "Sexta · 17h/18h (validar)",
    paradas: ["Breves · sáb 09h", "Gurupá · sáb 20h", "Almeirim · dom 09h", "Prainha · dom 17h", "Monte Alegre · dom 23h", "Santarém · seg 19h/início tarde"],
  },
  {
    id: "stm-bel-sab", rotulo: "Santarém → Belém (retorno sábado)", embarcacao: "F/B Amazonas VI",
    origemSigla: "STM", destinoSigla: "BEL",
    saida: "Sábado · 16h",
    paradas: ["Prainha · 00h (dia a validar)", "Almeirim · dom 08h", "Gurupá · dom 16h", "Breves · seg 02h", "Belém · seg 19h (chegada)"],
  },
];

function Navegacao() {
  const [tab, setTab] = useState<Tab>("operacao");
  const [showNovaViagem, setShowNovaViagem] = useState(false);
  const [showNovaEmbarcacao, setShowNovaEmbarcacao] = useState(false);
  const [viagemEditandoId, setViagemEditandoId] = useState<string | null>(null);
  const [embarcacaoEditandoId, setEmbarcacaoEditandoId] = useState<string | null>(null);
  const [showCalendario, setShowCalendario] = useState(false);
  const [rotaSel, setRotaSel] = useState(ROTAS_FAQ[1].id);
  const [salvandoViagem, setSalvandoViagem] = useState(false);
  const [viagemError, setViagemError] = useState<string | null>(null);
  const [embarcacaoError, setEmbarcacaoError] = useState<string | null>(null);
  const [salvandoEmbarcacao, setSalvandoEmbarcacao] = useState(false);
  const [notificandoEscalas, setNotificandoEscalas] = useState(false);
  const [escalaMensagem, setEscalaMensagem] = useState<string | null>(null);
  const [viagemForm, setViagemForm] = useState({
    embarcacaoId: "",
    dataHoraSaida: defaultDateTimeLocal(),
    dataHoraRetorno: "",
    status: "planejada" as ViagemStatus,
    situacao: "no_prazo" as ViagemSituacao,
    capacidade: {} as Record<string, string>,
  });
  const [embarcacaoForm, setEmbarcacaoForm] = useState({
    nome: "",
    tipo: "passeio_carga" as "passeio_carga" | "carga",
    status: "ativa" as "ativa" | "manutencao" | "alugada",
    capacidadeCarga: "",
    capacidadePax: {} as Record<string, string>,
  });
  const [viagensApi, setViagensApi] = useState<NavegacaoViagemApi[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<EmbarcacaoApi[]>([]);
  const [templatesApi, setTemplatesApi] = useState<RotaTemplateApi[]>([]);
  const [escalasColaboradores, setEscalasColaboradores] = useState<NavegacaoEscalaColaboradorApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([listNavegacaoViagens(), listEmbarcacoes(), listNavegacaoTemplatesRotas(), listNavegacaoEscalasColaboradores()])
      .then(([viagens, frota, templates, escalas]) => {
        if (!active) return;
        setViagensApi(viagens);
        setEmbarcacoes(frota);
        setTemplatesApi(Array.isArray(templates) ? templates : []);
        setEscalasColaboradores(escalas);
        setLoadError(null);
        if (templates[0]?.id) {
          setRotaSel((current) => (templates.some((template) => template.id === current) ? current : templates[0].id));
        }
        const rotaAtual = (Array.isArray(templates) && templates.length ? normalizeRotas(templates) : ROTAS_FAQ).find((template) => template.id === rotaSel) ?? ROTAS_FAQ[1];
        const embarcacaoDoTemplate = frota.find((e) => normalizeBoatName(e.nome) === normalizeBoatName(rotaAtual.embarcacao)) ?? frota[0];
        if (embarcacaoDoTemplate) {
          setViagemForm((prev) => ({ ...prev, embarcacaoId: prev.embarcacaoId || embarcacaoDoTemplate.id }));
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof AjcApiError ? err.message : "Nao foi possivel carregar a navegacao.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rotas = useMemo(() => normalizeRotas(templatesApi), [templatesApi]);
  const viagens = useMemo(() => viagensApi.map(mapViagemView), [viagensApi]);
  const rota = rotas.find((r) => r.id === rotaSel) ?? rotas[0] ?? ROTAS_FAQ[0];
  const embSel = rota.embarcacao;
  const embarcacaoTemplate = embarcacoes.find((e) => normalizeBoatName(e.nome) === normalizeBoatName(embSel));
  const embarcacaoSelecionada = embarcacoes.find((e) => e.id === viagemForm.embarcacaoId) ?? embarcacaoTemplate ?? embarcacoes[0];
  const classesEmb = classesFromCapacidade(embarcacaoSelecionada?.capacidadePax) ?? CLASSES_POR_EMBARCACAO[embarcacaoSelecionada?.nome ?? embSel] ?? CLASSES_POR_EMBARCACAO[embSel] ?? [];
  const ativas = embarcacoes.filter((e) => e.status === "ativa").length;
  const emCurso = viagens.filter((v) => v.status === "em_curso");
  const colaboradoresEscala = useMemo(
    () => escalasColaboradores.map((escala) => ({
      id: escala.colaboradorId,
      nome: escala.colaboradorNome,
      whatsapp: escala.colaboradorWhatsapp ?? "sem WhatsApp",
    })),
    [escalasColaboradores],
  );

  const tabs: [Tab, string][] = [
    ["operacao", "Painel operacional"],
    ["viagens", "Cronograma de viagens"],
    ["capacidade", "Capacidade & ocupação"],
    ["escalas", "Escala de colaboradores"],
    ["embarcacoes", "Embarcações"],
  ];

  function selecionarRota(id: string) {
    setRotaSel(id);
    const nextRota = rotas.find((r) => r.id === id);
    const embarcacaoDaRota = nextRota
      ? embarcacoes.find((e) => normalizeBoatName(e.nome) === normalizeBoatName(nextRota.embarcacao))
      : null;
    if (embarcacaoDaRota) {
      setViagemForm((prev) => ({ ...prev, embarcacaoId: embarcacaoDaRota.id }));
    }
  }

  function setCapacidadeClasse(label: string, value: string) {
    const key = classeKeyFromLabel(label);
    setViagemForm((prev) => ({ ...prev, capacidade: { ...prev.capacidade, [key]: value } }));
  }

  function abrirNovaViagem() {
    setViagemEditandoId(null);
    setViagemError(null);
    setViagemForm((prev) => ({
      ...prev,
      dataHoraSaida: defaultDateTimeLocal(),
      dataHoraRetorno: "",
      status: "planejada",
      situacao: "no_prazo",
      capacidade: {},
    }));
    setShowNovaViagem(true);
  }

  function abrirEditarViagem(row: ViagemView) {
    const original = viagensApi.find((viagem) => viagem.id === row.id);
    if (!original) return;
    setViagemEditandoId(original.id);
    setViagemError(null);
    setViagemForm({
      embarcacaoId: original.embarcacaoId,
      dataHoraSaida: toDateTimeLocalValue(new Date(original.dataHoraSaida)),
      dataHoraRetorno: original.dataHoraRetorno ? toDateTimeLocalValue(new Date(original.dataHoraRetorno)) : "",
      status: asViagemStatus(original.status),
      situacao: asViagemSituacao(original.situacao) ?? "no_prazo",
      capacidade: Object.fromEntries(Object.entries(original.capacidadePaxDisponivel ?? {}).map(([key, value]) => [key, String(value ?? "")])),
    });
    const matched = rotas.find((template) => template.origemSigla === original.origemSigla && template.destinoSigla === original.destinoSigla);
    if (matched) setRotaSel(matched.id);
    setShowNovaViagem(true);
  }

  function fecharViagemModal() {
    setShowNovaViagem(false);
    setViagemEditandoId(null);
    setViagemError(null);
  }

  function abrirNovaEmbarcacao() {
    setEmbarcacaoEditandoId(null);
    setEmbarcacaoError(null);
    setEmbarcacaoForm({
      nome: "",
      tipo: "passeio_carga",
      status: "ativa",
      capacidadeCarga: "",
      capacidadePax: {},
    });
    setShowNovaEmbarcacao(true);
  }

  function abrirEditarEmbarcacao(row: EmbarcacaoApi) {
    setEmbarcacaoEditandoId(row.id);
    setEmbarcacaoError(null);
    setEmbarcacaoForm({
      nome: row.nome,
      tipo: row.tipo === "carga" ? "carga" : "passeio_carga",
      status: row.status === "manutencao" || row.status === "alugada" ? row.status : "ativa",
      capacidadeCarga: row.capacidadeCarga === null || row.capacidadeCarga === undefined ? "" : String(row.capacidadeCarga),
      capacidadePax: Object.fromEntries(Object.entries(row.capacidadePax ?? {}).map(([key, value]) => [key, String(value ?? "")])),
    });
    setShowNovaEmbarcacao(true);
  }

  function fecharEmbarcacaoModal() {
    setShowNovaEmbarcacao(false);
    setEmbarcacaoEditandoId(null);
    setEmbarcacaoError(null);
  }

  function setEmbarcacaoCapacidade(label: string, value: string) {
    const key = classeKeyFromLabel(label);
    setEmbarcacaoForm((prev) => ({ ...prev, capacidadePax: { ...prev.capacidadePax, [key]: value } }));
  }

  async function salvarNovaViagem() {
    if (salvandoViagem) return;
    const embarcacao = embarcacaoSelecionada;
    if (!embarcacao) {
      setViagemError("Selecione uma embarcacao.");
      return;
    }
    if (!viagemForm.dataHoraSaida) {
      setViagemError("Informe a data e hora de saida.");
      return;
    }
    const capacidade = Object.fromEntries(
      Object.entries(viagemForm.capacidade)
        .map(([key, value]) => [key, Number(value)])
        .filter(([, value]) => Number.isFinite(value) && Number(value) > 0),
    );
    if (classesEmb.length > 0 && Object.keys(capacidade).length === 0) {
      setViagemError("Informe ao menos uma capacidade por classe.");
      return;
    }
    setSalvandoViagem(true);
    setViagemError(null);
    try {
      const payload = {
        embarcacaoId: embarcacao.id,
        origemSigla: rota.origemSigla,
        destinoSigla: rota.destinoSigla,
        dataHoraSaida: toIsoFromDateTimeLocal(viagemForm.dataHoraSaida),
        dataHoraRetorno: viagemForm.dataHoraRetorno ? toIsoFromDateTimeLocal(viagemForm.dataHoraRetorno) : null,
        capacidadePaxDisponivel: capacidade,
        status: viagemForm.status,
        situacao: viagemForm.situacao,
        observacoes: `Criada a partir do template FAQ: ${rota.rotulo}. Saida FAQ: ${rota.saida}`,
        escalas: rota.paradas.map((parada) => ({
          cidadeSigla: cidadeSiglaFromParada(parada) ?? rota.destinoSigla,
          observacao: parada,
        })),
      };
      const salva = viagemEditandoId
        ? await updateNavegacaoViagem(viagemEditandoId, payload)
        : await createNavegacaoViagem({ ...payload, dataHoraRetorno: payload.dataHoraRetorno ?? undefined, clientUuid: crypto.randomUUID() });
      setViagensApi((prev) => [salva, ...prev.filter((v) => v.id !== salva.id)]);
      fecharViagemModal();
      setTab("viagens");
      setViagemForm((prev) => ({ ...prev, capacidade: {} }));
    } catch (error) {
      console.error(error);
      setViagemError(error instanceof Error ? error.message : "Falha ao salvar viagem");
    } finally {
      setSalvandoViagem(false);
    }
  }

  async function notificarEscalasWhatsapp() {
    const escalaIds = escalasColaboradores
      .filter((escala) => !escala.conflito && escala.statusOriginal !== "confirmada" && escala.statusOriginal !== "cancelada")
      .map((escala) => escala.id);
    if (escalaIds.length === 0) {
      setEscalaMensagem("Nenhuma escala pendente para notificar.");
      return;
    }
    setNotificandoEscalas(true);
    setEscalaMensagem(null);
    try {
      await notifyNavegacaoEscalas({ escalaIds, clientUuid: crypto.randomUUID() });
      setEscalasColaboradores(await listNavegacaoEscalasColaboradores());
      setEscalaMensagem(`${escalaIds.length} escala(s) enfileirada(s) no stub WhatsApp. Provedor real segue pendente.`);
    } catch (error) {
      setEscalaMensagem(error instanceof Error ? error.message : "Nao foi possivel notificar as escalas.");
    } finally {
      setNotificandoEscalas(false);
    }
  }

  async function salvarNovaEmbarcacao() {
    if (salvandoEmbarcacao) return;
    const nome = embarcacaoForm.nome.trim();
    if (!nome) {
      setEmbarcacaoError("Informe o nome da embarcacao.");
      return;
    }
    const capacidadePax = Object.fromEntries(
      Object.entries(embarcacaoForm.capacidadePax)
        .map(([key, value]) => [key, Number(value)])
        .filter(([, value]) => Number.isFinite(value) && Number(value) > 0),
    );
    setSalvandoEmbarcacao(true);
    setEmbarcacaoError(null);
    try {
      const payload = {
        nome,
        tipo: embarcacaoForm.tipo,
        status: embarcacaoForm.status,
        capacidadeCarga: parseOptionalNumber(embarcacaoForm.capacidadeCarga),
        capacidadePax,
      };
      const salva = embarcacaoEditandoId
        ? await updateEmbarcacao(embarcacaoEditandoId, payload)
        : await createEmbarcacao(payload);
      setEmbarcacoes((prev) => [salva, ...prev.filter((item) => item.id !== salva.id)].sort((a, b) => a.nome.localeCompare(b.nome)));
      setViagemForm((prev) => ({ ...prev, embarcacaoId: prev.embarcacaoId || salva.id }));
      fecharEmbarcacaoModal();
      setTab("embarcacoes");
      setEmbarcacaoForm({
        nome: "",
        tipo: "passeio_carga",
        status: "ativa",
        capacidadeCarga: "",
        capacidadePax: {},
      });
    } catch (error) {
      console.error(error);
      setEmbarcacaoError(error instanceof Error ? error.message : "Falha ao salvar embarcacao");
    } finally {
      setSalvandoEmbarcacao(false);
    }
  }

  return (
    <AppShell crumb="Navegação">
      <SectionHeader
        eyebrow="Navegação-core"
        title="Frota e cronograma"
        description="Embarcações, viagens e cumprimento do cronograma. Tudo é vinculado a uma viagem."
        actions={
          <>
            <GhostButton icon={CalendarRange} onClick={() => setShowCalendario((v) => !v)}>Calendário</GhostButton>
            <PrimaryButton icon={Plus} onClick={abrirNovaViagem}>Nova viagem</PrimaryButton>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Embarcações ativas" value={`${ativas}/${embarcacoes.length}`} hint={loading ? "carregando frota" : "cadastros conectados"} icon={Ship} />
        <KPIStat index={1} label="Viagens em curso" value={String(emCurso.length)} hint={`${viagens.length} viagens no cronograma`} />
        <KPIStat index={2} label="Capacidade pax planejada" value={String(viagens.reduce((s, v) => s + v.passageiros, 0))} hint="soma das vagas por classe" delta={{ value: "API", positive: true }} />
        <KPIStat index={3} label="Volumes em trânsito" value={String(emCurso.reduce((s, v) => s + v.volumes, 0))} hint="TMS integra no proximo bloco" delta={{ value: "pendente", positive: true }} />
      </section>

      {loadError && (
        <div className="mt-4 rounded-lg border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-foreground">
          {loadError}
        </div>
      )}

      {(showNovaViagem || showCalendario) && (
        <section className={showNovaViagem ? "fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" : "mt-6 grid gap-4 xl:grid-cols-[1.1fr_1fr]"}>
          {showNovaViagem && (
            <div className="surface-card brand-rail brand-rail-left max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5 shadow-2xl">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-[color:var(--brand)]" />
                <h3 className="font-display text-lg">{viagemEditandoId ? "Editar viagem" : "Nova viagem"}</h3>
                <StatusChip tone="success">campos Lucas + FAQ 2026</StatusChip>
                <button className="ml-auto rounded-md p-2 text-muted-foreground transition-colors hover:bg-[color:var(--accent)] hover:text-foreground" onClick={fecharViagemModal} aria-label="Fechar">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Número gerado pelo sistema, FerryBoat em lista, saída, e paradas com preenchimento automático a partir do DOC FAQ. Camarotes/classes condicionais à embarcação.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MockField label="Numero da viagem (auto)" value="gerado pelo sistema" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">FerryBoat</p>
                  <select
                    value={embarcacaoSelecionada?.id ?? ""}
                    onChange={(event) => setViagemForm((prev) => ({ ...prev, embarcacaoId: event.target.value }))}
                    className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                  >
                    {embarcacoes.length
                      ? embarcacoes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)
                      : FROTA_LUCAS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Trecho / rota (DOC FAQ)</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {rotas.map((r) => (
                      <FilterChip key={r.id} active={r.id === rotaSel} onClick={() => selecionarRota(r.id)}>{r.rotulo}</FilterChip>
                    ))}
                  </div>
                </div>
                <label>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Data e hora da saida</p>
                  <input
                    type="datetime-local"
                    value={viagemForm.dataHoraSaida}
                    onChange={(event) => setViagemForm((prev) => ({ ...prev, dataHoraSaida: event.target.value }))}
                    className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                  />
                  <span className="mt-1 block text-[10px] text-muted-foreground">FAQ: {rota.saida}</span>
                </label>
                <label>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Data e hora do retorno</p>
                  <input
                    type="datetime-local"
                    value={viagemForm.dataHoraRetorno}
                    onChange={(event) => setViagemForm((prev) => ({ ...prev, dataHoraRetorno: event.target.value }))}
                    className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                  />
                </label>
                <label>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                  <select
                    value={viagemForm.status}
                    onChange={(event) => setViagemForm((prev) => ({ ...prev, status: event.target.value as ViagemStatus }))}
                    className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                  >
                    <option value="planejada">Planejada</option>
                    <option value="em_curso">Em curso</option>
                    <option value="concluida">Concluida</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </label>
                <label>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Situacao</p>
                  <select
                    value={viagemForm.situacao}
                    onChange={(event) => setViagemForm((prev) => ({ ...prev, situacao: event.target.value as ViagemSituacao }))}
                    className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                  >
                    <option value="no_prazo">No prazo</option>
                    <option value="atencao">Atencao</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </label>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Paradas (preenchidas automaticamente · DOC FAQ)</p>
                  <StatusChip tone="warning">horários do PDF a validar</StatusChip>
                </div>
                <ol className="mt-2 space-y-1.5">
                  {rota.paradas.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-lg bg-[color:var(--muted)] px-3 py-2 text-sm ring-1 ring-[color:var(--hairline)]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--brand)]/15 text-[10px] font-semibold text-[color:var(--brand)]">{i + 1}</span>
                      <span className="text-foreground">{p}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Capacidade disponivel por classe - {embarcacaoSelecionada?.nome ?? embSel}</p>
                {classesEmb.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">Embarcacao so de carga - sem classes de passageiro.</p>
                ) : (
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {classesEmb.map((classe) => {
                      const key = classeKeyFromLabel(classe);
                      return (
                        <label key={classe}>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{classe}</span>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={viagemForm.capacidade[key] ?? ""}
                            onChange={(event) => setCapacidadeClasse(classe, event.target.value)}
                            className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                            placeholder="0"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <PrimaryButton icon={Plus} onClick={salvarNovaViagem} disabled={salvandoViagem || !embarcacaoSelecionada}>
                  {salvandoViagem ? "Salvando..." : viagemEditandoId ? "Salvar viagem" : "Criar viagem"}
                </PrimaryButton>
                <GhostButton onClick={fecharViagemModal}>Cancelar</GhostButton>
                {viagemError && <span className="text-xs text-[color:var(--danger)]">{viagemError}</span>}
              </div>
            </div>
          )}

          {showCalendario && (
            <div className="surface-card p-5">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-[color:var(--brand)]" />
                <h3 className="font-display text-lg">Calendário operacional</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Visualização acionável do cronograma longo enquanto a regra final de calendário é definida.</p>
              <div className="mt-4 space-y-2">
                {viagens.slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
                    <Clock className="h-4 w-4 text-[color:var(--brand)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.codigo} · {v.origem} → {v.destino}</p>
                      <p className="text-[11px] text-muted-foreground">Saída {v.saida} · retorno {v.retorno}</p>
                    </div>
                    <ViagemStatusChip s={v.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {showNovaEmbarcacao && (
        <section className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="surface-card brand-rail brand-rail-left max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-lg">{embarcacaoEditandoId ? "Editar embarcação" : "Nova embarcação"}</h3>
              <StatusChip tone="success">cadastro real</StatusChip>
              <button className="ml-auto rounded-md p-2 text-muted-foreground transition-colors hover:bg-[color:var(--accent)] hover:text-foreground" onClick={fecharEmbarcacaoModal} aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Frota vem de `GET /api/cadastros/embarcacoes`. Alterações salvam no banco e atualizam capacidades usadas em Nova Viagem.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Nome</p>
                <input
                  value={embarcacaoForm.nome}
                  onChange={(event) => setEmbarcacaoForm((prev) => ({ ...prev, nome: event.target.value }))}
                  className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                  placeholder="F/B Amazonas VI"
                />
              </label>
              <label>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tipo</p>
                <select
                  value={embarcacaoForm.tipo}
                  onChange={(event) => setEmbarcacaoForm((prev) => ({ ...prev, tipo: event.target.value as "passeio_carga" | "carga" }))}
                  className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                >
                  <option value="passeio_carga">Passeio + carga</option>
                  <option value="carga">Somente carga</option>
                </select>
              </label>
              <label>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                <select
                  value={embarcacaoForm.status}
                  onChange={(event) => setEmbarcacaoForm((prev) => ({ ...prev, status: event.target.value as "ativa" | "manutencao" | "alugada" }))}
                  className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                >
                  <option value="ativa">Ativa</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="alugada">Alugada</option>
                </select>
              </label>
              <label>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Capacidade carga (t)</p>
                <input
                  value={embarcacaoForm.capacidadeCarga}
                  onChange={(event) => setEmbarcacaoForm((prev) => ({ ...prev, capacidadeCarga: event.target.value }))}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                  placeholder="0"
                />
              </label>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Capacidade por classe</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {CLASSES_FORM_EMBARCACAO.map((classe) => {
                  const key = classeKeyFromLabel(classe);
                  return (
                    <label key={classe}>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{classe}</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={embarcacaoForm.capacidadePax[key] ?? ""}
                        onChange={(event) => setEmbarcacaoCapacidade(classe, event.target.value)}
                        className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                        placeholder="0"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <PrimaryButton icon={Plus} onClick={salvarNovaEmbarcacao} disabled={salvandoEmbarcacao}>
                {salvandoEmbarcacao ? "Salvando..." : embarcacaoEditandoId ? "Salvar embarcação" : "Criar embarcação"}
              </PrimaryButton>
              <GhostButton onClick={fecharEmbarcacaoModal}>Cancelar</GhostButton>
              {embarcacaoError && <span className="text-xs text-[color:var(--danger)]">{embarcacaoError}</span>}
            </div>
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-[color:var(--hairline)]">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative -mb-px px-4 py-3 text-sm font-medium transition-colors ${
              tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-[2px] bg-[color:var(--brand)]" />}
          </button>
        ))}
      </div>

      {tab === "operacao" && (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="surface-card overflow-hidden">
            <header className="border-b border-[color:var(--hairline)] px-5 py-4">
              <h3 className="font-display text-lg text-foreground">Status × Situação · viagens em curso</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Status = ciclo. Situação = saúde do cronograma. Nunca colapsam no mesmo chip.</p>
            </header>
            <ul className="divide-y divide-[color:var(--hairline)]">
              {emCurso.map((v) => {
                const emb = embarcacoes.find((e) => e.id === v.embarcacaoId);
                return (
                  <li key={v.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm">
                          <span className="font-mono text-muted-foreground">{v.codigo}</span>{" "}
                          <span className="font-display text-foreground">{v.origem} → {v.destino}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{emb?.nome ?? v.embarcacaoNome}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Saída {v.saida} · Retorno {v.retorno}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ViagemStatusChip s={v.status} />
                        <ViagemSituacaoChip s={v.situacao} />
                      </div>
                    </div>
                    {/* Escalas */}
                    <ol className="mt-3 flex flex-wrap gap-2">
                      {v.escalas.map((e, i) => (
                        <li key={i} className={`rounded-md px-2.5 py-1.5 text-[11px] ring-1 ${
                          e.horaReal
                            ? "bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)] text-[color:var(--success)] ring-[color:color-mix(in_oklab,var(--success)_30%,transparent)]"
                            : "bg-[color:var(--muted)] text-muted-foreground ring-[color:var(--hairline)]"
                        }`}>
                          <span className="font-semibold">{e.cidade}</span>
                          <span className="ml-1 font-mono">{e.horaReal ?? e.horaPrevista}</span>
                          {!e.horaReal && <span className="ml-1 text-[10px] opacity-70">previsto</span>}
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="surface-card overflow-hidden">
            <header className="border-b border-[color:var(--hairline)] px-5 py-4">
              <h3 className="font-display text-lg text-foreground">Frota agora</h3>
            </header>
            <ul className="divide-y divide-[color:var(--hairline)]">
              {embarcacoes.map((e) => (
                <li key={e.id} onClick={() => abrirEditarEmbarcacao(e)} className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[color:color-mix(in_oklab,var(--brand)_5%,transparent)]">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.nome}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{e.tipo.replace("_", " + ")} · {lastTripLabel(viagens, e.id)}</p>
                  </div>
                  <StatusChip tone={e.status === "ativa" ? "success" : e.status === "manutencao" ? "warning" : "offline"}>
                    {e.status === "ativa" ? "Ativa" : e.status === "manutencao" ? "Manutenção" : "Alugada"}
                  </StatusChip>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "viagens" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar por código, embarcação, trecho…" right={<PrimaryButton icon={Plus} onClick={abrirNovaViagem}>Nova viagem</PrimaryButton>}>
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Em curso</FilterChip>
            <FilterChip>Planejadas</FilterChip>
            <FilterChip>Concluídas</FilterChip>
          </FilterBar>
          <DataTable
            rows={viagens}
            onRowClick={abrirEditarViagem}
            columns={[
              { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.codigo}</span> },
              { key: "trecho", header: "Trecho", render: (r) => <span className="font-display text-sm">{r.origem} → {r.destino}</span> },
              { key: "embarcacao", header: "Embarcação", render: (r) => r.embarcacaoNome },
              { key: "saida", header: "Saída", render: (r) => <span className="font-mono text-xs">{r.saida}</span> },
              { key: "retorno", header: "Retorno", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.retorno}</span> },
              { key: "status", header: "Status", render: (r) => <ViagemStatusChip s={r.status} /> },
              { key: "situacao", header: "Situação", render: (r) => r.situacao ? <ViagemSituacaoChip s={r.situacao} /> : <span className="text-xs text-muted-foreground">—</span> },
              { key: "ocupacao", header: "Ocupação", align: "right", render: (r) => <span className="font-mono">{r.ocupacaoPct}%</span> },
              { key: "carga", header: "Carga", align: "right", render: (r) => <span className="font-mono">{r.cargaPct}%</span> },
            ]}
          />
        </div>
      )}

      {tab === "capacidade" && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {embarcacoes.filter((e) => e.tipo !== "carga").map((e) => {
            const viagem = viagens.find((v) => v.embarcacaoId === e.id && v.status === "em_curso");
            const classes = capacityRows(e.capacidadePax);
            const ocup = viagem?.ocupacaoPct ?? 0;
            return (
              <div key={e.id} className="surface-card brand-rail brand-rail-left p-5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg text-foreground">{e.nome}</p>
                  <StatusChip tone={e.status === "ativa" ? "success" : e.status === "manutencao" ? "warning" : "offline"}>
                    {e.status === "ativa" ? "Ativa" : e.status === "manutencao" ? "Manutenção" : "Alugada"}
                  </StatusChip>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {viagem ? `${viagem.codigo} · ${viagem.origem} → ${viagem.destino}` : "Sem viagem em curso"}
                </p>
                <div className="mt-4 space-y-3">
                  {classes.map((c) => {
                    const pct = c.cap ? Math.min(100, Math.round((ocup / 100) * 100)) : 0;
                    const ocupados = Math.round((c.cap * ocup) / 100);
                    return (
                      <div key={c.label}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground/85">{c.label}</span>
                          <span className="font-mono text-muted-foreground">{ocupados}/{c.cap}</span>
                        </div>
                        <div className="mt-1.5"><ShimmerBar pct={viagem ? pct : 0} tone={c.tone} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[color:var(--hairline)] pt-3 text-xs">
                  <span className="text-muted-foreground">Carga</span>
                  <span className="font-mono text-foreground/85">{e.capacidadeCarga ?? "—"} t · {viagem?.cargaPct ?? 0}% usado</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "escalas" && (
        <div className="mt-5 space-y-4">
          <div className="surface-card brand-rail brand-rail-left flex flex-wrap items-start gap-3 p-4" style={{ background: "color-mix(in oklab, var(--danger) 7%, var(--card))" }}>
            <AlertTriangle className="mt-0.5 h-5 w-5 text-[color:var(--danger)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Regra de conflito de escala</p>
              <p className="mt-1 text-xs text-muted-foreground">Bloquear o mesmo colaborador no mesmo dia, horário ou período em duas embarcações/viagens diferentes.</p>
              <p className="mt-2 font-mono text-[11px] text-[color:var(--danger)]">Exemplo: João Nonato · 25/06 18:00-22:00 · V-0418 e V-0420</p>
            </div>
            <StatusChip tone="danger" pulse>bloqueante</StatusChip>
          </div>
          <FilterBar searchPlaceholder="Buscar colaborador, viagem, função…" right={<PrimaryButton icon={Send} disabled={notificandoEscalas} onClick={notificarEscalasWhatsapp}>{notificandoEscalas ? "Enfileirando..." : "Notificar via WhatsApp"}</PrimaryButton>}>
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Confirmadas</FilterChip>
            <FilterChip>Pendentes</FilterChip>
            <FilterChip>Conflitos</FilterChip>
          </FilterBar>
          <DataTable
            rows={escalasColaboradores}
            columns={[
              { key: "colaborador", header: "Colaborador", render: (r) => {
                const col = colaboradoresEscala.find((c) => c.id === r.colaboradorId);
                return (
                  <div>
                    <p className="font-medium">{col?.nome ?? "—"}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{col?.whatsapp}</p>
                  </div>
                );
              } },
              { key: "funcao", header: "Função", render: (r) => <span className="text-xs">{r.funcao}</span> },
              { key: "viagem", header: "Viagem", render: (r) => <span className="font-mono text-xs">{viagens.find((v) => v.id === r.viagemId)?.codigo ?? "—"}</span> },
              { key: "notificadoEm", header: "Notificado em", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.notificadoEm}</span> },
              { key: "status", header: "Status", render: (r) => {
                const tone = r.status === "confirmada" ? "success" : r.status === "notificada" ? "info" : r.status === "conflito" ? "danger" : "warning";
                return <StatusChip tone={tone as never} pulse={r.status === "conflito"}>{r.status}</StatusChip>;
              } },
            ]}
          />
          {escalaMensagem && <p className="text-center text-[11px] text-muted-foreground">{escalaMensagem}</p>}
          <p className="text-center text-[11px] text-muted-foreground">
            Escala notifica o colaborador via WhatsApp. Conflito (mesmo colaborador em duas viagens) bloqueia até resolução.
          </p>
        </div>
      )}

      {tab === "embarcacoes" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar embarcação…" right={<PrimaryButton icon={Plus} onClick={abrirNovaEmbarcacao}>Nova embarcação</PrimaryButton>}>
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Ativas</FilterChip>
            <FilterChip>Manutenção</FilterChip>
            <FilterChip>Alugadas</FilterChip>
          </FilterBar>
          <DataTable
            rows={embarcacoes}
            onRowClick={abrirEditarEmbarcacao}
            columns={[
              { key: "nome", header: "Embarcação", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "tipo", header: "Tipo", render: (r) => <span className="text-xs">{r.tipo === "carga" ? "Só carga" : "Passeio + carga"}</span> },
              { key: "capRede", header: "Rede", align: "right", render: (r) => capacityValue(r.capacidadePax, "rede") },
              { key: "capVip", header: "VIP", align: "right", render: (r) => capacityValue(r.capacidadePax, "rede_sala_vip") },
              { key: "capCamarote", header: "Camarote", align: "right", render: (r) => capacityValue(r.capacidadePax, "camarote") },
              { key: "capacidadeCarga", header: "Carga (t)", align: "right", render: (r) => r.capacidadeCarga ?? "—" },
              { key: "status", header: "Status", render: (r) => (
                <StatusChip tone={r.status === "ativa" ? "success" : r.status === "manutencao" ? "warning" : "offline"}>
                  {r.status === "ativa" ? "Ativa" : r.status === "manutencao" ? "Manutenção" : "Alugada"}
                </StatusChip>
              ) },
              { key: "ultimaViagem", header: "Última viagem", render: (r) => <span className="font-mono text-xs">{lastTripLabel(viagens, r.id)}</span> },
            ]}
          />
        </div>
      )}
    </AppShell>
  );
}

function mapViagemView(v: NavegacaoViagemApi): ViagemView {
  const capacidade = v.capacidadePaxDisponivel ?? {};
  const passageiros = Object.values(capacidade).reduce((sum, value) => sum + numericValue(value), 0);
  return {
    id: v.id,
    codigo: v.codigo ?? "sem-codigo",
    embarcacaoId: v.embarcacaoId,
    embarcacaoNome: v.embarcacaoNome,
    origem: v.origemSigla,
    destino: v.destinoSigla ?? v.escalas.at(-1)?.cidadeSigla ?? "—",
    saida: formatDateTime(v.dataHoraSaida),
    retorno: v.dataHoraRetorno ? formatDateTime(v.dataHoraRetorno) : "—",
    status: asViagemStatus(v.status),
    situacao: asViagemSituacao(v.situacao),
    ocupacaoPct: 0,
    cargaPct: 0,
    passageiros,
    volumes: 0,
    capacidadePaxDisponivel: capacidade,
    escalas: v.escalas.map((escala) => ({
      cidade: escala.cidadeSigla,
      horaPrevista: escala.dataHoraPrevista ? formatShortDateTime(escala.dataHoraPrevista) : "—",
      horaReal: escala.dataHoraReal ? formatShortDateTime(escala.dataHoraReal) : null,
    })),
  };
}

function normalizeRotas(templates: RotaTemplateApi[]): RotaView[] {
  if (!templates.length) return ROTAS_FAQ;
  return templates.map((template) => ({
    id: template.id,
    rotulo: template.rotulo ?? template.label ?? `${template.origemSigla ?? template.origem ?? "Origem"} → ${template.destinoSigla ?? template.destino ?? "Destino"}`,
    origemSigla: template.origemSigla ?? siglaFromLabel(template.origem) ?? "BEL",
    destinoSigla: template.destinoSigla ?? siglaFromLabel(template.destino) ?? "STM",
    embarcacao: template.embarcacaoNome ?? template.embarcacao ?? "F/B Amazonas VI",
    saida: template.saidaTexto ?? template.saida ?? "horario a validar",
    paradas: (template.paradas ?? []).map((parada) => {
      if (typeof parada === "string") return parada;
      const cidade = parada.cidadeSigla ?? parada.cidade ?? parada.label ?? "parada";
      const texto = parada.texto ?? parada.hora ?? parada.dataHoraPrevista ?? "";
      return texto ? `${cidade} · ${texto}` : cidade;
    }),
  }));
}

function defaultDateTimeLocal() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return toDateTimeLocalValue(date);
}

function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoFromDateTimeLocal(value: string) {
  return new Date(value).toISOString();
}

function classeKeyFromLabel(label: string) {
  const direct = CLASSE_API_BY_LABEL[label];
  if (direct) return direct;
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function siglaFromLabel(label?: string) {
  if (!label) return null;
  return cidadeSiglaFromParada(label);
}

function cidadeSiglaFromParada(label: string) {
  const normalized = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("belem")) return "BEL";
  if (normalized.includes("breves")) return "BRV";
  if (normalized.includes("gurupa")) return "GUR";
  if (normalized.includes("almeirim")) return "ALM";
  if (normalized.includes("porto de moz")) return "PMZ";
  if (normalized.includes("prainha")) return "PRA";
  if (normalized.includes("monte alegre")) return "MTA";
  if (normalized.includes("santarem")) return "STM";
  return null;
}

function capacityRows(capacidade: Record<string, unknown>) {
  const rows = Object.entries(capacidade)
    .filter(([, value]) => numericValue(value) > 0)
    .slice(0, 6)
    .map(([key, value], index) => ({
      label: labelClasse(key),
      cap: numericValue(value),
      tone: (index % 3 === 0 ? "brand" : index % 3 === 1 ? "warning" : "success") as "brand" | "warning" | "success",
    }));
  return rows.length ? rows : [{ label: "Sem classes cadastradas", cap: 0, tone: "brand" as const }];
}

function classesFromCapacidade(capacidade?: Record<string, unknown>) {
  if (!capacidade) return null;
  const classes = Object.entries(capacidade)
    .filter(([, value]) => numericValue(value) > 0)
    .map(([key]) => labelClasse(key));
  return classes.length ? classes : null;
}

function capacityValue(capacidade: Record<string, unknown>, key: string) {
  const value = numericValue(capacidade[key]);
  return value || "—";
}

function numericValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value) || 0;
  return 0;
}

function parseOptionalNumber(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function labelClasse(key: string) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace("Vip", "VIP");
}

function lastTripLabel(viagens: ViagemView[], embarcacaoId: string) {
  const viagem = viagens.find((v) => v.embarcacaoId === embarcacaoId);
  return viagem ? `${viagem.codigo} · ${viagem.origem} → ${viagem.destino}` : "Sem viagem vinculada";
}

function normalizeBoatName(value: string) {
  return value.toUpperCase().replace(/\s+/g, " ").trim();
}

function asViagemStatus(status: string): ViagemStatus {
  return ["planejada", "em_curso", "concluida", "cancelada"].includes(status) ? (status as ViagemStatus) : "planejada";
}

function asViagemSituacao(situacao: string | null): ViagemSituacao | undefined {
  return situacao && ["no_prazo", "atencao", "atrasado"].includes(situacao) ? (situacao as ViagemSituacao) : undefined;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MockField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="mt-1 flex min-h-10 items-center rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)]">
        {value}
      </div>
    </div>
  );
}
