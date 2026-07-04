import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes, Smartphone, Plus,
  CheckCircle2, AlertTriangle, FileText, Layers, Check, X,
  ClipboardCheck, Tag as TagIcon, Ship,
  Car,
} from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, PrimaryButton,
} from "@/components/ops/primitives";
import { NotasTab } from "@/components/ops/tms/NotasTab";
import { PaletesTab } from "@/components/ops/tms/PaletesTab";
import { PrestacaoTab } from "@/components/ops/tms/PrestacaoTab";
import { EtiquetaTab } from "@/components/ops/tms/EtiquetaTab";
import { ControleTab } from "@/components/ops/tms/ControleTab";
import { VeiculosTab } from "@/components/ops/tms/VeiculosTab";
import {
  AjcApiError,
  type ClienteApi,
  type EmbarcacaoApi,
  type NavegacaoViagemApi,
  type TmsCargaApi,
  type TmsDocumentoApi,
  type TmsEntregaApi,
  type TmsPaleteApi,
  type TmsPortariaApi,
  type TmsVolumeApi,
  type VeiculoEnvioApi,
  createTmsCarga,
  listEmbarcacoes,
  listClientes,
  listNavegacaoViagens,
  listTmsCargas,
  listTmsDocumentos,
  listTmsEntregas,
  listTmsPaletes,
  listTmsPortaria,
  listTmsVolumes,
  listVeiculosEnvios,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/app/tms")({
  head: () => ({ meta: [{ title: "TMS / Carga · AJC Suite" }] }),
  component: TMS,
});

type Tab = "ctrl" | "notas" | "paletes" | "prestacao" | "etiqueta" | "veiculos";

type TabDef = { id: Tab; label: string; spec: string; icon: React.ComponentType<{ className?: string }> };

type NovaCargaForm = {
  viagemId: string;
  clienteRemetenteId: string;
  documentoIds: string[];
  destinatarioNome: string;
  cidadeOrigemSigla: string;
  cidadeDestinoSigla: string;
  tipoRecebimento: "porto_balsa" | "direto";
  documentoTipo: "NFe" | "NFCe" | "DC";
  numeroDocumento: string;
  valorDeclarado: string;
  valorCobrado: string;
  pesoTotal: string;
  totalVolumes: string;
};

const initialNovaCargaForm: NovaCargaForm = {
  viagemId: "",
  clienteRemetenteId: "",
  documentoIds: [],
  destinatarioNome: "",
  cidadeOrigemSigla: "",
  cidadeDestinoSigla: "",
  tipoRecebimento: "porto_balsa",
  documentoTipo: "NFe",
  numeroDocumento: "",
  valorDeclarado: "",
  valorCobrado: "",
  pesoTotal: "",
  totalVolumes: "1",
};

// Sub-navegação agrupada para manter o padrão visual com muitas telas.
// Apps de campo migraram para a área dedicada `/campo` (FieldShell, sem o dock de gestão).
const TAB_GROUPS: { group: string; tabs: TabDef[] }[] = [
  {
    group: "Operação web",
    tabs: [
      { id: "ctrl",      label: "Controle por viagem", spec: "B.11", icon: Ship },
      { id: "notas",     label: "Notas & DC",          spec: "B.2/B.3", icon: FileText },
      { id: "paletes",   label: "Paletes",             spec: "B.6", icon: Layers },
      { id: "etiqueta",  label: "Etiqueta",            spec: "B.5", icon: TagIcon },
      { id: "veiculos",  label: "Veículos/Máquinas",   spec: "RF-5", icon: Car },
      { id: "prestacao", label: "Prestação de contas", spec: "B.10", icon: ClipboardCheck },
    ],
  },
];

