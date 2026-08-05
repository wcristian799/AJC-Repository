import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Boxes, ChevronLeft, ChevronRight, Clock3, Download, FileSearch,
  MapPin, PackageCheck, Printer, RefreshCw, Route, Ship, X,
} from "lucide-react";
import {
  DataTable, FilterBar, GhostButton, KPIStat, SectionHeader, StatusChip, ViagemStatusChip, brl,
} from "@/components/ops/primitives";
import { VoyageTrack } from "@/components/ops/motion-bits";
import {
  exportTmsControleViagens, listTmsControleViagens, listTmsControleVolumeEventos,
  listTmsControleVolumes, type CidadeApi, type EmbarcacaoApi, type TmsControleParams,
  type TmsControleResponseApi, type TmsControleViagemApi, type TmsControleVolumeApi,
  type TmsControleVolumeEventApi, type TmsControleVolumesResponseApi,
} from "@/lib/ajc-api";

type Filters = Pick<TmsControleParams, "embarcacaoId" | "cidadeSigla" | "status" | "dataInicio" | "dataFim">;

const EMPTY_FILTERS: Filters = { embarcacaoId: "", cidadeSigla: "", status: "", dataInicio: "", dataFim: "" };

/** B.11 — controle gerencial e operacional, agregado no servidor e auditável por volume. */
export function ControleTab({ embarcacoes = [], cidades = [] }: { embarcacoes?: EmbarcacaoApi[]; cidades?: CidadeApi[] }) {
  const [data, setData] = useState<TmsControleResponseApi | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "print" | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchDraft.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const load = useCallback(async (quiet = false) => {
    const current = ++requestId.current;
    if (quiet) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const response = await listTmsControleViagens({ ...filters, busca: search, pagina: page });
      if (current !== requestId.current) return;
      setData(response);
      setFilters((value) => ({
        ...value,
        dataInicio: value.dataInicio || response.filtros.dataInicio,
        dataFim: value.dataFim || response.filtros.dataFim,
      }));
      setSelectedId((value) => value && response.items.some((item) => item.id === value)
        ? value
        : response.items.find((item) => item.volumes > 0)?.id ?? response.items[0]?.id ?? null);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o controle por viagem.");
    } finally {
      if (current === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [filters, page, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data?.configuracao.atualizacaoSegundos) return;
    const timer = window.setInterval(() => void load(true), data.configuracao.atualizacaoSegundos * 1000);
    return () => window.clearInterval(timer);
  }, [data?.configuracao.atualizacaoSegundos, load]);

  const selected = data?.items.find((item) => item.id === selectedId) ?? null;
  const totals = data?.totals;
  const dirtyFilters = Boolean(searchDraft || filters.embarcacaoId || filters.cidadeSigla || filters.status);

  function patchFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setSearchDraft("");
    setSearch("");
    setFilters((current) => ({ ...EMPTY_FILTERS, dataInicio: current.dataInicio, dataFim: current.dataFim }));
    setPage(1);
  }

  async function runExport(mode: "csv" | "print") {
    setExporting(mode);
    setError(null);
    try {
      const response = await exportTmsControleViagens({ ...filters, busca: search });
      if (mode === "csv") downloadCsv(response); else printReport(response);
      if (response.exportacao?.truncada) setError(`A exportação atingiu o limite configurado de ${response.exportacao.limite.toLocaleString("pt-BR")} viagens. Refine o período para obter todo o conjunto.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível exportar o controle.");
    } finally { setExporting(null); }
  }

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Operação · diretoria"
        title="Controle de carga por viagem"
        description="Acompanhe o funil físico, valores informados e divergências. Clique em uma viagem para inspecionar volumes e abrir a trilha auditável."
        actions={<>
          <GhostButton icon={RefreshCw} disabled={refreshing} onClick={() => void load(true)}>{refreshing ? "Atualizando..." : "Atualizar"}</GhostButton>
          <GhostButton icon={Download} disabled={!!exporting} onClick={() => void runExport("csv")}>{exporting === "csv" ? "Gerando..." : "CSV"}</GhostButton>
          <GhostButton icon={Printer} disabled={!!exporting} onClick={() => void runExport("print")}>{exporting === "print" ? "Preparando..." : "Imprimir / PDF"}</GhostButton>
        </>}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Atualizado {data ? formatDateTime(data.atualizadoEm) : "—"} · ciclo automático de {data?.configuracao.atualizacaoSegundos ?? "—"}s</span>
        <span>{data ? `Configuração v${data.configuracao.versao}` : "Configuração operacional"}</span>
      </div>

      {error && <div className="flex items-start gap-2 rounded-md bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] p-3 text-xs text-[color:var(--danger)] ring-1 ring-[color:color-mix(in_oklab,var(--danger)_28%,transparent)]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      {loading && !data ? <ControlSkeleton /> : <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KPIStat label="Volumes totais" value={formatInt(totals?.volumes)} hint={`${formatInt(totals?.viagens)} viagens`} icon={Boxes} index={0} />
          <KPIStat label="Conferidos" value={formatInt(totals?.conferidos)} hint="bipe físico no porto" icon={PackageCheck} index={1} />
          <KPIStat label="Já embarcados" value={formatInt(totals?.embarcados)} hint="evento ou etapa posterior" icon={Ship} index={2} />
          <KPIStat label="Já entregues" value={formatInt(totals?.entregues)} hint="conclusão física" icon={MapPin} index={3} />
          <KPIStat label="Divergências abertas" value={formatInt(totals?.divergentes)} hint="exigem tratamento" icon={AlertTriangle} index={4} />
          <KPIStat label="Valor cobrado" value={money(totals?.valorCobrado)} hint={missingHint(totals?.cargasSemValorCobrado)} icon={Route} index={5} />
        </div>

        <div className="surface-card grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_repeat(5,minmax(120px,auto))_auto]">
          <FilterBar searchPlaceholder="Código da viagem, embarcação ou cidade..." searchValue={searchDraft} onSearchChange={setSearchDraft} />
          <Select label="Embarcação" value={filters.embarcacaoId ?? ""} onChange={(value) => patchFilter("embarcacaoId", value)} options={embarcacoes.map((item) => ({ value: item.id, label: item.nome }))} />
          <Select label="Cidade" value={filters.cidadeSigla ?? ""} onChange={(value) => patchFilter("cidadeSigla", value)} options={cidades.filter((item) => item.ativo).map((item) => ({ value: item.sigla, label: `${item.sigla} · ${item.nome}` }))} />
          <Select label="Status" value={filters.status ?? ""} onChange={(value) => patchFilter("status", value)} options={[{ value: "planejada", label: "Planejada" }, { value: "em_curso", label: "Em curso" }, { value: "concluida", label: "Concluída" }, { value: "cancelada", label: "Cancelada" }]} />
          <DateField label="Saída desde" value={filters.dataInicio ?? ""} onChange={(value) => patchFilter("dataInicio", value)} />
          <DateField label="Saída até" value={filters.dataFim ?? ""} onChange={(value) => patchFilter("dataFim", value)} />
          <button type="button" disabled={!dirtyFilters} onClick={clearFilters} className="self-end pb-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40">Limpar filtros</button>
        </div>

        {selected && <TripSpotlight trip={selected} />}

        <section>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2 px-1">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Viagens no período</p><p className="mt-1 text-xs text-muted-foreground">Valores não informados permanecem explícitos; o sistema não estima frete ou mercadoria.</p></div>
            <p className="text-xs text-muted-foreground">{formatInt(data?.paginacao.total)} resultado(s)</p>
          </div>
          <DataTable rows={data?.items ?? []} onRowClick={(row) => setSelectedId(row.id)} empty="Nenhuma viagem encontrada neste período e filtros." columns={tripColumns(selectedId)} />
          <Pagination page={data?.paginacao.pagina ?? 1} pages={data?.paginacao.paginas ?? 1} onChange={setPage} />
        </section>

        {selected ? <TripDetails trip={selected} cidades={cidades} /> : <EmptyDetails />}
      </>}
    </div>
  );
}

function TripSpotlight({ trip }: { trip: TmsControleViagemApi }) {
  const stops = [
    { code: trip.origem_sigla, label: trip.origem_sigla, done: trip.status !== "planejada" },
    ...trip.escalas.map((item) => ({ code: item.cidadeSigla, label: item.cidadeSigla, done: Boolean(item.dataHoraReal) })),
  ];
  if (!trip.escalas.some((item) => item.cidadeSigla === trip.destino_sigla) && trip.destino_sigla) stops.push({ code: trip.destino_sigla, label: trip.destino_sigla, done: trip.status === "concluida" });
  return <div className="surface-card brand-rail brand-rail-left p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Viagem selecionada</p><h3 className="mt-1 font-display text-xl">{trip.origem_sigla} → {trip.destino_sigla ?? "Em definição"} · {trip.codigo ?? "Sem código"}</h3><p className="mt-1 text-xs text-muted-foreground">{trip.embarcacao_nome} · saída {formatDateTime(trip.data_hora_saida)}</p></div>
      <div className="flex items-center gap-2"><ViagemStatusChip s={trip.status} />{trip.situacao && <StatusChip tone={trip.situacao === "atrasado" ? "danger" : trip.situacao === "atencao" ? "warning" : "success"}>{trip.situacao.replace("_", " ")}</StatusChip>}</div>
    </div>
    <div className="mt-4"><VoyageTrack label={`${trip.progresso_percentual}% do ciclo operacional registrado`} progressPct={trip.progresso_percentual} stops={stops} /></div>
  </div>;
}

function TripDetails({ trip, cidades }: { trip: TmsControleViagemApi; cidades: CidadeApi[] }) {
  const [data, setData] = useState<TmsControleVolumesResponseApi | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trailVolume, setTrailVolume] = useState<TmsControleVolumeApi | null>(null);

  useEffect(() => { setSearchDraft(""); setSearch(""); setStatus(""); setCity(""); setPage(1); }, [trip.id]);
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(searchDraft.trim()); setPage(1); }, 350); return () => window.clearTimeout(timer); }, [searchDraft]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    listTmsControleVolumes(trip.id, { busca: search, status, cidadeSigla: city, pagina: page })
      .then((response) => { if (active) setData(response); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Falha ao carregar os volumes da viagem."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [trip.id, search, status, city, page]);

  return <section className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-2 px-1">
      <div><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><FileSearch className="h-3.5 w-3.5" />Volumes da viagem</p><p className="mt-1 text-xs text-muted-foreground">Busca pelo UUID/QR, carga, pedido ou cliente. Clique em um volume para ver quem fez cada evento.</p></div>
      <p className="text-xs text-muted-foreground">{loading ? "Consultando..." : `${formatInt(data?.paginacao.total)} volume(s)`}</p>
    </div>
    <div className="surface-card grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_180px_210px]">
      <FilterBar searchPlaceholder="UUID, carga, pedido ou cliente..." searchValue={searchDraft} onSearchChange={setSearchDraft} />
      <Select label="Estado" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={["cadastrado", "conferido", "embarcado", "entregue", "divergente"].map((value) => ({ value, label: labelStatus(value) }))} />
      <Select label="Destino" value={city} onChange={(value) => { setCity(value); setPage(1); }} options={cidades.filter((item) => item.ativo).map((item) => ({ value: item.sigla, label: `${item.sigla} · ${item.nome}` }))} />
    </div>
    {error && <p className="rounded-md p-3 text-xs text-[color:var(--danger)] ring-1 ring-[color:var(--hairline)]">{error}</p>}
    <DataTable rows={data?.items ?? []} onRowClick={setTrailVolume} empty={loading ? "Carregando volumes..." : "Nenhum volume encontrado nesta viagem."} columns={volumeColumns()} />
    <Pagination page={data?.paginacao.pagina ?? 1} pages={data?.paginacao.paginas ?? 1} onChange={setPage} />
    <DivergencePanel items={data?.divergencias ?? []} onOpen={setTrailVolume} />
    {trailVolume && <AuditTrailModal volume={trailVolume} onClose={() => setTrailVolume(null)} />}
  </section>;
}

function DivergencePanel({ items, onOpen }: { items: Array<TmsControleVolumeApi & { observacao: string | null }>; onOpen: (item: TmsControleVolumeApi) => void }) {
  return <div className="surface-card overflow-hidden">
    <div className="flex items-center justify-between border-b border-[color:var(--hairline)] p-4"><div><h4 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-[color:var(--danger)]" />Divergências abertas</h4><p className="mt-1 text-[11px] text-muted-foreground">Fila priorizada da viagem selecionada.</p></div><StatusChip tone={items.length ? "danger" : "success"}>{items.length ? `${items.length} aberta(s)` : "sem pendências"}</StatusChip></div>
    {items.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Nenhum volume está em divergência nesta viagem.</p> : <div className="divide-y divide-[color:var(--hairline)]">{items.map((item) => <button key={item.id} type="button" onClick={() => onOpen(item)} className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-[color:var(--surface-tint)]"><div><p className="font-mono text-xs">{shortUuid(item.uuid)} · {item.carga_codigo ?? "Carga sem código"}</p><p className="mt-1 text-xs text-muted-foreground">{item.cliente_codigo} · {item.cliente_nome} · destino {item.cidade_destino_sigla}</p><p className="mt-1 text-xs text-[color:var(--danger)]">{item.observacao || "Divergência registrada sem observação."}</p></div><span className="shrink-0 text-[11px] text-muted-foreground">{formatDateTime(item.atualizado_em)}</span></button>)}</div>}
  </div>;
}

function AuditTrailModal({ volume, onClose }: { volume: TmsControleVolumeApi; onClose: () => void }) {
  const [events, setEvents] = useState<TmsControleVolumeEventApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { listTmsControleVolumeEventos(volume.id).then((response) => setEvents(response.items)).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao abrir a trilha.")); }, [volume.id]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [onClose]);
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Trilha do volume" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="surface-card max-h-[88vh] w-full max-w-2xl overflow-auto p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-[color:var(--hairline)] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Trilha auditável do volume</p><h3 className="mt-1 font-mono text-sm">{volume.uuid}</h3><p className="mt-1 text-xs text-muted-foreground">{volume.carga_codigo ?? "Carga sem código"} · {volume.cliente_nome} · {labelStatus(volume.status)}</p></div><button type="button" onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-md ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"><X className="h-4 w-4" /></button></div>
      {error && <p className="mt-4 text-xs text-[color:var(--danger)]">{error}</p>}
      {!events ? <p className="py-10 text-center text-sm text-muted-foreground">Carregando eventos...</p> : events.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Este volume está cadastrado, mas ainda não possui bipe físico.</p> : <ol className="mt-5 space-y-0">{events.map((event, index) => <li key={event.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3"><div className="flex flex-col items-center"><span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${event.tipo === "divergencia" ? "bg-[color:var(--danger)]" : "bg-[color:var(--brand)]"}`} />{index < events.length - 1 && <span className="h-full w-px bg-[color:var(--hairline)]" />}</div><div className="pb-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{eventStatusLabel(event.tipo)}</p><time className="text-[11px] text-muted-foreground">{formatDateTime(event.ocorrido_em ?? event.ocorridoEm)}</time></div><p className="mt-1 text-xs text-muted-foreground">por {event.usuario_nome ?? event.usuarioNome ?? "Usuário não identificado"}</p>{(event.observacao ?? event.obs) && <p className="mt-2 rounded-md bg-[color:var(--surface-tint)] p-2 text-xs">{event.observacao ?? event.obs}</p>}<div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">{(event.foto_url ?? event.fotoUrl) && <span>foto vinculada</span>}{event.gps && <span>GPS registrado</span>}</div></div></li>)}</ol>}
    </div>
  </div>;
}

