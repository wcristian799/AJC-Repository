import { useId, useState } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  id?: string;
  label: string;
  type?: string;
  icon?: LucideIcon;
  value?: string;
  onChange?: (v: string) => void;
  autoComplete?: string;
};

export function FloatingInput({
  id,
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  autoComplete,
}: Props) {
  const auto = useId();
  const inputId = id ?? auto;
  const [focused, setFocused] = useState(false);
  const [internal, setInternal] = useState("");
  const val = value ?? internal;
  const active = focused || val.length > 0;

  return (
    <div
      className={`group relative rounded-xl border bg-white/[0.025] transition-all ${
        focused
          ? "border-champagne/40 shadow-[0_0_0_4px_oklch(0.78_0.13_78_/_0.08)]"
          : "border-white/8 hover:border-white/15"
      }`}
    >
      <label
        htmlFor={inputId}
        className={`pointer-events-none absolute left-${
          Icon ? "10" : "4"
        } transition-all ${
          active
            ? "top-1.5 text-[10px] uppercase tracking-[0.18em] text-champagne/80"
            : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        }`}
        style={{ left: Icon ? "2.6rem" : "1rem" }}
      >
        {label}
      </label>
      {Icon && (
        <Icon
          className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
            focused ? "text-champagne" : "text-muted-foreground"
          }`}
          strokeWidth={1.7}
        />
      )}
      <input
        id={inputId}
        type={type}
        autoComplete={autoComplete}
        value={val}
        onChange={(e) => {
          setInternal(e.target.value);
          onChange?.(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full bg-transparent pb-2 pt-5 text-sm text-ice outline-none ${
          Icon ? "pl-10 pr-4" : "px-4"
        }`}
      />
    </div>
  );
}