function TMS() {
  const [tab, setTab] = useState<Tab>("ctrl");
  const [showNovaCarga, setShowNovaCarga] = useState(false);
  const [novaCargaForm, setNovaCargaForm] = useState<NovaCargaForm>(initialNovaCargaForm);
  const [clienteBusca, setClienteBusca] = useState("");
  const [savingNovaCarga, setSavingNovaCarga] = useState(false);
  const [novaCargaError, setNovaCargaError] = useState<string | null>(null);
  const [data, setData] = useState<TmsData>({
    cargas: [],
    documentos: [],
    volumes: [],
    paletes: [],
    portaria: [],
    entregas: [],
    veiculos: [],
    viagens: [],
    embarcacoes: [],
    clientes: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      listTmsCargas(),
      listTmsDocumentos(),
      listTmsVolumes(),
      listTmsPaletes(),
      listTmsPortaria(),
      listTmsEntregas(),
      listVeiculosEnvios(),
      listNavegacaoViagens(),
      listEmbarcacoes(),
      listClientes(),
    ])
      .then(([cargas, documentos, volumes, paletes, portaria, entregas, veiculos, viagens, embarcacoes, clientes]) => {
        if (!active) return;
        setData({
          cargas: ensureArray(cargas),
          documentos: ensureArray(documentos),
          volumes: ensureArray(volumes),
          paletes: ensureArray(paletes),
          portaria: ensureArray(portaria),
          entregas: ensureArray(entregas),
          veiculos: ensureArray(veiculos),
          viagens: ensureArray(viagens),
          embarcacoes: ensureArray(embarcacoes),
          clientes: ensureArray(clientes),
        });
        setLoadError(null);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof AjcApiError ? err.message : "Nao foi possivel carregar o TMS.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setNovaCargaForm((prev) => {
      const viagem = data.viagens.find((item) => item.id === prev.viagemId) ?? data.viagens[0];
      return {
        ...prev,
        viagemId: prev.viagemId || viagem?.id || "",
        clienteRemetenteId: prev.clienteRemetenteId,
        cidadeOrigemSigla: prev.cidadeOrigemSigla || viagem?.origemSigla || "",
        cidadeDestinoSigla: prev.cidadeDestinoSigla || viagem?.destinoSigla || "",
      };
    });
  }, [data.viagens, data.clientes]);

  const total = data.volumes.length;
  const conferidos = data.volumes.filter((v) => v.status !== "recebido").length;
  const divergentes = data.volumes.filter((v) => v.status === "divergente").length;
  const entregues = data.volumes.filter((v) => v.status === "entregue").length;
  const clienteSelecionado = data.clientes.find((cliente) => cliente.id === novaCargaForm.clienteRemetenteId) ?? null;
  const clientesFiltrados = useMemo(() => filterClientes(data.clientes, clienteBusca), [data.clientes, clienteBusca]);
  const documentosDoCliente = useMemo(
    () => data.documentos.filter((documento) => documento.cliente_id === novaCargaForm.clienteRemetenteId),
    [data.documentos, novaCargaForm.clienteRemetenteId],
  );
  const documentosSelecionados = useMemo(
    () => novaCargaForm.documentoIds
      .map((id) => documentosDoCliente.find((documento) => documento.id === id))
      .filter((documento): documento is TmsDocumentoApi => Boolean(documento)),
    [documentosDoCliente, novaCargaForm.documentoIds],
  );
  const novaCargaPreview = useMemo(() => buildNovaCargaPreview(data, novaCargaForm, clienteSelecionado, documentosSelecionados), [data, novaCargaForm, clienteSelecionado, documentosSelecionados]);

  async function submitNovaCarga(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNovaCargaError(null);
    if (!novaCargaForm.viagemId) {
      setNovaCargaError("Selecione a viagem.");
      return;
    }
    if (!novaCargaForm.clienteRemetenteId) {
      setNovaCargaError("Selecione o cliente remetente.");
      return;
    }
    if (novaCargaForm.documentoIds.length === 0) {
      setNovaCargaError("Selecione ao menos uma NF/DC vinculada ao cliente.");
      return;
    }
    if (!novaCargaForm.cidadeDestinoSigla.trim()) {
      setNovaCargaError("Informe o destino.");
      return;
    }
    const totalVolumes = Number.parseInt(novaCargaForm.totalVolumes, 10);
    if (!Number.isFinite(totalVolumes) || totalVolumes < 1) {
      setNovaCargaError("Volumes deve ser maior que zero.");
      return;
    }

    setSavingNovaCarga(true);
    try {
      await createTmsCarga({
        categoria: "carga",
        viagemId: novaCargaForm.viagemId,
        clienteRemetenteId: novaCargaForm.clienteRemetenteId,
        destinatarioNome: novaCargaForm.destinatarioNome.trim() || undefined,
        cidadeOrigemSigla: novaCargaForm.cidadeOrigemSigla.trim().toUpperCase() || undefined,
        cidadeDestinoSigla: novaCargaForm.cidadeDestinoSigla.trim().toUpperCase(),
        tipoRecebimento: novaCargaForm.tipoRecebimento,
        valorDeclarado: parseMoney(novaCargaForm.valorDeclarado),
        valorCobrado: parseMoney(novaCargaForm.valorCobrado),
        pesoTotal: parseMoney(novaCargaForm.pesoTotal),
        totalVolumes,
        numeroPedido: novaCargaPreview.pedido,
        documentoIds: novaCargaForm.documentoIds,
        numeroDocumento: novaCargaForm.numeroDocumento.trim() || undefined,
        documento: novaCargaForm.numeroDocumento.trim() && novaCargaForm.documentoIds.length === 0
          ? {
              tipo: novaCargaForm.documentoTipo,
              numero: novaCargaForm.numeroDocumento.trim(),
              valor: parseMoney(novaCargaForm.valorDeclarado),
              origem: "manual",
            }
          : undefined,
        clientUuid: crypto.randomUUID(),
      });
      const [cargas, documentos, volumes] = await Promise.all([listTmsCargas(), listTmsDocumentos(), listTmsVolumes()]);
      setData((prev) => ({ ...prev, cargas: ensureArray(cargas), documentos: ensureArray(documentos), volumes: ensureArray(volumes) }));
      setNovaCargaForm((prev) => ({
        ...initialNovaCargaForm,
        viagemId: prev.viagemId,
        clienteRemetenteId: "",
        cidadeOrigemSigla: prev.cidadeOrigemSigla,
        cidadeDestinoSigla: prev.cidadeDestinoSigla,
      }));
      setClienteBusca("");
      setShowNovaCarga(false);
    } catch (err) {
      setNovaCargaError(err instanceof Error ? err.message : "Nao foi possivel criar a carga.");
    } finally {
      setSavingNovaCarga(false);
    }
  }

  function selecionarCliente(cliente: ClienteApi) {
    setClienteBusca(`${cliente.codigo} - ${cliente.nome}`);
    setNovaCargaForm((prev) => ({
      ...prev,
      clienteRemetenteId: cliente.id,
      documentoIds: [],
      numeroDocumento: "",
      valorDeclarado: "",
      pesoTotal: "",
    }));
  }

  function toggleDocumento(documento: TmsDocumentoApi) {
    if (documento.carga_id) return;
    setNovaCargaForm((prev) => {
      const exists = prev.documentoIds.includes(documento.id);
      const documentoIds = exists ? prev.documentoIds.filter((id) => id !== documento.id) : [...prev.documentoIds, documento.id];
      const selecionados = documentoIds
        .map((id) => documentosDoCliente.find((item) => item.id === id))
        .filter((item): item is TmsDocumentoApi => Boolean(item));
      const primeiro = selecionados[0];
      return {
        ...prev,
        documentoIds,
        documentoTipo: normalizeDocumentoTipo(primeiro?.tipo ?? prev.documentoTipo),
        numeroDocumento: primeiro?.numero ?? "",
        valorDeclarado: selecionados.length ? formatDecimalInput(soma(selecionados.map((item) => item.valor))) : "",
        pesoTotal: selecionados.length ? formatDecimalInput(soma(selecionados.map((item) => item.peso_total))) : "",
        cidadeOrigemSigla: primeiro?.cidade_origem_sigla ?? prev.cidadeOrigemSigla,
        cidadeDestinoSigla: primeiro?.cidade_destino_sigla ?? prev.cidadeDestinoSigla,
      };
    });
  }

  return (
    <AppShell crumb="TMS · Carga">
      <SectionHeader
        eyebrow="Coração antifraude"
        title="TMS · Volumes, conferência e entrega"
        description="Cada volume nasce com UUID, é bipado, etiquetado, fotografado, conferido duas vezes e entregue com prova."
        actions={
          <>
            <Link
              to="/campo"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[color:var(--surface-elev)] px-4 text-sm font-medium text-foreground/85 ring-1 ring-[color:var(--hairline)] backdrop-blur-md transition-colors hover:bg-[color:var(--accent)] hover:text-foreground"
            >
              <Smartphone className="h-4 w-4" strokeWidth={1.7} />
              Abrir app de campo
            </Link>
            <PrimaryButton icon={Plus} onClick={() => setShowNovaCarga((v) => !v)}>Nova carga</PrimaryButton>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Volumes em rastreio" value={String(total)} hint="todos com QR ativo" icon={Boxes} />
        <KPIStat index={1} label="Conferidos hoje" value={String(conferidos)} hint={loading ? "carregando API" : "incluindo 2º bipe"} delta={{ value: "API", positive: true }} icon={CheckCircle2} />
        <KPIStat index={2} label="Divergências" value={String(divergentes)} hint="bloqueia entrega" icon={AlertTriangle} />
        <KPIStat index={3} label="Entregues" value={String(entregues)} hint="com foto + assinatura" />
      </section>

      {loadError && (
        <div className="mt-4 rounded-lg border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-foreground">
          {loadError}
        </div>
      )}

      {showNovaCarga && (
        <form onSubmit={submitNovaCarga} className="mt-6 surface-card brand-rail brand-rail-left p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Plus className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Nova carga</h3>
            <span className="rounded-full bg-[color:color-mix(in_oklab,var(--success)_14%,transparent)] px-2.5 py-1 text-[11px] text-[color:var(--success)] ring-1 ring-[color:color-mix(in_oklab,var(--success)_35%,transparent)]">campos Lucas (30/jun)</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Pedido = COD CLIENTE + NF/DC. UUID/QR e codigo de carga sao gerados pelo sistema. Cliente, peso e valor podem vir da NF/DC ou preenchimento manual.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <CargaField label="Numero do pedido / venda" value={novaCargaPreview.pedido} hint="COD CLIENTE + NF/DC" />
            <CargaField label="UUID de carga / QR Code" value={novaCargaPreview.uuid} hint="auto" mono />
            <CargaField label="Codigo de carga" value={novaCargaPreview.codigo} hint="auto" mono />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <FormSelect
              label="Viagem"
              value={novaCargaForm.viagemId}
              onChange={(viagemId) => {
                const viagem = data.viagens.find((item) => item.id === viagemId);
                setNovaCargaForm((prev) => ({
                  ...prev,
                  viagemId,
                  cidadeOrigemSigla: viagem?.origemSigla ?? prev.cidadeOrigemSigla,
                  cidadeDestinoSigla: viagem?.destinoSigla ?? prev.cidadeDestinoSigla,
                }));
              }}
            >
              <option value="">Selecionar viagem</option>
              {data.viagens.map((viagem) => (
                <option key={viagem.id} value={viagem.id}>
                  {viagem.codigo ?? "sem codigo"} - {viagem.origemSigla} -&gt; {viagem.destinoSigla ?? "destino"}
                </option>
              ))}
            </FormSelect>
            <FormInput label="Origem" value={novaCargaForm.cidadeOrigemSigla} onChange={(cidadeOrigemSigla) => setNovaCargaForm((prev) => ({ ...prev, cidadeOrigemSigla }))} placeholder="BEL" maxLength={4} />
            <FormInput label="Destino" value={novaCargaForm.cidadeDestinoSigla} onChange={(cidadeDestinoSigla) => setNovaCargaForm((prev) => ({ ...prev, cidadeDestinoSigla }))} placeholder="STM" maxLength={4} />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <ClienteSearchField
              busca={clienteBusca}
              clientes={clientesFiltrados}
              selecionado={clienteSelecionado}
              onBuscaChange={(value) => {
                setClienteBusca(value);
                if (novaCargaForm.clienteRemetenteId) {
                  setNovaCargaForm((prev) => ({ ...prev, clienteRemetenteId: "", documentoIds: [], numeroDocumento: "", valorDeclarado: "", pesoTotal: "" }));
                }
              }}
              onSelect={selecionarCliente}
            />
            <FormInput label="Destinatario" value={novaCargaForm.destinatarioNome} onChange={(destinatarioNome) => setNovaCargaForm((prev) => ({ ...prev, destinatarioNome }))} placeholder="nome/empresa ou manual" />
            <FormSelect label="Recebimento" value={novaCargaForm.tipoRecebimento} onChange={(tipoRecebimento) => setNovaCargaForm((prev) => ({ ...prev, tipoRecebimento: tipoRecebimento as NovaCargaForm["tipoRecebimento"] }))}>
              <option value="porto_balsa">Porto/balsa</option>
              <option value="direto">Direto</option>
            </FormSelect>
          </div>

          <DocumentoClientePicker
            documentos={documentosDoCliente}
            selecionados={novaCargaForm.documentoIds}
            clienteSelecionado={Boolean(novaCargaForm.clienteRemetenteId)}
            onToggle={toggleDocumento}
          />

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <FormSelect label="Documento" value={novaCargaForm.documentoTipo} onChange={(documentoTipo) => setNovaCargaForm((prev) => ({ ...prev, documentoTipo: documentoTipo as NovaCargaForm["documentoTipo"] }))}>
              <option value="NFe">NF-e</option>
              <option value="NFCe">NFC-e</option>
              <option value="DC">DC</option>
            </FormSelect>
            <FormInput label="Numero NF/DC" value={novaCargaForm.numeroDocumento} onChange={(numeroDocumento) => setNovaCargaForm((prev) => ({ ...prev, numeroDocumento }))} placeholder="18432" />
            <FormInput label="Peso total" value={novaCargaForm.pesoTotal} onChange={(pesoTotal) => setNovaCargaForm((prev) => ({ ...prev, pesoTotal }))} placeholder="1240" inputMode="decimal" />
            <FormInput label="Volumes" value={novaCargaForm.totalVolumes} onChange={(totalVolumes) => setNovaCargaForm((prev) => ({ ...prev, totalVolumes }))} placeholder="1" inputMode="numeric" />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <FormInput label="Valor NF/DC" value={novaCargaForm.valorDeclarado} onChange={(valorDeclarado) => setNovaCargaForm((prev) => ({ ...prev, valorDeclarado }))} placeholder="38900,00" inputMode="decimal" />
            <FormInput label="Frete cobrado" value={novaCargaForm.valorCobrado} onChange={(valorCobrado) => setNovaCargaForm((prev) => ({ ...prev, valorCobrado }))} placeholder="1200,00" inputMode="decimal" />
            <CargaField label="Agendamento de recebimento" value={novaCargaPreview.agenda} hint="max 5 caminhoes/janela" />
          </div>

          {novaCargaError && <p className="mt-3 rounded-md bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)] ring-1 ring-[color:var(--danger)]/30">{novaCargaError}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNovaCarga(false)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[color:var(--surface-elev)] px-4 text-sm font-medium text-foreground/85 ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--accent)]"
            >
              <X className="h-4 w-4" strokeWidth={1.7} />
              Cancelar
            </button>
            <PrimaryButton type="submit" icon={Check} disabled={savingNovaCarga || data.viagens.length === 0 || data.clientes.length === 0}>
              {savingNovaCarga ? "Salvando..." : "Salvar carga"}
            </PrimaryButton>
          </div>
        </form>
      )}
      {/* Sub-navegação agrupada */}
      <nav className="mt-6 space-y-2">
        {TAB_GROUPS.map((g) => (
          <div key={g.group} className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{g.group}</span>
            {g.tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"
                      : "text-muted-foreground ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)] hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                  <span className="font-mono text-[9px] text-muted-foreground/70">{t.spec}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {tab === "ctrl" && <ControleTab cargas={data.cargas} volumes={data.volumes} viagens={data.viagens} embarcacoes={data.embarcacoes} />}
      {tab === "notas" && (
        <NotasTab
          cargas={data.cargas}
          documentos={data.documentos}
          volumes={data.volumes}
          viagens={data.viagens}
          clientes={data.clientes}
          onCargasChange={(cargas) => setData((prev) => ({ ...prev, cargas }))}
          onDocumentosChange={(documentos) => setData((prev) => ({ ...prev, documentos }))}
          onVolumesChange={(volumes) => setData((prev) => ({ ...prev, volumes }))}
        />
      )}
      {tab === "paletes" && (
        <PaletesTab
          paletes={data.paletes}
          volumes={data.volumes}
          viagens={data.viagens}
          onPaletesChange={(paletes) => setData((prev) => ({ ...prev, paletes }))}
        />
      )}
      {tab === "etiqueta" && <EtiquetaTab volumes={data.volumes} />}
      {tab === "veiculos" && (
        <VeiculosTab
          envios={data.veiculos}
          viagens={data.viagens}
          onEnviosChange={(veiculos) => setData((prev) => ({ ...prev, veiculos }))}
        />
      )}
      {tab === "prestacao" && <PrestacaoTab />}
    </AppShell>
  );
}

function ClienteSearchField({
  busca,
  clientes,
  selecionado,
  onBuscaChange,
  onSelect,
}: {
  busca: string;
  clientes: ClienteApi[];
  selecionado: ClienteApi | null;
  onBuscaChange: (value: string) => void;
  onSelect: (cliente: ClienteApi) => void;
}) {
  const showResults = !selecionado || normalizeSearch(busca) !== normalizeSearch(`${selecionado.codigo} - ${selecionado.nome}`);
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cliente</span>
      <div className="relative mt-1">
        <input
          value={busca}
          onChange={(event) => onBuscaChange(event.target.value)}
          placeholder="buscar por codigo, nome ou documento"
          className="h-10 w-full rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-[color:var(--brand)]"
        />
        {showResults && (
          <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-md border border-[color:var(--hairline)] bg-[color:var(--surface)] shadow-2xl">
            {clientes.slice(0, 10).map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onClick={() => onSelect(cliente)}
                className="block w-full border-b border-[color:var(--hairline)] px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-[color:var(--accent)]"
              >
                <span className="font-mono text-[11px] text-[color:var(--brand)]">{cliente.codigo}</span>
                <span className="ml-2 font-medium text-foreground">{cliente.nome}</span>
                {cliente.cpfCnpj && <span className="mt-0.5 block text-[11px] text-muted-foreground">{cliente.cpfCnpj}</span>}
              </button>
            ))}
            {clientes.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum cliente encontrado.</div>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

function DocumentoClientePicker({
  documentos,
  selecionados,
  clienteSelecionado,
  onToggle,
}: {
  documentos: TmsDocumentoApi[];
  selecionados: string[];
  clienteSelecionado: boolean;
  onToggle: (documento: TmsDocumentoApi) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-[color:var(--hairline)] bg-[color:var(--muted)]/45 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">NF/DC do cliente</p>
        <span className="text-[10px] text-muted-foreground">{selecionados.length} selecionada(s)</span>
      </div>
      {!clienteSelecionado && <p className="mt-2 text-xs text-muted-foreground">Selecione o cliente para carregar as notas conectadas a ele.</p>}
      {clienteSelecionado && documentos.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Nao ha NF/DC livre para este cliente.</p>}
      {clienteSelecionado && documentos.length > 0 && (
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {documentos.map((documento) => {
            const checked = selecionados.includes(documento.id);
            const disabled = Boolean(documento.carga_id);
            return (
              <button
                key={documento.id}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(documento)}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  checked
                    ? "border-[color:var(--brand)] bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-foreground"
                    : "border-[color:var(--hairline)] bg-[color:var(--surface-elev)] text-foreground/85 hover:bg-[color:var(--accent)]"
                } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
              >
                <span className="block font-mono text-xs">
                  {documento.tipo}-{documento.numero ?? "sem-numero"}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {documento.cidade_origem_sigla ?? "--"} -&gt; {documento.cidade_destino_sigla ?? "--"}
                  {typeof documento.valor === "number" ? ` - ${formatCurrency(documento.valor)}` : ""}
                </span>
                {disabled && <span className="mt-1 block text-[10px] text-[color:var(--danger)]">ja vinculada a carga</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CargaField({ label, value, hint, mono }: { label: string; value: string; hint?: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {hint && <span className="text-[9px] text-muted-foreground/70">{hint}</span>}
      </div>
      <div className={`mt-1 flex min-h-10 items-center rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="mt-1 h-10 w-full rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-[color:var(--brand)]"
      />
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm text-foreground outline-none transition-colors focus:border-[color:var(--brand)]"
      >
        {children}
      </select>
    </label>
  );
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function filterClientes(clientes: ClienteApi[], query: string) {
  const needle = normalizeSearch(query);
  if (!needle) return clientes;
  return clientes.filter((cliente) =>
    [cliente.codigo, cliente.nome, cliente.cpfCnpj ?? ""].some((value) => normalizeSearch(value).includes(needle)),
  );
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function soma(values: Array<number | string | null | undefined>) {
  const total = values.reduce((sum, value) => {
    const numeric = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(numeric) ? sum + Number(numeric) : sum;
  }, 0);
  return total > 0 ? total : undefined;
}

function formatDecimalInput(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value).replace(".", ",") : "";
}

function normalizeDocumentoTipo(tipo: string): NovaCargaForm["documentoTipo"] {
  if (tipo === "NFCe") return "NFCe";
  if (tipo === "DC") return "DC";
  return "NFe";
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

type TmsData = {
  cargas: TmsCargaApi[];
  documentos: TmsDocumentoApi[];
  volumes: TmsVolumeApi[];
  paletes: TmsPaleteApi[];
  portaria: TmsPortariaApi[];
  entregas: TmsEntregaApi[];
  veiculos: VeiculoEnvioApi[];
  viagens: NavegacaoViagemApi[];
  embarcacoes: EmbarcacaoApi[];
  clientes: ClienteApi[];
};

function buildNovaCargaPreview(
  data: TmsData,
  form: NovaCargaForm,
  cliente: ClienteApi | null,
  documentosSelecionados: TmsDocumentoApi[],
) {
  const carga = data.cargas[0];
  const volume = data.volumes.find((v) => v.carga_id === carga?.id) ?? data.volumes[0];
  const viagem = data.viagens.find((v) => v.id === form.viagemId) ?? data.viagens.find((v) => v.codigo === carga?.viagem_codigo) ?? data.viagens[0];
  const primeiroDocumento = documentosSelecionados[0];
  return {
    pedido: buildPedidoVenda(cliente, primeiroDocumento, form),
    uuid: volume ? `${safeShortId(volume.uuid, volume.id)}... · QR gerado` : "gerado ao salvar",
    codigo: carga?.codigo ?? "gerado ao salvar",
    viagem: viagem ? `${viagem.codigo ?? "sem codigo"} · ${viagem.origemSigla} �  ${viagem.destinoSigla ?? "destino"}` : "selecionar viagem",
    origem: form.cidadeOrigemSigla || carga?.cidade_origem_sigla || viagem?.origemSigla || "selecionar",
    destino: form.cidadeDestinoSigla || carga?.cidade_destino_sigla || viagem?.destinoSigla || "selecionar",
    cliente: cliente ? `${cliente.codigo} - ${cliente.nome}` : carga?.remetente_nome ?? "buscar cliente",
    documento: documentosSelecionados.length
      ? documentosSelecionados.map((documento) => `${documento.tipo}-${documento.numero ?? "sem-numero"}`).join(", ")
      : "selecione NF/DC do cliente",
    peso: form.pesoTotal ? `${form.pesoTotal} kg` : carga?.peso_total ? `${carga.peso_total.toLocaleString("pt-BR")} kg` : "manual",
    valor: form.valorDeclarado ? formatCurrency(parseMoney(form.valorDeclarado) ?? 0) : carga?.valor_declarado ? formatCurrency(carga.valor_declarado) : "manual",
    agenda: data.portaria[0]?.entrada_em ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(data.portaria[0].entrada_em)) : "janela a definir",
  };
}

function buildPedidoVenda(cliente: ClienteApi | null, documento: TmsDocumentoApi | undefined, form: NovaCargaForm) {
  if (!cliente) return "selecione cliente + NF/DC";
  const numero = documento?.numero ?? form.numeroDocumento.trim();
  if (!numero) return `${cliente.codigo}-NF/DC`;
  const tipo = String(documento?.tipo ?? form.documentoTipo ?? "NFe").toLowerCase();
  return `${cliente.codigo}-${tipo}-${numero}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function safeShortId(...values: Array<unknown>) {
  const value = values.find((item) => typeof item === "string" && item.trim().length > 0);
  return typeof value === "string" ? value.slice(0, 8) : "sem-uuid";
}
