import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Link2,
  PenLine,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Ship,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  DataTable,
  GhostButton,
  PrimaryButton,
  SectionHeader,
  StatusChip,
  ViagemSituacaoChip,
  ViagemStatusChip,
} from "@/components/ops/primitives";
import {
  AjcApiError,
  createEmbarcacao,
  createNavegacaoViagem,
  listCidades,
  listEmbarcacoes,
  listNavegacaoEscalasColaboradores,
  listNavegacaoTemplatesRotas,
  listNavegacaoViagens,
  notifyNavegacaoEscalas,
  transitionNavegacaoViagem,
  updateEmbarcacao,
  updateNavegacaoViagem,
  type CidadeApi,
  type EmbarcacaoApi,
  type NavegacaoEscalaColaboradorApi,
  type NavegacaoViagemApi,
  type RotaTemplateApi,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/app/navegacao")({
  head: () => ({ meta: [{ title: "Navegação · AJC Suite" }] }),
  component: Navegacao,
});

type Tab = "agenda" | "viagens" | "escalas" | "embarcacoes";
type TripAction = "iniciar" | "concluir" | "cancelar";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const STATUS_LABELS: Record<string, string> = {
  planejada: "Planejada",
  em_curso: "Em curso",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
const PASSENGER_CLASSES = [
  "rede",
  "rede_sala_vip",
  "camarote",
  "suite_comum",
  "suite_comum_vip",
  "suite_master",
  "suite_master_vip",
  "mega_suite",
];

function Navegacao() {
  const [tab, setTab] = useState<Tab>("agenda");
  const [viagens, setViagens] = useState<NavegacaoViagemApi[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<EmbarcacaoApi[]>([]);
  const [rotas, setRotas] = useState<RotaTemplateApi[]>([]);
  const [cidades, setCidades] = useState<CidadeApi[]>([]);
  const [escalas, setEscalas] = useState<NavegacaoEscalaColaboradorApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tripModal, setTripModal] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [boatModal, setBoatModal] = useState(false);
  const [editingBoatId, setEditingBoatId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [query, setQuery] = useState("");
  const [boatFilter, setBoatFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const results = await Promise.allSettled([
      listNavegacaoViagens(),
      listEmbarcacoes(),
      listNavegacaoTemplatesRotas(),
      listNavegacaoEscalasColaboradores(),
      listCidades(),
    ]);
    const failures: string[] = [];
    const apply = <T,>(index: number, setter: (value: T) => void) => {
      const result = results[index];
      if (result.status === "fulfilled") setter(result.value as T);
      else
        failures.push(
          result.reason instanceof Error ? result.reason.message : "Falha de carregamento",
        );
    };
    apply<NavegacaoViagemApi[]>(0, setViagens);
    apply<EmbarcacaoApi[]>(1, setEmbarcacoes);
    apply<RotaTemplateApi[]>(2, setRotas);
    apply<NavegacaoEscalaColaboradorApi[]>(3, setEscalas);
    apply<CidadeApi[]>(4, setCidades);
    setError(
      failures.length
        ? `Parte dos dados não carregou: ${[...new Set(failures)].join(" · ")}`
        : null,
    );
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  const selected = viagens.find((trip) => trip.id === selectedId) ?? null;
  const filteredTrips = useMemo(
    () =>
      viagens.filter((trip) => {
        const haystack =
          `${trip.codigo ?? ""} ${trip.embarcacaoNome} ${trip.origemSigla} ${trip.destinoSigla ?? ""}`.toLocaleLowerCase(
            "pt-BR",
          );
        return (
          (!query || haystack.includes(query.toLocaleLowerCase("pt-BR"))) &&
          (!boatFilter || trip.embarcacaoId === boatFilter) &&
          (!routeFilter || trip.rotaTemplateId === routeFilter) &&
          (!statusFilter || trip.status === statusFilter)
        );
      }),
    [viagens, query, boatFilter, routeFilter, statusFilter],
  );

  const activeBoats = embarcacoes.filter((boat) => boat.status === "ativa");
  const reviewRoutes = rotas.filter((route) => route.requerRevisao);

  async function runTransition(action: TripAction) {
    if (!selected || transitioning) return;
    if (action === "cancelar" && cancelReason.trim().length < 5) {
      setMessage("Informe o motivo do cancelamento com pelo menos 5 caracteres.");
      return;
    }
    setTransitioning(true);
    setMessage(null);
    try {
      const saved = await transitionNavegacaoViagem(selected.id, {
        acao: action,
        motivo: action === "cancelar" ? cancelReason : undefined,
        clientUuid: crypto.randomUUID(),
      });
      setViagens((current) => current.map((trip) => (trip.id === saved.id ? saved : trip)));
      setShowCancel(false);
      setCancelReason("");
    } catch (err) {
      setMessage(apiMessage(err));
    } finally {
      setTransitioning(false);
    }
  }

  async function notifyPendingScales() {
    const ids = escalas
      .filter(
        (scale) => !scale.conflito && !["confirmada", "cancelada"].includes(scale.statusOriginal),
      )
      .map((scale) => scale.id);
    if (!ids.length) {
      setMessage("Nenhuma escala pendente para notificar.");
      return;
    }
    setNotifying(true);
    try {
      await notifyNavegacaoEscalas({ escalaIds: ids, clientUuid: crypto.randomUUID() });
      setEscalas(await listNavegacaoEscalasColaboradores());
      setMessage(
        `${ids.length} escala(s) registrada(s) para envio. O provedor de WhatsApp continua identificado como stub.`,
      );
    } catch (err) {
      setMessage(apiMessage(err));
    } finally {
      setNotifying(false);
    }
  }

  const tabs: Array<[Tab, string]> = [
    ["agenda", "Agenda operacional"],
    ["viagens", "Viagens"],
    ["escalas", "Escalas"],
    ["embarcacoes", "Embarcações"],
  ];

  return (
    <AppShell crumb="Navegação">
      <SectionHeader
        eyebrow="Navegação-core"
        title="Agenda de viagens"
        description="Planejamento semanal, intertrechos e ciclo operacional com dados versionados."
        actions={
          <div className="flex gap-2">
            <GhostButton
              icon={Ship}
              onClick={() => {
                setEditingBoatId(null);
                setBoatModal(true);
              }}
            >
              Nova embarcação
            </GhostButton>
            <PrimaryButton
              icon={Plus}
              disabled={!rotas.length || !activeBoats.length}
              onClick={() => {
                setEditingTripId(null);
                setTripModal(true);
              }}
            >
              Nova viagem
            </PrimaryButton>
          </div>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-1 border-b border-[color:var(--hairline)]">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative -mb-px px-3 py-2.5 text-sm font-medium ${tab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
            {tab === key && (
              <span className="absolute inset-x-2 -bottom-px h-[2px] bg-[color:var(--brand)]" />
            )}
          </button>
        ))}
      </div>

      {(error || message) && (
        <div
          className={`mt-4 border-l-2 p-3 text-xs ${error ? "border-[color:var(--danger)] bg-[color:var(--danger)]/5" : "border-[color:var(--info)] bg-[color:var(--info)]/5"}`}
        >
          {error ?? message}
        </div>
      )}
      {!rotas.length && !loading && (
        <div className="mt-4 flex items-start gap-3 border-l-2 border-[color:var(--warning)] bg-[color:var(--warning)]/5 p-4">
          <AlertTriangle className="h-5 w-5 text-[color:var(--warning)]" />
          <div>
            <p className="text-sm font-medium">Programação operacional ainda não aplicada</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aplique a migration 0024 e revise as rotas em Cadastros → Configurações operacionais.
            </p>
          </div>
        </div>
      )}
      {reviewRoutes.length > 0 && (
        <div className="mt-4 flex items-start gap-3 border-l-2 border-[color:var(--warning)] bg-[color:var(--warning)]/5 p-4">
          <AlertTriangle className="h-5 w-5 text-[color:var(--warning)]" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {reviewRoutes.length} rota(s) aguardam confirmação do FAQ
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Continuam utilizáveis, mas a divergência está visível e deve ser encerrada no cadastro
              operacional.
            </p>
          </div>
          <StatusChip tone="warning">revisão pendente</StatusChip>
        </div>
      )}

      {(tab === "agenda" || tab === "viagens") && (
        <TripFilters
          query={query}
          setQuery={setQuery}
          boatFilter={boatFilter}
          setBoatFilter={setBoatFilter}
          routeFilter={routeFilter}
          setRouteFilter={setRouteFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          embarcacoes={embarcacoes}
          rotas={rotas}
        />
      )}

      {tab === "agenda" && (
        <div
          className={`mt-4 grid items-start gap-4 ${selected ? "xl:grid-cols-[minmax(0,1fr)_390px]" : "grid-cols-1"}`}
        >
          <WeeklyCalendar
            weekStart={weekStart}
            setWeekStart={setWeekStart}
            trips={filteredTrips}
            boats={embarcacoes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={loading}
          />
          {selected && (
            <TripDetail
              trip={selected}
              cities={cidades}
              linkedTrip={
                viagens.find(
                  (trip) =>
                    trip.id !== selected.id &&
                    trip.cicloUuid &&
                    trip.cicloUuid === selected.cicloUuid,
                ) ?? null
              }
              onClose={() => setSelectedId(null)}
              onEdit={() => {
                setEditingTripId(selected.id);
                setTripModal(true);
              }}
              onAction={(action) =>
                action === "cancelar" ? setShowCancel(true) : void runTransition(action)
              }
              transitioning={transitioning}
            />
          )}
        </div>
      )}

      {tab === "viagens" && (
        <div className="mt-4">
          <DataTable<NavegacaoViagemApi>
            rows={filteredTrips}
            onRowClick={(trip) => {
              setSelectedId(trip.id);
              setWeekStart(mondayOf(new Date(trip.dataHoraSaida)));
              setTab("agenda");
            }}
            columns={[
              {
                key: "codigo",
                header: "Viagem",
                render: (trip) => (
                  <div>
                    <p className="font-mono text-xs font-medium">{trip.codigo ?? "Sem código"}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {trip.origemSigla} → {trip.destinoSigla ?? "—"}
                    </p>
                  </div>
                ),
              },
              {
                key: "boat",
                header: "Embarcação",
                render: (trip) => <span className="text-xs">{trip.embarcacaoNome}</span>,
              },
              {
                key: "departure",
                header: "Saída",
                render: (trip) => (
                  <span className="font-mono text-xs">{formatDateTime(trip.dataHoraSaida)}</span>
                ),
              },
              {
                key: "arrival",
                header: "Chegada prevista",
                render: (trip) => (
                  <span className="font-mono text-xs text-muted-foreground">
                    {trip.dataHoraRetorno ? formatDateTime(trip.dataHoraRetorno) : "—"}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (trip) => <ViagemStatusChip s={asTripStatus(trip.status)} />,
              },
              {
                key: "situation",
                header: "Situação",
                render: (trip) =>
                  trip.situacao ? (
                    <ViagemSituacaoChip s={asTripSituation(trip.situacao)} />
                  ) : (
                    <span>—</span>
                  ),
              },
              {
                key: "version",
                header: "Programação",
                align: "right",
                render: (trip) => (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {trip.configVersao ? `v${trip.configVersao}` : "legado"}
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {tab === "escalas" && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-end">
            <PrimaryButton icon={Send} disabled={notifying} onClick={notifyPendingScales}>
              {notifying ? "Registrando…" : "Notificar pendentes"}
            </PrimaryButton>
          </div>
          <DataTable<NavegacaoEscalaColaboradorApi>
            rows={escalas}
            columns={[
              {
                key: "name",
                header: "Colaborador",
                render: (scale) => (
                  <div>
                    <p className="text-sm font-medium">{scale.colaboradorNome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {scale.colaboradorWhatsapp ?? "WhatsApp não cadastrado"}
                    </p>
                  </div>
                ),
              },
              {
                key: "role",
                header: "Função",
                render: (scale) => (
                  <span className="text-xs">
                    {scale.funcao ?? scale.colaboradorFuncaoBase ?? "—"}
                  </span>
                ),
              },
              {
                key: "trip",
                header: "Viagem",
                render: (scale) => (
                  <span className="font-mono text-xs">{scale.viagemCodigo ?? "Por período"}</span>
                ),
              },
              {
                key: "period",
                header: "Período",
                render: (scale) => (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {scale.dataHoraSaida
                      ? formatDateTime(scale.dataHoraSaida)
                      : scale.periodoInicio
                        ? formatDateTime(scale.periodoInicio)
                        : "—"}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (scale) => (
                  <StatusChip
                    tone={
                      scale.conflito
                        ? "danger"
                        : scale.status === "confirmada"
                          ? "success"
                          : "warning"
                    }
                  >
                    {scale.conflito ? "Conflito" : scale.status}
                  </StatusChip>
                ),
              },
            ]}
          />
        </div>
      )}

      {tab === "embarcacoes" && (
        <div className="mt-4">
          <DataTable<EmbarcacaoApi>
            rows={embarcacoes}
            onRowClick={(boat) => {
              setEditingBoatId(boat.id);
              setBoatModal(true);
            }}
            columns={[
              {
                key: "name",
                header: "Embarcação",
                render: (boat) => <span className="font-medium">{boat.nome}</span>,
              },
              {
                key: "type",
                header: "Tipo",
                render: (boat) => (
                  <span className="text-xs">
                    {boat.tipo === "carga" ? "Somente carga" : "Passageiros + carga"}
                  </span>
                ),
              },
              {
                key: "passengers",
                header: "Classes configuradas",
                render: (boat) => (
                  <span className="text-xs text-muted-foreground">
                    {boatClassSummary(boat.capacidadePax)}
                  </span>
                ),
              },
              {
                key: "cargo",
                header: "Capacidade de carga",
                align: "right",
                render: (boat) => (
                  <span className="font-mono text-xs">{boat.capacidadeCarga ?? "—"}</span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (boat) => (
                  <StatusChip
                    tone={
                      boat.status === "ativa"
                        ? "success"
                        : boat.status === "manutencao"
                          ? "warning"
                          : "offline"
                    }
                  >
                    {boat.status}
                  </StatusChip>
                ),
              },
              {
                key: "actions",
                header: "Ações",
                align: "right",
                render: (boat) => (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingBoatId(boat.id);
                      setBoatModal(true);
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-[color:var(--accent)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
                    aria-label={`Editar embarcação ${boat.nome}`}
                  >
                    <PenLine className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Editar
                  </button>
                ),
              },
            ]}
          />
        </div>
      )}

      {tripModal && (
        <TripFormModal
          trip={viagens.find((trip) => trip.id === editingTripId) ?? null}
          rotas={rotas}
          boats={activeBoats}
          trips={viagens}
          onClose={() => {
            setTripModal(false);
            setEditingTripId(null);
          }}
          onSaved={(saved, linked) => {
            setViagens((current) =>
              current
                .map((trip) =>
                  trip.id === linked?.id ? linked : trip.id === saved.id ? saved : trip,
                )
                .filter(
                  (trip, index, array) =>
                    array.findIndex((candidate) => candidate.id === trip.id) === index,
                )
                .concat(viagens.some((trip) => trip.id === saved.id) ? [] : [saved]),
            );
            setTripModal(false);
            setEditingTripId(null);
            setSelectedId(saved.id);
            setTab("agenda");
          }}
        />
      )}
      {boatModal && (
        <BoatFormModal
          boat={embarcacoes.find((boat) => boat.id === editingBoatId) ?? null}
          onClose={() => {
            setBoatModal(false);
            setEditingBoatId(null);
          }}
          onSaved={(saved) => {
            setEmbarcacoes((current) =>
              [...current.filter((boat) => boat.id !== saved.id), saved].sort((a, b) =>
                a.nome.localeCompare(b.nome),
              ),
            );
            setBoatModal(false);
            setEditingBoatId(null);
          }}
        />
      )}
      {showCancel && selected && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4">
          <div className="surface-card w-full max-w-lg p-6">
            <p className="font-display text-xl">Cancelar {selected.codigo}?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              O cancelamento fica na trilha de auditoria e libera a embarcação para outro
              planejamento.
            </p>
            <textarea
              autoFocus
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Motivo operacional obrigatório"
              className="mt-4 min-h-24 w-full rounded-lg bg-[color:var(--muted)] p-3 text-sm ring-1 ring-[color:var(--hairline)]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <GhostButton icon={X} onClick={() => setShowCancel(false)}>
                Voltar
              </GhostButton>
              <PrimaryButton
                icon={Trash2}
                disabled={transitioning}
                onClick={() => void runTransition("cancelar")}
              >
                Confirmar cancelamento
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function TripFilters(props: {
  query: string;
  setQuery: (value: string) => void;
  boatFilter: string;
  setBoatFilter: (value: string) => void;
  routeFilter: string;
  setRouteFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  embarcacoes: EmbarcacaoApi[];
  rotas: RotaTemplateApi[];
}) {
  return (
    <div className="mt-4 grid gap-2 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--card)] p-3 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,220px))]">
      <label className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={props.query}
          onChange={(e) => props.setQuery(e.target.value)}
          placeholder="Buscar viagem, trecho ou embarcação"
          className="h-10 w-full rounded-lg bg-[color:var(--muted)] pl-9 pr-3 text-sm ring-1 ring-[color:var(--hairline)]"
        />
      </label>
      <FilterSelect
        value={props.boatFilter}
        onChange={props.setBoatFilter}
        label="Todas as embarcações"
        options={props.embarcacoes.map((boat) => [boat.id, boat.nome])}
      />
      <FilterSelect
        value={props.routeFilter}
        onChange={props.setRouteFilter}
        label="Todas as rotas"
        options={props.rotas.map((route) => [route.id, route.nome])}
      />
      <FilterSelect
        value={props.statusFilter}
        onChange={props.setStatusFilter}
        label="Todos os status"
        options={Object.entries(STATUS_LABELS)}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: string[][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 min-w-0 rounded-lg bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]"
    >
      <option value="">{label}</option>
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  );
}

function WeeklyCalendar({
  weekStart,
  setWeekStart,
  trips,
  boats,
  selectedId,
  onSelect,
  loading,
}: {
  weekStart: Date;
  setWeekStart: (date: Date) => void;
  trips: NavegacaoViagemApi[];
  boats: EmbarcacaoApi[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = addDays(weekStart, 7);
  const rows = boats.filter((boat) =>
    trips.some((trip) => trip.embarcacaoId === boat.id && overlapsWeek(trip, weekStart, weekEnd)),
  );
  return (
    <section className="surface-card min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--hairline)] p-4">
        <div>
          <p className="text-sm font-medium">Semana operacional</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(days[0])} a {formatDate(days[6])}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <GhostButton icon={ArrowLeft} onClick={() => setWeekStart(addDays(weekStart, -7))}>
            Anterior
          </GhostButton>
          <GhostButton icon={RotateCcw} onClick={() => setWeekStart(mondayOf(new Date()))}>
            Hoje
          </GhostButton>
          <GhostButton icon={ArrowRight} onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Próxima
          </GhostButton>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[190px_repeat(7,minmax(100px,1fr))] border-b border-[color:var(--hairline)]">
            <div className="p-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Embarcação
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`border-l border-[color:var(--hairline)] p-3 text-center ${isSameDate(day, new Date()) ? "bg-[color:var(--brand)]/8" : ""}`}
              >
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {DAY_NAMES[day.getDay()]}
                </p>
                <p className="mt-1 font-mono text-sm">
                  {day.getDate().toString().padStart(2, "0")}/
                  {(day.getMonth() + 1).toString().padStart(2, "0")}
                </p>
              </div>
            ))}
          </div>
          {rows.map((boat) => (
            <div
              key={boat.id}
              className="grid min-h-24 grid-cols-[190px_minmax(0,1fr)] border-b border-[color:var(--hairline)] last:border-0"
            >
              <div className="p-4">
                <p className="text-sm font-medium">{boat.nome}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {boat.status} ·{" "}
                  {boat.tipo === "carga" ? "carga" : boatClassSummary(boat.capacidadePax)}
                </p>
              </div>
              <div className="relative grid grid-cols-7">
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`border-l border-[color:var(--hairline)] ${isSameDate(day, new Date()) ? "bg-[color:var(--brand)]/5" : ""}`}
                  />
                ))}
                {trips
                  .filter(
                    (trip) =>
                      trip.embarcacaoId === boat.id && overlapsWeek(trip, weekStart, weekEnd),
                  )
                  .map((trip, index) => {
                    const pos = calendarPosition(trip, weekStart, weekEnd);
                    return (
                      <button
                        key={trip.id}
                        onClick={() => onSelect(trip.id)}
                        style={{
                          left: `${pos.left}%`,
                          width: `${pos.width}%`,
                          top: `${12 + index * 38}px`,
                        }}
                        className={`absolute z-10 h-8 overflow-hidden border-l-2 px-2 text-left transition-all ${selectedId === trip.id ? "border-[color:var(--foreground)] bg-[color:var(--brand)] text-white" : tripTone(trip.status)}`}
                        title={`${trip.codigo} · ${trip.origemSigla} → ${trip.destinoSigla}`}
                      >
                        <span className="block truncate text-[11px] font-medium">
                          {trip.origemSigla} → {trip.destinoSigla} ·{" "}
                          {formatHour(trip.dataHoraSaida)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
          {!rows.length && (
            <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-muted-foreground">
              {loading
                ? "Carregando agenda…"
                : "Nenhuma viagem encontrada nesta semana com os filtros atuais."}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 border-t border-[color:var(--hairline)] px-4 py-3 text-[11px] text-muted-foreground">
        <Legend color="bg-[color:var(--info)]" label="Planejada" />
        <Legend color="bg-[color:var(--warning)]" label="Em curso" />
        <Legend color="bg-[color:var(--success)]" label="Concluída" />
        <Legend color="bg-muted-foreground" label="Cancelada" />
      </div>
    </section>
  );
}

function TripDetail({
  trip,
  cities,
  linkedTrip,
  onClose,
  onEdit,
  onAction,
  transitioning,
}: {
  trip: NavegacaoViagemApi;
  cities: CidadeApi[];
  linkedTrip: NavegacaoViagemApi | null;
  onClose: () => void;
  onEdit: () => void;
  onAction: (action: TripAction) => void;
  transitioning: boolean;
}) {
  const cityName = (sigla: string) => cities.find((city) => city.sigla === sigla)?.nome ?? sigla;
  return (
    <aside className="surface-card sticky top-4 overflow-hidden xl:max-h-[calc(100vh-130px)] xl:overflow-y-auto">
      <div className="border-b border-[color:var(--hairline)] bg-[color:var(--brand)]/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Viagem selecionada · {trip.codigo}
            </p>
            <h2 className="mt-2 font-display text-2xl">
              {cityName(trip.origemSigla)} <span className="text-muted-foreground">→</span>{" "}
              {cityName(trip.destinoSigla ?? "")}
            </h2>
          </div>
          <button aria-label="Fechar detalhe" onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <ViagemStatusChip s={asTripStatus(trip.status)} />
          {trip.situacao && <ViagemSituacaoChip s={asTripSituation(trip.situacao)} />}
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 border-b border-[color:var(--hairline)] pb-4">
          <Info label="Embarcação" value={trip.embarcacaoNome} />
          <Info
            label="Programação"
            value={trip.configVersao ? `Versão ${trip.configVersao}` : "Viagem legada"}
          />
          <Info label="Saída" value={formatDateTime(trip.dataHoraSaida)} />
          <Info
            label="Chegada prevista"
            value={trip.dataHoraRetorno ? formatDateTime(trip.dataHoraRetorno) : "—"}
          />
        </div>
        {linkedTrip && (
          <div className="mt-4 flex w-full items-center gap-3 border-l-2 border-[color:var(--info)] bg-[color:var(--info)]/5 p-3">
            <Link2 className="h-4 w-4 text-[color:var(--info)]" />
            <div className="flex-1">
              <p className="text-xs font-medium">Ciclo associado</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {linkedTrip.codigo} · {linkedTrip.origemSigla} → {linkedTrip.destinoSigla}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Roteiro detalhado
          </p>
          <div className="mt-4">
            <TimelinePoint
              city={cityName(trip.origemSigla)}
              label="Partida"
              planned={trip.dataHoraSaida}
              actual={null}
              first
            />
            {trip.escalas.map((stop, index) => (
              <TimelinePoint
                key={stop.id}
                city={cityName(stop.cidadeSigla)}
                label={index === trip.escalas.length - 1 ? "Chegada" : `Intertrecho ${index + 1}`}
                planned={stop.dataHoraPrevista}
                actual={stop.dataHoraReal}
                last={index === trip.escalas.length - 1}
              />
            ))}
          </div>
        </div>
        {trip.motivoCancelamento && (
          <div className="mt-4 border-l-2 border-[color:var(--danger)] p-3 text-xs">
            <p className="font-medium">Motivo do cancelamento</p>
            <p className="mt-1 text-muted-foreground">{trip.motivoCancelamento}</p>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[color:var(--hairline)] pt-4">
          {trip.status === "planejada" && (
            <>
              <GhostButton onClick={onEdit}>Editar</GhostButton>
              <PrimaryButton
                icon={Play}
                disabled={transitioning}
                onClick={() => onAction("iniciar")}
              >
                Iniciar viagem
              </PrimaryButton>
            </>
          )}
          {trip.status === "em_curso" && (
            <PrimaryButton
              icon={Check}
              disabled={transitioning}
              onClick={() => onAction("concluir")}
            >
              Concluir viagem
            </PrimaryButton>
          )}
          {["planejada", "em_curso"].includes(trip.status) && (
            <GhostButton
              icon={Trash2}
              disabled={transitioning}
              onClick={() => onAction("cancelar")}
            >
              Cancelar
            </GhostButton>
          )}
        </div>
      </div>
    </aside>
  );
}

function TripFormModal({
  trip,
  rotas,
  boats,
  trips,
  onClose,
  onSaved,
}: {
  trip: NavegacaoViagemApi | null;
  rotas: RotaTemplateApi[];
  boats: EmbarcacaoApi[];
  trips: NavegacaoViagemApi[];
  onClose: () => void;
  onSaved: (trip: NavegacaoViagemApi, linked?: NavegacaoViagemApi) => void;
}) {
  const initialRoute =
    rotas.find((route) => route.id === trip?.rotaTemplateId) ??
    rotas.find((route) => route.ativo) ??
    rotas[0];
  const [routeId, setRouteId] = useState(initialRoute?.id ?? "");
  const [boatId, setBoatId] = useState(
    trip?.embarcacaoId ?? initialRoute?.embarcacaoPadraoId ?? boats[0]?.id ?? "",
  );
  const [departure, setDeparture] = useState(() =>
    trip
      ? toLocalInput(trip.dataHoraSaida)
      : initialRoute
        ? toLocalInput(nextOccurrence(initialRoute))
        : "",
  );
  const [linkedId, setLinkedId] = useState("");
  const [notes, setNotes] = useState(trip?.observacoes ?? "");
  const [capacity, setCapacity] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(trip?.capacidadePaxDisponivel ?? {}).map(([key, value]) => [
        key,
        String(numericCapacity(value) || ""),
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const route = rotas.find((item) => item.id === routeId) ?? initialRoute;
  const boat = boats.find((item) => item.id === boatId);
  const classCaps = boat ? extractBoatCapacities(boat.capacidadePax) : {};
  const departureDate = departure ? new Date(departure) : null;
  const stops =
    route && departureDate && Number.isFinite(departureDate.getTime())
      ? route.paradas.map((stop) => ({
          ...stop,
          date: new Date(departureDate.getTime() + stop.offsetMinutos * 60_000),
        }))
      : [];
  const arrival = stops.at(-1)?.date ?? null;
  const possibleLinks = trips.filter(
    (candidate) =>
      candidate.id !== trip?.id &&
      candidate.configVersaoId &&
      candidate.rotaTemplateId &&
      candidate.origemSigla === route?.destinoSigla &&
      candidate.destinoSigla === route?.origemSigla &&
      candidate.status === "planejada",
  );

  function selectRoute(id: string) {
    const next = rotas.find((item) => item.id === id);
    setRouteId(id);
    if (!trip && next) {
      setDeparture(toLocalInput(nextOccurrence(next)));
      if (next.embarcacaoPadraoId) setBoatId(next.embarcacaoPadraoId);
    }
  }
  async function save() {
    if (!route || !boat || !departureDate || !arrival) {
      setError("Selecione rota, embarcação e saída válidas.");
      return;
    }
    const capabilities = Object.keys(classCaps);
    const selectedCapacity = Object.fromEntries(
      capabilities
        .map((key) => [key, Number(capacity[key] || classCaps[key])])
        .filter(([, value]) => Number(value) > 0),
    );
    const cycleUuid = linkedId
      ? (trips.find((candidate) => candidate.id === linkedId)?.cicloUuid ?? crypto.randomUUID())
      : (trip?.cicloUuid ?? undefined);
    setSaving(true);
    setError(null);
    try {
      const payload = {
        embarcacaoId: boat.id,
        origemSigla: route.origemSigla,
        destinoSigla: route.destinoSigla,
        dataHoraSaida: departureDate.toISOString(),
        dataHoraRetorno: arrival.toISOString(),
        capacidadePaxDisponivel: selectedCapacity,
        observacoes: notes || undefined,
        rotaTemplateId: route.id,
        configVersaoId: route.configVersaoId,
        cicloUuid: cycleUuid,
        escalas: stops.map((stop) => ({
          cidadeSigla: stop.cidadeSigla,
          dataHoraPrevista: stop.date.toISOString(),
        })),
      };
      const saved = trip
        ? await updateNavegacaoViagem(trip.id, payload)
        : await createNavegacaoViagem({ ...payload, clientUuid: crypto.randomUUID() });
      let linked: NavegacaoViagemApi | undefined;
      if (linkedId && cycleUuid) {
        linked = await updateNavegacaoViagem(linkedId, { cicloUuid: cycleUuid });
      }
      onSaved(saved, linked);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={trip ? `Editar ${trip.codigo}` : "Planejar nova viagem"}
      subtitle="A rota preenche os intertrechos e preserva a versão publicada."
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Rota e frequência" wide>
          <select value={routeId} onChange={(e) => selectRoute(e.target.value)}>
            {rotas
              .filter((item) => item.ativo || item.id === trip?.rotaTemplateId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} · {DAY_NAMES[item.diaSemana]} {item.horaSaida}
                  {item.requerRevisao ? " · revisar" : ""}
                </option>
              ))}
          </select>
        </FormField>
        <FormField label="Embarcação">
          <select value={boatId} onChange={(e) => setBoatId(e.target.value)}>
            {boats.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Data e hora de saída">
          <input
            type="datetime-local"
            value={departure}
            onChange={(e) => setDeparture(e.target.value)}
          />
        </FormField>
        <FormField label="Chegada prevista">
          <input
            readOnly
            value={arrival ? formatDateTime(arrival.toISOString()) : "Calculada pelos intertrechos"}
          />
        </FormField>
        <FormField label="Vincular retorno ao ciclo" wide>
          <select value={linkedId} onChange={(e) => setLinkedId(e.target.value)}>
            <option value="">Sem vínculo por enquanto</option>
            {possibleLinks.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.codigo} · {candidate.origemSigla} → {candidate.destinoSigla} ·{" "}
                {formatDateTime(candidate.dataHoraSaida)}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Intertrechos calculados
          </p>
          <div className="mt-3 space-y-2">
            {stops.map((stop, index) => (
              <div
                key={`${stop.cidadeSigla}-${index}`}
                className="flex items-center justify-between border-b border-[color:var(--hairline)] py-2 text-xs"
              >
                <span>
                  {String(index + 1).padStart(2, "0")} · {stop.cidadeSigla}
                </span>
                <span className="font-mono text-muted-foreground">
                  {formatDateTime(stop.date.toISOString())}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Capacidade desta viagem
          </p>
          <div className="mt-3 space-y-2">
            {Object.entries(classCaps).map(([key, max]) => (
              <label key={key} className="flex items-center justify-between gap-3 text-xs">
                <span>
                  {classLabel(key)}{" "}
                  <span className="text-muted-foreground">
                    · {max > 0 ? `máximo ${max}` : "não informada no cadastro"}
                  </span>
                </span>
                <input
                  type="number"
                  min={0}
                  max={max || undefined}
                  value={capacity[key] ?? (max > 0 ? String(max) : "")}
                  placeholder="informar"
                  onChange={(e) =>
                    setCapacity((current) => ({ ...current, [key]: e.target.value }))
                  }
                  className="h-9 w-24 rounded-lg bg-[color:var(--muted)] px-2 text-right font-mono ring-1 ring-[color:var(--hairline)]"
                />
              </label>
            ))}
            {!Object.keys(classCaps).length && (
              <p className="text-xs text-muted-foreground">
                Esta embarcação não possui capacidade de passageiros cadastrada.
              </p>
            )}
          </div>
        </div>
      </div>
      <FormField label="Observações" wide>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" />
      </FormField>
      {error && <p className="mt-3 text-xs text-[color:var(--danger)]">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <GhostButton icon={X} onClick={onClose}>
          Cancelar
        </GhostButton>
        <PrimaryButton icon={Check} disabled={saving} onClick={() => void save()}>
          {saving ? "Salvando…" : trip ? "Salvar alterações" : "Criar viagem"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function BoatFormModal({
  boat,
  onClose,
  onSaved,
}: {
  boat: EmbarcacaoApi | null;
  onClose: () => void;
  onSaved: (boat: EmbarcacaoApi) => void;
}) {
  const [name, setName] = useState(boat?.nome ?? "");
  const [type, setType] = useState<"passeio_carga" | "carga">(
    boat?.tipo === "carga" ? "carga" : "passeio_carga",
  );
  const [status, setStatus] = useState<"ativa" | "manutencao" | "alugada">(
    boat?.status === "manutencao" || boat?.status === "alugada" ? boat.status : "ativa",
  );
  const [cargo, setCargo] = useState(
    boat?.capacidadeCarga == null ? "" : String(boat.capacidadeCarga),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialClassData = extractBoatClassSettings(boat?.capacidadePax ?? {});
  const [classSettings, setClassSettings] = useState<
    Record<string, { supported: boolean; capacity: string }>
  >(() =>
    Object.fromEntries(
      PASSENGER_CLASSES.map((key) => [
        key,
        {
          supported: initialClassData[key]?.supported ?? false,
          capacity: initialClassData[key]?.capacity ? String(initialClassData[key].capacity) : "",
        },
      ]),
    ),
  );
  async function saveBoat() {
    if (!name.trim()) {
      setError("Informe o nome da embarcação.");
      return;
    }
    setSaving(true);
    try {
      const classes = PASSENGER_CLASSES.filter((key) => classSettings[key].supported);
      const capacidadePorClasse = Object.fromEntries(
        classes.map((key) => [
          key,
          {
            supported: true,
            capacidade: classSettings[key].capacity ? Number(classSettings[key].capacity) : null,
          },
        ]),
      );
      const payload = {
        nome: name.trim(),
        tipo: type,
        status,
        capacidadeCarga: cargo ? Number(cargo.replace(",", ".")) : null,
        capacidadePax: { classes, capacidadePorClasse },
      };
      const saved = boat
        ? await updateEmbarcacao(boat.id, payload)
        : await createEmbarcacao(payload);
      onSaved(saved);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={boat ? "Editar embarcação" : "Nova embarcação"}
      subtitle="Cadastro mestre usado pelo planejamento e bloqueios de agenda."
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Nome" wide>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Tipo">
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="passeio_carga">Passageiros + carga</option>
            <option value="carga">Somente carga</option>
          </select>
        </FormField>
        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="ativa">Ativa</option>
            <option value="manutencao">Manutenção</option>
            <option value="alugada">Alugada</option>
          </select>
        </FormField>
        <FormField label="Capacidade de carga">
          <input inputMode="decimal" value={cargo} onChange={(e) => setCargo(e.target.value)} />
        </FormField>
      </div>
      {type !== "carga" && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Classes e capacidade de passageiros
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Informe lugares de rede ou unidades comerciais de camarote e suíte disponíveis nesta
            embarcação.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {PASSENGER_CLASSES.map((key) => (
              <div
                key={key}
                className="flex items-center gap-3 border-b border-[color:var(--hairline)] py-2"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={classSettings[key].supported}
                    onChange={(e) =>
                      setClassSettings((current) => ({
                        ...current,
                        [key]: { ...current[key], supported: e.target.checked },
                      }))
                    }
                  />
                  <span>{classLabel(key)}</span>
                </label>
                <input
                  aria-label={`Capacidade ${classLabel(key)}`}
                  disabled={!classSettings[key].supported}
                  type="number"
                  min={0}
                  value={classSettings[key].capacity}
                  onChange={(e) =>
                    setClassSettings((current) => ({
                      ...current,
                      [key]: { ...current[key], capacity: e.target.value },
                    }))
                  }
                  placeholder="não informada"
                  className="h-9 w-32 rounded-lg bg-[color:var(--muted)] px-2 text-right text-xs ring-1 ring-[color:var(--hairline)] disabled:opacity-40"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-xs text-[color:var(--danger)]">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <GhostButton icon={X} onClick={onClose}>
          Cancelar
        </GhostButton>
        <PrimaryButton icon={Check} disabled={saving} onClick={() => void saveBoat()}>
          {saving ? "Salvando…" : "Salvar embarcação"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-black/75 p-4">
      <section className="surface-card max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--hairline)] pb-4">
          <div>
            <h2 className="font-display text-2xl">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <button aria-label="Fechar" onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}
function FormField({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`${wide ? "md:col-span-2" : ""} block`}>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="[&_input]:h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:bg-[color:var(--muted)] [&_input]:px-3 [&_input]:text-sm [&_input]:ring-1 [&_input]:ring-[color:var(--hairline)] [&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:bg-[color:var(--muted)] [&_select]:px-3 [&_select]:text-sm [&_select]:ring-1 [&_select]:ring-[color:var(--hairline)] [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:bg-[color:var(--muted)] [&_textarea]:p-3 [&_textarea]:text-sm [&_textarea]:ring-1 [&_textarea]:ring-[color:var(--hairline)]">
        {children}
      </div>
    </label>
  );
}
function TimelinePoint({
  city,
  label,
  planned,
  actual,
  first,
  last,
}: {
  city: string;
  label: string;
  planned: string | null;
  actual: string | null;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative grid grid-cols-[20px_1fr_auto] gap-3 pb-5 last:pb-0">
      <div className="relative flex justify-center">
        <span
          className={`mt-1 h-3 w-3 rounded-full border-2 ${actual ? "border-[color:var(--success)] bg-[color:var(--success)]/30" : "border-[color:var(--warning)] bg-[color:var(--card)]"}`}
        />
        {!last && (
          <span className="absolute left-1/2 top-4 h-[calc(100%_-_8px)] w-px -translate-x-1/2 bg-[color:var(--hairline)]" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{city}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{first ? "Origem" : label}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[11px]">{planned ? formatDateTime(planned) : "—"}</p>
        <p
          className={`mt-0.5 font-mono text-[11px] ${actual ? "text-[color:var(--success)]" : "text-muted-foreground"}`}
        >
          {actual ? `Real ${formatDateTime(actual)}` : "Real —"}
        </p>
      </div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-medium">{value}</p>
    </div>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function mondayOf(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}
function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function overlapsWeek(trip: NavegacaoViagemApi, start: Date, end: Date) {
  const departure = new Date(trip.dataHoraSaida).getTime();
  const arrival = new Date(trip.dataHoraRetorno ?? trip.dataHoraSaida).getTime();
  return departure < end.getTime() && arrival >= start.getTime();
}
function calendarPosition(trip: NavegacaoViagemApi, start: Date, end: Date) {
  const total = end.getTime() - start.getTime();
  const from = Math.max(start.getTime(), new Date(trip.dataHoraSaida).getTime());
  const to = Math.min(
    end.getTime(),
    new Date(trip.dataHoraRetorno ?? trip.dataHoraSaida).getTime(),
  );
  return {
    left: Math.max(0, ((from - start.getTime()) / total) * 100),
    width: Math.max(3, ((Math.max(to, from + 3_600_000) - from) / total) * 100),
  };
}
function nextOccurrence(route: RotaTemplateApi) {
  const date = new Date();
  const [hours, minutes] = route.horaSaida.split(":").map(Number);
  const delta = (route.diaSemana - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  date.setHours(hours, minutes, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 7);
  return date;
}
function toLocalInput(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}
function tripTone(status: string) {
  if (status === "em_curso")
    return "border-[color:var(--warning)] bg-[color:var(--warning)]/20 text-foreground";
  if (status === "concluida")
    return "border-[color:var(--success)] bg-[color:var(--success)]/15 text-foreground";
  if (status === "cancelada")
    return "border-muted-foreground bg-[color:var(--muted)] text-muted-foreground line-through";
  return "border-[color:var(--info)] bg-[color:var(--info)]/15 text-foreground";
}
function extractBoatCapacities(raw: Record<string, unknown>) {
  const source =
    raw.capacidadePorClasse && typeof raw.capacidadePorClasse === "object"
      ? (raw.capacidadePorClasse as Record<string, unknown>)
      : raw;
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(source)) {
    const numeric = numericCapacity(value);
    const supported =
      value && typeof value === "object" && "supported" in value
        ? Boolean((value as { supported?: unknown }).supported)
        : numeric > 0;
    if (supported) result[key] = numeric;
  }
  return result;
}
function extractBoatClassSettings(raw: Record<string, unknown>) {
  const source =
    raw.capacidadePorClasse && typeof raw.capacidadePorClasse === "object"
      ? (raw.capacidadePorClasse as Record<string, unknown>)
      : raw;
  const declared = new Set(
    Array.isArray(raw.classes)
      ? raw.classes.filter((value): value is string => typeof value === "string")
      : [],
  );
  const result: Record<string, { supported: boolean; capacity: number }> = {};
  for (const key of PASSENGER_CLASSES) {
    const value = source[key];
    const supported =
      declared.has(key) ||
      Boolean(value && typeof value === "object" && (value as { supported?: unknown }).supported) ||
      numericCapacity(value) > 0;
    result[key] = { supported, capacity: numericCapacity(value) };
  }
  return result;
}
function numericCapacity(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value === "object") {
    const data = value as Record<string, unknown>;
    return numericCapacity(data.capacidade ?? data.valor);
  }
  return 0;
}
function boatClassSummary(raw: Record<string, unknown>) {
  const classes = Object.keys(extractBoatCapacities(raw));
  if (!classes.length && Array.isArray(raw.classes)) return `${raw.classes.length} classe(s)`;
  return classes.length
    ? classes.map(classLabel).slice(0, 3).join(", ") +
        (classes.length > 3 ? ` +${classes.length - 3}` : "")
    : "Sem classes de passageiros";
}
function classLabel(key: string) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace("Vip", "VIP");
}
function asTripStatus(value: string): "planejada" | "em_curso" | "concluida" | "cancelada" {
  return ["planejada", "em_curso", "concluida", "cancelada"].includes(value)
    ? (value as "planejada" | "em_curso" | "concluida" | "cancelada")
    : "planejada";
}
function asTripSituation(value: string): "no_prazo" | "atencao" | "atrasado" {
  return ["no_prazo", "atencao", "atrasado"].includes(value)
    ? (value as "no_prazo" | "atencao" | "atrasado")
    : "no_prazo";
}
function apiMessage(error: unknown) {
  return error instanceof AjcApiError || error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}
