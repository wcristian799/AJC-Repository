import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Boxes, Smartphone, Plus,
  CheckCircle2, AlertTriangle, FileText, Layers,
  ClipboardCheck, Tag as TagIcon, Ship,
} from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, PrimaryButton,
} from "@/components/ops/primitives";
import { VOLUMES } from "@/mocks/data";
import { NotasTab } from "@/components/ops/tms/NotasTab";
import { PaletesTab } from "@/components/ops/tms/PaletesTab";
import { PrestacaoTab } from "@/components/ops/tms/PrestacaoTab";
import { EtiquetaTab } from "@/components/ops/tms/EtiquetaTab";
import { ControleTab } from "@/components/ops/tms/ControleTab";

export const Route = createFileRoute("/app/tms")({
  head: () => ({ meta: [{ title: "TMS / Carga · AJC Suite" }] }),
  component: TMS,
});

type Tab = "ctrl" | "notas" | "paletes" | "prestacao" | "etiqueta";

type TabDef = { id: Tab; label: string; spec: string; icon: React.ComponentType<{ className?: string }> };

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
      { id: "prestacao", label: "Prestação de contas", spec: "B.10", icon: ClipboardCheck },
    ],
  },
];

function TMS() {
  const [tab, setTab] = useState<Tab>("ctrl");

  const total = VOLUMES.length;
  const conferidos = VOLUMES.filter((v) => v.status !== "recebido").length;
  const divergentes = VOLUMES.filter((v) => v.status === "divergente").length;
  const entregues = VOLUMES.filter((v) => v.status === "entregue").length;

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
            <PrimaryButton icon={Plus}>Nova carga</PrimaryButton>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Volumes em rastreio" value={String(total)} hint="todos com QR ativo" icon={Boxes} />
        <KPIStat index={1} label="Conferidos hoje" value={String(conferidos)} hint="incluindo 2º bipe" delta={{ value: "+24", positive: true }} icon={CheckCircle2} />
        <KPIStat index={2} label="Divergências" value={String(divergentes)} hint="bloqueia entrega" icon={AlertTriangle} />
        <KPIStat index={3} label="Entregues" value={String(entregues)} hint="com foto + assinatura" />
      </section>

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

      {tab === "ctrl" && <ControleTab />}
      {tab === "notas" && <NotasTab />}
      {tab === "paletes" && <PaletesTab />}
      {tab === "etiqueta" && <EtiquetaTab />}
      {tab === "prestacao" && <PrestacaoTab />}
    </AppShell>
  );
}
