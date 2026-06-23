type Status =
  | "andamento"
  | "aguardando"
  | "finalizado"
  | "urgente"
  | "agendado"
  | "pago"
  | "pendente";

const map: Record<
  Status,
  { label: string; dot: string; text: string; bg: string; ring: string; glow: string }
> = {
  andamento: {
    label: "Em andamento",
    dot: "bg-radar",
    text: "text-radar",
    bg: "bg-[color:color-mix(in_oklab,var(--radar)_10%,transparent)]",
    ring: "ring-[color:color-mix(in_oklab,var(--radar)_28%,transparent)]",
    glow: "shadow-[0_0_0_3px_color-mix(in_oklab,var(--radar)_10%,transparent)]",
  },
  aguardando: {
    label: "Aguardando cliente",
    dot: "bg-tide",
    text: "text-tide",
    bg: "bg-[color:color-mix(in_oklab,var(--tide)_10%,transparent)]",
    ring: "ring-[color:color-mix(in_oklab,var(--tide)_28%,transparent)]",
    glow: "",
  },
  finalizado: {
    label: "Finalizado",
    dot: "bg-success",
    text: "text-success",
    bg: "bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)]",
    ring: "ring-[color:color-mix(in_oklab,var(--success)_28%,transparent)]",
    glow: "",
  },
  urgente: {
    label: "Urgente",
    dot: "bg-danger",
    text: "text-danger",
    bg: "bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)]",
    ring: "ring-[color:color-mix(in_oklab,var(--danger)_32%,transparent)]",
    glow: "shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--danger)_45%,transparent)]",
  },
  agendado: {
    label: "Agendado",
    dot: "bg-champagne",
    text: "text-champagne",
    bg: "bg-[color:color-mix(in_oklab,var(--champagne)_10%,transparent)]",
    ring: "ring-[color:color-mix(in_oklab,var(--champagne)_30%,transparent)]",
    glow: "",
  },
  pago: {
    label: "Pago",
    dot: "bg-success",
    text: "text-success",
    bg: "bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)]",
    ring: "ring-[color:color-mix(in_oklab,var(--success)_28%,transparent)]",
    glow: "",
  },
  pendente: {
    label: "Pendente",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-[color:color-mix(in_oklab,var(--warning)_10%,transparent)]",
    ring: "ring-[color:color-mix(in_oklab,var(--warning)_30%,transparent)]",
    glow: "",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ring-1 backdrop-blur-sm ${s.bg} ${s.ring} ${s.text} ${s.glow}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inset-0 rounded-full opacity-60 ${s.dot} ping-soft`} />
        <span className={`relative h-1.5 w-1.5 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}
