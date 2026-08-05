import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { CrossDockingTab } from "@/components/ops/tms/CrossDockingTab";

export const Route = createFileRoute("/campo/recebimento")({
  head: () => ({ meta: [{ title: "Embarque e cross-docking · App de campo · AJC" }] }),
  component: CampoRecebimento,
});

function CampoRecebimento() {
  return (
    <FieldShell
      perfil={{
        nome: "Conferente da Embarcação",
        local: "Embarque e cross-docking",
      }}
    >
      <CrossDockingTab />
    </FieldShell>
  );
}
