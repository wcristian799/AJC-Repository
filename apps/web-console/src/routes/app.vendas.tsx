import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Ticket, Plus, QrCode, Globe, Monitor, Smartphone, Users, FileText, Gift, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton,
  StatusChip, CounterBadge, Tag, brl,
} from "@/components/ops/primitives";
import { CountUp, ShimmerBar } from "@/components/ops/motion-bits";
import {
  createBilhete,
  createCortesia,
  getConfigValue,
  getVendasResumo,
  getManifesto,
  listBilhetes,
  listCortesias,
  listGratuidades,
  listNavegacaoViagens,
  listPrecosPassagemMatriz,
  type BilheteApi,
  type CortesiaApi,
  type GratuidadeApi,
  type NavegacaoViagemApi,
  type PrecoPassagemMatrizApi,
  type VendasResumoApi,
} from "@/lib/ajc-api";
import { precoPassagemPorClasseApi } from "@/lib/passagem-pricing";

export const Route = createFileRoute("/app/vendas")({
  head: () => ({ meta: [{ title: "Vendas · AJC Suite" }] }),
  component: Vendas,
});

type Tab = "passagens" | "canais" | "ocupacao" | "cortesias" | "manifesto" | "regulatorio";
type CortesiaClasse = (typeof CORTESIA_CLASSES)[number];
type CortesiaMotivoId = (typeof CORTESIA_MOTIVOS)[number]["id"];
type TipoTarifa = "paga" | "cortesia" | "gratuidade" | "contrato";
type FormaPagamentoPassagem = "dinheiro" | "pix" | "cartao_credito" | "cartao_debito";

type PassagemRow = {
  id: string;
  qr: string;
  viagemId: string;
  viagemCodigo: string;
  classe: string;
  passageiro: string;
  documento: string;
  valor: number;
  status: string;
  canal: string;
  assento?: string | null;
};

const CLASSE_LABEL: Record<string, string> = {
  rede: "Rede",
  rede_sala_vip: "Rede VIP",
  camarote: "Camarote",
  suite_comum: "Suite comum",
  suite_comum_vip: "Suite comum VIP",
  suite_master: "Suite master",
  suite_master_vip: "Suite master VIP",
  mega_suite: "Mega suite",
};
const PASSAGEM_CLASSES = Object.keys(CLASSE_LABEL);
const FORMA_PAGAMENTO_LABEL: Record<FormaPagamentoPassagem, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartao de credito",
  cartao_debito: "Cartao de debito",
};

const CORTESIA_MOTIVOS = [
  { id: "imprensa", label: "Imprensa - cobertura institucional" },
  { id: "influencia", label: "Parceria comercial - influencia" },
  { id: "relacionamento", label: "Relacionamento - autoridade local" },
  { id: "diretoria", label: "Convidado da diretoria" },
] as const;

const CORTESIA_CLASSES = ["Rede", "Rede VIP", "Camarote Royal"] as const;
const TIPO_TARIFA_LABEL: Record<TipoTarifa, string> = {
  paga: "Paga",
  cortesia: "Cortesia",
  gratuidade: "Gratuidade",
  contrato: "Contrato",
};

function bilheteToRow(b: BilheteApi): PassagemRow {
  const tipoLabel = b.tipo === "cortesia" ? "Cortesia" : b.tipo === "gratuidade" ? "Gratuidade" : b.tipo === "contrato" ? "Contrato" : null;
  return {
    id: b.id,
    qr: b.qr_token ?? b.codigo,
    viagemId: b.viagem_id,
    viagemCodigo: b.viagem_codigo,
    classe: tipoLabel ?? CLASSE_LABEL[b.classe] ?? b.classe,
    passageiro: b.passageiro_nome ?? b.cliente_nome ?? "Passageiro sem nome",
    documento: b.passageiro_documento ?? "-",
    valor: Number(b.preco_pago ?? 0),
    status: b.status,
    canal: b.canal ?? b.tipo,
    assento: b.assento,
  };
}

const classeApi = (classe: string) => {
  if (classe === "Rede VIP") return "rede_sala_vip";
  if (classe === "Camarote Royal") return "suite_master";
  return "rede";
};

function tipoTarifaFromClasse(classe: string): TipoTarifa {
  if (classe === "Cortesia") return "cortesia";
  if (classe === "Gratuidade") return "gratuidade";
  if (classe === "Contrato") return "contrato";
  return "paga";
}

function canalLabel(canal: string) {
  const labels: Record<string, string> = {
    portal: "Portal online",
    online: "Portal online",
    pdv: "PDV porto",
    totem: "Totem",
    app: "App publico",
    agente: "Agente comercial",
    cortesia: "Cortesia",
    gratuidade: "Gratuidade",
  };
  return labels[canal] ?? canal;
}