function tripColumns(selectedId: string | null) { return [
  { key: "codigo", header: "Viagem", render: (row: TmsControleViagemApi) => <div className={row.id === selectedId ? "text-[color:var(--brand)]" : ""}><p className="font-mono text-xs">{row.codigo ?? "Sem código"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{row.origem_sigla} → {row.destino_sigla ?? "—"} · {formatDate(row.data_hora_saida)}</p></div> },
  { key: "embarcacao_nome", header: "Embarcação", render: (row: TmsControleViagemApi) => <span className="text-xs">{row.embarcacao_nome}</span> },
  { key: "volumes", header: "Volumes", align: "right" as const, render: (row: TmsControleViagemApi) => <span className="font-mono">{formatInt(row.volumes)}</span> },
  { key: "funil", header: "Conf. / Embarc. / Entreg.", align: "center" as const, render: (row: TmsControleViagemApi) => <div className="inline-flex items-center gap-1 font-mono text-[11px]"><Count tone="info" value={row.conferidos} /><span className="text-muted-foreground">/</span><Count tone="brand" value={row.embarcados} /><span className="text-muted-foreground">/</span><Count tone="success" value={row.entregues} /></div> },
  { key: "valor_declarado", header: "Declarado", align: "right" as const, render: (row: TmsControleViagemApi) => <MoneyCell value={row.valor_declarado} missing={row.cargas_sem_valor_declarado} /> },
  { key: "valor_cobrado", header: "Cobrado", align: "right" as const, render: (row: TmsControleViagemApi) => <MoneyCell value={row.valor_cobrado} missing={row.cargas_sem_valor_cobrado} brand /> },
  { key: "divergentes", header: "Diverg.", align: "right" as const, render: (row: TmsControleViagemApi) => row.divergentes ? <span className="inline-flex items-center gap-1 text-[color:var(--danger)]"><AlertTriangle className="h-3.5 w-3.5" /><span className="font-mono text-xs">{row.divergentes}</span></span> : <span className="text-muted-foreground">—</span> },
  { key: "status", header: "Status", render: (row: TmsControleViagemApi) => <ViagemStatusChip s={row.status} /> },
]; }

function volumeColumns() { return [
  { key: "uuid", header: "UUID / QR", render: (row: TmsControleVolumeApi) => <div><p className="font-mono text-[11px]">{shortUuid(row.uuid)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{row.indice_volume}/{row.total_volumes} · {row.eventos_total} evento(s)</p></div> },
  { key: "carga_codigo", header: "Carga / pedido", render: (row: TmsControleVolumeApi) => <div><p className="font-mono text-xs">{row.carga_codigo ?? "Sem código"}</p><p className="text-[10px] text-muted-foreground">{row.numero_pedido ?? "Sem pedido"}</p></div> },
  { key: "cliente_nome", header: "Cliente", render: (row: TmsControleVolumeApi) => <div><p className="text-xs font-medium">{row.cliente_nome}</p><p className="text-[10px] text-muted-foreground">{row.cliente_codigo ?? "Sem código"}</p></div> },
  { key: "cidade_destino_sigla", header: "Destino" },
  { key: "peso", header: "Peso", align: "right" as const, render: (row: TmsControleVolumeApi) => row.peso === null ? <span className="text-[11px] text-[color:var(--warning)]">não informado</span> : <span className="font-mono text-xs">{formatDecimal(row.peso)} kg</span> },
  { key: "valor_cobrado", header: "Cobrado", align: "right" as const, render: (row: TmsControleVolumeApi) => row.valor_cobrado === null ? <span className="text-[11px] text-[color:var(--warning)]">não informado</span> : <span className="font-mono text-xs">{brl(row.valor_cobrado)}</span> },
  { key: "status", header: "Estado", render: (row: TmsControleVolumeApi) => <StatusChip tone={statusTone(row.status)}>{labelStatus(row.status)}</StatusChip> },
  { key: "atualizado_em", header: "Última atualização", render: (row: TmsControleVolumeApi) => <span className="text-[11px] text-muted-foreground">{formatDateTime(row.atualizado_em)}</span> },
]; }

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) { return <label className="min-w-0"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md bg-[color:var(--muted)] px-2 text-xs ring-1 ring-[color:var(--hairline)]"><option value="">Todos</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>; }
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md bg-[color:var(--muted)] px-2 text-xs ring-1 ring-[color:var(--hairline)]" /></label>; }
function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) { return <div className="mt-2 flex items-center justify-end gap-2"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior" className="grid h-8 w-8 place-items-center rounded-md ring-1 ring-[color:var(--hairline)] disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-20 text-center text-xs text-muted-foreground">{page} de {pages}</span><button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Próxima página" className="grid h-8 w-8 place-items-center rounded-md ring-1 ring-[color:var(--hairline)] disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button></div>; }
function Count({ tone, value }: { tone: "info" | "brand" | "success"; value: number }) { return <span className={`rounded px-1.5 py-0.5 ${tone === "success" ? "bg-[color:color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)]" : tone === "brand" ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)]" : "bg-[color:color-mix(in_oklab,var(--info)_14%,transparent)] text-[color:var(--info)]"}`}>{value}</span>; }
function MoneyCell({ value, missing, brand }: { value: number | null; missing: number; brand?: boolean }) { return <div><p className={`font-mono text-xs ${brand ? "text-[color:var(--brand)]" : ""}`}>{money(value)}</p>{missing > 0 && <p className="mt-0.5 text-[9px] text-[color:var(--warning)]">{missing} carga(s) sem valor</p>}</div>; }
function EmptyDetails() { return <div className="surface-card grid min-h-40 place-items-center p-8 text-center"><div><Ship className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Selecione uma viagem</p><p className="mt-1 text-xs text-muted-foreground">O detalhamento de volumes e divergências aparecerá aqui.</p></div></div>; }
function ControlSkeleton() { return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="surface-card h-32 animate-pulse bg-[color:var(--muted)]" />)}</div><div className="surface-card h-14 animate-pulse bg-[color:var(--muted)]" /><div className="surface-card h-72 animate-pulse bg-[color:var(--muted)]" /></div>; }

