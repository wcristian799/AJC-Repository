import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  useAnimationFrame,
} from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar · AJC Suite" },
      { name: "description", content: "Acesse a Suite ERP/TMS da AJC Ferry Boat." },
      { property: "og:title", content: "AJC Suite · Entrar" },
    ],
  }),
  component: LoginPage,
});

/* ============================================================
   AJC Suite — Login cinematográfico
   Cena única, sem split. Tinta carmim que escorre, balsa que
   percorre a rota fluvial, tipografia kinetic, cursor com glow,
   contadores tickando, formulário materializa em camadas.
   ============================================================ */

function LoginPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"intro" | "form" | "submitting" | "done">("intro");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // intro → form
  useEffect(() => {
    const t = setTimeout(() => setPhase("form"), 900);
    return () => clearTimeout(t);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "form") return;
    setPhase("submitting");
    setTimeout(() => {
      setPhase("done");
      setTimeout(() => navigate({ to: "/app/inicio" }), 700);
    }, 1100);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.06_0.008_25)] text-ivory">
      <CursorGlow />
      <FilmGrain />
      <RiverCanvas />
      <CrimsonInk />
      <CornerBrackets />

      {/* HUD topo */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7 }}
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 sm:px-10"
      >
        <div className="flex items-center gap-3">
          <BrandMark size={26} />
          <div className="leading-none">
            <p className="font-display text-[15px]">AJC Ferry Boat</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.32em] text-[color:var(--brand-glow)]">
              Suite · ERP/TMS
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-4 font-mono text-[10px] uppercase tracking-[0.3em] text-ivory/60 md:flex">
          <LiveClock />
          <span className="h-3 w-px bg-ivory/20" />
          <span className="inline-flex items-center gap-2">
            <span className="relative grid h-1.5 w-1.5 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--brand)]/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
            </span>
            Operação ativa
          </span>
        </div>
      </motion.header>

      {/* ===== Cena central ===== */}
      <section className="relative z-20 mx-auto flex min-h-screen max-w-[1280px] flex-col items-center justify-center px-6 pb-16 pt-20 sm:pt-28">
        <AnimatePresence mode="wait">
          {phase === "intro" ? (
            <Intro key="intro" />
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]"
            >
              {/* COLUNA — texto kinetic */}
              <div className="relative hidden lg:block">
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.05, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-6 -ml-2 flex items-center"
                >
                  <BrandMark size={280} variant="mono-light" className="drop-shadow-[0_8px_50px_color-mix(in_oklab,var(--brand)_60%,transparent)]" />
                </motion.div>
                <KineticHeadline />

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3, duration: 0.8 }}
                  className="mt-8 max-w-md text-[15px] leading-relaxed text-ivory/70"
                >
                  Da margem à entrega, com prova de cada passo.
                  Passageiros, encomendas, carga e veículos —
                  Belém ↔ 7 cidades, ponta a ponta.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6, duration: 0.8 }}
                  className="mt-10 grid max-w-md grid-cols-3 gap-3"
                >
                  <LiveStat label="balsas" target={3} suffix=" / em curso" />
                  <LiveStat label="volumes" target={924} suffix=" / rastreio" />
                  <LiveStat label="QR válido" target={98} suffix="%" />
                </motion.div>
              </div>

              {/* COLUNA — formulário materializado */}
              <FormPanel
                phase={phase}
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
                onSubmit={submit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* rodapé fino */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 0.8 }}
        className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-6 py-5 font-mono text-[10px] uppercase tracking-[0.28em] text-ivory/40 sm:px-10"
      >
        <span>01°27′S · 48°30′W · BELÉM/PA</span>
        <span className="hidden md:inline">TLS 1.3 · LGPD · auditoria imutável</span>
        <Coord />
      </motion.footer>
    </main>
  );
}

