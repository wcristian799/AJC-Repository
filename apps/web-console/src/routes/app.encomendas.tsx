import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Package, PackagePlus, FileSignature, Calculator, Ship, Route as RouteIcon,
  PackageCheck, AlertTriangle, History,
} from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import { SectionHeader, KPIStat, PrimaryButton, GhostButton, brl } from "@/components/ops/primitives";
import { ENCOMENDAS, DECLARACOES_CONTEUDO } from "@/mocks/data";
import { DespachoTab } from "@/components/ops/encomendas/DespachoTab";
import { DeclaracaoTab } from "@/components/ops/encomendas/DeclaracaoTab";
import { CotacaoTab } from "@/components/ops/encomendas/CotacaoTab";
import { ControleViagemTab } from "@/components/ops/encomendas/ControleViagemTab";
import { RastreamentoTab } from "@/components/ops/encomendas/RastreamentoTab";

export const Route = createFileRoute("/app/encomendas")({
  head: () => ({ meta: [{ title: "Encomendas · AJC Suite" }] }),
  component: Encomendas,
});

type Tab = "despacho" | "dc" | "cotacao" | "controle" | "rastreio";

type TabDef = { id: Tab; label: string; spec: string; icon: React.ComponentType<{ className?: string }> };

const TABS: TabDef[] = [
  { id: "despacho",  label: "Despacho",               spec: "B.1", icon: PackagePlus },
  { id: "dc",        label: "Declaração de conteúdo",  spec: "B.2", icon: FileSignature },
  { id: "cotacao",   label: "Cotação",                 spec: "B.3", icon: Calculator },
  { id: "controle",  label: "Controle por viagem",     spec: "B.4", icon: Ship },
  { id: "rastreio",  label: "Rastreamento",            spec: "B.5", icon: RouteIcon },
];

function Encomendas() {
  const [tab, setTab] = useState<Tab>("despacho");

  const total = ENCOMENDAS.length;
  const cobradoTotal = ENCOMENDAS.reduce((s, e) => s + e.valorCobrado, 0);
  const entregues = ENCOMENDAS.filter((e) => e.status === "entregue").length;
  const dcPendentes = ENCOMENDAS.filter((e) => {
    const dc = DECLARACOES_CONTEUDO.find((d) => d.id === e.dcId);
    return !dc || !dc.assinaturaOk;
  }).length;

  return (
    <AppShell crumb="Encomendas">
      <SectionHeader
        eyebrow="PDV · balcão · prova legal"
        title="Encomendas · despacho, DC e rastreio"
        description="Precificação por tamanho/valor e Declaração de Conteúdo com cláusula de exclusão de responsabilidade. Conecta Vendas (PDV) e TMS (etiqueta, conferência, entrega)."
        actions={
          <>
            <GhostButton icon={Calculator} onClick={() => setTab("cotacao")}>Cotar</GhostButton>
            <PrimaryButton icon={PackagePlus} onClick={() => setTab("despacho")}>Novo despacho</PrimaryButton>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Encomendas em rastreio" value={String(total)} hint="todas com etiqueta TMS" icon={Package} />
        <KPIStat index={1} label="Frete cobrado" value={brl(cobradoTotal)} hint="lançado no caixa de encomendas" delta={{ value: "+12%", positive: true }} icon={PackageCheck} />
        <KPIStat index={2} label="Entregues" value={String(entregues)} hint="com foto + assinatura" icon={PackageCheck} />
        <KPIStat index={3} label="DC pendentes" value={String(dcPendentes)} hint="bloqueia embarque" icon={AlertTriangle} />
      </section>

      {/* Sub-navegação */}
      <nav className="mt-6 flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => {
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
      </nav>

      {tab === "despacho" && <DespachoTab />}
      {tab === "dc" && <DeclaracaoTab />}
      {tab === "cotacao" && <CotacaoTab onConverter={() => setTab("despacho")} />}
      {tab === "controle" && <ControleViagemTab />}
      {tab === "rastreio" && <RastreamentoTab />}

      {/* B.6 — histórico vive no CRM (não duplicar) */}
      <div className="mt-6 surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4 text-[color:var(--brand)]" />
          <span><span className="font-medium text-foreground">Histórico de envios (B.6)</span> fica no CRM — data, volumes, conteúdo, preço e trecho dos últimos envios do cliente.</span>
        </p>
        <GhostButton icon={History}>Abrir no CRM</GhostButton>
      </div>
    </AppShell>
  );
}
