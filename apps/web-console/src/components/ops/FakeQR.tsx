import { useMemo } from "react";

/**
 * QR Code decorativo (não funcional) desenhado em SVG a partir de um seed.
 * Usado nas telas de confirmação de venda / bilhete. Determinístico por `value`,
 * com os três "olhos" do QR para leitura visual convincente.
 */
export function FakeQR({
  value,
  size = 180,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const cells = 25;
  const modules = useMemo(() => {
    // PRNG determinístico (mulberry32) semeado pelo texto
    let seed = 0;
    for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const grid: boolean[][] = [];
    for (let y = 0; y < cells; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < cells; x++) row.push(rand() > 0.5);
      grid.push(row);
    }
    return grid;
  }, [value]);

  const isFinder = (x: number, y: number) => {
    const inBox = (bx: number, by: number) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
    return inBox(0, 0) || inBox(cells - 7, 0) || inBox(0, cells - 7);
  };

  const unit = size / cells;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`QR Code ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} rx={10} fill="#ffffff" />
      {modules.map((row, y) =>
        row.map((on, x) => {
          if (isFinder(x, y)) return null;
          if (!on) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x * unit + unit * 0.08}
              y={y * unit + unit * 0.08}
              width={unit * 0.84}
              height={unit * 0.84}
              rx={unit * 0.18}
              fill="#0a0a0a"
            />
          );
        }),
      )}
      {/* Três "olhos" do QR */}
      {([[0, 0], [cells - 7, 0], [0, cells - 7]] as const).map(([bx, by], i) => (
        <g key={i}>
          <rect x={bx * unit} y={by * unit} width={unit * 7} height={unit * 7} rx={unit} fill="#0a0a0a" />
          <rect x={(bx + 1) * unit} y={(by + 1) * unit} width={unit * 5} height={unit * 5} rx={unit * 0.7} fill="#ffffff" />
          <rect x={(bx + 2) * unit} y={(by + 2) * unit} width={unit * 3} height={unit * 3} rx={unit * 0.5} fill="#0a0a0a" />
        </g>
      ))}
    </svg>
  );
}
