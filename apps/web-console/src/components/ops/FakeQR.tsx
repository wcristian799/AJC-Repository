import { RealQR } from "./RealQR";

export function FakeQR({
  value,
  size = 180,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  return <RealQR value={value} size={size} className={className} />;
}
