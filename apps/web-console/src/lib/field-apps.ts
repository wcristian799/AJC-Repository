import { DoorOpen, FileSignature, PackagePlus, ShipWheel, Smartphone, Store, Ticket, type LucideIcon } from "lucide-react";

export type FieldAppDefinition = {
  permission: string;
  name: string;
  description: string;
  spec: string;
  to: string;
  icon: LucideIcon;
  available: boolean;
};

export const FIELD_APPS: FieldAppDefinition[] = [
  { permission:"campo.porteiro", name:"Porteiro", description:"Entrada e saida do patio", spec:"B.1", to:"/campo/portaria", icon:DoorOpen, available:true },
  { permission:"campo.conferente_porto", name:"Conferente do Porto", description:"Primeiro bipe e conferencia fisica", spec:"B.4", to:"/campo/conferencia", icon:Smartphone, available:true },
  { permission:"campo.conferente_navegacao", name:"Conferente da Embarcacao", description:"Bipe de embarque e cross-docking", spec:"B.7/B.8", to:"/campo/recebimento", icon:PackagePlus, available:true },
  { permission:"campo.entregas", name:"Entregas", description:"Bipe final, fotos e assinatura", spec:"B.9", to:"/campo/entregas", icon:FileSignature, available:true },
  { permission:"campo.gerente_embarcacao", name:"Gerente da Embarcacao", description:"Prestacao de contas da viagem", spec:"Etapa 05", to:"/campo/gerente", icon:ShipWheel, available:true },
  { permission:"campo.bilheteiro", name:"Bilheteiro", description:"Validacao de QR no embarque", spec:"Vendas", to:"/embarque", icon:Ticket, available:true },
  { permission:"campo.pdv", name:"PDV do porto", description:"Venda de passagens no balcao", spec:"Vendas", to:"/pos", icon:Store, available:true },
];

export function authorizedFieldApps(permissions: string[]) {
  const allowed = new Set(permissions);
  return FIELD_APPS.filter((app) => app.available && allowed.has(app.permission));
}

export function requiredFieldPermission(pathname: string) {
  return FIELD_APPS.find((app) => pathname === app.to || pathname.startsWith(`${app.to}/`))?.permission;
}
