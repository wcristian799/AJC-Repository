import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { SyncIndicator } from "@/components/ops/primitives";

export type FieldPerfil = {
  /** Rótulo do posto (ex.: "Conferente do Porto"). */
  nome: string;
  /** Nome do operador com o coletor na mão (ex.: "João Nonato"). */
  operador: string;
  /** Local/turno opcional (ex.: "Porto de Belém · turno manhã"). */
  local?: string;
  /** Estado da conexão — campo é offline-first, offline não é erro. */
  online?: boolean;
  /** Eventos aguardando sincronização. */
  pending?: number;
};

/**
 * Shell do app de campo (operador no coletor/celular). Mobile-first, fundo
 * escuro, alvos grandes — SEM o dock/menu de gestão. Cada operador tem UM
 * posto por vez; "trocar perfil/sair" volta ao hub `/campo`.
 */
export function FieldShell({ perfil, children }: { perfil: FieldPerfil; children: ReactNode }) {
  const { nome, operador, local, online = false, pending = 0 } = perfil;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[color:var(--surface-noir,var(--background))]">
      {/* Barra superior compacta — identidade + perfil + sync */}
      <header className="sticky top-0 z-30 border-b border-[color:var(--hairline)] bg-[color:var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <Link to="/campo" className="flex min-w-0 items-center gap-2.5" title="Trocar posto">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_30%,transparent)] to-transparent ring-1 ring-[color:var(--hairline-champagne)]">
              <BrandMark size={18} />
            </span>
            <span className="min-w-0 leading-none">
              <span className="block truncate font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--brand)]">{nome}</span>
              <span className="mt-1 block truncate text-[13px] font-medium tracking-tight text-foreground">{operador}</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <SyncIndicator online={online} pending={pending} />
            <Link
              to="/campo"
              className="grid h-9 w-9 place-items-center rounded-full text-foreground/70 ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--accent)] hover:text-foreground"
              title="Trocar perfil / sair"
              aria-label="Trocar perfil ou sair"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
            </Link>
          </div>
        </div>
        {local && (
          <div className="mx-auto w-full max-w-3xl px-4 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{local}</span>
          </div>
        )}
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-5"
      >
        {children}
      </motion.main>
    </div>
  );
}