function statusTone(status: string): "danger" | "success" | "brand" | "info" | "warning" | "neutral" { if (status === "divergente") return "danger"; if (status === "entregue") return "success"; if (status === "embarcado") return "brand"; if (status === "conferido") return "info"; return "neutral"; }
function labelStatus(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function eventStatusLabel(value: string) { const legacy: Record<string, string> = { recebido: "Conferido · histórico anterior", reconferido: "Embarcado · histórico anterior", desembarcado: "Embarcado · histórico anterior" }; return legacy[value] ?? labelStatus(value); }
function money(value: number | null | undefined) { return value === null || value === undefined ? "Não informado" : brl(Number(value)); }
function missingHint(value: number | undefined) { return value ? `${value} carga(s) sem valor` : "todas as cargas informadas"; }
function formatInt(value: number | undefined) { return Number(value ?? 0).toLocaleString("pt-BR"); }
function formatDecimal(value: number) { return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 3 }); }
function formatDate(value: string | undefined) { return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(value)) : "—"; }
function formatDateTime(value: string | undefined) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—"; }
function shortUuid(value: string) { return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value; }

function downloadCsv(response: TmsControleResponseApi) {
  const header = ["viagem", "embarcacao", "origem", "destino", "saida", "status", "cargas", "volumes", "conferidos", "embarcados", "entregues", "divergentes", "valor_declarado", "valor_cobrado", "cargas_sem_valor_declarado", "cargas_sem_valor_cobrado"];
  const rows = response.items.map((item) => [item.codigo, item.embarcacao_nome, item.origem_sigla, item.destino_sigla, item.data_hora_saida, item.status, item.cargas, item.volumes, item.conferidos, item.embarcados, item.entregues, item.divergentes, item.valor_declarado, item.valor_cobrado, item.cargas_sem_valor_declarado, item.cargas_sem_valor_cobrado]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = `controle-viagens-${response.filtros.dataInicio}-${response.filtros.dataFim}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
function printReport(response: TmsControleResponseApi) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) throw new Error("O navegador bloqueou a janela de impressão. Libere pop-ups e tente novamente.");
  const rows = response.items.map((item) => `<tr><td>${escapeHtml(item.codigo ?? "—")}</td><td>${escapeHtml(item.embarcacao_nome)}</td><td>${escapeHtml(`${item.origem_sigla} → ${item.destino_sigla ?? "—"}`)}</td><td>${escapeHtml(formatDateTime(item.data_hora_saida))}</td><td>${item.volumes}</td><td>${item.conferidos}/${item.embarcados}/${item.entregues}</td><td>${escapeHtml(money(item.valor_declarado))}</td><td>${escapeHtml(money(item.valor_cobrado))}</td><td>${item.divergentes}</td></tr>`).join("");
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Controle por viagem</title><style>body{font:12px Arial;color:#111;padding:28px}h1{font-size:20px;margin:0 0 4px}p{color:#555}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:7px;border:1px solid #ccc;text-align:left}th{background:#eee;font-size:10px;text-transform:uppercase}@media print{body{padding:0}}</style></head><body><h1>Controle de carga por viagem</h1><p>Período ${escapeHtml(response.filtros.dataInicio)} a ${escapeHtml(response.filtros.dataFim)} · emitido ${escapeHtml(formatDateTime(response.atualizadoEm))} · configuração v${response.configuracao.versao}</p><table><thead><tr><th>Viagem</th><th>Embarcação</th><th>Rota</th><th>Saída</th><th>Volumes</th><th>C/E/E</th><th>Declarado</th><th>Cobrado</th><th>Diverg.</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`); popup.document.close();
}
function csvCell(value: unknown) { const text = value === null || value === undefined ? "" : String(value); return `"${text.replaceAll('"', '""')}"`; }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char); }
