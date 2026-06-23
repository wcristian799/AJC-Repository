import logoUrl from "@/assets/ferry-boat-logo.png";
import { useTheme } from "@/components/theme/ThemeProvider";

type Props = {
  size?: number;
  variant?: "auto" | "brand" | "mono-light" | "mono-dark";
  className?: string;
};

/**
 * Seal / brand mark do Ferry Boat (PNG da identidade — carmim sobre transparente).
 * - `auto` (default): realça o brilho no dark
 * - `mono-light`: usado sobre fundos escuros
 */
export function BrandLogo({ size = 40, variant = "auto", className }: Props) {
  const { theme } = useTheme();
  const useLight =
    variant === "mono-light" || (variant === "auto" && theme === "dark");

  return (
    <img
      src={logoUrl}
      alt="Ferry Boat — selo"
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        filter: useLight
          ? "drop-shadow(0 2px 12px color-mix(in oklab, var(--ice) 18%, transparent))"
          : "drop-shadow(0 2px 8px color-mix(in oklab, var(--brand) 28%, transparent))",
      }}
    />
  );
}
