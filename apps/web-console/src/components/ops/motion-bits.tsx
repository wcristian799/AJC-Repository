import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform, animate } from "motion/react";

/* ============ CountUp ============ */
export function CountUp({
  to,
  duration = 1.4,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);

  // Anima no mount (client-side). Não dependemos de useInView porque, sob o SSR
  // do TanStack Start, ele pode ficar preso em `false` e o número nunca conta.
  useEffect(() => {
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v),
    });
    // Salvaguarda: se o requestAnimationFrame não rodar (aba em background,
    // economia de bateria), garante que o valor final apareça em vez de ficar
    // preso em 0. O onUpdate sobrescreve normalmente quando o rAF está vivo.
    const settle = setTimeout(() => setVal((v) => (v === 0 && to !== 0 ? to : v)), duration * 1000 + 400);
    return () => {
      controls.stop();
      clearTimeout(settle);
    };
  }, [to, duration]);

  const formatted = val.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* ============ RadialDial — anel SVG animado para KPIs ============ */
export function RadialDial({
  value,
  size = 56,
  stroke = 4,
  tone = "brand",
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 22 });
  const offset = useTransform(spring, (v) => c - (v / 100) * c);

  useEffect(() => {
    if (inView) mv.set(Math.min(100, Math.max(0, value)));
  }, [inView, value, mv]);

  const color =
    tone === "success" ? "var(--success)" :
    tone === "warning" ? "var(--warning)" :
    tone === "danger"  ? "var(--danger)"  : "var(--brand)";

  return (
    <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c}
        style={{ strokeDashoffset: offset, filter: `drop-shadow(0 0 6px color-mix(in oklab, ${color} 60%, transparent))` }}
      />
    </svg>
  );
}

/* ============ LiveDot — ponto pulsante "ao vivo" ============ */
export function LiveDot({ tone = "brand" }: { tone?: "brand" | "success" | "warning" | "danger" }) {
  const color =
    tone === "success" ? "var(--success)" :
    tone === "warning" ? "var(--warning)" :
    tone === "danger"  ? "var(--danger)"  : "var(--brand)";
  return (
    <span className="relative inline-grid place-items-center">
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <motion.span
        className="absolute h-2 w-2 rounded-full"
        style={{ background: color }}
        animate={{ scale: [1, 2.4], opacity: [0.55, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
      />
    </span>
  );
}

/* ============ Marquee / Ticker ============ */
export function Ticker({ items, speed = 50 }: { items: ReactNode[]; speed?: number }) {
  const content = (
    <div className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
          <span className="h-1 w-1 rounded-full bg-[color:var(--brand)]" />
          {it}
        </div>
      ))}
    </div>
  );
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[color:var(--card)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[color:var(--card)] to-transparent" />
      <motion.div
        className="flex w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        {content}
        {content}
      </motion.div>
    </div>
  );
}