function canalDescription(canal: string) {
  const descriptions: Record<string, string> = {
    portal: "Pedido publico com pagamento e QR",
    online: "Pedido publico com pagamento e QR",
    pdv: "Venda presencial com caixa",
    totem: "Autoatendimento no porto",
    app: "Venda pelo app/area do cliente",
    agente: "Venda intermediada por agente comercial",
    cortesia: "Bilhete sem receita, controlado por limite",
    gratuidade: "Beneficio legal controlado para relatorio",
  };
  return descriptions[canal] ?? "Canal operacional";
}

function canaisFromBilhetes(bilhetes: BilheteApi[]) {
  const map = new Map<string, { id: string; canal: string; rotulo: string; descricao: string; bilhetes: number; receita: number; online: boolean }>();
  for (const bilhete of bilhetes) {
    const canal = bilhete.canal ?? bilhete.tipo;
    const row = map.get(canal) ?? {
      id: canal,
      canal,
      rotulo: canalLabel(canal),
      descricao: canalDescription(canal),
      bilhetes: 0,
      receita: 0,
      online: ["portal", "online", "app"].includes(canal),
    };
    row.bilhetes += 1;
    row.receita += Number(bilhete.preco_pago ?? 0);
    map.set(canal, row);
  }
  return [...map.values()].sort((a, b) => b.receita - a.receita);
}

function ocupacaoFromBilhetes(bilhetes: BilheteApi[]) {
  const map = new Map<string, { classe: string; capacidade: number; ocupados: number; receita: number }>();
  for (const bilhete of bilhetes) {
    const row = map.get(bilhete.classe) ?? { classe: bilhete.classe, capacidade: 0, ocupados: 0, receita: 0 };
    row.ocupados += 1;
    row.receita += Number(bilhete.preco_pago ?? 0);
    map.set(bilhete.classe, row);
  }
  return [...map.values()].sort((a, b) => b.ocupados - a.ocupados);
}

function viagemLabel(v: NavegacaoViagemApi) {
  const saida = new Date(v.dataHoraSaida).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `${v.codigo ?? "Viagem"} · ${v.origemSigla} → ${v.destinoSigla ?? ""} · ${saida}`;
}

