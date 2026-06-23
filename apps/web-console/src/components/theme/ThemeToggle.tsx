import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[color:var(--hairline)] bg-[color:var(--surface-elev)] text-ice/80 backdrop-blur-md transition-colors hover:border-champagne/40 hover:text-champagne"
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-champagne/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {isDark ? (
            <Moon className="h-4 w-4" strokeWidth={1.7} />
          ) : (
            <Sun className="h-4 w-4" strokeWidth={1.8} />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
