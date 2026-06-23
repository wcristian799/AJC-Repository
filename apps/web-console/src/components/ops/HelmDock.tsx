import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import {
  LayoutDashboard, Ship, Boxes, Users, Wallet, Settings2, Ticket,
  Package, Command, Bell, Radio,
} from "lucide-react";
import { BrandMark } from "./BrandMark";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; group: "op" | "ge" };

const NAV: NavItem[] = [
  { title: "Início",     url: "/app/inicio",     icon: LayoutDashboard, group: "op" },
  { title: "Navegação",  url: "/app/navegacao",  icon: Ship,            group: "op" },
  { title: "TMS",        url: "/app/tms",        icon: Boxes,           group: "op" },
  { title: "Encomendas", url: "/app/encomendas", icon: Package,         group: "op" },
  { title: "Vendas",     url: "/app/vendas",     icon: Ticket,          group: "op" },
  { title: "CRM",        url: "/app/crm",        icon: Users,           group: "ge" },
  { title: "Financeiro", url: "/app/financeiro", icon: Wallet,          group: "ge" },
  { title: "Cadastros",  url: "/app/cadastros",  icon: Settings2,       group: "ge" },
];

// Índice do primeiro item do grupo "gestão" — usado para o divisor visual.
const FIRST_GE_INDEX = NAV.findIndex((it) => it.group === "ge");

export function HelmDock({ onCommand }: { onCommand?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { scrollY } = useScroll();
  const [compact, setCompact] = useState(false);
  const [last, setLast] = useState(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    const goingDown = y > last && y > 120;
    setCompact(goingDown);
    setLast(y);
  });

  return (
    <>
      {/* Desktop dock — floating bottom center */}
      <motion.nav
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="pointer-events-none fixed bottom-5 left-1/2 z-40 hidden -translate-x-1/2 md:block"
      >
        <motion.div
          layout
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="noir-panel helm-glow pointer-events-auto flex items-center gap-1 rounded-full px-2 py-2"
        >
          {/* Crest */}
          <Link
            to="/app/inicio"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_45%,transparent)] to-transparent ring-1 ring-[color:var(--hairline-champagne)]"
            title="AJC"
          >
            <BrandMark size={18} />
          </Link>

          <span className="mx-1 h-6 w-px bg-[color:var(--hairline)]" />

          {/* Items */}
          <ul className="flex items-center gap-0.5">
            {NAV.map((it, i) => {
              const active = pathname.startsWith(it.url);
              const showLabel = !compact || active;
              return (
                <li key={it.url} className="relative">
                  <Link
                    to={it.url}
                    className="relative grid h-9 place-items-center"
                  >
                    {active && (
                      <motion.span
                        layoutId="helm-active"
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_30%,transparent)] to-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] ring-1 ring-[color:var(--hairline-brand)]"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    {it.group === "ge" && i === FIRST_GE_INDEX && (
                      <span className="absolute -left-1 top-1/2 h-3 w-px -translate-y-1/2 bg-[color:var(--hairline)]" />
                    )}
                    <span className={`relative z-10 flex items-center gap-2 px-3 transition-colors ${
                      active ? "text-foreground" : "text-foreground/65 hover:text-foreground"
                    }`}>
                      <it.icon className="h-4 w-4" strokeWidth={1.7} />
                      <AnimatePresence initial={false}>
                        {showLabel && (
                          <motion.span
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden whitespace-nowrap text-[12.5px] font-medium tracking-tight"
                          >
                            {it.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <span className="mx-1 h-6 w-px bg-[color:var(--hairline)]" />

          {/* App de campo — outro contexto (sem o dock de gestão) */}
          <Link
            to="/campo"
            className="grid h-9 w-9 place-items-center rounded-full text-foreground/75 transition-colors hover:bg-[color:var(--accent)] hover:text-foreground"
            title="Abrir app de campo"
          >
            <Radio className="h-4 w-4" strokeWidth={1.7} />
          </Link>

          {/* Command */}
          <button
            onClick={onCommand}
            className="group flex h-9 items-center gap-2 rounded-full bg-[color:color-mix(in_oklab,var(--champagne)_8%,transparent)] px-3 text-[11px] font-medium text-foreground/85 ring-1 ring-[color:var(--hairline-champagne)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--champagne)_14%,transparent)] hover:text-foreground"
            title="Comando rápido"
          >
            <Command className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Comando</span>
            <kbd className="hidden rounded border border-[color:var(--hairline)] px-1.5 font-mono text-[9px] text-muted-foreground lg:inline">⌘K</kbd>
          </button>

          {/* Alerts */}
          <button
            className="relative grid h-9 w-9 place-items-center rounded-full text-foreground/75 transition-colors hover:bg-[color:var(--accent)] hover:text-foreground"
            title="Alertas"
          >
            <Bell className="h-4 w-4" strokeWidth={1.7} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[color:var(--brand)] ring-2 ring-[color:var(--surface-noir)]" />
          </button>
        </motion.div>
      </motion.nav>

      {/* Mobile: bottom bar */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="noir-panel pointer-events-auto mx-2 mb-2 flex items-center justify-around gap-1 rounded-2xl px-2 py-2">
          {NAV.slice(0, 5).map((it) => {
            const active = pathname.startsWith(it.url);
            return (
              <Link
                key={it.url}
                to={it.url}
                className={`relative flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 ${
                  active ? "text-foreground" : "text-foreground/60"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="helm-active-mobile"
                    className="absolute inset-0 rounded-xl bg-[color:color-mix(in_oklab,var(--brand)_22%,transparent)] ring-1 ring-[color:var(--hairline-brand)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <it.icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={1.7} />
                <span className="relative z-10 text-[9px] font-medium tracking-tight">{it.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

/* Top brasão bar (substitui topbar pesada) */
export function HelmCrown({ crumb }: { crumb?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[color:var(--hairline)] bg-[color:var(--background)]/70 px-4 backdrop-blur-xl md:px-8 lg:px-12">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_30%,transparent)] to-transparent ring-1 ring-[color:var(--hairline-champagne)]">
          <BrandMark size={16} />
        </div>
        <span className="champagne-eyebrow truncate">AJC · Suite</span>
        {crumb && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <span className="truncate text-[12px] font-medium tracking-tight text-foreground/90">{crumb}</span>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline-flex">
          <span className="relative grid place-items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
            <span className="absolute h-1.5 w-1.5 rounded-full bg-[color:var(--success)] pulse-soft" />
          </span>
          Live
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </span>
      </div>
    </header>
  );
}

/* Suppress unused import warning */
void useEffect;
