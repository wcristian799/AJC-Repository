import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, TrendingDown, TrendingUp, Plus, ArrowUpRight, ArrowDownRight, Percent } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton, StatusChip, brl,
} from "@/components/ops/primitives";
import { CountUp } from "@/components/ops/motion-bits";
import { CAIXAS, CONTAS_PAGAR, CONTAS_RECEBER, AGENTES } from "@/mocks/data";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · AJC Suite" }] }),
  component: Financeiro,
});

type Tab = "tesouraria" | "ar" | "ap" | "comissoes";

function Financeiro() {
  const [tab, setTab] = useState<Tab>("tesouraria");
  const saldo = CAIXAS.reduce((s, c) => s + c.saldo, 0);
  const aPagar = CONTAS_PAGAR.filter((c) => c.status !== "pago").reduce((s, c) => s + c.valor, 0);
  const aReceber = CONTAS_RECEBER.filter((c) => c.status !== "recebido").reduce((s, c) => s + c.valor, 0);
  const vencidas = [...CONTAS_PAGAR, ...CONTAS_RECEBER].filter((c) => c.status === "vencida").length;

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

  return (
    <AppShell crumb="Financeiro">
      <SectionHeader
        eyebrow="Tesouraria"
        title="Financeiro · caixas em tempo real"
        description="Porto, balsas, encomendas, agentes e lanchonetes consolidados. AP/AR e comissões — visão leve do MVP (núcleo é Fase 2)."
        actions={
          <>
            <GhostButton>Plano de contas 🔶</GhostButton>
            <PrimaryButton icon={Plus}>Lançamento mínimo</PrimaryButton>
          </>
        }
      />

      <div className="mt-4 surface-card p-4">
        <p className="text-sm font-medium text-foreground">Recorte desta rodada</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Caixa leve, AP/AR e comissões mockadas para validação. Conciliação bancária, Compras e DRE ficam para a etapa financeira posterior.
        </p>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Saldo consolidado" value={brl(saldo)} hint={`${CAIXAS.length} caixas`} icon={Wallet} />
        <KPIStat index={1} label="A receber" value={brl(aReceber)} hint="em aberto" delta={{ value: "+18%", positive: true }} icon={TrendingUp} />
        <KPIStat index={2} label="A pagar" value={brl(aPagar)} hint="em aberto" delta={{ value: "+4%", positive: false }} icon={TrendingDown} />
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
          {CAIXAS.map((c) => (
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
          <FilterBar searchPlaceholder="Buscar fornecedor, descrição…">
            <FilterChip active>Hoje</FilterChip>
            <FilterChip>Semana</FilterChip>
            <FilterChip>Mês</FilterChip>
            <FilterChip>Personalizado</FilterChip>
            <input type="date" className="h-9 rounded-md bg-[color:var(--muted)] px-2 text-xs text-foreground ring-1 ring-[color:var(--hairline)]" />
          </FilterBar>
          <DataTable
            rows={CONTAS_PAGAR}
            columns={[
              { key: "descricao", header: "Descrição", render: (r) => <span className="font-medium">{r.descricao}</span> },
              { key: "parte", header: "Fornecedor" },
              { key: "vencimento", header: "Vencimento", render: (r) => <span className="font-mono text-xs">{r.vencimento}</span> },
              { key: "valor", header: "Valor", align: "right", render: (r) => <span className="font-mono">{brl(r.valor)}</span> },
              { key: "status", header: "Status", render: (r) => <StatusChip tone={tone(r.status) as never}>{r.status.replace("_", " ")}</StatusChip> },
            ]}
          />
        </div>
      )}

      {tab === "ar" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar cliente, origem…">
            <FilterChip active>Hoje</FilterChip>
            <FilterChip>Semana</FilterChip>
            <FilterChip>Mês</FilterChip>
            <FilterChip>Personalizado</FilterChip>
            <input type="date" className="h-9 rounded-md bg-[color:var(--muted)] px-2 text-xs text-foreground ring-1 ring-[color:var(--hairline)]" />
          </FilterBar>
          <DataTable
            rows={CONTAS_RECEBER}
            columns={[
              { key: "descricao", header: "Descrição", render: (r) => <span className="font-medium">{r.descricao}</span> },
              { key: "parte", header: "Cliente" },
              { key: "vencimento", header: "Vencimento", render: (r) => <span className="font-mono text-xs">{r.vencimento}</span> },
              { key: "valor", header: "Valor", align: "right", render: (r) => <span className="font-mono">{brl(r.valor)}</span> },
              { key: "status", header: "Status", render: (r) => <StatusChip tone={tone(r.status) as never}>{r.status.replace("_", " ")}</StatusChip> },
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
              {brl(AGENTES.reduce((s, a) => s + (a.volumeMes * a.comissaoPct) / 100, 0))}
            </span>
          </div>
          <DataTable
            rows={AGENTES.map((a, i) => ({ ...a, idx: i }))}
            columns={[
              { key: "nome", header: "Agente", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "cidade", header: "Cidade" },
              { key: "ar", header: "Conta a receber", render: (r) => <span className="font-mono text-xs">{r.idx % 2 === 0 ? "AR pago" : "AR em aberto"}</span> },
              { key: "volumeMes", header: "Captação", align: "right", render: (r) => <span className="font-mono">{brl(r.volumeMes)}</span> },
              { key: "comissaoPct", header: "%", align: "right", render: (r) => <span className="font-mono">{r.comissaoPct.toFixed(1)}%</span> },
              { key: "comissao", header: "Comissão est.", align: "right", render: (r) => <span className="font-mono text-[color:var(--brand)]">{brl((r.volumeMes * r.comissaoPct) / 100)}</span> },
              { key: "status", header: "Status", render: (r) => {
                const status = r.idx % 3 === 0 ? "pago" : r.idx % 2 === 0 ? "liberada" : "em aberto";
                const tone = status === "pago" ? "success" : status === "liberada" ? "warning" : "info";
                return <StatusChip tone={tone}>{status}</StatusChip>;
              } },
              { key: "datas", header: "Datas", render: (r) => <span className="text-[11px] text-muted-foreground">abriu 22/06 · {r.idx % 2 === 0 ? "liberou 25/06" : "aguarda AR"}</span> },
            ]}
          />
          <p className="text-center text-[11px] text-muted-foreground">
            Fechamento por período gera conta a pagar ao agente. Cruzamento da prestação de contas das viagens entra na Fase 2.
          </p>
        </div>
      )}
    </AppShell>
  );
}
