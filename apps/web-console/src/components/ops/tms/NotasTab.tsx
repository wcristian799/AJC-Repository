import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarClock, CheckCircle2, FileCheck2, FileText, Radio,
  RefreshCw, Ship, Truck, Upload, UserCheck, UserPlus,
} from "lucide-react";
import {
  DataTable, FilterBar, FilterChip, GhostButton, PrimaryButton, SectionHeader,
  StatusChip, Tag, brl,
} from "@/components/ops/primitives";
import {
  analyzeTmsDocumento,
  conferirTmsDocumento,
  createTmsDocumento,
  listTmsAgendamentoDisponibilidade,
  listTmsCargas,
  listTmsDocumentos,
  listTmsVolumes,
  type CidadeApi,
  type ClienteApi,
  type NavegacaoViagemApi,
  type TmsAgendamentoSlotApi,
  type TmsCargaApi,
  type TmsDocumentoAnaliseApi,
  type TmsDocumentoApi,
  type TmsVolumeApi,
} from "@/lib/ajc-api";

type NotaStatus = "pendente" | "conferida" | "divergente";
type NotaRow = {
  id: string;
  tipo: string;
  numero: string;
  cliente: string;
  valor: number;
  carga: string;
  viagem: string;
  pagamento: string;
  status: NotaStatus;
  volumes: number;
  agendadoPara?: string | null;
};

type LaunchForm = {
  uploadId: string;
  clienteRemetenteId: string;
  remetenteNome: string;
  remetenteDocumento: string;
  remetenteTelefone: string;
  tipo: "NFe" | "NFCe" | "DC";
  pagamento: "CIF" | "FOB";
  numero: string;
  viagemId: string;
  cidadeDestinoSigla: string;
  valor: string;
  pesoTotal: string;
  totalVolumes: string;
  destinatarioNome: string;
  destinatarioDocumento: string;
  destinatarioTelefone: string;
  agendamentoData: string;
  agendadoPara: string;
};

const STATUS_TONE: Record<NotaStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  conferida: "success",
  divergente: "danger",
};

