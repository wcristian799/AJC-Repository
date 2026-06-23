import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { ColetorTab } from "@/components/ops/tms/ColetorTab";

export const Route = createFileRoute("/campo/conferencia")({
  head: () => ({ meta: [{ title: "Conferência · App de campo · AJC" }] }),
  component: CampoConferencia,
});

function CampoConferencia() {
  return (
    <FieldShell
      perfil={{
        nome: "Conferente do Porto",
        operador: "João Nonato",
        local: "Coletor · conferência e entrega",
        online: false,
        pending: 3,
      }}
    >
      <ColetorTab />
    </FieldShell>
  );
}
