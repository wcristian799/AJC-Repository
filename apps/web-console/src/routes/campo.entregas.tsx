import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { EntregasTab } from "@/components/ops/tms/EntregasTab";

export const Route = createFileRoute("/campo/entregas")({
  head: () => ({ meta: [{ title: "Entregas · App de campo · AJC" }] }),
  component: CampoEntregas,
});

function CampoEntregas() {
  return (
    <FieldShell
      perfil={{
        nome: "Entregas (desembarque)",
        operador: "Túlio Andrade",
        local: "Desembarque balsa → terra",
        online: false,
        pending: 1,
      }}
    >
      <EntregasTab />
    </FieldShell>
  );
}
