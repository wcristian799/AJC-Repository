import { motion } from "motion/react";

/** Compass / brand mark — used in login and nav dock */
export function NauticalMark({ size = 40 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      initial={{ rotate: -8, opacity: 0 }}
      animate={{ rotate: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <linearGradient id="gold-mark" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.92 0.08 88)" />
          <stop offset="100%" stopColor="oklch(0.72 0.14 75)" />
        </linearGradient>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="url(#gold-mark)"
        strokeWidth="1.2"
        opacity="0.7"
      />
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="oklch(1 0 0 / 0.15)"
        strokeWidth="0.8"
      />
      <path
        d="M32 8 L36 32 L32 56 L28 32 Z"
        fill="url(#gold-mark)"
        opacity="0.95"
      />
      <path
        d="M8 32 L32 28 L56 32 L32 36 Z"
        fill="oklch(1 0 0 / 0.85)"
        opacity="0.85"
      />
      <circle cx="32" cy="32" r="2.5" fill="url(#gold-mark)" />
    </motion.svg>
  );
}
