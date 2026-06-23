import { motion } from "motion/react";
import compassImg from "@/assets/brass-compass.jpg";

type Blip = { x: number; y: number; label: string; tone?: "ok" | "warn" | "alert" };

const blips: Blip[] = [
  { x: 38, y: 36, label: "Sereia III", tone: "ok" },
  { x: 62, y: 44, label: "Marlin Azul", tone: "warn" },
  { x: 48, y: 66, label: "Vento Sul", tone: "ok" },
  { x: 68, y: 30, label: "Estrela do Mar", tone: "alert" },
  { x: 32, y: 58, label: "Aurora", tone: "ok" },
  { x: 56, y: 26, label: "Ondina", tone: "ok" },
];

const toneColor: Record<NonNullable<Blip["tone"]>, string> = {
  ok: "oklch(0.82 0.18 165)",
  warn: "oklch(0.84 0.16 75)",
  alert: "oklch(0.7 0.22 25)",
};

export function RadarPanel() {
  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Painel operacional · 47°N 14°W
          </p>
          <h3 className="font-display text-2xl text-ice mt-1">Status da frota</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-radar opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-radar" />
          </span>
          <span className="font-mono uppercase tracking-widest text-radar/90">
            Live · scanning
          </span>
        </div>
      </div>

      <div className="relative mx-auto mt-6 aspect-square w-full max-w-[460px]">
        {/* Brass compass photograph */}
        <div className="absolute inset-0 overflow-hidden rounded-full ring-1 ring-champagne/20 shadow-[0_30px_80px_-20px_oklch(0.78_0.13_78_/_0.35),inset_0_0_60px_oklch(0.08_0.03_245_/_0.6)]">
          <img
            src={compassImg}
            alt="Bússola náutica de bronze"
            width={1024}
            height={1024}
            loading="lazy"
            className="h-full w-full object-cover scale-[1.12]"
          />
          {/* tint to match palette */}
          <div className="absolute inset-0 bg-gradient-to-b from-deep/20 via-transparent to-deep/50 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_55%,oklch(0.08_0.03_245_/_0.85)_100%)]" />
        </div>

        {/* sweep overlay */}
        <div className="radar-sweep absolute inset-0 rounded-full overflow-hidden">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <defs>
              <linearGradient id="sweep" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="oklch(0.82 0.18 165 / 0)" />
                <stop offset="100%" stopColor="oklch(0.82 0.18 165 / 0.45)" />
              </linearGradient>
            </defs>
            <path d="M50 50 L50 2 A48 48 0 0 1 96 36 Z" fill="url(#sweep)" />
          </svg>
        </div>

        {/* blips */}
        {blips.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <div className="group relative">
              <span
                className="ping-soft absolute inset-0 m-auto h-2 w-2 rounded-full"
                style={{ background: toneColor[b.tone ?? "ok"] }}
              />
              <span
                className="relative block h-2 w-2 rounded-full ring-2 ring-deep/80"
                style={{
                  background: toneColor[b.tone ?? "ok"],
                  boxShadow: `0 0 12px ${toneColor[b.tone ?? "ok"]}`,
                }}
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-deep/90 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ice/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                {b.label}
              </span>
            </div>
          </motion.div>
        ))}

        {/* center pin */}
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne shadow-[0_0_24px_oklch(0.78_0.13_78_/_0.8)]" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/5 pt-4 font-mono text-[10px] uppercase tracking-widest">
        <Stat label="Em operação" value="18" tone="ok" />
        <Stat label="Em manutenção" value="04" tone="warn" />
        <Stat label="Aguardando" value="02" tone="alert" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "alert";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className="font-display text-base normal-case tracking-normal"
        style={{ color: toneColor[tone] }}
      >
        {value}
      </span>
    </div>
  );
}
