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
        operador: "Sebastião Luz",
        local: "Cross-docking na balsa",
        online: false,
        pending: 2,
      }}
    >
      <CrossDockingTab />
    </FieldShell>
  );
}
