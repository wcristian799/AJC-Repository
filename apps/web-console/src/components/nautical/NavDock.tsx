import { useState } from "react";
import { motion } from "motion/react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Anchor,
  CalendarDays,
  Wrench,
  Users,
  Wallet,
  Settings,
  Store,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

type Item = {
  id: string;
  icon: typeof LayoutDashboard;
  label: string;
  to?: string;
};

const items: Item[] = [
  { id: "overview", icon: LayoutDashboard, label: "Visão geral", to: "/dashboard" },
  { id: "pos", icon: Store, label: "Ponte de Vendas", to: "/pos" },
  { id: "fleet", icon: Anchor, label: "Frota" },
  { id: "schedule", icon: CalendarDays, label: "Agenda" },
  { id: "service", icon: Wrench, label: "Serviços" },
  { id: "clients", icon: Users, label: "Clientes" },
  { id: "finance", icon: Wallet, label: "Financeiro" },
  { id: "settings", icon: Settings, label: "Ajustes" },
];

export function NavDock() {
  const [activeFallback, setActiveFallback] = useState("overview");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex sticky top-6 ml-6 mt-6 h-[calc(100vh-3rem)] w-[76px] flex-col items-center justify-between rounded-2xl glass-panel py-5">
      <div className="flex flex-col items-center gap-6">
        <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_18%,transparent)] to-transparent ring-1 ring-[color:color-mix(in_oklab,var(--brand)_25%,transparent)]">
          <BrandLogo size={30} />
        </div>
        <div className="luxe-divider w-8" />
        <nav className="flex flex-col items-center gap-1.5">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = it.to ? pathname === it.to : activeFallback === it.id;
            const inner = (
              <>
                {isActive && (
                  <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-xl bg-gradient-to-b from-[color:color-mix(in_oklab,var(--brand)_18%,transparent)] to-transparent ring-1 ring-[color:color-mix(in_oklab,var(--brand)_30%,transparent)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {isActive && (
                  <span className="absolute -left-[14px] top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r bg-gradient-to-b from-champagne via-gold to-[color:var(--brand)] shadow-[0_0_12px_color-mix(in_oklab,var(--brand)_60%,transparent)]" />
                )}
                <Icon
                  className={`relative h-[18px] w-[18px] transition-colors ${
                    isActive ? "text-champagne" : "text-muted-foreground group-hover:text-ice"
                  }`}
                  strokeWidth={1.6}
                />
                <span className="pointer-events-none absolute left-[58px] z-50 whitespace-nowrap rounded-md bg-[color:var(--surface-elev)] px-2.5 py-1 text-xs text-ice opacity-0 ring-1 ring-[color:var(--hairline-strong)] backdrop-blur transition-opacity group-hover:opacity-100">
                  {it.label}
                </span>
              </>
            );

            const cls =
              "group relative grid h-11 w-11 place-items-center rounded-xl transition-colors hover:bg-[color:color-mix(in_oklab,var(--ice)_5%,transparent)]";

            return it.to ? (
              <Link key={it.id} to={it.to} className={cls} aria-label={it.label}>
                {inner}
              </Link>
            ) : (
              <button
                key={it.id}
                onClick={() => setActiveFallback(it.id)}
                className={cls}
                aria-label={it.label}
              >
                {inner}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="luxe-divider w-8" />
        <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_55%,transparent)] to-[color:color-mix(in_oklab,var(--brand)_22%,transparent)] ring-1 ring-[color:color-mix(in_oklab,var(--gold)_45%,transparent)]">
          <BrandLogo size={22} variant="mono-light" />
        </div>
      </div>
    </aside>
  );
}

/** Mobile bottom nav */
export function NavDockMobile() {
  const [active, setActive] = useState("overview");
  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-around rounded-2xl glass-panel px-2 py-2">
      {items.slice(0, 5).map((it) => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setActive(it.id)}
            className="relative grid h-11 w-11 place-items-center rounded-xl"
          >
            {isActive && (
              <motion.span
                layoutId="dock-active-m"
                className="absolute inset-0 rounded-xl bg-white/5 ring-1 ring-champagne/30"
              />
            )}
            <Icon
              className={`relative h-[18px] w-[18px] ${
                isActive ? "text-champagne" : "text-muted-foreground"
              }`}
              strokeWidth={1.6}
            />
          </button>
        );
      })}
    </nav>
  );
}