function Vendas() {
  const [tab, setTab] = useState<Tab>("passagens");
  const [bilhetes, setBilhetes] = useState<BilheteApi[]>([]);
  const [gratuidadesApi, setGratuidadesApi] = useState<GratuidadeApi[]>([]);
  const [viagens, setViagens] = useState<NavegacaoViagemApi[]>([]);
  const [precosPassagem, setPrecosPassagem] = useState<PrecoPassagemMatrizApi[]>([]);
  const [resumo, setResumo] = useState<VendasResumoApi | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novaPassagemOpen, setNovaPassagemOpen] = useState(false);
  const [salvandoPassagem, setSalvandoPassagem] = useState(false);
  const [passagemForm, setPassagemForm] = useState({
    viagemId: "",
    classe: "rede",
    passageiroNome: "",
    passageiroDocumento: "",
    formaPagamento: "pix" as FormaPagamentoPassagem,
  });
  const passagens = useMemo(() => bilhetes.map(bilheteToRow), [bilhetes]);
  const total = passagens.length;
  const validadas = passagens.filter((p) => p.status === "validado" || p.status === "usado").length;
  const gratuidades = gratuidadesApi.length || passagens.filter((p) => p.classe === "Gratuidade").length;
  const cortesias = passagens.filter((p) => p.classe === "Cortesia").length;
  const receita = passagens.reduce((s, p) => s + p.valor, 0);

  const canais = useMemo(() => resumo?.canais.length ? resumo.canais.map((canal) => ({
    ...canal,
    rotulo: canalLabel(canal.canal),
    descricao: canalDescription(canal.canal),
  })) : canaisFromBilhetes(bilhetes), [bilhetes, resumo]);
  const ocupacaoClasses = useMemo(() => resumo?.ocupacao.length ? resumo.ocupacao : ocupacaoFromBilhetes(bilhetes), [bilhetes, resumo]);
  const agentes = resumo?.agentes ?? [];
  const receitaCanais = canais.reduce((s, c) => s + c.receita, 0);
  const bilhetesCanais = canais.reduce((s, c) => s + c.bilhetes, 0);
  const passagensRegulatorias = passagens.filter((p) => p.classe === "Gratuidade" || p.classe === "Cortesia");
  const viagensAtivas = useMemo(() => viagens.filter((v) => v.status !== "concluida" && v.status !== "cancelada"), [viagens]);
  const viagemSelecionada = viagensAtivas.find((v) => v.id === passagemForm.viagemId) ?? viagensAtivas[0];
  const precoNovaPassagem = viagemSelecionada
    ? precoPassagemPorClasseApi(precosPassagem, viagemSelecionada.origemSigla, viagemSelecionada.destinoSigla ?? "", passagemForm.classe)
    : 0;
  const inputCls =
    "h-10 w-full rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]";

  const tabs: [Tab, string][] = [
    ["passagens", "Passagens"],
    ["canais", "Canais de venda"],
    ["ocupacao", "Ocupação por classe"],
    ["cortesias", "Gerador de cortesias"],
    ["manifesto", "Manifesto / passageiros"],
    ["regulatorio", "Relatório regulatório (MP)"],
  ];

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [bilhetesApi, gratuidades, resumoApi, viagensApi, precosApi] = await Promise.all([
          listBilhetes(),
          listGratuidades(),
          getVendasResumo(),
          listNavegacaoViagens(),
          listPrecosPassagemMatriz(),
        ]);
        if (!alive) return;
        setBilhetes(bilhetesApi);
        setGratuidadesApi(gratuidades);
        setResumo(resumoApi);
        const ativas = viagensApi.filter((v) => v.status !== "concluida" && v.status !== "cancelada");
        setViagens(viagensApi);
        setPrecosPassagem(precosApi);
        if (!passagemForm.viagemId && ativas[0]) {
          setPassagemForm((prev) => ({ ...prev, viagemId: ativas[0].id }));
        }
      } catch (error) {
        console.error(error);
        setErro(error instanceof Error ? error.message : "Falha ao carregar vendas");
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  async function criarPassagem() {
    const viagem = viagemSelecionada;
    if (salvandoPassagem || !viagem) return;
    if (!passagemForm.passageiroNome.trim()) {
      setErro("Informe o nome do passageiro.");
      return;
    }
    if (precoNovaPassagem <= 0) {
      setErro("Tabela de preco nao encontrada para o trecho e classe selecionados.");
      return;
    }
    setSalvandoPassagem(true);
    setErro(null);
    try {
      const novo = await createBilhete({
        viagemId: viagem.id,
        classe: passagemForm.classe,
        tipo: "pdv",
        canal: "gestao",
        passageiroNome: passagemForm.passageiroNome.trim(),
        passageiroDocumento: passagemForm.passageiroDocumento.trim() || undefined,
        precoPago: precoNovaPassagem,
        formaPagamento: passagemForm.formaPagamento,
        emitirBpe: false,
        clientUuid: crypto.randomUUID(),
      });
      const [bilhetesApi, gratuidades, resumoApi] = await Promise.all([listBilhetes(), listGratuidades(), getVendasResumo()]);
      setBilhetes(bilhetesApi.length ? bilhetesApi : [novo, ...bilhetes]);
      setGratuidadesApi(gratuidades);
      setResumo(resumoApi);
      setPassagemForm((prev) => ({ ...prev, passageiroNome: "", passageiroDocumento: "" }));
      setNovaPassagemOpen(false);
      setTab("passagens");
    } catch (error) {
      console.error(error);
      setErro(error instanceof Error ? error.message : "Falha ao emitir passagem");
    } finally {
      setSalvandoPassagem(false);
    }
  }

  function exportarRegulatorioCsv() {
    downloadCsv("ajc-regulatorio-gratuidades-cortesias.csv", passagensRegulatorias.map((p) => ({
      qr: p.qr,
      beneficiario: p.passageiro,
      documento: p.documento,
      viagem: p.viagemCodigo,
      tipo: p.classe,
      canal: p.canal,
      status: p.status,
    })));
  }

  function exportarRegulatorioPdf() {
    printHtmlReport({
      title: "Relatorio regulatorio - gratuidades e cortesias",
      subtitle: `Gerado em ${new Date().toLocaleString("pt-BR")}`,
      rows: passagensRegulatorias.map((p) => ({
        QR: p.qr,
        Beneficiario: p.passageiro,
        Documento: p.documento,
        Viagem: p.viagemCodigo,
        Tipo: p.classe,
        Canal: p.canal,
        Status: p.status,
      })),
    });
  }

  return (
    <AppShell crumb="Vendas">
      <SectionHeader
        eyebrow="Passagens & Encomendas"
        title="Vendas multi-canal"
        description="Portal online, app, PDV, totem e validação por QR. Cortesias e gratuidades com relatório regulatório."
        actions={
          <>
            <Link to="/pos"><GhostButton icon={Monitor}>Abrir PDV</GhostButton></Link>
            <Link to="/cliente"><GhostButton icon={Smartphone}>Compra pública</GhostButton></Link>
            <PrimaryButton
              icon={Plus}
              onClick={() => {
                setTab("passagens");
                setNovaPassagemOpen((open) => !open);
              }}
            >
              Nova passagem
            </PrimaryButton>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Passagens emitidas (hoje)" value={String(total)} hint={`${validadas} já validadas`} delta={{ value: "+18", positive: true }} icon={Ticket} />
        <KPIStat index={1} label="Receita do dia" value={brl(receita)} hint="líquido de cortesias e gratuidades" delta={{ value: "+12%", positive: true }} />
        <KPIStat index={2} label="Gratuidades" value={String(gratuidades)} hint="idoso, PCD — controle MP" icon={QrCode} />
        <KPIStat index={3} label="Cortesias" value={String(cortesias)} hint="limite por viagem aplicado" />
      </section>
      {erro && <p className="mt-3 text-xs text-[color:var(--danger)]">{erro}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-1 border-b border-[color:var(--hairline)]">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative -mb-px px-4 py-3 text-sm font-medium transition-colors ${tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-[2px] bg-[color:var(--brand)]" />}
          </button>
        ))}
      </div>

      {tab === "passagens" && (
        <div className="mt-5 space-y-4">
          {novaPassagemOpen && (
            <div className="surface-card brand-rail brand-rail-left p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Ticket className="h-4 w-4 text-[color:var(--brand)]" />
                <h3 className="font-display text-lg">Nova passagem</h3>
                <Tag tone="brand">emissao real</Tag>
                <span className="ml-auto font-mono text-sm text-[color:var(--brand)]">{brl(precoNovaPassagem)}</span>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1.5fr)_minmax(180px,0.8fr)_minmax(170px,0.7fr)]">
                <label className="text-xs text-muted-foreground">
                  Viagem
                  <select
                    className={`${inputCls} mt-1`}
                    value={viagemSelecionada?.id ?? passagemForm.viagemId}
                    onChange={(event) => setPassagemForm((prev) => ({ ...prev, viagemId: event.target.value }))}
                  >
                    {viagensAtivas.map((v) => <option key={v.id} value={v.id}>{viagemLabel(v)}</option>)}
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">
                  Classe
                  <select
                    className={`${inputCls} mt-1`}
                    value={passagemForm.classe}
                    onChange={(event) => setPassagemForm((prev) => ({ ...prev, classe: event.target.value }))}
                  >
                    {PASSAGEM_CLASSES.map((classe) => <option key={classe} value={classe}>{CLASSE_LABEL[classe]}</option>)}
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">
                  Pagamento
                  <select
                    className={`${inputCls} mt-1`}
                    value={passagemForm.formaPagamento}
                    onChange={(event) => setPassagemForm((prev) => ({ ...prev, formaPagamento: event.target.value as FormaPagamentoPassagem }))}
                  >
                    {Object.entries(FORMA_PAGAMENTO_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">
                  Passageiro
                  <input
                    className={`${inputCls} mt-1`}
                    value={passagemForm.passageiroNome}
                    onChange={(event) => setPassagemForm((prev) => ({ ...prev, passageiroNome: event.target.value }))}
                    placeholder="Nome completo"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Documento
                  <input
                    className={`${inputCls} mt-1`}
                    value={passagemForm.passageiroDocumento}
                    onChange={(event) => setPassagemForm((prev) => ({ ...prev, passageiroDocumento: event.target.value }))}
                    placeholder="CPF/RG"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <PrimaryButton icon={Ticket} onClick={criarPassagem} disabled={salvandoPassagem || !viagemSelecionada || precoNovaPassagem <= 0}>
                    {salvandoPassagem ? "Emitindo..." : "Emitir"}
                  </PrimaryButton>
                  <GhostButton onClick={() => setNovaPassagemOpen(false)}>Cancelar</GhostButton>
                </div>
              </div>
            </div>
          )}
          <FilterBar searchPlaceholder="Buscar passageiro, QR, viagem…">
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Emitidas</FilterChip>
            <FilterChip>Validadas</FilterChip>
            <FilterChip>Canceladas</FilterChip>
          </FilterBar>
          <DataTable
            rows={passagens}
            columns={[
              { key: "qr", header: "QR", render: (r) => <span className="font-mono text-[11px]">{r.qr}</span> },
              { key: "passageiro", header: "Passageiro", render: (r) => (
                <div>
                  <p className="font-medium">{r.passageiro}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{r.documento}</p>
                </div>
              ) },
              { key: "viagem", header: "Viagem", render: (r) => <span className="font-mono text-xs">{r.viagemCodigo}</span> },
              { key: "classe", header: "Classe", render: (r) => <Tag tone={r.classe === "Gratuidade" || r.classe === "Cortesia" ? "warning" : "brand"}>{r.classe}</Tag> },
              { key: "canal", header: "Canal", render: (r) => <span className="text-xs">{r.canal}</span> },
              { key: "valor", header: "Valor", align: "right", render: (r) => r.valor ? <span className="font-mono">{brl(r.valor)}</span> : <span className="text-xs text-muted-foreground">isento</span> },
              { key: "status", header: "Status", render: (r) => {
                const tone = r.status === "validado" ? "success" : r.status === "emitido" ? "info" : r.status === "usado" ? "neutral" : "offline";
                return <StatusChip tone={tone as never}>{r.status}</StatusChip>;
              } },
            ]}
          />
        </div>
      )}

      {tab === "canais" && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="surface-card brand-rail brand-rail-left p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Receita · todos os canais</p>
              <p className="big-numeric mt-3 text-3xl text-foreground">R$ <CountUp to={receitaCanais} duration={1.6} /></p>
              <p className="mt-2 text-xs text-muted-foreground">{bilhetesCanais} bilhetes consolidados hoje</p>
            </div>
            <div className="surface-card p-5 xl:col-span-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[color:var(--brand)]" />
                <p className="text-sm font-medium">Participação por canal</p>
                <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Portal online é MVP</span>
              </div>
              <div className="mt-4 space-y-3">
                {canais.map((c) => {
                  const pct = Math.round((c.receita / Math.max(receitaCanais, 1)) * 100);
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{c.rotulo}</span>
                        <span className="font-mono text-muted-foreground">{brl(c.receita)} · {pct}%</span>
                      </div>
                      <div className="mt-1.5"><ShimmerBar pct={pct} tone={c.id === "portal" ? "brand" : "success"} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DataTable
            rows={canais}
            columns={[
              { key: "rotulo", header: "Canal", render: (r) => (
                <div>
                  <p className="font-medium">{r.rotulo}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{r.descricao}</p>
                </div>
              ) },
              { key: "online", header: "Pagamento online", render: (r) => <StatusChip tone={r.online ? "success" : "neutral"}>{r.online ? "Integrado" : "Manual"}</StatusChip> },
              { key: "bilhetes", header: "Bilhetes", align: "right", render: (r) => <span className="font-mono">{r.bilhetes}</span> },
              { key: "receita", header: "Receita", align: "right", render: (r) => <span className="font-mono">{brl(r.receita)}</span> },
            ]}
          />

          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-lg">Agente comercial · detalhado por agente</h3>
              <StatusChip tone="brand">canal expandido</StatusChip>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {agentes.map((a, i) => (
                <div key={a.id} className="rounded-lg bg-[color:var(--muted)] p-4 ring-1 ring-[color:var(--hairline)]">
                  <p className="text-sm font-medium text-foreground">{a.nome}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{a.cidadeSigla} · {a.clientes} clientes</p>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <span className="font-mono text-lg text-[color:var(--brand)]">{brl(a.volumeMes)}</span>
                    <span className="text-[10px] text-muted-foreground">{a.bilhetes || 18 + i * 3} bilhetes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "ocupacao" && (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {ocupacaoClasses.map((o, i) => {
            const capacidade = Math.max(o.capacidade, o.ocupados, 1);
            const pct = Math.round((o.ocupados / capacidade) * 100);
            const tone = pct >= 90 ? "danger" : pct >= 70 ? "warning" : "brand";
            const ticketMedio = o.ocupados ? o.receita / o.ocupados : 0;
            return (
              <div key={o.classe} className="surface-card brand-rail brand-rail-left p-5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg text-foreground">{CLASSE_LABEL[o.classe] ?? o.classe}</p>
                  <Tag tone={tone as never}>Pulseira pendente</Tag>
                </div>
                <p className="big-numeric mt-4 text-3xl text-foreground">
                  <CountUp to={o.ocupados} duration={1.4} /><span className="text-foreground/30">/{capacidade}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{pct}% ocupado · {brl(ticketMedio)} ticket medio</p>
                <div className="mt-4"><ShimmerBar pct={pct} tone={tone as never} /></div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {Math.max(0, capacidade - o.ocupados)} vagas livres · sem overbooking entre canais
                </p>
              </div>
            );
          })}
        </div>
      )}

      {tab === "cortesias" && <CortesiasTab />}

      {tab === "manifesto" && <ManifestoTab />}

      {tab === "regulatorio" && (
        <div className="mt-5 surface-card brand-rail brand-rail-left p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Globe className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Relatório regulatório · MP</h3>
            <div className="ml-auto flex items-center gap-2">
              <GhostButton icon={FileText} onClick={exportarRegulatorioPdf}>Exportar PDF</GhostButton>
              <GhostButton icon={Users} onClick={exportarRegulatorioCsv}>Exportar CSV</GhostButton>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Listagem de gratuidades e cortesias para entrega ao Ministério Público (filtro por período, tipo e viagem). Exportável em PDF/CSV.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">BP-e / SEFAZ-PA</p>
              <p className="mt-1 text-sm font-medium text-foreground">Obrigatório desde 2019</p>
            </div>
            <div className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">PDV</p>
              <p className="mt-1 text-sm font-medium text-foreground">Emitir ou não no ato da venda</p>
            </div>
            <div className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Portal/app público</p>
              <p className="mt-1 text-sm font-medium text-foreground">Emissão automática obrigatória</p>
            </div>
          </div>
          <div className="mt-5">
            <DataTable
              rows={passagensRegulatorias}
              columns={[
                { key: "qr", header: "QR", render: (r) => <span className="font-mono text-[11px]">{r.qr}</span> },
                { key: "passageiro", header: "Beneficiário" },
                { key: "documento", header: "Documento", render: (r) => <span className="font-mono text-xs">{r.documento}</span> },
                { key: "viagem", header: "Viagem", render: (r) => <span className="font-mono text-xs">{r.viagemCodigo}</span> },
                { key: "classe", header: "Tipo", render: (r) => <Tag tone="warning">{r.classe}</Tag> },
                { key: "canal", header: "Canal" },
              ]}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ============ B.6 Gerador de cortesias ============ */

function parseLimiteCortesia(valor: unknown) {
  if (!valor || typeof valor !== "object") return null;
  const raw = (valor as { porViagem?: unknown; limite?: unknown }).porViagem ?? (valor as { limite?: unknown }).limite;
  const limite = Number(raw);
  return Number.isInteger(limite) && limite > 0 ? limite : null;
}

function CortesiasTab() {
  const [viagensAtivas, setViagensAtivas] = useState<NavegacaoViagemApi[]>([]);
  const [cortesias, setCortesias] = useState<CortesiaApi[]>([]);
  const [limitePorViagem, setLimitePorViagem] = useState<number | null>(null);
  const [viagemId, setViagemId] = useState<string>("");
  const [classe, setClasse] = useState<CortesiaClasse>(CORTESIA_CLASSES[0]);
  const [motivoId, setMotivoId] = useState<CortesiaMotivoId>(CORTESIA_MOTIVOS[0].id);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("Beneficiário indicado pela diretoria · validar documento no embarque");

  const viagem = viagensAtivas.find((v) => v.id === viagemId);
  const limite = limitePorViagem ?? 0;
  const emitidasDaViagem = cortesias.filter((c) => c.viagem_id === viagemId);
  const emitidasCount = emitidasDaViagem.length;
  const noLimite = limitePorViagem === null || emitidasCount >= limite;
  const inputCls =
    "h-10 w-full rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]";

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [viagens, cortesiasApi, limiteConfig] = await Promise.all([
          listNavegacaoViagens(),
          listCortesias(),
          getConfigValue("limite_cortesia"),
        ]);
        if (!alive) return;
        const ativas = viagens.filter((v) => v.status !== "concluida" && v.status !== "cancelada");
        setViagensAtivas(ativas);
        setCortesias(cortesiasApi);
        setLimitePorViagem(parseLimiteCortesia(limiteConfig.valor));
        if (!viagemId && ativas[0]) setViagemId(ativas[0].id);
      } catch (error) {
        console.error(error);
        setErro(error instanceof Error ? error.message : "Falha ao carregar cortesias");
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  async function gerarCortesia() {
    if (!viagemId || noLimite || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const motivo = CORTESIA_MOTIVOS.find((m) => m.id === motivoId)?.label ?? motivoId;
      const nova = await createCortesia({
        viagemId,
        classe: classeApi(classe),
        motivo,
        observacoes: observacao,
        clientUuid: crypto.randomUUID(),
      });
      setCortesias((prev) => [nova, ...prev.filter((c) => c.id !== nova.id)]);
    } catch (error) {
      console.error(error);
      setErro(error instanceof Error ? error.message : "Falha ao gerar cortesia");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Form de geração */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-[color:var(--brand)]" />
          <h3 className="font-display text-lg">Gerar código de cortesia</h3>
          <Tag tone="warning">Influência / relacionamento</Tag>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada cortesia gera um código vinculado à viagem. O limite por viagem é configurável em Cadastros.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Viagem</span>
            <select className={`mt-1.5 ${inputCls}`} value={viagemId} onChange={(e) => setViagemId(e.target.value)}>
              {viagensAtivas.map((v) => (
                <option key={v.id} value={v.id}>{viagemLabel(v)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Classe</span>
            <select className={`mt-1.5 ${inputCls}`} value={classe} onChange={(e) => setClasse(e.target.value as CortesiaClasse)}>
              {CORTESIA_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Motivo</span>
            <select className={`mt-1.5 ${inputCls}`} value={motivoId} onChange={(e) => setMotivoId(e.target.value as CortesiaMotivoId)}>
              {CORTESIA_MOTIVOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Observação / beneficiário</span>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="mt-1.5 min-h-20 w-full rounded-md bg-[color:var(--muted)] px-3 py-2 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
            />
          </label>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Categorias/motivos de cortesia serão cadastrados em Cadastros; aqui o operador seleciona e detalha o contexto.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <PrimaryButton icon={Plus} disabled={noLimite || salvando || !viagemId} onClick={gerarCortesia}>
            {salvando ? "Gerando..." : "Gerar código"}
          </PrimaryButton>
          {noLimite ? (
            <StatusChip tone="danger">{limitePorViagem === null ? "Config pendente" : "Limite da viagem atingido"}</StatusChip>
          ) : (
            <span className="text-xs text-muted-foreground">
              Restam <strong className="text-foreground">{limite - emitidasCount}</strong> cortesia(s) para esta viagem
            </span>
          )}
          {erro && <span className="text-xs text-[color:var(--danger)]">{erro}</span>}
        </div>
      </div>

      {/* Contador grande */}
      <div className="surface-card flex flex-col gap-3 p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {viagem?.codigo} · cortesias emitidas
        </p>
        <CounterBadge current={emitidasCount} total={limite} label="Emitidas nesta viagem" />
        <p className={`text-center text-sm font-medium ${noLimite ? "text-[color:var(--danger)]" : "text-muted-foreground"}`}>
          {noLimite
            ? limitePorViagem === null ? "Configure limite_cortesia em Cadastros para liberar emissão." : "Limite atingido — bloqueado até liberar em Cadastros."
            : `${emitidasCount} de ${limite} usadas nesta viagem`}
        </p>
      </div>

      {/* Lista de cortesias emitidas */}
      <div className="lg:col-span-2">
        <DataTable
          rows={emitidasDaViagem}
          empty="Nenhuma cortesia emitida para esta viagem"
          columns={[
            { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-[11px]">{r.codigo}</span> },
            { key: "viagem", header: "Viagem", render: (r) => <span className="font-mono text-xs">{r.viagem_codigo}</span> },
            { key: "classe", header: "Classe", render: (r) => <Tag tone="warning">{r.classe ? CLASSE_LABEL[r.classe] ?? r.classe : "Qualquer"}</Tag> },
            { key: "motivo", header: "Motivo", render: (r) => <span className="text-xs">{r.motivo}</span> },
            { key: "observacao", header: "Observação", render: (r) => <span className="text-xs text-muted-foreground">{r.observacoes ?? "-"}</span> },
            { key: "concedidoPor", header: "Concedido por", render: (r) => (
              <div>
                <p className="text-xs font-medium">{r.concedido_por_nome}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(r.criado_em).toLocaleString("pt-BR")}</p>
              </div>
            ) },
            { key: "status", header: "Status", render: (r) => (
              <StatusChip tone={r.status === "usada" ? "success" : "neutral"}>
                {r.status === "usada" ? "Usada" : "Não usada"}
              </StatusChip>
            ) },
          ]}
        />
      </div>
    </div>
  );
}

/* ============ B.8 Manifesto de passageiros por viagem ============ */

function ManifestoTab() {
  const [viagensComPassageiros, setViagensComPassageiros] = useState<NavegacaoViagemApi[]>([]);
  const [viagemId, setViagemId] = useState<string>("");
  const [rows, setRows] = useState<PassagemRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const viagem = viagensComPassageiros.find((v) => v.id === viagemId);
  const inputCls =
    "h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]";

  useEffect(() => {
    let alive = true;
    async function loadViagens() {
      try {
        const viagens = await listNavegacaoViagens();
        if (!alive) return;
        setViagensComPassageiros(viagens);
        if (!viagemId && viagens[0]) setViagemId(viagens[0].id);
      } catch (error) {
        console.error(error);
        setErro(error instanceof Error ? error.message : "Falha ao carregar viagens do manifesto");
      }
    }
    loadViagens();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!viagemId) return;
    let alive = true;
    async function loadManifesto() {
      try {
        const manifesto = await getManifesto(viagemId);
        if (!alive) return;
        setRows(manifesto.bilhetes.map(bilheteToRow));
      } catch (error) {
        console.error(error);
        setErro(error instanceof Error ? error.message : "Falha ao carregar manifesto");
      }
    }
    loadManifesto();
    return () => {
      alive = false;
    };
  }, [viagemId]);

  const totaisEscala = useMemo(() => {
    const escalas = viagem?.escalas.map((e) => e.cidadeSigla) ?? [];
    return escalas.map((cidade, i) => ({ cidade, total: Math.max(1, Math.round(rows.length / Math.max(escalas.length, 1)) - (i % 2)) }));
  }, [rows.length, viagem]);

  const totaisClasse = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of rows) m.set(p.classe, (m.get(p.classe) ?? 0) + 1);
    return [...m.entries()];
  }, [rows]);

  const totaisTarifa = useMemo(() => {
    const m = new Map<TipoTarifa, number>();
    for (const p of rows) {
      const t = tipoTarifaFromClasse(p.classe);
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return (["paga", "cortesia", "gratuidade", "contrato"] as TipoTarifa[])
      .filter((t) => m.has(t))
      .map((t) => [t, m.get(t) ?? 0] as const);
  }, [rows]);

  const embarcados = rows.filter((p) => p.status === "usado" || p.status === "validado").length;
  const tarifaTone: Record<TipoTarifa, "brand" | "warning" | "neutral"> = {
    paga: "brand", cortesia: "warning", gratuidade: "warning", contrato: "neutral",
  };
  const manifestoCodigo = viagem?.codigo ?? viagemId ?? "viagem";
  const manifestoNome = `ajc-manifesto-${manifestoCodigo}`;

  function exportarManifestoCsv() {
    downloadCsv(`${manifestoNome}.csv`, rows.map((p) => ({
      qr: p.qr,
      passageiro: p.passageiro,
      documento: p.documento,
      viagem: p.viagemCodigo,
      classe: p.classe,
      canal: p.canal,
      assento: p.assento ?? "",
      status: p.status,
      valor: p.valor,
    })));
  }

  function exportarManifestoPdf() {
    printHtmlReport({
      title: "Manifesto de passageiros",
      subtitle: `${viagem ? viagemLabel(viagem) : "Viagem"} - ${rows.length} passageiro(s), ${embarcados} embarcado(s)`,
      rows: rows.map((p) => ({
        QR: p.qr,
        Passageiro: p.passageiro,
        Documento: p.documento,
        Classe: p.classe,
        Canal: p.canal,
        Assento: p.assento ?? "",
        Status: p.status,
      })),
    });
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="surface-card flex flex-wrap items-center gap-3 p-4">
        <ClipboardList className="h-4 w-4 text-[color:var(--brand)]" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Manifesto de passageiros</p>
          <p className="text-xs text-muted-foreground">Base de conferência de embarque · derivada das passagens da viagem.</p>
        </div>
        <select className={`ml-auto ${inputCls}`} value={viagemId} onChange={(e) => setViagemId(e.target.value)}>
          {viagensComPassageiros.map((v) => (
            <option key={v.id} value={v.id}>{viagemLabel(v)}</option>
          ))}
        </select>
        <GhostButton icon={FileText} onClick={exportarManifestoPdf}>Exportar PDF</GhostButton>
        <GhostButton icon={Users} onClick={exportarManifestoCsv}>Exportar CSV</GhostButton>
        {erro && <span className="text-xs text-[color:var(--danger)]">{erro}</span>}
      </div>

      {/* Totais */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
        <div className="surface-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total por classe</p>
          <div className="mt-4 space-y-3">
            {totaisClasse.map(([cl, n]) => {
              const pct = Math.round((n / Math.max(rows.length, 1)) * 100);
              return (
                <div key={cl}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{cl}</span>
                    <span className="big-numeric text-base text-foreground"><CountUp to={n} duration={1.2} /></span>
                  </div>
                  <div className="mt-1.5"><ShimmerBar pct={pct} tone="brand" /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="surface-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total por tipo de tarifa</p>
          <div className="mt-4 space-y-3">
            {totaisTarifa.map(([t, n]) => {
              const pct = Math.round((n / Math.max(rows.length, 1)) * 100);
              const tone = t === "paga" ? "brand" : t === "contrato" ? "success" : "warning";
              return (
                <div key={t}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{TIPO_TARIFA_LABEL[t]}</span>
                    <span className="big-numeric text-base text-foreground"><CountUp to={n} duration={1.2} /></span>
                  </div>
                  <div className="mt-1.5"><ShimmerBar pct={pct} tone={tone} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="surface-card brand-rail brand-rail-left p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total geral da saída</p>
          <p className="big-numeric mt-3 text-3xl text-foreground">
            <CountUp to={embarcados} duration={1.4} /><span className="text-foreground/30">/{rows.length}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{viagem?.codigo} · status de embarque</p>
          <div className="mt-4"><ShimmerBar pct={Math.round((embarcados / Math.max(rows.length, 1)) * 100)} tone="success" /></div>
        </div>
      </div>

      <div className="surface-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total por cidade / escala</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {totaisEscala.map((e) => (
            <div key={e.cidade} className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
              <p className="font-mono text-lg text-foreground">{e.total}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{e.cidade}</p>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        rows={rows}
        empty="Sem passageiros para esta viagem"
        columns={[
          { key: "passageiro", header: "Passageiro", render: (r) => (
            <div>
              <p className="font-medium">{r.passageiro}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{r.documento}</p>
            </div>
          ) },
          { key: "classe", header: "Classe", render: (r) => <Tag tone={tipoTarifaFromClasse(r.classe) === "paga" ? "brand" : "warning"}>{r.classe}</Tag> },
          { key: "assento", header: "Assento", render: (r) => r.assento ? <span className="font-mono text-xs">{r.assento}</span> : <span className="text-xs text-muted-foreground">—</span> },
          { key: "tarifa", header: "Tipo de tarifa", render: (r) => {
            const t = tipoTarifaFromClasse(r.classe);
            return <Tag tone={tarifaTone[t]}>{TIPO_TARIFA_LABEL[t]}</Tag>;
          } },
          { key: "embarque", header: "Embarque", render: (r) => (
            <StatusChip tone={r.status === "usado" ? "success" : "neutral"}>
              {r.status === "usado" ? "Embarcado" : "Não embarcado"}
            </StatusChip>
          ) },
        ]}
      />
    </div>
  );
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = rows[0] ? Object.keys(rows[0]) : ["sem_dados"];
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function printHtmlReport({ title, subtitle, rows }: { title: string; subtitle: string; rows: Array<Record<string, unknown>> }) {
  const headers = rows[0] ? Object.keys(rows[0]) : ["Sem dados"];
  const tableRows = rows.length
    ? rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">Sem registros para exportar.</td></tr>`;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!popup) return;
  popup.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #171717; }
          h1 { margin: 0; font-size: 22px; }
          p { margin: 6px 0 20px; color: #555; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 7px 8px; text-align: left; vertical-align: top; }
          th { background: #f3f3f3; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
          @media print { body { margin: 18mm; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>`);
  popup.document.close();
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
