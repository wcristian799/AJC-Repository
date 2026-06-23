import { type ReactNode, type ComponentType } from "react";
import { motion } from "motion/react";
import {
  CircleDot, AlertTriangle, CheckCircle2, XCircle, Clock, WifiOff, Wifi,
  Search, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { LiveDot, ShimmerBar } from "./motion-bits";

const easeOut = [0.16, 1, 0.3, 1] as const;


/* ============ StatusChip — status e situação separados ============ */

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "offline" | "brand";

const TONES: Record<StatusTone, { fg: string; bg: string; ring: string; dot: string }> = {
  neutral:  { fg: "text-foreground",            bg: "bg-muted/60",                                ring: "ring-[color:var(--hairline)]",       dot: "bg-muted-foreground" },
  success:  { fg: "text-[color:var(--success)]", bg: "bg-[color:color-mix(in_oklab,var(--success)_14%,transparent)]", ring: "ring-[color:color-mix(in_oklab,var(--success)_35%,transparent)]", dot: "bg-[color:var(--success)]" },
  warning:  { fg: "text-[color:var(--warning)]", bg: "bg-[color:color-mix(in_oklab,var(--warning)_14%,transparent)]", ring: "ring-[color:color-mix(in_oklab,var(--warning)_35%,transparent)]", dot: "bg-[color:var(--warning)]" },
  danger:   { fg: "text-[color:var(--danger)]",  bg: "bg-[color:color-mix(in_oklab,var(--danger)_14%,transparent)]",  ring: "ring-[color:color-mix(in_oklab,var(--danger)_35%,transparent)]",  dot: "bg-[color:var(--danger)]" },
  info:     { fg: "text-[color:var(--info)]",    bg: "bg-[color:color-mix(in_oklab,var(--info)_14%,transparent)]",    ring: "ring-[color:color-mix(in_oklab,var(--info)_35%,transparent)]",    dot: "bg-[color:var(--info)]" },
  offline:  { fg: "text-[color:var(--offline)]", bg: "bg-[color:color-mix(in_oklab,var(--offline)_14%,transparent)]", ring: "ring-[color:color-mix(in_oklab,var(--offline)_35%,transparent)]", dot: "bg-[color:var(--offline)]" },
  brand:    { fg: "text-[color:var(--brand)]",   bg: "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)]",   ring: "ring-[color:color-mix(in_oklab,var(--brand)_35%,transparent)]",   dot: "bg-[color:var(--brand)]" },
};

export function StatusChip({
  tone = "neutral",
  pulse = false,
  children,
  size = "sm",
}: {
  tone?: StatusTone;
  pulse?: boolean;
  children: ReactNode;
  size?: "xs" | "sm" | "md";
}) {
  const t = TONES[tone];
  const sz = size === "xs" ? "h-5 px-2 text-[10px]" : size === "md" ? "h-7 px-3 text-xs" : "h-6 px-2.5 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ring-1 font-medium ${t.bg} ${t.fg} ${t.ring} ${sz}`}>
      <span className="relative grid place-items-center">
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
        {pulse && <span className={`absolute h-1.5 w-1.5 rounded-full ${t.dot} pulse-soft`} />}
      </span>
      <span className="whitespace-nowrap tracking-tight">{children}</span>
    </span>
  );
}

/* Helpers semânticos do spec */
export function ViagemStatusChip({ s }: { s: "planejada" | "em_curso" | "concluida" | "cancelada" }) {
  const map = {
    planejada: { tone: "neutral" as StatusTone, label: "Planejada" },
    em_curso:  { tone: "brand"   as StatusTone, label: "Em curso" },
    concluida: { tone: "success" as StatusTone, label: "Concluída" },
    cancelada: { tone: "offline" as StatusTone, label: "Cancelada" },
  }[s];
  return <StatusChip tone={map.tone} pulse={s === "em_curso"}>{map.label}</StatusChip>;
}

export function ViagemSituacaoChip({ s }: { s?: "no_prazo" | "atencao" | "atrasado" }) {
  if (!s) return null;
  const map = {
    no_prazo: { tone: "success" as StatusTone, label: "No prazo",  Icon: CheckCircle2 },
    atencao:  { tone: "warning" as StatusTone, label: "Atenção",   Icon: AlertTriangle },
    atrasado: { tone: "danger"  as StatusTone, label: "Atrasado",  Icon: XCircle },
  }[s];
  return (
    <StatusChip tone={map.tone} pulse={s !== "no_prazo"}>
      <map.Icon className="h-3 w-3" /> {map.label}
    </StatusChip>
  );
}

