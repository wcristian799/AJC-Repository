import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Users, MapPin, FileSpreadsheet, X, History, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton,
  StatusChip, brl, Tag,
} from "@/components/ops/primitives";
import {
  createCliente,
  createCrmCotacao,
  getCrmHistoricoCliente,
  listAgentes,
  listCidades,
  listClientes,
  listCrmCotacoes,
  updateCliente,
  type CidadeApi,
  type ClienteApi,
  type CrmCotacaoApi,
  type CrmHistoricoClienteApi,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/app/crm")({
  head: () => ({ meta: [{ title: "CRM · AJC Suite" }] }),
  component: CRM,
});

type Tab = "clientes" | "agentes" | "alocacao" | "cotacoes";

type UiCliente = {
  id: string;
  codigo: string;
  tipo: string;
  nome: string;
  documento: string;
  cidade: string;
  agenteId: string | null;
  ultimoEnvio: string;
  totalMovimentado: number;
};

type UiAgente = {
  id: string;
  nome: string;
  cidade: string;
  comissaoPct: number;
  clientes: number;
  volumeMes: number;
  ativo: boolean;
};

type UiCotacao = {
  id: string;
  clienteId: string;
  tipo: string;
  trecho: string;
  valor: number;
  status: string;
  validade: string;
};

type UiHistoricoEnvio = {
  id: string;
  data: string;
  trecho: string;
  volumes: number;
  conteudo: string;
  preco: number;
};