/* ─────────── INTRO: marca surge da tinta ─────────── */
function Intro() {
  return (
    <motion.div
      exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
      transition={{ duration: 0.6 }}
      className="relative grid place-items-center"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="grid h-24 w-24 place-items-center rounded-2xl ring-1 ring-[color:var(--brand)]/30"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, oklch(0.5 0.22 27 / 0.55), transparent 70%)",
        }}
      >
        <BrandMark size={56} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, letterSpacing: "0.6em" }}
        animate={{ opacity: 1, letterSpacing: "0.4em" }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-[color:var(--brand-glow)]"
      >
        AJC · SUITE
      </motion.p>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
        className="mt-4 h-px w-40 origin-left bg-gradient-to-r from-transparent via-[color:var(--brand)] to-transparent"
      />
    </motion.div>
  );
}

/* ─────────── Headline kinetic char-by-char ─────────── */
function KineticHeadline() {
  const line1 = "Da margem".split("");
  const line2 = "à entrega.".split("");
  return (
    <h1 className="font-display text-[clamp(2.6rem,7vw,5.4rem)] leading-[0.95] tracking-[-0.02em]">
      <div className="flex flex-wrap">
        {line1.map((c, i) => (
          <motion.span
            key={`a${i}`}
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.04, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block"
            style={{ whiteSpace: c === " " ? "pre" : "normal" }}
          >
            {c}
          </motion.span>
        ))}
      </div>
      <div className="flex flex-wrap">
        {line2.map((c, i) => (
          <motion.span
            key={`b${i}`}
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 + i * 0.045, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block brand-text"
            style={{ whiteSpace: c === " " ? "pre" : "normal" }}
          >
            {c}
          </motion.span>
        ))}
      </div>
    </h1>
  );
}