/* ============ KPIStat ============ */

export function KPIStat({
  label, value, hint, delta, icon: Icon, index = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: { value: string; positive?: boolean };
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  index?: number;
}) {
  // Heuristic progress for the shimmer bar (deterministic per label)
  const seed = (label.charCodeAt(0) * 13 + label.length * 7) % 60;
  const pct = 40 + seed;
  const tone: "brand" | "success" | "warning" | "danger" =
    delta?.positive === true ? "success" : delta?.positive === false ? "danger" : "brand";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: easeOut }}
      whileHover={{ y: -3 }}
      className="surface-card brand-rail brand-rail-left group relative overflow-hidden p-4 md:p-5"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[color:color-mix(in_oklab,var(--brand)_18%,transparent)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px]">
          {label}
        </p>
        {Icon && (
          <motion.span
            whileHover={{ rotate: 8, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"
          >
            <Icon className="h-4 w-4" strokeWidth={1.7} />
          </motion.span>
        )}
      </div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 + 0.15, duration: 0.5, ease: easeOut }}
        className="big-numeric mt-3 text-2xl text-foreground sm:text-3xl md:text-[2rem] xl:text-[2.2rem]"
      >
        {value}
      </motion.p>
      <div className="mt-3 flex items-center justify-between gap-2">
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
        {delta && (
          <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            delta.positive ? "bg-[color:color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)]"
                            : "bg-[color:color-mix(in_oklab,var(--danger)_14%,transparent)] text-[color:var(--danger)]"
          }`}>
            {delta.positive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {delta.value}
          </span>
        )}
      </div>
      <div className="mt-3">
        <ShimmerBar pct={pct} tone={tone} />
      </div>
    </motion.div>
  );
}


/* ============ FilterBar ============ */

export function FilterBar({
  searchPlaceholder = "Buscar…",
  right,
  children,
}: {
  searchPlaceholder?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-wrap items-center gap-2 p-2.5">
      <div className="relative flex h-9 min-w-0 flex-1 basis-full items-center gap-2 rounded-md bg-[color:var(--muted)] px-3 ring-1 ring-[color:var(--hairline)] focus-within:ring-[color:var(--ring)] sm:basis-auto">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="h-full w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
      </div>
      {children}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function FilterChip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-9 rounded-md px-3 text-xs font-medium transition-colors ${
        active
          ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"
          : "bg-[color:var(--muted)] text-foreground/80 ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
      }`}
    >
      {children}
    </button>
  );
}