function CRM() {
  const [tab, setTab] = useState<Tab>("clientes");
  const [aberto, setAberto] = useState<UiCliente | null>(null);
  const [clientesApi, setClientesApi] = useState<UiCliente[]>([]);
  const [agentesApi, setAgentesApi] = useState<UiAgente[]>([]);
  const [cotacoesApi, setCotacoesApi] = useState<UiCotacao[]>([]);
  const [cidadesApi, setCidadesApi] = useState<CidadeApi[]>([]);
  const [historicoAberto, setHistoricoAberto] = useState<CrmHistoricoClienteApi | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novoCliente, setNovoCliente] = useState({ nome: "", cpfCnpj: "", cidadeSigla: "BEL", agenteId: "" });
  const [novaCotacao, setNovaCotacao] = useState({ clienteId: "", tipo: "carga" as "carga" | "encomenda" | "veiculo", origemSigla: "BEL", destinoSigla: "STM", valorEstimado: "", observacao: "" });
  const [salvando, setSalvando] = useState(false);

  async function carregarCrm() {
    const [clientes, agentes, cotacoes, cidades] = await Promise.all([listClientes(), listAgentes(), listCrmCotacoes(), listCidades()]);
    const uiClientes = clientes.map(mapCliente);
    setClientesApi(uiClientes);
    setAgentesApi(agentes.map((a) => ({
      id: a.id,
      nome: a.nome,
      cidade: a.cidadeSigla,
      comissaoPct: a.percentualComissao ?? 0,
      clientes: clientes.filter((c) => c.agenteId === a.id).length,
      volumeMes: cotacoes
        .filter((c) => c.agenteId === a.id)
        .reduce((sum, c) => sum + (c.valorEstimado ?? 0), 0),
      ativo: a.ativo,
    })));
    setCotacoesApi(cotacoes.map(mapCotacao));
    setCidadesApi(cidades);
    setNovoCliente((current) => ({
      ...current,
      cidadeSigla: current.cidadeSigla || cidades[0]?.sigla || "BEL",
      agenteId: current.agenteId || agentes[0]?.id || "",
    }));
    setNovaCotacao((current) => ({
      ...current,
      clienteId: current.clienteId || clientes[0]?.id || "",
    }));
    setErro(null);
  }

  useEffect(() => {
    let alive = true;
    carregarCrm()
      .then(() => {
        if (!alive) return;
      })
      .catch((error) => {
        if (!alive) return;
        setClientesApi([]);
        setAgentesApi([]);
        setCotacoesApi([]);
        setCidadesApi([]);
        setErro(error instanceof Error ? error.message : "Falha ao carregar CRM");
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!aberto) {
      setHistoricoAberto(null);
      return;
    }
    let alive = true;
    getCrmHistoricoCliente(aberto.id)
      .then((historico) => {
        if (alive) setHistoricoAberto(historico);
      })
      .catch(() => {
        if (alive) setHistoricoAberto(null);
      });
    return () => {
      alive = false;
    };
  }, [aberto]);

  const clientes = useMemo<UiCliente[]>(() => clientesApi, [clientesApi]);
  const agentes = useMemo<UiAgente[]>(() => agentesApi, [agentesApi]);
  const cotacoes = useMemo<UiCotacao[]>(() => cotacoesApi, [cotacoesApi]);
  const cidades = useMemo(() => cidadesApi.length ? cidadesApi : [], [cidadesApi]);
  const totalCarteira = clientes.reduce((s, c) => s + c.totalMovimentado, 0);
  const tabs: [Tab, string][] = [
    ["clientes", "Base de clientes"],
    ["agentes", "Agentes comerciais"],
    ["alocacao", "Alocação cliente × agente"],
    ["cotacoes", "Cotações"],
  ];

  async function criarClienteRapido() {
    if (!novoCliente.nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    setSalvando(true);
    try {
      await createCliente({
        nome: novoCliente.nome,
        cpfCnpj: novoCliente.cpfCnpj || null,
        cidadeSigla: novoCliente.cidadeSigla || null,
        agenteId: novoCliente.agenteId || null,
        contatos: [],
      });
      setNovoCliente((current) => ({ ...current, nome: "", cpfCnpj: "" }));
      await carregarCrm();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao criar cliente");
    } finally {
      setSalvando(false);
    }
  }

  async function criarCotacaoRapida() {
    if (!novaCotacao.clienteId) {
      setErro("Selecione um cliente para a cotação.");
      return;
    }
    setSalvando(true);
    try {
      const cliente = clientes.find((c) => c.id === novaCotacao.clienteId);
      await createCrmCotacao({
        clienteId: novaCotacao.clienteId,
        agenteId: cliente?.agenteId ?? null,
        tipo: novaCotacao.tipo,
        origemSigla: novaCotacao.origemSigla || null,
        destinoSigla: novaCotacao.destinoSigla || null,
        valorEstimado: novaCotacao.valorEstimado ? Number(novaCotacao.valorEstimado) : null,
        parametros: { observacao: novaCotacao.observacao },
      });
      setNovaCotacao((current) => ({ ...current, valorEstimado: "", observacao: "" }));
      await carregarCrm();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao criar cotação");
    } finally {
      setSalvando(false);
    }
  }

  async function criarCotacaoDoHistorico(cliente: UiCliente, envio?: UiHistoricoEnvio) {
    const [origemSigla, destinoSigla] = siglasFromTrecho(envio?.trecho);
    setSalvando(true);
    try {
      await createCrmCotacao({
        clienteId: cliente.id,
        agenteId: cliente.agenteId ?? null,
        tipo: "carga",
        origemSigla: origemSigla ?? "BEL",
        destinoSigla: destinoSigla ?? (cliente.cidade !== "-" ? cliente.cidade : "STM"),
        valorEstimado: envio?.preco ?? null,
        parametros: {
          origem: "historico_crm",
          envioId: envio?.id ?? null,
          observacao: envio
            ? `Nova cotacao baseada no envio ${envio.trecho} de ${envio.data}, ${envio.volumes} volume(s).`
            : "Nova cotacao baseada na ficha 360 do cliente.",
        },
      });
      setAberto(null);
      setTab("cotacoes");
      await carregarCrm();
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao criar cotacao pelo historico");
    } finally {
      setSalvando(false);
    }
  }

  function siglasFromTrecho(trecho?: string): [string | null, string | null] {
    const siglas = trecho?.match(/[A-Z]{3}/g) ?? [];
    return [siglas[0] ?? null, siglas[1] ?? null];
  }

  function exportarCrm() {
    if (tab === "agentes") {
      downloadCsv("ajc-crm-agentes.csv", agentes.map((a) => ({
        nome: a.nome,
        cidade: a.cidade,
        comissaoPct: a.comissaoPct,
        clientes: a.clientes,
        volumeMes: a.volumeMes,
        ativo: a.ativo ? "sim" : "nao",
      })));
      return;
    }
    if (tab === "cotacoes") {
      downloadCsv("ajc-crm-cotacoes.csv", cotacoes.map((c) => ({
        cliente: clientes.find((cliente) => cliente.id === c.clienteId)?.nome ?? c.clienteId,
        tipo: c.tipo,
        trecho: c.trecho,
        valor: c.valor,
        status: c.status,
        validade: c.validade,
      })));
      return;
    }
    downloadCsv("ajc-crm-clientes.csv", clientes.map((c) => ({
      codigo: c.codigo,
      tipo: c.tipo,
      nome: c.nome,
      documento: c.documento,
      cidade: c.cidade,
      agente: agentes.find((a) => a.id === c.agenteId)?.nome ?? "",
      ultimoEnvio: c.ultimoEnvio,
      totalMovimentado: c.totalMovimentado,
    })));
  }

  return (
    <AppShell crumb="CRM">
      <SectionHeader
        eyebrow="Relacionamento"
        title="Clientes, agentes e histórico"
        description="Belém central · 7 cidades · 1 agente por cidade. Cada cliente alocado a exatamente um agente."
        actions={
          <>
            <GhostButton icon={FileSpreadsheet} onClick={exportarCrm}>Exportar</GhostButton>
            <PrimaryButton icon={Plus} onClick={() => setTab("clientes")}>Novo cliente</PrimaryButton>
          </>
        }
      />
      {erro && (
        <div className="mt-4 surface-card p-3 text-xs text-[color:var(--danger)]">
          API CRM: {erro}
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Clientes ativos" value={String(clientes.length)} hint="PF + PJ" icon={Users} />
        <KPIStat index={1} label="Agentes em campo" value={String(agentes.filter((a) => a.ativo).length)} hint="7 cidades atendidas" icon={MapPin} />
        <KPIStat index={2} label="Carteira movimentada" value={brl(totalCarteira)} hint={clientesApi.length ? "aguardando BI por cliente" : "acumulado dos clientes"} delta={{ value: "+9%", positive: true }} />
        <KPIStat index={3} label="Captação do mês (agentes)" value={brl(agentes.reduce((s, a) => s + a.volumeMes, 0))} hint="estimativa para comissão" />
      </section>

      <div className="mt-6 flex items-center gap-1 border-b border-[color:var(--hairline)]">
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

      {tab === "clientes" && (
        <div className="mt-5 space-y-4">
          <FilterBar
            searchPlaceholder="Buscar por nome, CPF/CNPJ..."
            right={
              <div className="flex flex-wrap items-center gap-2">
                <select className="h-9 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]">
                  <option>Cidade/UF · todas</option>
                  {cidades.map((c) => <option key={c.sigla}>{c.nome}/PA</option>)}
                  <option>Outro estado</option>
                </select>
                <PrimaryButton icon={Plus} onClick={criarClienteRapido}>{salvando ? "Salvando..." : "Novo cliente"}</PrimaryButton>
              </div>
            }
          >
            <FilterChip active>Todos</FilterChip>
            <FilterChip>PF</FilterChip>
            <FilterChip>PJ</FilterChip>
            {cidades.slice(0, 4).map((c) => <FilterChip key={c.sigla}>{c.sigla}</FilterChip>)}
          </FilterBar>
          <div className="surface-card p-4">
            <p className="text-sm font-medium text-foreground">Cadastro rápido</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <input value={novoCliente.nome} onChange={(e) => setNovoCliente((c) => ({ ...c, nome: e.target.value }))} placeholder="Nome/Razão social" className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]" />
              <input value={novoCliente.cpfCnpj} onChange={(e) => setNovoCliente((c) => ({ ...c, cpfCnpj: e.target.value }))} placeholder="CPF/CNPJ" className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]" />
              <select value={novoCliente.cidadeSigla} onChange={(e) => setNovoCliente((c) => ({ ...c, cidadeSigla: e.target.value }))} className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]">
                {cidades.map((cidade) => <option key={cidade.sigla} value={cidade.sigla}>{cidade.nome}/PA</option>)}
              </select>
              <select value={novoCliente.agenteId} onChange={(e) => setNovoCliente((c) => ({ ...c, agenteId: e.target.value }))} className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]">
                <option value="">Sem agente</option>
                {agentes.map((agente) => <option key={agente.id} value={agente.id}>{agente.nome}</option>)}
              </select>
            </div>
          </div>
          <DataTable
            rows={clientes}
            onRowClick={(r) => setAberto(r)}
            columns={[
              { key: "nome", header: "Cliente", render: (r) => (
                <div>
                  <p className="font-medium">{r.nome}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{r.codigo} · {r.documento}</p>
                </div>
              ) },
              { key: "tipo", header: "Tipo", render: (r) => <Tag tone={r.tipo === "PJ" ? "brand" : "neutral"}>{r.tipo}</Tag> },
              { key: "cidade", header: "Cidade" },
              { key: "agente", header: "Agente", render: (r) => agentes.find((a) => a.id === r.agenteId)?.nome ?? "—" },
              { key: "ultimoEnvio", header: "Último envio", render: (r) => <span className="font-mono text-xs">{r.ultimoEnvio}</span> },
              { key: "totalMovimentado", header: "Movimentado", align: "right", render: (r) => <span className="font-mono">{brl(r.totalMovimentado)}</span> },
            ]}
          />
          <p className="text-center text-[11px] text-muted-foreground">Clique em um cliente para abrir a ficha 360º.</p>
        </div>
      )}

      {tab === "agentes" && (
        <div className="mt-5">
          <DataTable
            rows={agentes}
            columns={[
              { key: "nome", header: "Agente", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "cidade", header: "Cidade" },
              { key: "comissaoPct", header: "Comissão", align: "right", render: (r) => <span className="font-mono">{r.comissaoPct.toFixed(1)}%</span> },
              { key: "clientes", header: "Clientes", align: "right" },
              { key: "volumeMes", header: "Captação do mês", align: "right", render: (r) => <span className="font-mono">{brl(r.volumeMes)}</span> },
              { key: "ativo", header: "Status", render: (r) => <StatusChip tone={r.ativo ? "success" : "offline"}>{r.ativo ? "Ativo" : "Inativo"}</StatusChip> },
            ]}
          />
        </div>
      )}

      {tab === "alocacao" && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {agentes.map((a) => {
            const meus = clientes.filter((c) => c.agenteId === a.id);
            return (
              <div key={a.id} className="surface-card brand-rail brand-rail-left p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{a.cidade}</p>
                <p className="mt-1 font-display text-lg text-foreground">{a.nome}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Clientes</p>
                    <p className="big-numeric mt-1 text-2xl text-foreground">{meus.length || a.clientes}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Comissão est.</p>
                    <p className="big-numeric mt-1 text-2xl text-[color:var(--brand)]">{brl(a.volumeMes * a.comissaoPct / 100)}</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">Estimativa · fecha no Financeiro</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === "cotacoes" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar cotação, cliente, trecho..." right={<PrimaryButton icon={Plus} onClick={criarCotacaoRapida}>{salvando ? "Salvando..." : "Nova cotação"}</PrimaryButton>}>
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Abertas</FilterChip>
            <FilterChip>Convertidas</FilterChip>
            <FilterChip>Expiradas</FilterChip>
          </FilterBar>
          <div className="surface-card p-4">
            <p className="text-sm font-medium text-foreground">Nova cotação</p>
            <div className="mt-3 grid gap-2 md:grid-cols-6">
              <select value={novaCotacao.clienteId} onChange={(e) => setNovaCotacao((c) => ({ ...c, clienteId: e.target.value }))} className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)] md:col-span-2">
                <option value="">Cliente</option>
                {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.codigo} - {cliente.nome}</option>)}
              </select>
              <select value={novaCotacao.tipo} onChange={(e) => setNovaCotacao((c) => ({ ...c, tipo: e.target.value as typeof c.tipo }))} className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]">
                <option value="carga">Carga</option>
                <option value="encomenda">Encomenda</option>
                <option value="veiculo">Veículo</option>
              </select>
              <select value={novaCotacao.destinoSigla} onChange={(e) => setNovaCotacao((c) => ({ ...c, destinoSigla: e.target.value }))} className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]">
                {cidades.map((cidade) => <option key={cidade.sigla} value={cidade.sigla}>{cidade.sigla}</option>)}
              </select>
              <input type="number" min={0} value={novaCotacao.valorEstimado} onChange={(e) => setNovaCotacao((c) => ({ ...c, valorEstimado: e.target.value }))} placeholder="Valor" className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]" />
              <input value={novaCotacao.observacao} onChange={(e) => setNovaCotacao((c) => ({ ...c, observacao: e.target.value }))} placeholder="Observação" className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]" />
            </div>
          </div>
          <DataTable
            rows={cotacoes}
            columns={[
              { key: "id", header: "Cotação", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
              { key: "cliente", header: "Cliente", render: (r) => clientes.find((c) => c.id === r.clienteId)?.nome ?? "—" },
              { key: "tipo", header: "Tipo", render: (r) => <Tag tone="brand">{r.tipo}</Tag> },
              { key: "trecho", header: "Trecho", render: (r) => <span className="font-display text-sm">{r.trecho}</span> },
              { key: "valor", header: "Valor estimado", align: "right", render: (r) => <span className="font-mono">{brl(r.valor)}</span> },
              { key: "validade", header: "Validade", render: (r) => <span className="text-xs text-muted-foreground">{r.validade}</span> },
              { key: "status", header: "Status", render: (r) => {
                const tone = r.status === "aberta" ? "info" : r.status === "convertida" ? "success" : "offline";
                return <StatusChip tone={tone as never}>{r.status}</StatusChip>;
              } },
            ]}
          />
          <p className="text-center text-[11px] text-muted-foreground">
            Cotação não compromete vaga. Campos finais da cotação vêm do Lucas; encomenda usa motor de preços (🔶 Lucas), carga/veículo usam tabela pronta.
          </p>
        </div>
      )}

      <ClienteDrawer
        cliente={aberto}
        agentes={agentes}
        historico={historicoAberto}
        cotacoes={cotacoes}
        onRealocar={async (clienteId, agenteId) => {
          await updateCliente(clienteId, { agenteId, motivoRealocacao: "Realocação via ficha 360" });
          await carregarCrm();
          setAberto((current) => current ? { ...current, agenteId } : current);
        }}
        onCriarCotacaoHistorico={criarCotacaoDoHistorico}
        onClose={() => setAberto(null)}
      />
    </AppShell>
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

