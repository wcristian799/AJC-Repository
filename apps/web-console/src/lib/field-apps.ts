import { BriefcaseBusiness, DoorOpen, PackageCheck, ScanLine, ShipWheel, ShoppingBag, Ticket, UserRoundCheck, type LucideIcon } from "lucide-react";
import type { CampoAplicativoApi } from "@/lib/ajc-api";

export type FieldAppDefinition = { codigo:string; permissions:string[]; name:string; description:string; spec:string; to:string; icon:LucideIcon; available:boolean };
const presentation:Record<string,{icon:LucideIcon;spec:string}>={
  porteiro:{icon:DoorOpen,spec:"Etapa 14"}, encomendas:{icon:ShoppingBag,spec:"Etapa 15"}, conferente_porto:{icon:PackageCheck,spec:"Etapa 15"},
  conferente_navegacao:{icon:ScanLine,spec:"Etapa 15"}, gerente_embarcacao:{icon:ShipWheel,spec:"Etapa 16"}, crm_comercial:{icon:BriefcaseBusiness,spec:"Etapa 20"}, bilheteria_digital:{icon:Ticket,spec:"Etapa 17"},
  agente_comercial:{icon:UserRoundCheck,spec:"Agência"},
};
export function fieldAppFromApi(app:CampoAplicativoApi):FieldAppDefinition { const meta=presentation[app.codigo]||{icon:BriefcaseBusiness,spec:"Campo"};return {codigo:app.codigo,permissions:app.permissoes,name:app.nome,description:app.descricao,spec:meta.spec,to:app.rota,icon:meta.icon,available:app.ativo}; }
const routePermissions:Array<[string,string[]]>=[
  ["/campo/portaria",["campo.porteiro"]], ["/campo/encomendas",["campo.encomendas"]], ["/campo/conferencia",["campo.conferente_porto"]],
  ["/campo/navegacao",["campo.conferente_navegacao"]], ["/campo/recebimento",["campo.conferente_navegacao"]], ["/campo/gerente",["campo.gerente_embarcacao"]],
  ["/campo/agente",["campo.agente"]],
  ["/campo/crm",["campo.crm_comercial"]], ["/campo/bilheteria",["campo.bilheteiro","campo.pdv"]], ["/campo/entregas",["campo.conferente_navegacao","campo.gerente_embarcacao"]],
];
export function requiredFieldPermissions(pathname:string){return routePermissions.find(([route])=>pathname===route||pathname.startsWith(`${route}/`))?.[1]||[];}
