import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { CampoCrm } from "@/components/ops/field/CampoComercial";
export const Route=createFileRoute("/campo/crm")({head:()=>({meta:[{title:"CRM Comercial · AJC Campo"}]}),component:()=> <FieldShell perfil={{nome:"CRM Comercial",local:"Clientes, cotações e pedidos de envio"}}><CampoCrm/></FieldShell>});
