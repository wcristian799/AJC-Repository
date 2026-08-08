import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { CampoAgente } from "@/components/ops/field/CampoAgente";

export const Route=createFileRoute("/campo/agente")({head:()=>({meta:[{title:"Agente Comercial · AJC Campo"}]}),component:()=> <FieldShell perfil={{nome:"Agente Comercial",local:"Carteira, captação e pedidos da agência"}}><CampoAgente/></FieldShell>});