/* ─────────── Painel do form com magnetic button ─────────── */
function FormPanel({
  phase,
  email,
  password,
  setEmail,
  setPassword,
  onSubmit,
}: {
  phase: "form" | "submitting" | "done" | "intro";
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const loading = phase === "submitting";
  const done = phase === "done";

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* moldura com beam vermelho percorrendo */}
      <div className="relative rounded-2xl p-[1px]">
        <BorderBeam />
        <div className="relative rounded-2xl border border-[color:var(--hairline-strong)] bg-[oklch(0.08_0.01_25/0.78)] p-8 backdrop-blur-xl">
          <div className="mb-7 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[color:var(--brand-glow)]">
              ▸ acesso seguro
            </p>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ivory/40">
              v.2026.06
            </span>
          </div>

          <h2 className="font-display text-2xl text-ivory">Acessar a suite</h2>
          <p className="mt-1.5 text-[13px] text-ivory/55">
            Credenciais corporativas AJC.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <LineField
              id="email"
              label="E-MAIL"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <LineField
              id="password"
              label="SENHA"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between pt-1 text-[11px] text-ivory/55">
              <label className="flex cursor-pointer items-center gap-2">
                <span className="relative grid h-3.5 w-3.5 place-items-center rounded-[4px] border border-ivory/30 transition-colors hover:border-[color:var(--brand)]/70">
                  <input type="checkbox" className="peer sr-only" />
                  <span className="hidden h-1.5 w-1.5 rounded-[2px] bg-[color:var(--brand)] peer-checked:block" />
                </span>
                Manter conectado
              </label>
              <a href="#" className="story-link text-[color:var(--brand-glow)]">
                Esqueci minha senha
              </a>
            </div>

            <MagneticButton loading={loading} done={done} />
          </form>

          <div className="mt-7 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.3em] text-ivory/40">
            <span className="h-px flex-1 bg-ivory/10" />
            <span>perfis · operação · campo · gestão</span>
            <span className="h-px flex-1 bg-ivory/10" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────── Campo com underline animada ─────────── */
function LineField({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div className="relative pt-5">
      <motion.label
        htmlFor={id}
        animate={{
          y: active ? -18 : 0,
          fontSize: active ? "10px" : "13px",
          color: active ? "oklch(0.78 0.16 27)" : "oklch(0.8 0 0 / 0.55)",
          letterSpacing: active ? "0.32em" : "0.06em",
        }}
        transition={{ duration: 0.25 }}
        className="pointer-events-none absolute left-0 top-5 origin-left font-mono uppercase"
      >
        {label}
      </motion.label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="block w-full bg-transparent pb-2 pt-1 text-[15px] text-ivory outline-none"
      />
      <div className="relative h-px w-full bg-ivory/15">
        <motion.div
          initial={false}
          animate={{ scaleX: active ? 1 : 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 origin-left bg-gradient-to-r from-[color:var(--brand)] via-[color:var(--brand-glow)] to-transparent"
        />
      </div>
    </div>
  );
}

/* ─────────── Botão magnético com glow ─────────── */
function MagneticButton({ loading, done }: { loading: boolean; done: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left - r.width / 2) * 0.35);
    y.set((e.clientY - r.top - r.height / 2) * 0.35);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={reset}
      type="submit"
      disabled={loading || done}
      className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-md border border-[color:var(--brand)]/40 bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-medium tracking-wide text-primary-foreground shadow-[0_18px_50px_-12px_oklch(0.5_0.22_27/0.55)]"
    >
      <span className="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          className={`absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 ${
            loading
              ? "[animation:shine-sweep_1s_linear_infinite]"
              : "opacity-0 group-hover:opacity-100 group-hover:[animation:shine-sweep_1.1s_ease-out]"
          }`}
        />
      </span>
      <span className="relative inline-flex items-center gap-2">
        {done ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2.5} /> Acessando
          </>
        ) : loading ? (
          <>
            <Spinner /> Verificando credenciais
          </>
        ) : (
          <>
            Entrar
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </span>
    </motion.button>
  );
}

function Spinner() {
  return (
    <span className="relative inline-grid h-4 w-4 place-items-center">
      <span className="absolute inset-0 animate-spin rounded-full border border-white/30 border-t-white" />
    </span>
  );
}

/* ─────────── Border beam crimson ─────────── */
function BorderBeam() {
  return (
    <span
      className="pointer-events-none absolute inset-0 rounded-2xl"
      style={{
        background:
          "conic-gradient(from 0deg, transparent 0deg, oklch(0.55 0.22 27 / 0.9) 30deg, transparent 90deg, transparent 360deg)",
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        padding: 1,
        animation: "beam-spin 6s linear infinite",
      }}
    />
  );
}

/* ─────────── Cursor glow ─────────── */
function CursorGlow() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 80, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 80, damping: 18, mass: 0.4 });
  useEffect(() => {
    function on(e: MouseEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
    }
    window.addEventListener("mousemove", on);
    return () => window.removeEventListener("mousemove", on);
  }, [x, y]);
  const left = useTransform(sx, (v) => `${v - 240}px`);
  const top = useTransform(sy, (v) => `${v - 240}px`);
  return (
    <motion.div
      aria-hidden
      style={{ left, top }}
      className="pointer-events-none fixed z-10 h-[480px] w-[480px] rounded-full opacity-60 mix-blend-screen"
    >
      <div
        className="h-full w-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.55 0.22 27 / 0.35), transparent 60%)",
          filter: "blur(20px)",
        }}
      />
    </motion.div>
  );
}

/* ─────────── Grão fino ─────────── */
function FilmGrain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] opacity-[0.08] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.7'/></svg>\")",
      }}
    />
  );
}

/* ─────────── Tinta carmim escorrendo (blob) ─────────── */
function CrimsonInk() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.55, scale: 1 }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute -left-40 top-1/4 z-0 h-[640px] w-[640px] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.5 0.22 27 / 0.6), transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.45, scale: 1 }}
        transition={{ delay: 0.4, duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute -right-40 bottom-0 z-0 h-[560px] w-[560px] rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.32 0.18 27 / 0.7), transparent 70%)",
        }}
      />
    </>
  );
}

/* ─────────── Rota fluvial em SVG com balsa atravessando ─────────── */
function RiverCanvas() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 900"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.55]"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="river" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="oklch(0.7 0.18 27)" stopOpacity="0" />
          <stop offset="0.5" stopColor="oklch(0.7 0.18 27)" stopOpacity="0.55" />
          <stop offset="1" stopColor="oklch(0.7 0.18 27)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="dot" r="0.5">
          <stop offset="0" stopColor="oklch(0.85 0.18 27)" />
          <stop offset="1" stopColor="oklch(0.85 0.18 27)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Grid sutil */}
      <g opacity="0.18">
        {Array.from({ length: 16 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            x2="1440"
            y1={i * 60}
            y2={i * 60}
            stroke="oklch(1 0 0 / 0.06)"
          />
        ))}
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={`v${i}`}
            y1="0"
            y2="900"
            x1={i * 60}
            x2={i * 60}
            stroke="oklch(1 0 0 / 0.06)"
          />
        ))}
      </g>

      {/* Rota fluvial — curva Belém → Santarém */}
      <motion.path
        id="route"
        d="M 60 720 C 280 660, 360 560, 540 540 S 820 600, 980 460 S 1280 280, 1400 180"
        fill="none"
        stroke="url(#river)"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.6, ease: [0.65, 0, 0.35, 1] }}
      />

      {/* Cidades */}
      {[
        [60, 720, "BEL"],
        [540, 540, "BRV"],
        [980, 460, "PMZ"],
        [1400, 180, "STM"],
      ].map(([cx, cy, label], i) => (
        <g key={label as string}>
          <motion.circle
            cx={cx as number}
            cy={cy as number}
            r="4"
            fill="oklch(0.85 0.18 27)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2 + i * 0.2, duration: 0.5 }}
          />
          <motion.circle
            cx={cx as number}
            cy={cy as number}
            r="14"
            fill="none"
            stroke="oklch(0.85 0.18 27)"
            strokeWidth="0.8"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.8, 2.2] }}
            transition={{
              delay: 1.3 + i * 0.2,
              duration: 2.4,
              repeat: Infinity,
              repeatDelay: 0.6,
            }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          <text
            x={(cx as number) + 12}
            y={(cy as number) - 10}
            fill="oklch(1 0 0 / 0.55)"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            letterSpacing="0.2em"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Balsa percorrendo */}
      <FerryAlongRoute />
    </svg>
  );
}

function FerryAlongRoute() {
  const glow = useRef<SVGCircleElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const t = useRef(0);

  useEffect(() => {
    pathRef.current = document.getElementById("route") as unknown as SVGPathElement | null;
  }, []);

  useAnimationFrame((_, delta) => {
    if (!pathRef.current || !glow.current || !dot.current) return;
    t.current = (t.current + delta / 9000) % 1;
    const len = pathRef.current.getTotalLength();
    const p = pathRef.current.getPointAtLength(t.current * len);
    glow.current.setAttribute("cx", String(p.x));
    glow.current.setAttribute("cy", String(p.y));
    dot.current.setAttribute("cx", String(p.x));
    dot.current.setAttribute("cy", String(p.y));
  });

  return (
    <>
      <circle ref={glow} r="22" fill="url(#dot)" />
      <circle ref={dot} r="3.5" fill="oklch(0.95 0.05 27)" />
    </>
  );
}

/* ─────────── HUD: cantos ─────────── */
function CornerBrackets() {
  const cls =
    "absolute z-30 h-8 w-8 border-[color:var(--brand)]/40";
  return (
    <>
      <span className={`${cls} left-4 top-4 border-l border-t`} />
      <span className={`${cls} right-4 top-4 border-r border-t`} />
      <span className={`${cls} left-4 bottom-4 border-b border-l`} />
      <span className={`${cls} right-4 bottom-4 border-b border-r`} />
    </>
  );
}

/* ─────────── Live clock ─────────── */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <span className="tabular-nums">
      {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

function Coord() {
  const [c, setC] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setC((v) => (v + 1) % 360), 80);
    return () => clearInterval(i);
  }, []);
  return <span className="tabular-nums">HDG {String(c).padStart(3, "0")}°</span>;
}

/* ─────────── Contador tickando ─────────── */
function LiveStat({
  target,
  label,
  suffix,
}: {
  target: number;
  label: string;
  suffix?: string;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const loop = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setV(Math.round(target * eased));
      if (k < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return (
    <div className="rounded-md border border-ivory/10 bg-ivory/[0.02] p-3 backdrop-blur-sm">
      <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-ivory/45">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl tabular-nums text-ivory">
        {v}
        {suffix && (
          <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ivory/45">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
