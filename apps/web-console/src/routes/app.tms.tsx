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
        setData({ cargas, documentos, volumes, paletes, portaria, entregas, veiculos, viagens, embarcacoes, clientes });
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
        clienteRemetenteId: prev.clienteRemetenteId || data.clientes[0]?.id || "",
        cidadeOrigemSigla: prev.cidadeOrigemSigla || viagem?.origemSigla || "",
        cidadeDestinoSigla: prev.cidadeDestinoSigla || viagem?.destinoSigla || "",
      };
    });
  }, [data.viagens, data.clientes]);

  const total = data.volumes.length;
  const conferidos = data.volumes.filter((v) => v.status !== "recebido").length;
  const divergentes = data.volumes.filter((v) => v.status === "divergente").length;
  const entregues = data.volumes.filter((v) => v.status === "entregue").length;
  const novaCargaPreview = useMemo(() => buildNovaCargaPreview(data), [data]);

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
        numeroDocumento: novaCargaForm.numeroDocumento.trim() || undefined,
        documento: novaCargaForm.numeroDocumento.trim()
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
      setData((prev) => ({ ...prev, cargas, documentos, volumes }));
      setNovaCargaForm((prev) => ({
        ...initialNovaCargaForm,
        viagemId: prev.viagemId,
        clienteRemetenteId: prev.clienteRemetenteId,
        cidadeOrigemSigla: prev.cidadeOrigemSigla,
        cidadeDestinoSigla: prev.cidadeDestinoSigla,
      }));
      setShowNovaCarga(false);
    } catch (err) {
      setNovaCargaError(err instanceof Error ? err.message : "Nao foi possivel criar a carga.");
    } finally {
      setSavingNovaCarga(false);
    }
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
            <FormSelect label="Cliente" value={novaCargaForm.clienteRemetenteId} onChange={(clienteRemetenteId) => setNovaCargaForm((prev) => ({ ...prev, clienteRemetenteId }))}>
              <option value="">Selecionar cliente</option>
              {data.clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </FormSelect>
            <FormInput label="Destinatario" value={novaCargaForm.destinatarioNome} onChange={(destinatarioNome) => setNovaCargaForm((prev) => ({ ...prev, destinatarioNome }))} placeholder="nome/empresa ou manual" />
            <FormSelect label="Recebimento" value={novaCargaForm.tipoRecebimento} onChange={(tipoRecebimento) => setNovaCargaForm((prev) => ({ ...prev, tipoRecebimento: tipoRecebimento as NovaCargaForm["tipoRecebimento"] }))}>
              <option value="porto_balsa">Porto/balsa</option>
              <option value="direto">Direto</option>
            </FormSelect>
          </div>

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

function buildNovaCargaPreview(data: TmsData) {
  const carga = data.cargas[0];
  const volume = data.volumes.find((v) => v.carga_id === carga?.id) ?? data.volumes[0];
  const viagem = data.viagens.find((v) => v.codigo === carga?.viagem_codigo) ?? data.viagens[0];
  return {
    pedido: carga?.numero_pedido ?? "gerado ao salvar",
    uuid: volume ? `${volume.uuid.slice(0, 8)}... · QR gerado` : "gerado ao salvar",
    codigo: carga?.codigo ?? "gerado ao salvar",
    viagem: viagem ? `${viagem.codigo ?? "sem codigo"} · ${viagem.origemSigla} → ${viagem.destinoSigla ?? "destino"}` : "selecionar viagem",
    origem: carga?.cidade_origem_sigla ?? viagem?.origemSigla ?? "selecionar",
    destino: carga?.cidade_destino_sigla ?? viagem?.destinoSigla ?? "selecionar",
    cliente: carga?.remetente_nome ?? "NF/DC ou preenchimento manual",
    documento: carga?.numero_pedido ? `${carga.numero_pedido} · vinculado` : "anexar NF/DC",
    peso: carga?.peso_total ? `${carga.peso_total.toLocaleString("pt-BR")} kg` : "manual",
    valor: carga?.valor_declarado ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(carga.valor_declarado) : "manual",
    agenda: data.portaria[0]?.entrada_em ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(data.portaria[0].entrada_em)) : "janela a definir",
  };
}
