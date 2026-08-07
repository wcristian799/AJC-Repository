import { createFileRoute } from "@tanstack/react-router";
import { FieldShell } from "@/components/ops/field/FieldShell";
import { CampoNavegacao } from "@/components/ops/field/CampoNavegacao";
export const Route=createFileRoute("/campo/navegacao")({head:()=>({meta:[{title:"Conferente Navegação · AJC Campo"}]}),component:()=> <FieldShell perfil={{nome:"Conferente Navegação",local:"Embarque, cross-docking e movimentação física"}}><CampoNavegacao/></FieldShell>});
