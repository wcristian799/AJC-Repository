import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { CampoEncomendas } from "@/components/ops/field/CampoComercial";
export const Route=createFileRoute("/campo/encomendas")({head:()=>({meta:[{title:"Encomendas · AJC Campo"}]}),component:()=> <FieldShell perfil={{nome:"Encomendas",local:"Balcão e acompanhamento operacional"}}><CampoEncomendas/></FieldShell>});