/* ============ ShimmerBar — barra de progresso com brilho ============ */
export function ShimmerBar({ pct, tone = "brand" }: { pct: number; tone?: "brand" | "success" | "warning" | "danger" }) {
  const color =
    tone === "success" ? "var(--success)" :
    tone === "warning" ? "var(--warning)" :
    tone === "danger"  ? "var(--danger)"  : "var(--brand)";
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="relative h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${color} 65%, transparent), ${color})` }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${Math.min(100, pct)}%` } : {}}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute inset-y-0 w-12 -skew-x-12 bg-white/15"
        animate={{ x: ["-50%", "600%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
    </div>
  );
}

/* ============ RadarSweep — radar SVG com varredura ============ */
export function RadarSweep({ size = 220, blips = [] as { angle: number; radius: number; tone?: "brand" | "warning" | "danger" }[] }) {
  const rings = [0.3, 0.55, 0.8];
  const center = size / 2;
  return (
    <div className="relative overflow-hidden rounded-full" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--brand) 25%, transparent)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="sweep-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--brand) 0%, transparent)" />
            <stop offset="100%" stopColor="color-mix(in oklab, var(--brand) 70%, transparent)" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={center - 2} fill="url(#radar-fill)" />
        {rings.map((r, i) => (
          <circle
            key={i}
            cx={center} cy={center} r={(center - 4) * r}
            fill="none"
            stroke="color-mix(in oklab, var(--brand) 30%, transparent)"
            strokeWidth={0.6}
          />
        ))}
        <line x1={center} y1={4} x2={center} y2={size - 4} stroke="color-mix(in oklab, var(--brand) 18%, transparent)" strokeWidth={0.5} />
        <line x1={4} y1={center} x2={size - 4} y2={center} stroke="color-mix(in oklab, var(--brand) 18%, transparent)" strokeWidth={0.5} />
      </svg>

      {/* Sweep */}
      <motion.div
        className="absolute left-1/2 top-1/2 origin-left"
        style={{
          width: center - 4,
          height: 2,
          background: "linear-gradient(90deg, color-mix(in oklab, var(--brand) 80%, transparent), transparent)",
          transformOrigin: "left center",
          translateY: -1,
          filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--brand) 70%, transparent))",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
      />
      {/* Sweep cone */}
      <motion.div
        className="absolute left-1/2 top-1/2 origin-left"
        style={{
          width: center - 4,
          height: center - 4,
          background:
            "conic-gradient(from 0deg, color-mix(in oklab, var(--brand) 14%, transparent), transparent 55deg)",
          transformOrigin: "left top",
          translateY: -(center - 4),
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
      />

      {/* Blips */}
      {blips.map((b, i) => {
        const rad = (b.angle * Math.PI) / 180;
        // Arredonda p/ 2 casas: os bundles SSR e cliente fazem constant-folding
        // de Math.cos/sin com precisão diferente, gerando hydration mismatch que
        // quebra os efeitos do subtree (CountUp ficava preso em 0).
        const x = Math.round((center + Math.cos(rad) * (center - 14) * b.radius) * 100) / 100;
        const y = Math.round((center + Math.sin(rad) * (center - 14) * b.radius) * 100) / 100;
        const color =
          b.tone === "warning" ? "var(--warning)" :
          b.tone === "danger"  ? "var(--danger)"  : "var(--brand-glow)";
        return (
          <div key={i} className="absolute" style={{ left: x - 4, top: y - 4 }}>
            <span className="block h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ border: `1px solid ${color}` }}
              animate={{ scale: [1, 3], opacity: [0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ============ VoyageTrack — timeline com barco navegando ============ */
export function VoyageTrack({
  stops,
  progressPct,
  label,
}: {
  stops: { code: string; label: string; done?: boolean }[];
  progressPct: number; // 0..100
  label?: string;
}) {
  return (
    <div className="relative pt-2">
      {label && (
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
      )}
      <div className="relative h-12">
        {/* Track */}
        <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-[color:var(--hairline)]" />
        <motion.div
          className="absolute left-2 top-1/2 h-px -translate-y-1/2"
          style={{
            background: "linear-gradient(90deg, color-mix(in oklab, var(--brand) 70%, transparent), var(--brand))",
            boxShadow: "0 0 8px color-mix(in oklab, var(--brand) 60%, transparent)",
          }}
          initial={{ width: 0 }}
          animate={{ width: `calc(${Math.min(100, progressPct)}% - 16px)` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Stops */}
        <div className="absolute inset-0 flex items-center justify-between px-2">
          {stops.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ring-2 ring-[color:var(--card)] ${
                  s.done ? "bg-[color:var(--brand)]" : "bg-[color:var(--muted)] border border-[color:var(--hairline-strong)]"
                }`}
              />
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{s.code}</span>
            </div>
          ))}
        </div>

        {/* Boat */}
        <motion.div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ left: "8px" }}
          animate={{ left: `calc(${Math.min(100, progressPct)}% - 0px)` }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            animate={{ y: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="grid h-7 w-7 place-items-center rounded-full bg-[color:var(--brand)] text-primary-foreground shadow-[0_0_20px_color-mix(in_oklab,var(--brand)_70%,transparent)]"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 20a4 4 0 0 0 4-2 4 4 0 0 0 6 0 4 4 0 0 0 6 0 4 4 0 0 0 4 2" />
              <path d="M4 18 3 14h18l-1 4" />
              <path d="M12 4v10" />
              <path d="M12 4l6 6H6z" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/* ============ AuroraMesh — fundo animado para hero ============ */
export function AuroraMesh() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-1/4 -top-1/3 h-[120%] w-[80%] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand) 35%, transparent), transparent)" }}
        animate={{ x: [0, 60, -20, 0], y: [0, 30, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 top-0 h-[100%] w-[70%] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand-glow) 30%, transparent), transparent)" }}
        animate={{ x: [0, -40, 30, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklab, var(--ivory) 20%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--ivory) 20%, transparent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
    </div>
  );
}
