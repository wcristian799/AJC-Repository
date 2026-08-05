export type VolumeCurrentStatus =
  | "cadastrado"
  | "conferido"
  | "embarcado"
  | "entregue"
  | "divergente";

export type VolumeEventType =
  | "conferido"
  | "embarcado"
  | "entregue"
  | "divergencia";

export type VolumeOperationMode = "conferencia" | "embarque";
export type CargoReceivingType = "porto_balsa" | "direto";

export const CURRENT_VOLUME_STATUSES: readonly VolumeCurrentStatus[] = [
  "cadastrado",
  "conferido",
  "embarcado",
  "entregue",
  "divergente",
];

export const CURRENT_VOLUME_EVENTS: readonly VolumeEventType[] = [
  "conferido",
  "embarcado",
  "entregue",
  "divergencia",
];

export function operationTarget(mode: VolumeOperationMode) {
  return mode === "embarque" ? "embarcado" : "conferido";
}

export function canScanVolume(
  current: string,
  receivingType: CargoReceivingType,
  mode: VolumeOperationMode,
) {
  if (mode === "conferencia") return current === "cadastrado";
  return receivingType === "direto"
    ? current === "cadastrado"
    : current === "conferido";
}

export function canApplyVolumeEvent(
  current: string,
  receivingType: CargoReceivingType,
  event: VolumeEventType,
) {
  if (event === "divergencia") return true;
  if (event === "conferido") return current === "cadastrado";
  if (event === "embarcado")
    return current === "conferido" || (current === "cadastrado" && receivingType === "direto");
  return event === "entregue" && current === "embarcado";
}
