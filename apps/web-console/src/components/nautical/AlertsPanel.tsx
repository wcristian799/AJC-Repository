import { motion } from "motion/react";
import { AlertTriangle, Clock, Anchor, CalendarRange } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Alert = {
  icon: LucideIcon;
  title: string;
  meta: string;
  tone: "warn" | "alert" | "info";
};

const alerts: Alert[] = [
  {
    icon: AlertTriangle,
    title: "Manutenção vencendo · Marlin Azul",
    meta: "Antifouling em 3 dias",
    tone: "alert",
  },
  {
    icon: Clock,
    title: "Pagamento pendente · OS-2837",
    meta: "Família Lobato · R$ 4.820",
    tone: "warn",
  },
  {
    icon: Anchor,
    title: "Embarcação aguardando liberação",
    meta: "Estrela do Mar · doca 12",
    tone: "warn",
  },
  {
    icon: CalendarRange,
    title: "Agenda cheia · sábado e domingo",
    meta: "12 entradas · 8 saídas",
    tone: "info",
  },
];

const toneClass = {
  alert: "text-danger ring-danger/25 bg-danger/[0.06]",
  warn: "text-warning ring-warning/25 bg-warning/[0.06]",
  info: "text-radar ring-radar/20 bg-radar/[0.05]",
};

export function AlertsPanel() {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Atenção operacional
          </p>
          <h3 className="mt-1 font-display text-xl text-ice">Alertas em tempo real</h3>
        </div>
        <span className="relative flex h-2 w-2">
          <span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-warning opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
        </span>
      </div>

      <ul className="mt-5 space-y-2.5">
        {alerts.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.li
              key={a.title}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.25, duration: 0.45 }}
              whileHover={{ x: 2 }}
              className="group flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.03]"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${toneClass[a.tone]}`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ice">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.meta}</p>
              </div>
              <span className="mt-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                →
              </span>
            </motion.li>
          );
        })}
      </ul>

      <button className="mt-4 w-full rounded-xl border border-white/5 py-2.5 text-xs text-muted-foreground transition-colors hover:border-champagne/30 hover:text-champagne">
        Ver todas as notificações
      </button>
    </div>
  );
}
