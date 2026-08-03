import { useEffect, useState, type ReactNode } from "react";
import { getMeAjc, getStoredAuth, setStoredAuth } from "@/lib/ajc-api";

export function FieldStandaloneGuard({permission,children}:{permission:string;children:ReactNode}){
  const [allowed,setAllowed]=useState<boolean|null>(null);
  useEffect(()=>{const stored=getStoredAuth();if(!stored){window.location.href="/campo/login";return;}getMeAjc().then(user=>{setStoredAuth({...stored,user});setAllowed(user.permissions.includes(permission));}).catch(()=>{setStoredAuth(null);window.location.href="/campo/login";});},[permission]);
  if(allowed===null)return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Validando acesso...</div>;
  if(!allowed)return <div className="grid min-h-screen place-items-center bg-background px-6 text-center"><div><h1 className="font-display text-2xl">Acesso não autorizado</h1><p className="mt-2 text-sm text-muted-foreground">Sua função não possui permissão para este aplicativo.</p><a href="/campo" className="mt-5 inline-flex rounded-lg bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white">Voltar aos aplicativos</a></div></div>;
  return <>{children}</>;
}