/* ============ DataTable shell ============ */

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, empty = "Sem registros",
}: {
  columns: { key: keyof T | string; header: string; render?: (row: T) => ReactNode; align?: "left" | "right" | "center"; width?: string }[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: string;
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="max-h-[640px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[color:var(--card)]/95 backdrop-blur-md">
            <tr className="border-b border-[color:var(--hairline)]">
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  }`}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.025, duration: 0.35, ease: easeOut }}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-[color:var(--hairline)] last:border-0 transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-[color:color-mix(in_oklab,var(--brand)_5%,transparent)]" : "hover:bg-[color:color-mix(in_oklab,var(--brand)_3%,transparent)]"
                } ${i % 2 === 1 ? "bg-[color:var(--surface-tint)]" : ""}`}
              >
                {columns.map((c) => (
                  <td
                    key={String(c.key)}
                    className={`px-4 py-3 text-foreground/90 ${
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {c.render ? c.render(row) : (row as any)[c.key]}
                  </td>
                ))}
              </motion.tr>
            ))}

          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ Section header ============ */

export function SectionHeader({
  eyebrow, title, description, actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: easeOut }}
      className="surface-card filet-crimson relative overflow-hidden p-5 md:p-6"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-[0.06] blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--champagne), transparent)" }} />
      <div className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="champagne-eyebrow inline-flex items-center gap-2"
            >
              <LiveDot /> {eyebrow}
            </motion.p>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.55, ease: easeOut }}
            className="mt-2 font-display text-2xl leading-[1.1] text-foreground sm:text-[1.75rem] md:text-[2rem]"
          >
            {title}
          </motion.h1>
          {description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="mt-1.5 max-w-2xl text-xs text-muted-foreground sm:text-sm"
            >
              {description}
            </motion.p>
          )}
        </div>
        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45 }}
            className="flex flex-wrap items-center gap-2"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}



/* ============ Buttons ============ */

export function PrimaryButton({
  children, onClick, type = "button", icon: Icon, disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-md bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] px-4 text-sm font-medium text-primary-foreground shadow-[0_10px_24px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] transition-shadow hover:shadow-[0_14px_32px_-12px_color-mix(in_oklab,var(--brand)_85%,transparent)] disabled:opacity-60"
    >
      <span className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/22 opacity-0 group-hover:opacity-100 group-hover:[animation:shine-sweep_1.2s_ease-out]" />
      </span>
      <span className="relative inline-flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" strokeWidth={1.7} />}
        {children}
      </span>
    </button>
  );
}

export function GhostButton({
  children, onClick, icon: Icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-md bg-[color:var(--surface-elev)] px-4 text-sm font-medium text-foreground/85 ring-1 ring-[color:var(--hairline)] backdrop-blur-md transition-colors hover:bg-[color:var(--accent)] hover:text-foreground"
    >
      {Icon && <Icon className="h-4 w-4" strokeWidth={1.7} />}
      {children}
    </button>
  );
}

/* ============ SyncIndicator + OfflineBanner ============ */

export function SyncIndicator({ online = true, pending = 0 }: { online?: boolean; pending?: number }) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-2 rounded-full px-2.5 text-[11px] font-medium ring-1 ${
        online
          ? "text-[color:var(--success)] ring-[color:color-mix(in_oklab,var(--success)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)]"
          : "text-[color:var(--offline)] ring-[color:color-mix(in_oklab,var(--offline)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--offline)_10%,transparent)]"
      }`}
    >
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {online ? "Sincronizado" : `Offline · ${pending} pend.`}
    </span>
  );
}

export function OfflineBanner({ pending }: { pending: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-[color:color-mix(in_oklab,var(--offline)_14%,transparent)] px-4 py-2.5 text-sm text-[color:var(--offline)] ring-1 ring-[color:color-mix(in_oklab,var(--offline)_30%,transparent)]">
      <WifiOff className="h-4 w-4" />
      <span className="font-medium">Trabalhando offline</span>
      <span className="text-muted-foreground">·  {pending} eventos aguardam sincronização</span>
    </div>
  );
}

/* ============ CounterBadge (campo: gigante) ============ */

export function CounterBadge({ current, total, label }: { current: number; total: number; label?: string }) {
  const pct = Math.min(100, Math.round((current / Math.max(total, 1)) * 100));
  const tone: StatusTone = current === total ? "success" : current > total ? "danger" : "brand";
  const t = TONES[tone];
  return (
    <div className={`relative rounded-3xl ring-1 p-8 ${t.bg} ${t.ring}`}>
      {label && <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>}
      <p className={`big-numeric mt-3 text-center text-[6rem] leading-none ${t.fg}`}>
        {current}<span className="text-foreground/30">/{total}</span>
      </p>
      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
        <div
          className={`h-full transition-all ${
            tone === "success" ? "bg-[color:var(--success)]" : tone === "danger" ? "bg-[color:var(--danger)]" : "bg-[color:var(--brand)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ============ Helpers ============ */

export function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  const t = TONES[tone];
  return (
    <span className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium ring-1 ${t.bg} ${t.fg} ${t.ring}`}>
      {children}
    </span>
  );
}

export { Clock, CircleDot };

/* ============ BentoGrid — assimétrico 12-col, premium ============ */
export function BentoGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12 ${className}`}>
      {children}
    </div>
  );
}

export function BentoCell({
  span = 6,
  spanMd,
  className = "",
  children,
}: {
  span?: number;
  spanMd?: number;
  className?: string;
  children: ReactNode;
}) {
  const xl: Record<number, string> = {
    3: "xl:col-span-3", 4: "xl:col-span-4", 5: "xl:col-span-5",
    6: "xl:col-span-6", 7: "xl:col-span-7", 8: "xl:col-span-8",
    9: "xl:col-span-9", 12: "xl:col-span-12",
  };
  const md: Record<number, string> = {
    2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4",
    6: "md:col-span-6",
  };
  return (
    <div className={`${md[spanMd ?? Math.min(6, span)] ?? "md:col-span-6"} ${xl[span] ?? "xl:col-span-6"} min-w-0 ${className}`}>
      {children}
    </div>
  );
}
