import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingDown, TrendingUp, Plus, ArrowUpRight, ArrowDownRight, Percent } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton, StatusChip, brl,
} from "@/components/ops/primitives";
import { CountUp } from "@/components/ops/motion-bits";
import {
  createFinanceiroTitulo,
  listAgentes,
  listCaixas,
  listCrmCotacoes,
  listFinanceiroTitulos,
  type CaixaApi,
  type CreateFinanceiroTituloInput,
  type FinanceiroTituloApi,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · AJC Suite" }] }),
  component: Financeiro,
});

type Tab = "tesouraria" | "ar" | "ap" | "comissoes";

type UiCaixa = {
  id: string;
  tipo: string;
  referencia: string;
  saldo: number;
  entradasDia: number;
  saidasDia: number;
  status?: string;
};

type UiAgenteComissao = {
  id: string;
  nome: string;
  cidade: string;
  comissaoPct: number;
  volumeMes: number;
  idx: number;
};

type UiTitulo = {
  id: string;
  tipo: "receber" | "pagar";
  descricao: string;
  parte: string;
  vencimento: string;
  valor: number;
  status: string;
  origem: string;
  referencia: string;
};

function Financeiro() {
  const [tab, setTab] = useState<Tab>("tesouraria");
  const [caixasApi, setCaixasApi] = useState<UiCaixa[]>([]);
  const [agentesApi, setAgentesApi] = useState<UiAgenteComissao[]>([]);
  const [titulosApi, setTitulosApi] = useState<UiTitulo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [showTituloForm, setShowTituloForm] = useState(false);
  const [salvandoTitulo, setSalvandoTitulo] = useState(false);
  const [tituloMensagem, setTituloMensagem] = useState<string | null>(null);
  const [tituloForm, setTituloForm] = useState({
    tipo: "receber" as "receber" | "pagar",
    descricao: "",
    parteNome: "",
    vencimento: hojeISO(),
    valor: "",
    observacao: "",
  });

  function carregarDados() {
    let alive = true;
    Promise.all([listCaixas(), listAgentes(), listCrmCotacoes(), listFinanceiroTitulos()])
      .then(([caixas, agentes, cotacoes, titulos]) => {
        if (!alive) return;
        setCaixasApi(caixas.map(mapCaixa));
        setTitulosApi(titulos.map(mapTitulo));
        setAgentesApi(agentes.map((a, idx) => ({
          id: a.id,
          nome: a.nome,
          cidade: a.cidadeSigla,
          comissaoPct: a.percentualComissao ?? 0,
          volumeMes: cotacoes
            .filter((c) => c.agenteId === a.id)
            .reduce((sum, c) => sum + (c.valorEstimado ?? 0), 0),
          idx,
        })));
        setErro(null);
      })
      .catch((error) => {
        if (!alive) return;
        setCaixasApi([]);
        setAgentesApi([]);
        setTitulosApi([]);
        setErro(error instanceof Error ? error.message : "Falha ao carregar financeiro");
      });
    return () => {
      alive = false;
    };
  }

  useEffect(() => {
    return carregarDados();
  }, []);

  const caixas = useMemo<UiCaixa[]>(() => caixasApi, [caixasApi]);
  const agentes = useMemo<UiAgenteComissao[]>(() => agentesApi, [agentesApi]);
  const contasReceber = useMemo(() => titulosApi.filter((t) => t.tipo === "receber"), [titulosApi]);
  const contasPagar = useMemo(() => titulosApi.filter((t) => t.tipo === "pagar"), [titulosApi]);

  const saldo = caixas.reduce((s, c) => s + c.saldo, 0);
  const aPagar = contasPagar.filter((c) => c.status !== "pago").reduce((s, c) => s + c.valor, 0);
  const aReceber = contasReceber.filter((c) => c.status !== "recebido").reduce((s, c) => s + c.valor, 0);
  const vencidas = titulosApi.filter((c) => c.status === "vencida").length;

  const tone = (s: string) =>
    s === "vencida" ? "danger" :
    s === "vence_semana" ? "warning" :
    s === "pago" || s === "recebido" ? "success" :
    "info";

  const tabs: [Tab, string][] = [
    ["tesouraria", "Tesouraria · Caixas"],
    ["ar", "Contas a receber"],
    ["ap", "Contas a pagar"],
    ["comissoes", "Comissões de agentes"],
  ];

  async function salvarTituloMinimo() {
    const valor = parseDecimal(tituloForm.valor);
    if (!tituloForm.descricao.trim() || !tituloForm.parteNome.trim() || !tituloForm.vencimento || valor <= 0) {
      setTituloMensagem("Preencha descricao, parte, vencimento e valor maior que zero.");
      return;
    }

    setSalvandoTitulo(true);
    setTituloMensagem(null);
    try {
      const payload: CreateFinanceiroTituloInput = {
        tipo: tituloForm.tipo,
        descricao: tituloForm.descricao.trim(),
        parteNome: tituloForm.parteNome.trim(),
        vencimento: tituloForm.vencimento,
        valor,
        origem: "manual_financeiro_minimo",
        observacao: tituloForm.observacao.trim() || undefined,
        clientUuid: crypto.randomUUID(),
      };
      const criado = await createFinanceiroTitulo(payload);
      setTitulosApi((current) => [mapTitulo(criado), ...current.filter((t) => t.id !== criado.id)]);
      setTab(criado.tipo === "pagar" ? "ap" : "ar");
      setShowTituloForm(false);
      setTituloForm({
        tipo: criado.tipo === "pagar" ? "pagar" : "receber",
        descricao: "",
        parteNome: "",
        vencimento: hojeISO(),
        valor: "",
        observacao: "",
      });
      setTituloMensagem("Lancamento minimo registrado no AP/AR real.");
      carregarDados();
    } catch (error) {
      setTituloMensagem(error instanceof Error ? error.message : "Falha ao salvar lancamento minimo");
    } finally {
      setSalvandoTitulo(false);
    }
  }

  return (
    <AppShell crumb="Financeiro">
      <SectionHeader
        eyebrow="Tesouraria"
        title="Financeiro · caixas em tempo real"
        description="Porto, balsas, encomendas, agentes e lanchonetes consolidados. AP/AR e comissões — visão leve do MVP (núcleo é Fase 2)."
        actions={
          <>
            <GhostButton>Plano de contas 🔶</GhostButton>
            <PrimaryButton icon={Plus} onClick={() => setShowTituloForm((value) => !value)}>Lançamento mínimo</PrimaryButton>
          </>
        }
      />

      <div className="mt-4 surface-card p-4">
        <p className="text-sm font-medium text-foreground">Recorte desta rodada</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Caixa leve e AP/AR operacional já consomem backend real. Plano de contas, conciliação bancária, Compras e DRE ficam para a etapa financeira posterior.
        </p>
        {erro && <p className="mt-2 text-xs text-[color:var(--danger)]">API: {erro}</p>}
      </div>

      {showTituloForm && (
        <div className="mt-4 surface-card brand-rail brand-rail-left p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Lancamento minimo AP/AR</p>
              <p className="mt-1 text-xs text-muted-foreground">Registro manual operacional para contas a pagar ou receber. Plano de contas completo segue fase financeira posterior.</p>
            </div>
            <div className="inline-flex rounded-lg bg-[color:var(--muted)] p-1 ring-1 ring-[color:var(--hairline)]">
              {(["receber", "pagar"] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setTituloForm((form) => ({ ...form, tipo }))}
                  className={`h-8 rounded-md px-3 text-xs font-medium transition-colors ${tituloForm.tipo === tipo ? "bg-[color:var(--surface-elev)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {tipo === "receber" ? "Receber" : "Pagar"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <FormInput label="Descricao" value={tituloForm.descricao} onChange={(descricao) => setTituloForm((form) => ({ ...form, descricao }))} placeholder="Frete, fornecedor, ajuste..." className="xl:col-span-2" />
            <FormInput label={tituloForm.tipo === "receber" ? "Cliente/parte" : "Fornecedor/parte"} value={tituloForm.parteNome} onChange={(parteNome) => setTituloForm((form) => ({ ...form, parteNome }))} placeholder="Nome ou razao social" />
            <FormInput label="Vencimento" type="date" value={tituloForm.vencimento} onChange={(vencimento) => setTituloForm((form) => ({ ...form, vencimento }))} />
            <FormInput label="Valor" value={tituloForm.valor} onChange={(valor) => setTituloForm((form) => ({ ...form, valor }))} placeholder="0,00" inputMode="decimal" />
            <FormInput label="Observacao" value={tituloForm.observacao} onChange={(observacao) => setTituloForm((form) => ({ ...form, observacao }))} placeholder="Opcional" className="md:col-span-2 xl:col-span-5" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PrimaryButton icon={Plus} onClick={salvarTituloMinimo} disabled={salvandoTitulo}>{salvandoTitulo ? "Salvando..." : "Salvar lancamento"}</PrimaryButton>
            <GhostButton onClick={() => setShowTituloForm(false)}>Cancelar</GhostButton>
            {tituloMensagem && <span className="text-xs text-muted-foreground">{tituloMensagem}</span>}
          </div>
        </div>
      )}

      {!showTituloForm && tituloMensagem && (
        <p className="mt-3 rounded-lg bg-[color:var(--muted)] px-3 py-2 text-xs text-muted-foreground">{tituloMensagem}</p>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Saldo consolidado" value={brl(saldo)} hint={`${caixas.length} caixas`} icon={Wallet} />
        <KPIStat index={1} label="A receber" value={brl(aReceber)} hint={`${contasReceber.length} títulos`} delta={{ value: "real", positive: true }} icon={TrendingUp} />
        <KPIStat index={2} label="A pagar" value={brl(aPagar)} hint={`${contasPagar.length} títulos`} delta={{ value: "real", positive: false }} icon={TrendingDown} />
        <KPIStat index={3} label="Vencidas" value={String(vencidas)} hint="ação imediata" />
      </section>

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

      {tab === "tesouraria" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {caixas.map((c) => (
            <div key={c.id} className="surface-card brand-rail brand-rail-left p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{c.tipo}</p>
              <p className="mt-1 text-sm font-medium text-foreground">{c.referencia}</p>
              <p className="big-numeric mt-4 text-3xl text-foreground">R$ <CountUp to={c.saldo} duration={1.5} /></p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)] px-2.5 py-2 ring-1 ring-[color:color-mix(in_oklab,var(--success)_25%,transparent)]">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--success)]">
                    <ArrowUpRight className="h-3 w-3" /> Entradas
                  </div>
                  <p className="mt-0.5 font-mono text-[color:var(--success)]">{brl(c.entradasDia)}</p>
                </div>
                <div className="rounded-md bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-2.5 py-2 ring-1 ring-[color:color-mix(in_oklab,var(--danger)_25%,transparent)]">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--danger)]">
                    <ArrowDownRight className="h-3 w-3" /> Saídas
                  </div>
                  <p className="mt-0.5 font-mono text-[color:var(--danger)]">{brl(c.saidasDia)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "ap" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar fornecedor, descrição...">
            <FilterChip active>Hoje</FilterChip>
            <FilterChip>Semana</FilterChip>
            <FilterChip>Mês</FilterChip>
            <FilterChip>Personalizado</FilterChip>
            <input type="date" className="h-9 rounded-md bg-[color:var(--muted)] px-2 text-xs text-foreground ring-1 ring-[color:var(--hairline)]" />
          </FilterBar>
          <DataTable
            rows={contasPagar}
            columns={[
              { key: "descricao", header: "Descrição", render: (r) => <span className="font-medium">{r.descricao}</span> },
              { key: "parte", header: "Fornecedor" },
              { key: "vencimento", header: "Vencimento", render: (r) => <span className="font-mono text-xs">{r.vencimento}</span> },
              { key: "valor", header: "Valor", align: "right", render: (r) => <span className="font-mono">{brl(r.valor)}</span> },
              { key: "status", header: "Status", render: (r) => <StatusChip tone={tone(r.status) as never}>{r.status.replace("_", " ")}</StatusChip> },
              { key: "origem", header: "Origem", render: (r) => <span className="text-xs text-muted-foreground">{r.origem}</span> },
            ]}
          />
        </div>
      )}

      {tab === "ar" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar cliente, origem...">
            <FilterChip active>Hoje</FilterChip>
            <FilterChip>Semana</FilterChip>
            <FilterChip>Mês</FilterChip>
            <FilterChip>Personalizado</FilterChip>
            <input type="date" className="h-9 rounded-md bg-[color:var(--muted)] px-2 text-xs text-foreground ring-1 ring-[color:var(--hairline)]" />
          </FilterBar>
          <DataTable
            rows={contasReceber}
            columns={[
              { key: "descricao", header: "Descrição", render: (r) => <span className="font-medium">{r.descricao}</span> },
              { key: "parte", header: "Cliente" },
              { key: "vencimento", header: "Vencimento", render: (r) => <span className="font-mono text-xs">{r.vencimento}</span> },
              { key: "valor", header: "Valor", align: "right", render: (r) => <span className="font-mono">{brl(r.valor)}</span> },
              { key: "status", header: "Status", render: (r) => <StatusChip tone={tone(r.status) as never}>{r.status.replace("_", " ")}</StatusChip> },
              { key: "referencia", header: "Referência", render: (r) => <span className="text-xs text-muted-foreground">{r.referencia}</span> },
            ]}
          />
        </div>
      )}

      {tab === "comissoes" && (
        <div className="mt-5 space-y-4">
          <div className="surface-card brand-rail brand-rail-left flex flex-wrap items-center gap-3 p-4">
            <Percent className="h-4 w-4 text-[color:var(--brand)]" />
            <span className="text-sm font-medium">Comissão estimada do período</span>
            <span className="text-xs text-muted-foreground">a partir da captação dos agentes (CRM) · regras finais 🔶 diretoria</span>
            <span className="ml-auto big-numeric text-2xl text-[color:var(--brand)]">
              {brl(agentes.reduce((s, a) => s + (a.volumeMes * a.comissaoPct) / 100, 0))}
            </span>
          </div>
          <DataTable
            rows={agentes}
            columns={[
              { key: "nome", header: "Agente", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "cidade", header: "Cidade" },
              { key: "ar", header: "Conta a receber", render: (r) => <span className="font-mono text-xs">{r.idx % 2 === 0 ? "AR pago" : "AR em aberto"}</span> },
              { key: "volumeMes", header: "Captação", align: "right", render: (r) => <span className="font-mono">{brl(r.volumeMes)}</span> },
              { key: "comissaoPct", header: "%", align: "right", render: (r) => <span className="font-mono">{r.comissaoPct.toFixed(1)}%</span> },
              { key: "comissao", header: "Comissão est.", align: "right", render: (r) => <span className="font-mono text-[color:var(--brand)]">{brl((r.volumeMes * r.comissaoPct) / 100)}</span> },
              { key: "status", header: "Status", render: (r) => {
                const status = r.idx % 3 === 0 ? "pago" : r.idx % 2 === 0 ? "liberada" : "em aberto";
                const statusTone = status === "pago" ? "success" : status === "liberada" ? "warning" : "info";
                return <StatusChip tone={statusTone}>{status}</StatusChip>;
              } },
              { key: "datas", header: "Datas", render: (r) => <span className="text-[11px] text-muted-foreground">abriu 22/06 · {r.idx % 2 === 0 ? "liberou 25/06" : "aguarda AR"}</span> },
            ]}
          />
          <p className="text-center text-[11px] text-muted-foreground">
            Fechamento por período gera conta a pagar ao agente. Cruzamento da prestação de contas das viagens entra na fase financeira posterior.
          </p>
        </div>
      )}
    </AppShell>
  );
}

function mapCaixa(caixa: CaixaApi): UiCaixa {
  return {
    id: caixa.id,
    tipo: caixa.tipo,
    referencia: caixa.referencia ?? caixa.operador_nome,
    saldo: caixa.saldo,
    entradasDia: caixa.entradas_dia,
    saidasDia: caixa.saidas_dia,
    status: caixa.status,
  };
}

function mapTitulo(titulo: FinanceiroTituloApi): UiTitulo {
  const referencia = titulo.bilhete_codigo ?? titulo.carga_codigo ?? titulo.origem;
  return {
    id: titulo.id,
    tipo: titulo.tipo,
    descricao: titulo.descricao,
    parte: titulo.parte_nome,
    vencimento: new Date(`${titulo.vencimento}T00:00:00`).toLocaleDateString("pt-BR"),
    valor: titulo.valor,
    status: titulo.status,
    origem: titulo.origem,
    referencia,
  };
}

function parseDecimal(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "decimal" | "numeric";
  className?: string;
}) {
  return (
    <label className={`text-xs text-muted-foreground ${className}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-1 h-10 w-full rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-[color:var(--brand)]"
      />
    </label>
  );
}
