import { motion } from "motion/react";
import { FilePlus2, Ship, Wrench, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Action = {
  id: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};

const actions: Action[] = [
  { id: "new-order", label: "Nova ordem de serviço", icon: FilePlus2, primary: true },
  { id: "register-vessel", label: "Cadastrar embarcação", icon: Ship },
  { id: "schedule", label: "Agendar manutenção", icon: Wrench },
  { id: "payment", label: "Registrar pagamento", icon: CreditCard },
];

export function QuickActions({ onNewOrder }: { onNewOrder: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {actions.map((a) => {
        const Icon = a.icon;
        const onClick = a.id === "new-order" ? onNewOrder : undefined;
        if (a.primary) {
          return (
            <motion.button
              key={a.id}
              onClick={onClick}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-medium text-[color:var(--primary-foreground)] shadow-[0_14px_36px_-12px_color-mix(in_oklab,var(--brand)_55%,transparent),inset_0_1px_0_color-mix(in_oklab,var(--ice)_22%,transparent)] ring-1 ring-[color:color-mix(in_oklab,var(--gold)_35%,transparent)] transition-shadow hover:shadow-[0_22px_50px_-12px_color-mix(in_oklab,var(--brand)_75%,transparent),inset_0_1px_0_color-mix(in_oklab,var(--ice)_30%,transparent)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand) 0%, var(--brand-soft) 55%, color-mix(in oklab, var(--brand) 70%, var(--gold)) 100%)",
              }}
            >
              <span className="pointer-events-none absolute inset-0 overflow-hidden">
                <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-[color:color-mix(in_oklab,var(--ice)_55%,transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:[animation:shine-sweep_1.2s_ease-out]" />
              </span>
              <span className="pointer-events-none absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-[color:color-mix(in_oklab,var(--gold)_70%,transparent)] to-transparent" />
              <Icon className="relative h-4 w-4" strokeWidth={2} />
              <span className="relative">{a.label}</span>
            </motion.button>
          );
        }
        return (
          <motion.button
            key={a.id}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[color:var(--surface-elev)] px-4 py-2.5 text-sm text-ice/85 backdrop-blur transition-all hover:border-[color:color-mix(in_oklab,var(--brand)_45%,transparent)] hover:text-ice hover:shadow-[0_10px_24px_-12px_color-mix(in_oklab,var(--brand)_45%,transparent)]"
          >
            <Icon className="h-4 w-4 text-champagne transition-transform group-hover:scale-110" strokeWidth={1.7} />
            {a.label}
          </motion.button>
        );
      })}
    </div>
  );
}
