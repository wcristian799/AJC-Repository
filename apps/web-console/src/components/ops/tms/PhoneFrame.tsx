import { type ReactNode } from "react";
import { SyncIndicator } from "@/components/ops/primitives";

/**
 * Frame de celular para os simuladores de app de campo (mesmo visual do
 * SimuladorColetor da rota TMS). Reutilizado em Portaria, Cross-docking e
 * Entregas para manter consistência.
 */
export function PhoneFrame({
  online = true,
  pending = 0,
  clock = "08:42",
  framed = true,
  children,
}: {
  online?: boolean;
  pending?: number;
  clock?: string;
  /** true = moldura de celular (simulador no painel web). false = tela cheia (dentro do app de campo /campo, onde o FieldShell já é o dispositivo). */
  framed?: boolean;
  children: ReactNode;
}) {
  // Tela cheia: sem moldura nem barra de status (o FieldShell já fornece ambos).
  if (!framed) {
    return <div className="mx-auto w-full max-w-[480px]">{children}</div>;
  }
  return (
    <div className="mx-auto">
      <div className="relative h-[700px] w-[360px] overflow-hidden rounded-[40px] bg-black p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-[color:var(--background)]">
          <div className="flex items-center justify-between px-5 py-2.5 text-[11px] font-medium text-foreground">
            <span className="font-mono">{clock}</span>
            <SyncIndicator online={online} pending={pending} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Botão grande de captura (foto/assinatura) — placeholder de prova legal. */
export function CaptureTile({
  icon: Icon,
  label,
  done = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  done?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`surface-deep flex h-32 flex-col items-center justify-center gap-2 transition-colors ${
        done
          ? "text-[color:var(--success)] ring-1 ring-[color:color-mix(in_oklab,var(--success)_40%,transparent)]"
          : "text-[color:var(--brand)]"
      }`}
    >
      <Icon className="h-7 w-7" />
      <span className="text-xs font-medium">{label}</span>
      {done && <span className="text-[10px] text-[color:var(--success)]">✓ capturado</span>}
    </button>
  );
}