function mapCotacao(c: CrmCotacaoApi): UiCotacao {
  const validade = c.validade
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(c.validade))
    : "—";
  return {
    id: c.id.slice(0, 8).toUpperCase(),
    clienteId: c.clienteId,
    tipo: c.tipo,
    trecho: `${c.origemSigla ?? "BEL"} → ${c.destinoSigla ?? "-"}`,
    valor: c.valorEstimado ?? 0,
    status: c.status,
    validade,
  };
}

function mapCliente(c: ClienteApi): UiCliente {
  return {
    id: c.id,
    codigo: c.codigo,
    tipo: c.tipo,
    nome: c.nome,
    documento: c.cpfCnpj ?? "-",
    cidade: c.cidadeSigla ?? "-",
    agenteId: c.agenteId,
    ultimoEnvio: "-",
    totalMovimentado: 0,
  };
}

function ClienteDrawer({
  cliente,
  agentes,
  historico,
  cotacoes,
  onRealocar,
  onCriarCotacaoHistorico,
  onClose,
}: {
  cliente: UiCliente | null;
  agentes: UiAgente[];
  historico: CrmHistoricoClienteApi | null;
  cotacoes: UiCotacao[];
  onRealocar: (clienteId: string, agenteId: string) => Promise<void>;
  onCriarCotacaoHistorico: (cliente: UiCliente, envio?: UiHistoricoEnvio) => Promise<void>;
  onClose: () => void;
}) {
  const agente = cliente ? agentes.find((a) => a.id === cliente.agenteId) : null;
  const [agenteDestino, setAgenteDestino] = useState("");
  const [realocando, setRealocando] = useState(false);
  const enviosApi = historico?.cargas.map((h) => ({
    id: h.id,
    data: h.criadoEm ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(h.criadoEm)) : "—",
    trecho: h.trecho.replace(" -> ", " → "),
    volumes: h.volumes,
    conteudo: `${h.codigo ?? h.categoria} · ${h.pesoTotal ?? 0} kg`,
    preco: h.valor ?? 0,
  })) ?? [];
  const envios = enviosApi;
  const cotacoesCliente = cliente ? cotacoes.filter((c) => c.clienteId === cliente.id) : [];

  useEffect(() => {
    setAgenteDestino(cliente?.agenteId ?? "");
  }, [cliente?.agenteId]);

  async function realocarCliente() {
    if (!cliente || !agenteDestino || agenteDestino === cliente.agenteId) return;
    setRealocando(true);
    try {
      await onRealocar(cliente.id, agenteDestino);
    } finally {
      setRealocando(false);
    }
  }

  return (
    <AnimatePresence>
      {cliente && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="surface-card fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto rounded-none border-l p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="champagne-eyebrow">Ficha 360º</span>
                <h3 className="mt-1 font-display text-2xl text-foreground">{cliente.nome}</h3>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{cliente.codigo} · {cliente.documento}</p>
              </div>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[color:var(--accent)] hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="surface-deep p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Tipo · cidade</p>
                <p className="mt-1 text-sm font-medium text-foreground">{cliente.tipo} · {cliente.cidade}</p>
              </div>
              <div className="surface-deep p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Movimentado</p>
                <p className="mt-1 big-numeric text-lg text-foreground">{brl(cliente.totalMovimentado)}</p>
              </div>
            </div>

            <div className="mt-3 surface-deep flex items-center justify-between p-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Agente alocado</p>
                <p className="mt-1 text-sm font-medium text-foreground">{agente?.nome ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={agenteDestino} onChange={(e) => setAgenteDestino(e.target.value)} className="h-9 rounded-md bg-[color:var(--muted)] px-2 text-xs text-foreground ring-1 ring-[color:var(--hairline)]">
                  <option value="">Agente</option>
                  {agentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <GhostButton icon={ArrowRight} onClick={realocarCliente}>{realocando ? "..." : "Realocar"}</GhostButton>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <History className="h-4 w-4 text-[color:var(--brand)]" />
              <h4 className="font-display text-base text-foreground">Histórico de envios</h4>
            </div>
            <ul className="mt-3 space-y-2">
              {envios.length === 0 && <li className="text-sm text-muted-foreground">Sem envios registrados.</li>}
              {envios.map((e, i) => (
                <li key={e.id} className={`surface-deep p-3 ${i < 2 ? "brand-rail brand-rail-left" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm text-foreground">{e.trecho}</span>
                    <span className="font-mono text-xs text-muted-foreground">{e.data}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{e.volumes} vol · {e.conteudo}</span>
                    <span className="font-mono text-foreground/85">{brl(e.preco)}</span>
                  </div>
                  {i < 2 && <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--brand)]">Destaque · base de precificação</p>}
                </li>
              ))}
            </ul>

            {cotacoesCliente.length > 0 && (
              <>
                <h4 className="mt-6 font-display text-base text-foreground">Cotações</h4>
                <ul className="mt-3 space-y-2">
                  {cotacoesCliente.map((c) => (
                    <li key={c.id} className="surface-deep flex items-center justify-between p-3">
                      <span className="text-sm text-foreground">{c.tipo} · {c.trecho}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-foreground/85">{brl(c.valor)}</span>
                        <StatusChip tone={c.status === "aberta" ? "info" : c.status === "convertida" ? "success" : "offline"}>{c.status}</StatusChip>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-auto pt-6">
              <PrimaryButton icon={Plus} disabled={envios.length === 0} onClick={() => onCriarCotacaoHistorico(cliente, envios[0])}>
                Novo envio com base no histórico
              </PrimaryButton>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
