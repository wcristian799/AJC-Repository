import {
  CURRENT_VOLUME_EVENTS,
  CURRENT_VOLUME_STATUSES,
  canApplyVolumeEvent,
  canScanVolume,
  operationTarget,
} from "./tms-volume-flow";

describe("fluxo operacional de volumes", () => {
  it("expoe somente os cinco estados vigentes", () => {
    expect(CURRENT_VOLUME_STATUSES).toEqual([
      "cadastrado",
      "conferido",
      "embarcado",
      "entregue",
      "divergente",
    ]);
    expect(CURRENT_VOLUME_EVENTS).toEqual([
      "conferido",
      "embarcado",
      "entregue",
      "divergencia",
    ]);
  });

  it("aplica o fluxo comum cadastrado, conferido, embarcado e entregue", () => {
    expect(canApplyVolumeEvent("cadastrado", "porto_balsa", "conferido")).toBe(true);
    expect(canApplyVolumeEvent("conferido", "porto_balsa", "embarcado")).toBe(true);
    expect(canApplyVolumeEvent("embarcado", "porto_balsa", "entregue")).toBe(true);
    expect(canApplyVolumeEvent("cadastrado", "porto_balsa", "embarcado")).toBe(false);
    expect(canApplyVolumeEvent("conferido", "porto_balsa", "entregue")).toBe(false);
  });

  it("permite cadastrado para embarcado somente no cross-docking", () => {
    expect(canApplyVolumeEvent("cadastrado", "direto", "embarcado")).toBe(true);
    expect(canScanVolume("cadastrado", "direto", "embarque")).toBe(true);
    expect(canScanVolume("cadastrado", "porto_balsa", "embarque")).toBe(false);
  });

  it("faz o bipe do porto produzir conferido e o da embarcacao produzir embarcado", () => {
    expect(operationTarget("conferencia")).toBe("conferido");
    expect(operationTarget("embarque")).toBe("embarcado");
    expect(canScanVolume("cadastrado", "porto_balsa", "conferencia")).toBe(true);
    expect(canScanVolume("conferido", "porto_balsa", "embarque")).toBe(true);
  });

  it("aceita divergencia como excecao sem inventar uma etapa intermediaria", () => {
    expect(canApplyVolumeEvent("cadastrado", "porto_balsa", "divergencia")).toBe(true);
    expect(canApplyVolumeEvent("embarcado", "direto", "divergencia")).toBe(true);
  });
});
