import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { PortariaTab } from "@/components/ops/tms/PortariaTab";

export const Route = createFileRoute("/campo/portaria")({
  head: () => ({ meta: [{ title: "Portaria · AJC Campo" }] }),
  component: CampoPortaria,
});

function CampoPortaria() {
  return <FieldShell perfil={{ nome: "Porteiro", local: "Entrada, saída e controle do pátio" }}><PortariaTab /></FieldShell>;
}