export function NotasTab({
  cargas,
  cidades,
  documentos = [],
  viagens = [],
  clientes = [],
  onCargasChange,
  onDocumentosChange,
  onVolumesChange,
}: {
  cargas?: TmsCargaApi[];
  cidades?: CidadeApi[];
  documentos?: TmsDocumentoApi[];
  volumes?: TmsVolumeApi[];
  viagens?: NavegacaoViagemApi[];
  clientes?: ClienteApi[];
  onCargasChange?: (items: TmsCargaApi[]) => void;
  onDocumentosChange?: (items: TmsDocumentoApi[]) => void;
  onVolumesChange?: (items: TmsVolumeApi[]) => void;
}) {
  const [filtro, setFiltro] = useState<NotaStatus | "todos">("todos");
  const [showLaunch, setShowLaunch] = useState(false);
  const [analysis, setAnalysis] = useState<TmsDocumentoAnaliseApi | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<TmsAgendamentoSlotApi[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [form, setForm] = useState<LaunchForm>(emptyForm());

  const activeTrips = useMemo(
    () => viagens.filter((trip) => ["planejada", "em_curso"].includes(trip.status)),
    [viagens],
  );
  const selectedTrip = activeTrips.find((trip) => trip.id === form.viagemId);
  const tripDestinations = selectedTrip
    ? Array.from(new Set([...selectedTrip.escalas.map((stop) => stop.cidadeSigla), selectedTrip.destinoSigla].filter(Boolean) as string[]))
    : [];
  const rows = documentos.map(mapDocumento).filter((item) => filtro === "todos" || item.status === filtro);
  const today = todayDateInput();
  const todayDocuments = documentos.filter((item) => item.agendado_para?.slice(0, 10) === today);

  async function loadAvailability(showLoading = true) {
    if (!form.agendamentoData) return;
    if (showLoading) setLoadingSlots(true);
    try {
      const next = await listTmsAgendamentoDisponibilidade(form.agendamentoData);
      setSlots(next);
      setLastUpdated(new Date());
      setForm((current) => {
        if (next.some((slot) => slot.inicio === current.agendadoPara && !slot.bloqueada)) return current;
        return { ...current, agendadoPara: next.find((slot) => !slot.bloqueada)?.inicio ?? "" };
      });
    } catch (cause) {
      setSlots([]);
      setError(cause instanceof Error ? cause.message : "Nao foi possivel consultar a agenda.");
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    void loadAvailability();
  }, [form.agendamentoData]);

  useEffect(() => {
    const seconds = slots[0]?.atualizacaoSegundos;
    if (!seconds) return;
    const timer = window.setInterval(() => void loadAvailability(false), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [form.agendamentoData, slots[0]?.atualizacaoSegundos]);

  async function handleFile(file?: File) {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await analyzeTmsDocumento(file);
      setAnalysis(result);
      const extracted = result.extraido;
      setForm((current) => ({
        ...current,
        uploadId: result.uploadId,
        clienteRemetenteId: result.cliente?.id ?? "",
        remetenteNome: extracted.remetente.nome ?? "",
        remetenteDocumento: extracted.remetente.documento ?? "",
        remetenteTelefone: extracted.remetente.telefone ?? "",
        tipo: extracted.tipo,
        pagamento: extracted.pagamento ?? "CIF",
        numero: extracted.numero ?? extracted.chaveAcesso ?? "",
        valor: extracted.valor?.toString() ?? "",
        pesoTotal: extracted.pesoTotal?.toString() ?? "",
        totalVolumes: extracted.totalVolumes?.toString() ?? "1",
        destinatarioNome: extracted.destinatario.nome ?? "",
        destinatarioDocumento: extracted.destinatario.documento ?? "",
        destinatarioTelefone: extracted.destinatario.telefone ?? "",
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel enviar e analisar o documento.");
    } finally {
      setAnalyzing(false);
    }
  }

  function selectExistingClient(id: string) {
    const client = clientes.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      clienteRemetenteId: id,
      remetenteNome: client?.nome ?? current.remetenteNome,
      remetenteDocumento: client?.cpfCnpj ?? current.remetenteDocumento,
    }));
  }

  function selectTrip(id: string) {
    const trip = activeTrips.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      viagemId: id,
      cidadeDestinoSigla: trip?.destinoSigla ?? trip?.escalas.at(-1)?.cidadeSigla ?? "",
    }));
  }

  async function saveDocument() {
    setError(null);
    if (!form.uploadId) return setError("Envie o arquivo da NF/DC antes de continuar.");
    if (!form.remetenteNome.trim()) return setError("Informe o nome ou razao social do remetente.");
    if (!form.numero.trim()) return setError("Informe o numero da NF/DC.");
    if (!form.viagemId || !form.cidadeDestinoSigla) return setError("Selecione a viagem e o destino operacional.");
    if (!form.destinatarioNome.trim() || !form.destinatarioDocumento.trim() || !form.destinatarioTelefone.trim()) {
      return setError("Informe nome, CPF/CNPJ e telefone do destinatario.");
    }
    if (!form.agendadoPara) return setError("Selecione uma janela de recebimento com vaga.");
    setSaving(true);
    try {
      await createTmsDocumento({
        uploadId: form.uploadId,
        viagemId: form.viagemId,
        clienteRemetenteId: form.clienteRemetenteId || undefined,
        remetenteNome: form.remetenteNome.trim(),
        remetenteDocumento: form.remetenteDocumento.trim() || undefined,
        remetenteTelefone: form.remetenteTelefone.trim() || undefined,
        tipo: form.tipo,
        pagamento: form.pagamento,
        numero: form.numero.trim(),
        cidadeOrigemSigla: selectedTrip?.origemSigla,
        cidadeDestinoSigla: form.cidadeDestinoSigla,
        valor: parseNumber(form.valor),
        pesoTotal: parseNumber(form.pesoTotal),
        totalVolumes: Math.max(1, Number.parseInt(form.totalVolumes, 10) || 1),
        destinatarioNome: form.destinatarioNome.trim(),
        destinatarioDocumento: form.destinatarioDocumento.trim(),
        destinatarioTelefone: form.destinatarioTelefone.trim(),
        agendadoPara: form.agendadoPara,
        clientUuid: crypto.randomUUID(),
      });
      const [nextLoads, nextDocuments, nextVolumes] = await Promise.all([
        listTmsCargas(), listTmsDocumentos(), listTmsVolumes(),
      ]);
      onCargasChange?.(nextLoads);
      onDocumentosChange?.(nextDocuments);
      onVolumesChange?.(nextVolumes);
      setAnalysis(null);
      setForm(emptyForm());
      setShowLaunch(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel lancar a NF/DC.");
    } finally {
      setSaving(false);
    }
  }

  async function markDocument(id: string, status: "conferida" | "divergente") {
    setSavingId(id);
    setError(null);
    try {
      const updated = await conferirTmsDocumento(id, {
        status,
        observacao: status === "divergente" ? "Divergencia registrada na fila de NF/DC" : "Conferencia concluida na fila de NF/DC",
        clientUuid: crypto.randomUUID(),
      });
      onDocumentosChange?.(documentos.map((item) => item.id === id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel atualizar a conferencia.");
    } finally {
      setSavingId(null);
    }
  }

  const occupiedSlots = slots.filter((slot) => slot.ocupadas > 0);
  const fullSlots = slots.filter((slot) => slot.bloqueada).length;
  const expectedVolumes = todayDocuments.reduce((sum, item) => sum + Number(item.total_volumes ?? 0), 0);

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="ADM Notas - back-office"
        title="Notas Fiscais & Declaracoes de Conteudo"
        description="Um unico fluxo para enviar, interpretar e vincular cada NF/DC a cliente, carga e viagem antes do recebimento."
        actions={<PrimaryButton icon={Upload} onClick={() => setShowLaunch((value) => !value)}>Lancar NF/DC</PrimaryButton>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Pendentes de conferencia" value={documentos.filter((item) => item.status === "pendente").length} tone="warning" icon={FileText} />
        <MiniStat label="Vinculadas a carga" value={documentos.filter((item) => item.carga_id).length} tone="brand" icon={Ship} />
        <MiniStat label="Conferidas hoje" value={documentos.filter((item) => item.status === "conferida" && item.atualizado_em.slice(0, 10) === today).length} tone="success" icon={CheckCircle2} />
      </div>

      {showLaunch && (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-[color:var(--hairline)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl">Lancamento de NF/DC</h3>
                <p className="mt-1 max-w-3xl text-xs text-muted-foreground">Comece pelo arquivo. XML preenche a nota e procura o cliente por CPF/CNPJ; PDF ou foto permanecem disponiveis para preenchimento assistido.</p>
              </div>
              {analysis && <StatusChip tone="success">arquivo armazenado e verificado</StatusChip>}
            </div>
            <UploadFirst analysis={analysis} analyzing={analyzing} onFile={handleFile} />
          </div>

          {analysis && (
            <div className="p-5">
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg bg-[color:var(--muted)] px-4 py-3 ring-1 ring-[color:var(--hairline)]">
                {analysis.cliente ? <UserCheck className="h-5 w-5 text-[color:var(--success)]" /> : <UserPlus className="h-5 w-5 text-[color:var(--brand)]" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{analysis.cliente ? `${analysis.cliente.codigo} - ${analysis.cliente.nome}` : "Cliente novo sera cadastrado junto com a nota"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{analysis.extraido.xmlLido ? "Dados extraidos do XML. Revise antes de salvar." : "Arquivo sem XML: complete os dados abaixo; nao e necessario sair para Cadastros."}</p>
                </div>
                <select value={form.clienteRemetenteId} onChange={(event) => selectExistingClient(event.target.value)} className="h-10 max-w-xs rounded-md bg-background px-3 text-xs ring-1 ring-[color:var(--hairline)]">
                  <option value="">Cadastrar a partir da nota</option>
                  {clientes.map((client) => <option key={client.id} value={client.id}>{client.codigo} - {client.nome}</option>)}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Remetente"><input value={form.remetenteNome} onChange={(event) => setForm({ ...form, remetenteNome: event.target.value })} /></Field>
                <Field label="CPF/CNPJ remetente"><input value={form.remetenteDocumento} onChange={(event) => setForm({ ...form, remetenteDocumento: event.target.value })} /></Field>
                <Field label="Telefone remetente"><input value={form.remetenteTelefone} onChange={(event) => setForm({ ...form, remetenteTelefone: event.target.value })} /></Field>
                <Field label="Tipo"><select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as LaunchForm["tipo"] })}><option value="NFe">NF-e</option><option value="NFCe">NFC-e</option><option value="DC">Declaracao de Conteudo</option></select></Field>
                <Field label="Numero / chave"><input value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} /></Field>
                <Field label="Pagamento"><select value={form.pagamento} onChange={(event) => setForm({ ...form, pagamento: event.target.value as LaunchForm["pagamento"] })}><option value="CIF">CIF</option><option value="FOB">FOB</option></select></Field>
                <Field label="Viagem"><select value={form.viagemId} onChange={(event) => selectTrip(event.target.value)}><option value="">Selecionar viagem</option>{activeTrips.map((trip) => <option key={trip.id} value={trip.id}>{trip.codigo} - {trip.embarcacaoNome} - {trip.origemSigla} → {trip.destinoSigla}</option>)}</select></Field>
                <Field label="Destino da carga"><select value={form.cidadeDestinoSigla} disabled={!selectedTrip} onChange={(event) => setForm({ ...form, cidadeDestinoSigla: event.target.value })}><option value="">Selecionar destino</option>{tripDestinations.map((sigla) => <option key={sigla} value={sigla}>{cityLabel(sigla, cidades)}</option>)}</select></Field>
                <AgendamentoField data={form.agendamentoData} value={form.agendadoPara} slots={slots} loading={loadingSlots} onDate={(value) => setForm({ ...form, agendamentoData: value, agendadoPara: "" })} onValue={(value) => setForm({ ...form, agendadoPara: value })} />
                <Field label="Valor declarado"><input inputMode="decimal" value={form.valor} onChange={(event) => setForm({ ...form, valor: event.target.value })} placeholder="0,00" /></Field>
                <Field label="Peso total"><input inputMode="decimal" value={form.pesoTotal} onChange={(event) => setForm({ ...form, pesoTotal: event.target.value })} placeholder="kg" /></Field>
                <Field label="Volumes"><input inputMode="numeric" min={1} value={form.totalVolumes} onChange={(event) => setForm({ ...form, totalVolumes: event.target.value })} /></Field>
                <Field label="Destinatario"><input value={form.destinatarioNome} onChange={(event) => setForm({ ...form, destinatarioNome: event.target.value })} /></Field>
                <Field label="CPF/CNPJ destinatario"><input value={form.destinatarioDocumento} onChange={(event) => setForm({ ...form, destinatarioDocumento: event.target.value })} /></Field>
                <Field label="Telefone destinatario"><input value={form.destinatarioTelefone} onChange={(event) => setForm({ ...form, destinatarioTelefone: event.target.value })} /></Field>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--hairline)] pt-4">
                <p className="max-w-2xl text-xs text-muted-foreground">A nota cria a carga e os volumes. A escolha MP/PD/PC e a alocacao no palete acontecem no recebimento, com a mercadoria fisicamente conferida.</p>
                <div className="flex gap-2"><GhostButton onClick={() => { setShowLaunch(false); setAnalysis(null); }}>Cancelar</GhostButton><PrimaryButton icon={FileCheck2} disabled={saving} onClick={saveDocument}>{saving ? "Lancando..." : "Lancar NF/DC"}</PrimaryButton></div>
              </div>
            </div>
          )}
        </section>
      )}

      {error && <p role="alert" className="rounded-md bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)] px-3 py-2 text-xs text-[color:var(--danger)] ring-1 ring-[color:color-mix(in_oklab,var(--danger)_28%,transparent)]">{error}</p>}

      <FilterBar searchPlaceholder="Buscar numero, cliente, carga ou viagem...">
        {(["todos", "pendente", "conferida", "divergente"] as const).map((value) => <FilterChip key={value} active={filtro === value} onClick={() => setFiltro(value)}>{value === "todos" ? "Todos" : value === "pendente" ? "Pendentes" : value === "conferida" ? "Conferidas" : "Divergentes"}</FilterChip>)}
      </FilterBar>
      <DataTable<NotaRow>
        rows={rows}
        empty="Nenhuma NF/DC neste filtro."
        columns={[
          { key: "tipo", header: "Tipo", render: (row) => <Tag tone={row.tipo === "DC" ? "info" : "brand"}>{row.tipo}</Tag> },
          { key: "numero", header: "Numero / chave", render: (row) => <span className="font-mono text-[11px]">{row.numero}</span> },
          { key: "cliente", header: "Cliente", render: (row) => <span className="font-medium">{row.cliente}</span> },
          { key: "carga", header: "Carga", render: (row) => <span className="font-mono text-xs">{row.carga}</span> },
          { key: "viagem", header: "Viagem", render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.viagem}</span> },
          { key: "pagamento", header: "CIF/FOB", render: (row) => <Tag tone={row.pagamento === "FOB" ? "warning" : "info"}>{row.pagamento}</Tag> },
          { key: "valor", header: "Valor", align: "right", render: (row) => <span className="font-mono text-xs">{brl(row.valor)}</span> },
          { key: "status", header: "Status", render: (row) => <StatusChip tone={STATUS_TONE[row.status]} size="sm">{row.status}</StatusChip> },
          { key: "acao", header: "Conferencia", align: "right", render: (row) => row.status === "pendente" ? <div className="flex justify-end gap-1"><Action title="Marcar conferida" disabled={savingId === row.id} icon={CheckCircle2} tone="success" onClick={() => markDocument(row.id, "conferida")} /><Action title="Registrar divergencia" disabled={savingId === row.id} icon={AlertTriangle} tone="danger" onClick={() => markDocument(row.id, "divergente")} /></div> : <span className="text-[11px] text-muted-foreground">concluida</span> },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="surface-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[color:var(--brand)]" /><h3 className="font-display text-lg">Agenda de recebimento</h3></div><GhostButton icon={RefreshCw} onClick={() => loadAvailability()}>{loadingSlots ? "Atualizando..." : "Atualizar"}</GhostButton></div>
          <p className="mt-1 text-xs text-muted-foreground">Capacidade e duracao vem da configuracao operacional publicada.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {occupiedSlots.map((slot) => <div key={slot.inicio} className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]"><div className="flex items-center justify-between"><span className="font-mono text-sm">{formatSlot(slot.inicio)}</span><StatusChip tone={slot.bloqueada ? "danger" : "warning"} size="xs">{slot.ocupadas}/{slot.capacidade}</StatusChip></div><p className="mt-1 text-xs text-muted-foreground">{slot.disponiveis} vaga(s) livre(s) · janela de {slot.intervaloMinutos} min</p></div>)}
            {!occupiedSlots.length && <p className="sm:col-span-2 rounded-lg bg-[color:var(--muted)] p-4 text-xs text-muted-foreground ring-1 ring-[color:var(--hairline)]">Nenhum recebimento agendado para {formatDate(form.agendamentoData)}.</p>}
          </div>
        </section>
        <section className="surface-card p-5">
          <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-[color:var(--brand)]" /><h3 className="font-display text-lg">Previsibilidade do dia</h3></div>
          <div className="mt-4 grid grid-cols-3 gap-2"><MiniNumber label="NF/DC" value={todayDocuments.length} /><MiniNumber label="volumes" value={expectedVolumes} /><MiniNumber label="janelas cheias" value={fullSlots} /></div>
          <div className="mt-4 border-t border-[color:var(--hairline)] pt-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Radio className="h-4 w-4 text-[color:var(--success)]" /><p className="text-sm font-medium">Dados operacionais</p></div>{lastUpdated && <span className="text-[10px] text-muted-foreground">atualizado {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}</div><div className="mt-2 space-y-2">{todayDocuments.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-[color:var(--muted)] px-3 py-2 text-xs ring-1 ring-[color:var(--hairline)]"><span className="truncate font-mono">{item.numero ?? item.carga_codigo}</span><span className="truncate text-muted-foreground">{item.cliente_nome}</span><span className="shrink-0 font-mono text-[color:var(--brand)]">{item.total_volumes ?? 0} vol</span></div>)}{!todayDocuments.length && <p className="rounded-md bg-[color:var(--muted)] p-3 text-xs text-muted-foreground ring-1 ring-[color:var(--hairline)]">Nenhuma NF/DC prevista para hoje.</p>}</div></div>
        </section>
      </div>
    </div>
  );
}

