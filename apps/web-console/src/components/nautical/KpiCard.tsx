import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  hint: string;
  delta?: { value: string; positive?: boolean };
  icon: LucideIcon;
  spark?: number[];
  index?: number;
};

export function KpiCard({ label, value, hint, delta, icon: Icon, spark, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="group glass-card shine-on-hover relative rounded-2xl p-5 transition-shadow hover:shadow-[0_30px_60px_-30px_oklch(0_0_0_/_0.7),0_0_0_1px_color-mix(in_oklab,var(--brand)_22%,transparent)]"
    >
      {/* left brand rail */}
      <span className="pointer-events-none absolute inset-y-5 left-0 w-[2px] rounded-full bg-gradient-to-b from-transparent via-[color:color-mix(in_oklab,var(--brand)_55%,transparent)] to-transparent opacity-70" />
      {/* gold corner glint */}
      <span className="pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-[60px] bg-gradient-to-br from-[color:color-mix(in_oklab,var(--gold)_18%,transparent)] to-transparent" />
      {/* shine sweep on hover */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-[color:color-mix(in_oklab,var(--ice)_8%,transparent)] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:[animation:shine-sweep_1.6s_ease-out]" />
      </span>

      <div className="relative flex items-start justify-between">
        <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_18%,transparent)] via-[color:color-mix(in_oklab,var(--ice)_4%,transparent)] to-transparent ring-1 ring-[color:color-mix(in_oklab,var(--brand)_25%,transparent)] shadow-[inset_0_1px_0_color-mix(in_oklab,var(--ice)_10%,transparent)]">
          <Icon className="h-[18px] w-[18px] text-champagne" strokeWidth={1.7} />
        </div>
        {delta && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ring-1 ${
              delta.positive
                ? "text-success ring-[color:color-mix(in_oklab,var(--success)_25%,transparent)] bg-[color:color-mix(in_oklab,var(--success)_8%,transparent)]"
                : "text-danger ring-[color:color-mix(in_oklab,var(--danger)_25%,transparent)] bg-[color:color-mix(in_oklab,var(--danger)_8%,transparent)]"
            }`}
          >
            {delta.positive ? "▲" : "▼"} {delta.value}
          </span>
        )}
      </div>

      <p className="relative mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="relative mt-1 font-display text-[2.1rem] leading-none text-ice">{value}</p>
      <p className="relative mt-2 text-xs text-muted-foreground">{hint}</p>

      {spark && <Sparkline values={spark} />}
    </motion.div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const w = 100;
  const h = 28;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-7 w-full">
      <defs>
        <linearGradient id={`spark-${values.join("-")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.88 0.07 88 / 0.35)" />
          <stop offset="100%" stopColor="oklch(0.88 0.07 88 / 0)" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#spark-${values.join("-")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke="oklch(0.88 0.07 88)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
