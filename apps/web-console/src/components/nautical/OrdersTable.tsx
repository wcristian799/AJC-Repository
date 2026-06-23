import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

const rows = [
  {
    id: "OS-2841",
    client: "Eduardo Vasconcellos",
    vessel: "Sereia III · 42'",
    service: "Revisão completa de motor",
    status: "andamento" as const,
    eta: "26 jun",
    owner: { name: "Lucas Andrade", initials: "LA" },
  },
  {
    id: "OS-2839",
    client: "Marina Holdings",
    vessel: "Marlin Azul · 56'",
    service: "Polimento de casco",
    status: "aguardando" as const,
    eta: "28 jun",
    owner: { name: "Renata Costa", initials: "RC" },
  },
  {
    id: "OS-2837",
    client: "Família Lobato",
    vessel: "Aurora · 38'",
    service: "Troca de eletrônicos GPS",
    status: "urgente" as const,
    eta: "Hoje · 17h",
    owner: { name: "Pedro Hoffmann", initials: "PH" },
  },
  {
    id: "OS-2835",
    client: "Clube Costa Atlântica",
    vessel: "Vento Sul · 48'",
    service: "Antifouling temporada",
    status: "agendado" as const,
    eta: "02 jul",
    owner: { name: "Ana Beatriz", initials: "AB" },
  },
  {
    id: "OS-2832",
    client: "Henrique Mota",
    vessel: "Ondina · 34'",
    service: "Inspeção pré-travessia",
    status: "finalizado" as const,
    eta: "Entregue",
    owner: { name: "Tiago Reis", initials: "TR" },
  },
];

export function OrdersTable() {
  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between border-b border-white/5 px-6 py-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Operação · últimas 72h
          </p>
          <h3 className="mt-1 font-display text-xl text-ice">Ordens de serviço recentes</h3>
        </div>
        <button className="group flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-ice/80 transition-colors hover:border-champagne/40 hover:text-champagne">
          Ver todas
          <ArrowUpRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={1.8}
          />
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-6 py-3 font-medium">OS / Cliente</th>
              <th className="px-4 py-3 font-medium">Embarcação</th>
              <th className="px-4 py-3 font-medium">Serviço</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Previsão</th>
              <th className="px-6 py-3 font-medium">Responsável</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <motion.tr
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i + 0.2, duration: 0.4 }}
                className="group border-t border-white/[0.04] transition-colors hover:bg-white/[0.025]"
              >
                <td className="px-6 py-4">
                  <p className="font-mono text-[11px] text-champagne/80">{r.id}</p>
                  <p className="mt-0.5 text-ice">{r.client}</p>
                </td>
                <td className="px-4 py-4 text-muted-foreground">{r.vessel}</td>
                <td className="px-4 py-4 text-ice/90">{r.service}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-4 font-mono text-xs text-ice/80">{r.eta}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-petrol to-deep text-[10px] font-medium text-ice ring-1 ring-white/10">
                      {r.owner.initials}
                    </span>
                    <span className="text-xs text-muted-foreground">{r.owner.name}</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