function UploadFirst({ analysis, analyzing, onFile }: { analysis: TmsDocumentoAnaliseApi | null; analyzing: boolean; onFile: (file?: File) => void }) {
  return <label className="mt-4 flex min-h-32 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[color:var(--hairline-strong)] bg-[color:var(--muted)] p-6 text-center transition-colors hover:border-[color:var(--brand)] focus-within:border-[color:var(--brand)]"><input className="sr-only" type="file" accept=".xml,.pdf,.jpg,.jpeg,.png,application/xml,application/pdf,image/jpeg,image/png" disabled={analyzing} onChange={(event) => onFile(event.target.files?.[0])} /><div><Upload className="mx-auto h-7 w-7 text-[color:var(--brand)]" /><p className="mt-2 text-sm font-medium">{analyzing ? "Enviando e lendo o documento..." : analysis ? "Trocar arquivo" : "Escolher XML, PDF ou foto da NF/DC"}</p><p className="mt-1 text-xs text-muted-foreground">{analysis ? `${analysis.arquivo.nome} · ${formatBytes(analysis.arquivo.bytes)} · SHA-256 ${analysis.arquivo.hash.slice(0, 10)}...` : "Ate 10 MB. XML permite preenchimento automatico."}</p></div></label>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span><div className="[&_input]:h-10 [&_input]:w-full [&_input]:rounded-md [&_input]:bg-[color:var(--muted)] [&_input]:px-3 [&_input]:text-sm [&_input]:ring-1 [&_input]:ring-[color:var(--hairline)] [&_select]:h-10 [&_select]:w-full [&_select]:rounded-md [&_select]:bg-[color:var(--muted)] [&_select]:px-3 [&_select]:text-sm [&_select]:ring-1 [&_select]:ring-[color:var(--hairline)] [&_select:disabled]:opacity-50">{children}</div></label>;
}

