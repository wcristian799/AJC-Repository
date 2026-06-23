import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { PortariaTab } from "@/components/ops/tms/PortariaTab";

export const Route = createFileRoute("/campo/portaria")({
  head: () => ({ meta: [{ title: "Portaria · App de campo · AJC" }] }),
  component: CampoPortaria,
});

function CampoPortaria() {
  return (
    <FieldShell
      perfil={{
        nome: "Porteiro",
        operador: "Raimundo Nonato",
        local: "Porto de Belém · turno manhã",
        online: false,
        pending: 2,
      }}
    >
      <PortariaTab />
    </FieldShell>
  );
}
