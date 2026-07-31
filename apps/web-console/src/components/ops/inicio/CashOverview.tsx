import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Anchor,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Landmark,
  Users,
  WalletCards,
} from "lucide-react";
import type { CaixaApi } from "@/lib/ajc-api";
import { brl, StatusChip } from "@/components/ops/primitives";

type CashGroupKey = "porto" | "embarcacao" | "agente" | "apoio";
type CashFilter = "todos" | CashGroupKey;

const CASH_GROUPS: Array<{
  key: CashGroupKey;
  label: string;
  description: string;
  Icon: typeof Landmark;
}> = [
  { key: "porto", label: "Porto", description: "Bilheteria e atendimento", Icon: Landmark },
  { key: "embarcacao", label: "Embarcações", description: "Operação a bordo", Icon: Anchor },
  { key: "agente", label: "Agentes", description: "Pontos comerciais", Icon: Users },
  { key: "apoio", label: "Apoio", description: "Demais operações", Icon: Building2 },
];

export function CashOverview({ caixas, loading }: { caixas: CaixaApi[]; loading: boolean }) {
  const [filter, setFilter] = useState<CashFilter>("todos");
  const normalized = useMemo(
    () => caixas.map((caixa) => ({ ...caixa, group: normalizeCashType(caixa.tipo) })),
    [caixas],
  );
  const totalBalance = normalized.reduce((sum, caixa) => sum + Number(caixa.saldo || 0), 0);
  const totalIncome = normalized.reduce((sum, caixa) => sum + Number(caixa.entradas_dia || 0), 0);
  const totalExpense = normalized.reduce((sum, caixa) => sum + Number(caixa.saidas_dia || 0), 0);
  const openCount = normalized.filter((caixa) => caixa.status === "aberto").length;
  const visible =
    filter === "todos" ? normalized : normalized.filter((caixa) => caixa.group === filter);

  return (
    <section className="mt-6" aria-labelledby="cash-overview-title">
      <div className="surface-card overflow-hidden">
        <div className="grid gap-5 border-b border-[color:var(--hairline)] p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
                <WalletCards className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 id="cash-overview-title" className="font-display text-xl text-foreground">
                  Caixas em tempo real
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Saldos separados por origem operacional, sem esconder categorias zeradas.
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/app/financeiro"
            className="inline-flex h-9 items-center gap-2 justify-self-start rounded-md px-3 text-xs font-semibold text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)] hover:bg-[color:color-mix(in_oklab,var(--brand)_9%,transparent)] lg:justify-self-end"
          >
            Abrir Financeiro <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-px bg-[color:var(--hairline)] md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="bg-[color:var(--card)] p-5">
            <p className="text-xs font-medium text-muted-foreground">Saldo operacional</p>
            <p className="big-numeric mt-2 text-3xl text-foreground">{brl(totalBalance)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <StatusChip tone={openCount > 0 ? "success" : "warning"} size="xs">
                {cashCount(openCount, "aberto", "abertos")}
              </StatusChip>
              <span className="text-muted-foreground">
                {cashCount(normalized.length, "cadastrado", "cadastrados")}
              </span>
            </div>
          </div>
          <CashMetric
            label="Entradas hoje"
            value={totalIncome}
            Icon={ArrowDownLeft}
            tone="success"
          />
          <CashMetric label="Saídas hoje" value={totalExpense} Icon={ArrowUpRight} tone="danger" />
          <CashMetric
            label="Movimento líquido"
            value={totalIncome - totalExpense}
            Icon={CircleDollarSign}
            tone={totalIncome - totalExpense >= 0 ? "success" : "danger"}
          />
        </div>
      </div>

      <div
        className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Filtrar caixas por origem"
      >
        {CASH_GROUPS.map(({ key, label, description, Icon }) => {
          const items = normalized.filter((caixa) => caixa.group === key);
          const balance = items.reduce((sum, caixa) => sum + Number(caixa.saldo || 0), 0);
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter((current) => (current === key ? "todos" : key))}
              className={`surface-card min-w-0 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] ${active ? "bg-[color:color-mix(in_oklab,var(--brand)_8%,var(--card))] ring-1 ring-[color:var(--hairline-brand)]" : "hover:bg-[color:var(--surface-elev)]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${items.length > 0 ? "bg-[color:color-mix(in_oklab,var(--brand)_11%,transparent)] text-[color:var(--brand)]" : "bg-[color:var(--muted)] text-muted-foreground"}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {cashCount(items.length, "caixa", "caixas")}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold text-foreground">{label}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{description}</p>
              <p
                className={`big-numeric mt-3 text-xl ${items.length > 0 ? "text-foreground" : "text-muted-foreground"}`}
              >
                {brl(balance)}
              </p>
            </button>
          );
        })}
      </div>

      <div className="surface-card mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--hairline)] px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {filter === "todos"
                ? "Todos os caixas"
                : CASH_GROUPS.find((group) => group.key === filter)?.label}
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Saldo atual, movimento do dia e responsável por caixa.
            </p>
          </div>
          {filter !== "todos" ? (
            <button
              type="button"
              onClick={() => setFilter("todos")}
              className="text-xs font-semibold text-[color:var(--brand)] hover:underline"
            >
              Limpar filtro
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-lg bg-[color:var(--muted)]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="grid min-h-44 place-items-center px-5 py-8 text-center">
            <div className="max-w-md">
              <WalletCards className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {filter === "todos"
                  ? "Nenhum caixa cadastrado"
                  : `Nenhum caixa de ${CASH_GROUPS.find((group) => group.key === filter)?.label.toLowerCase()}`}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                A categoria permanece visível para que a ausência de operação não seja confundida
                com saldo zero.
              </p>
              <Link
                to="/app/financeiro"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--brand)] hover:underline"
              >
                Ver gestão financeira <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--hairline)]">
            {visible.map((caixa) => (
              <motion.article
                key={caixa.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="grid gap-4 bg-[color:var(--card)] p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(130px,0.7fr)_minmax(210px,0.9fr)] sm:items-center sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {caixa.referencia || "Caixa operacional"}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {caixa.operador_nome || "Responsável não identificado"}
                    </p>
                  </div>
                  <StatusChip tone={caixa.status === "aberto" ? "success" : "neutral"} size="xs">
                    {caixa.status === "aberto" ? "Aberto" : "Fechado"}
                  </StatusChip>
                </div>
                <div className="sm:text-right">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                    Saldo atual
                  </p>
                  <p className="big-numeric mt-1 text-2xl text-foreground">
                    {brl(Number(caixa.saldo || 0))}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-[color:color-mix(in_oklab,var(--success)_8%,transparent)] px-2.5 py-2">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                      Entradas
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[color:var(--success)]">
                      + {brl(Number(caixa.entradas_dia || 0))}
                    </p>
                  </div>
                  <div className="rounded-md bg-[color:color-mix(in_oklab,var(--danger)_8%,transparent)] px-2.5 py-2">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                      Saídas
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[color:var(--danger)]">
                      − {brl(Number(caixa.saidas_dia || 0))}
                    </p>
                  </div>
                  <p className="col-span-2 mt-1 text-right text-[10px] text-muted-foreground">
                    Aberto em {formatCashDate(caixa.aberto_em)}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CashMetric({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: typeof CircleDollarSign;
  tone: "success" | "danger";
}) {
  return (
    <div className="bg-[color:var(--card)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon
          className={`h-4 w-4 ${tone === "success" ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}`}
        />
      </div>
      <p
        className={`big-numeric mt-3 text-xl ${tone === "success" ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}`}
      >
        {brl(value)}
      </p>
    </div>
  );
}

function normalizeCashType(type: string): CashGroupKey {
  const value = type.toLowerCase();
  if (value.includes("balsa") || value.includes("embarc")) return "embarcacao";
  if (value.includes("porto")) return "porto";
  if (value.includes("agente")) return "agente";
  return "apoio";
}

function formatCashDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function cashCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}