function AgendamentoField({ data, value, slots, loading, onDate, onValue }: { data: string; value: string; slots: TmsAgendamentoSlotApi[]; loading: boolean; onDate: (value: string) => void; onValue: (value: string) => void }) {
  const interval = slots[0]?.intervaloMinutos;
  const capacity = slots[0]?.capacidade;
  return <label><span className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><span>Agendamento</span>{interval && capacity ? <span>{capacity} vagas / {interval} min</span> : null}</span><div className="grid grid-cols-[0.85fr_1.15fr] gap-2"><input type="date" value={data} onChange={(event) => onDate(event.target.value)} className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]" /><select value={value} disabled={loading || !slots.length} onChange={(event) => onValue(event.target.value)} className="h-10 min-w-0 rounded-md bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)] disabled:opacity-50"><option value="">{loading ? "Consultando..." : "Selecionar horario"}</option>{slots.map((slot) => <option key={slot.inicio} value={slot.inicio} disabled={slot.bloqueada}>{formatSlot(slot.inicio)} · {slot.disponiveis}/{slot.capacidade} vagas</option>)}</select></div></label>;
}

function MiniStat({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "warning" | "success" | "brand"; icon: React.ComponentType<{ className?: string }> }) {
  const color = tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "var(--brand)";
  return <div className="surface-card flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-lg ring-1 ring-[color:var(--hairline)]" style={{ color, background: `color-mix(in oklab, ${color} 10%, transparent)` }}><Icon className="h-5 w-5" /></span><div><p className="big-numeric text-2xl">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div></div>;
}

