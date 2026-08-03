import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { CrossDockingTab } from "@/components/ops/tms/CrossDockingTab";

export const Route = createFileRoute("/campo/recebimento")({
  head: () => ({ meta: [{ title: "Recebimento direto · App de campo · AJC" }] }),
  component: CampoRecebimento,
});

function CampoRecebimento() {
  return (
    <FieldShell
      perfil={{
        nome: "Recebimento direto / Balsa",
        local: "Recebimento físico e cross-docking",
      }}
    >
      <CrossDockingTab />
    </FieldShell>
  );
}
