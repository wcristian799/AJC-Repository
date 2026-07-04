import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type RealQRProps = {
  value: string;
  size?: number;
  className?: string;
  label?: string;
};

export function RealQR({ value, size = 180, className = "", label }: RealQRProps) {
  const normalized = useMemo(() => value.trim() || "AJC-QR-VAZIO", [value]);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(normalized, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: size,
      color: {
        dark: "#0a0a0a",
        light: "#ffffff",
      },
    })
      .then((nextSvg) => {
        if (!cancelled) setSvg(nextSvg);
      })
      .catch(() => {
        if (!cancelled) setSvg("");
      });
    return () => {
      cancelled = true;
    };
  }, [normalized, size]);

  if (!svg) {
    return (
      <div
        className={`grid place-items-center bg-white text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-500 ${className}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={label ?? `QR Code ${normalized}`}
      >
        QR
      </div>
    );
  }

  return (
    <span
      className={className}
      style={{ display: "inline-block", width: size, height: size, lineHeight: 0 }}
      role="img"
      aria-label={label ?? `QR Code ${normalized}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