function MiniNumber({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]"><p className="big-numeric text-xl">{value}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p></div>; }

function Action({ title, disabled, icon: Icon, tone, onClick }: { title: string; disabled: boolean; icon: React.ComponentType<{ className?: string }>; tone: "success" | "danger"; onClick: () => void }) { const color = tone === "success" ? "var(--success)" : "var(--danger)"; return <button aria-label={title} title={title} disabled={disabled} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-md ring-1 disabled:opacity-50" style={{ color, borderColor: "transparent", background: `color-mix(in oklab, ${color} 9%, transparent)` }}><Icon className="h-4 w-4" /></button>; }

function mapDocumento(item: TmsDocumentoApi): NotaRow { return { id: item.id, tipo: item.tipo === "DC" ? "DC" : item.tipo === "NFCe" ? "NFC-e" : "NF-e", numero: item.numero ?? item.chave_acesso ?? "-", cliente: item.cliente_nome ?? item.remetente_nome ?? "Cliente nao informado", valor: item.valor ?? 0, carga: item.carga_codigo ?? "-", viagem: item.viagem_codigo ?? "-", pagamento: item.pagamento === "FOB" ? "FOB" : "CIF", status: item.status === "divergente" ? "divergente" : item.status === "conferida" ? "conferida" : "pendente", volumes: Number(item.total_volumes ?? 0), agendadoPara: item.agendado_para }; }
function emptyForm(): LaunchForm { return { uploadId: "", clienteRemetenteId: "", remetenteNome: "", remetenteDocumento: "", remetenteTelefone: "", tipo: "NFe", pagamento: "CIF", numero: "", viagemId: "", cidadeDestinoSigla: "", valor: "", pesoTotal: "", totalVolumes: "1", destinatarioNome: "", destinatarioDocumento: "", destinatarioTelefone: "", agendamentoData: todayDateInput(), agendadoPara: "" }; }
function parseNumber(value: string) { const parsed = Number(value.replace(/\./g, "").replace(",", ".").trim()); return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined; }
function todayDateInput() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function formatSlot(value: string) { return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatDate(value: string) { return value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "a data selecionada"; }
function formatBytes(value: number) { return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }
function cityLabel(sigla: string, cidades: CidadeApi[] | undefined) { const city = cidades?.find((item) => item.sigla === sigla); return city ? `${city.nome} · ${sigla}` : sigla; }
