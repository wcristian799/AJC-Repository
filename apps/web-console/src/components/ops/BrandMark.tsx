import logoUrl from "@/assets/ferry-boat-logo.png";
import { useTheme } from "@/components/theme/ThemeProvider";

type Props = {
  size?: number;
  variant?: "auto" | "brand" | "mono-light";
  className?: string;
};

/**
 * Selo da marca AJC (Ferry Boat) — PNG da identidade (vermelho carmim sobre
 * transparente). Em fundos escuros (mono-light/dark), realça o brilho para o
 * carmim "saltar" sem perder a cor da marca.
 */
export function BrandMark({ size = 36, variant = "auto", className }: Props) {
  const { theme } = useTheme();
  const useLight =
    variant === "mono-light" || (variant === "auto" && theme === "dark");

  return (
    <img
      src={logoUrl}
      alt="AJC · Ferry Boat"
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        filter: useLight
          ? "drop-shadow(0 2px 10px color-mix(in oklab, var(--brand) 35%, transparent))"
          : "drop-shadow(0 1px 4px color-mix(in oklab, var(--brand) 25%, transparent))",
      }}
    />
  );
}

export function BrandLockup({ tagline = "Suite Operacional" }: { tagline?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_22%,transparent)] to-transparent ring-1 ring-[color:var(--hairline-brand)]">
        <BrandMark size={26} />
      </div>
      <div className="leading-none">
        <p className="font-display text-base text-foreground">AJC · Ferry Boat</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
          {tagline}
        </p>
      </div>
    </div>
  );
}
