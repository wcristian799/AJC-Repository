import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  FileSignature,
  History,
  Package,
  PackageCheck,
  PackagePlus,
  Route as RouteIcon,
  Ship,
} from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  GhostButton,
  KPIStat,
  PrimaryButton,
  SectionHeader,
  brl,
} from "@/components/ops/primitives";
import { ControleViagemTab } from "@/components/ops/encomendas/ControleViagemTab";
import { CotacaoTab, type CotacaoParaDespacho } from "@/components/ops/encomendas/CotacaoTab";
import { DeclaracaoTab } from "@/components/ops/encomendas/DeclaracaoTab";
import { DespachoTab } from "@/components/ops/encomendas/DespachoTab";
import { RastreamentoTab } from "@/components/ops/encomendas/RastreamentoTab";
import { buildPrecoEncomendaTabela } from "@/components/ops/encomendas/pricing";
import type { ClienteEncomendaUi, ViagemEncomendaUi } from "@/components/ops/encomendas/types";
import {
  getEncomendasConfig,
  listClientes,
  listEncomendas,
  listNavegacaoViagens,
  listPrecos,
  type EncomendaApi,
  type EncomendasConfigApi,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/app/encomendas")({
  head: () => ({ meta: [{ title: "Encomendas · AJC Suite" }] }),
  component: Encomendas,
});
type Tab = "despacho" | "dc" | "cotacao" | "controle" | "rastreio";
const TABS = [
  { id: "despacho" as const, label: "Despacho", icon: PackagePlus },
  { id: "dc" as const, label: "Documentos e assinatura", icon: FileSignature },
  { id: "cotacao" as const, label: "Cotação", icon: Calculator },
  { id: "controle" as const, label: "Controle por viagem", icon: Ship },
  { id: "rastreio" as const, label: "Rastreamento", icon: RouteIcon },
];

function Encomendas() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("despacho");
  const [encomendas, setEncomendas] = useState<EncomendaApi[]>([]);
  const [clientes, setClientes] = useState<ClienteEncomendaUi[]>([]);
  const [viagens, setViagens] = useState<ViagemEncomendaUi[]>([]);
  const [config, setConfig] = useState<EncomendasConfigApi | null>(null);
  const [precos, setPrecos] = useState<ReturnType<typeof buildPrecoEncomendaTabela>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversao, setConversao] = useState<CotacaoParaDespacho | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, clientRows, trips, configuration, priceRows] = await Promise.all([
        listEncomendas(),
        listClientes(),
        listNavegacaoViagens(),
        getEncomendasConfig(),
        listPrecos({ tipo: "encomenda" }),
      ]);
      setEncomendas(items);
      setClientes(
        clientRows.map((item) => ({
          id: item.id,
          codigo: item.codigo,
          nome: item.nome,
          documento: item.cpfCnpj ?? "",
          telefone: contactPhone(item.contatos),
          cidade: item.cidadeSigla ?? "",
        })),
      );
      setViagens(
        trips.map((trip) => ({
          id: trip.id,
          codigo: trip.codigo ?? trip.id.slice(0, 8),
          origem: trip.origemSigla,
          destino: trip.destinoSigla ?? trip.escalas.at(-1)?.cidadeSigla ?? "",
          status: trip.status,
          embarcacaoNome: trip.embarcacaoNome,
          escalas: trip.escalas.map((stop) => ({
            cidade: stop.cidadeSigla,
            horaPrevista: stop.dataHoraPrevista ?? "",
            horaReal: stop.dataHoraReal ?? undefined,
          })),
        })),
      );
      setConfig(configuration.valor);
      setPrecos(buildPrecoEncomendaTabela(priceRows));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar Encomendas");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => ({
      total: encomendas.length,
      cobrado: encomendas.reduce((sum, item) => sum + item.valor_cobrado, 0),
      entregues: encomendas.filter((item) => item.status === "entregue").length,
      pendentes: encomendas.filter((item) => item.status_documental !== "pronta").length,
    }),
    [encomendas],
  );

  return (
    <AppShell crumb="Encomendas">
      <SectionHeader
        eyebrow="Operação · documentos · custódia"
        title="Encomendas"
        description="Cotação, despacho, NF ou Declaração de Conteúdo, preço auditável, controle por viagem e rastreamento do mesmo envio físico."
        actions={
          <>
            <GhostButton icon={Calculator} onClick={() => setTab("cotacao")}>
              Cotar
            </GhostButton>
            <PrimaryButton icon={PackagePlus} onClick={() => setTab("despacho")}>
              Novo despacho
            </PrimaryButton>
          </>
        }
      />
      {error && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[color:color-mix(in_oklab,var(--danger)_9%,transparent)] p-4 text-sm ring-1 ring-[color:color-mix(in_oklab,var(--danger)_28%,transparent)]">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[color:var(--danger)]" />
            {error}
          </span>
          <GhostButton onClick={load}>Tentar novamente</GhostButton>
        </div>
      )}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat
          index={0}
          label="Despachos"
          value={loading ? "—" : String(metrics.total)}
          hint="registros operacionais"
          icon={Package}
        />
        <KPIStat
          index={1}
          label="Frete cobrado"
          value={loading ? "—" : brl(metrics.cobrado)}
          hint="valor persistido"
          icon={PackageCheck}
        />
        <KPIStat
          index={2}
          label="Entregues"
          value={loading ? "—" : String(metrics.entregues)}
          hint="estado físico do TMS"
          icon={PackageCheck}
        />
        <KPIStat
          index={3}
          label="Documentação pendente"
          value={loading ? "—" : String(metrics.pendentes)}
          hint="bloqueia avanço operacional"
          icon={AlertTriangle}
        />
      </section>
      <nav
        className="hide-scrollbar mt-6 flex gap-1.5 overflow-x-auto pb-1"
        aria-label="Áreas de encomendas"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 transition-colors ${tab === item.id ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-[color:var(--hairline-brand)]" : "text-muted-foreground ring-[color:var(--hairline)] hover:bg-[color:var(--accent)] hover:text-foreground"}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
      {!loading && config && tab === "despacho" && (
        <DespachoTab
          clientes={clientes}
          viagens={viagens}
          precos={precos}
          config={config}
          conversao={conversao}
          onCreated={() => {
            setConversao(null);
            void load();
          }}
        />
      )}
      {!loading && config && tab === "dc" && (
        <DeclaracaoTab encomendas={encomendas} config={config} onSaved={load} />
      )}
      {!loading && config && tab === "cotacao" && (
        <CotacaoTab
          clientes={clientes}
          viagens={viagens}
          precos={precos}
          config={config}
          onConverter={(draft) => {
            setConversao(draft);
            setTab("despacho");
          }}
        />
      )}
      {!loading && tab === "controle" && (
        <ControleViagemTab encomendas={encomendas} viagens={viagens} />
      )}
      {!loading && tab === "rastreio" && <RastreamentoTab encomendas={encomendas} />}
      <div className="mt-6 surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4 text-[color:var(--brand)]" />
          <span>O histórico do cliente reutiliza estes despachos, sem recadastro.</span>
        </p>
        <GhostButton icon={History} onClick={() => navigate({ to: "/app/crm" })}>
          Abrir CRM
        </GhostButton>
      </div>
    </AppShell>
  );
}
function contactPhone(contacts: unknown[]) {
  const item = contacts.find(
    (value) => value && typeof value === "object" && ("telefone" in value || "valor" in value),
  ) as { telefone?: unknown; valor?: unknown } | undefined;
  return String(item?.telefone ?? item?.valor ?? "");
}
