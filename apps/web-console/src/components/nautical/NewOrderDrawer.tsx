import { AnimatePresence, motion } from "motion/react";
import { X, Ship, Wrench, User, CalendarDays } from "lucide-react";
import { FloatingInput } from "./FloatingInput";

export function NewOrderDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-abyss/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col glass-panel"
          >
            <header className="flex items-start justify-between border-b border-white/5 p-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-champagne/80">
                  Operação · nova entrada
                </p>
                <h2 className="mt-1 font-display text-2xl text-ice">Nova ordem de serviço</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Registre os detalhes da operação e atribua um responsável.
                </p>
              </div>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-white/30 hover:text-ice"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <FloatingInput id="client" label="Cliente" icon={User} />
              <FloatingInput id="vessel" label="Embarcação" icon={Ship} />
              <FloatingInput id="service" label="Tipo de serviço" icon={Wrench} />
              <FloatingInput id="date" label="Previsão de entrega" icon={CalendarDays} />

              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Prioridade
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Normal", "Alta", "Urgente"].map((p, i) => (
                    <button
                      key={p}
                      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                        i === 1
                          ? "border-champagne/40 bg-champagne/10 text-champagne"
                          : "border-white/8 text-ice/80 hover:border-white/20"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Observações
                </label>
                <textarea
                  rows={4}
                  placeholder="Detalhes adicionais da operação…"
                  className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-ice placeholder:text-muted-foreground/60 focus:border-champagne/40 focus:outline-none focus:ring-2 focus:ring-champagne/20"
                />
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-white/5 p-6">
              <button
                onClick={onClose}
                className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-ice/80 hover:border-white/30"
              >
                Cancelar
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="rounded-full bg-gradient-to-r from-champagne to-gold px-5 py-2.5 text-sm font-medium text-deep shadow-[0_12px_30px_-10px_oklch(0.78_0.13_78_/_0.55)]"
              >
                Criar ordem
              </motion.button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
