import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, LogOut, Radio } from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { getStoredAuth, listCampoAplicativos, logoutAjc } from "@/lib/ajc-api";
import { fieldAppFromApi, type FieldAppDefinition } from "@/lib/field-apps";

export const Route = createFileRoute("/campo/")({
  head: () => ({ meta: [{ title: "Aplicativos de campo · AJC" }] }),
  component: CampoHub,
});

const easeOut = [0.16, 1, 0.3, 1] as const;

function CampoHub() {
  const [apps, setApps] = useState<FieldAppDefinition[]>([]);
  const [operator, setOperator] = useState("Operador");
  useEffect(() => {
    const auth = getStoredAuth();
    setOperator(auth?.user.nome ?? "Operador");
    listCampoAplicativos().then(rows=>setApps(rows.map(fieldAppFromApi))).catch(()=>setApps([]));
  }, []);
  return <div className="relative min-h-screen overflow-hidden bg-background">
    <div className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-[color:var(--brand)] opacity-10 blur-3xl" />
    <header className="relative mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg ring-1 ring-[color:var(--hairline-champagne)]"><BrandMark size={20}/></span><div><p className="font-mono text-[9px] uppercase tracking-[.22em] text-[color:var(--brand)]">AJC · Campo</p><p className="text-sm font-medium">Suite operacional</p></div></div>
      <button onClick={() => void logoutAjc().then(()=>{window.location.href="/campo/login";})} className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs ring-1 ring-[color:var(--hairline)]"><LogOut className="h-4 w-4"/>Sair</button>
    </header>
    <main className="relative mx-auto max-w-3xl px-4 pb-16 pt-9">
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.45,ease:easeOut}}>
        <p className="champagne-eyebrow inline-flex items-center gap-2"><Radio className="h-3.5 w-3.5"/>Acesso por funcao</p>
        <h1 className="mt-2 font-display text-3xl">Olá, {operator}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Escolha um dos aplicativos liberados pela administração.</p>
      </motion.div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">{apps.map((app,index)=><AppCard key={app.to} app={app} index={index}/>)}</div>
    </main>
  </div>;
}

function AppCard({app,index}:{app:FieldAppDefinition;index:number}) {
  const Icon=app.icon;
  return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:index*.05,duration:.4,ease:easeOut}}>
    <Link to={app.to} className="surface-card group flex min-h-28 items-center gap-4 p-5 ring-1 ring-[color:var(--hairline)] hover:ring-[color:var(--hairline-brand)]">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"><Icon className="h-7 w-7" strokeWidth={1.6}/></span>
      <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="truncate font-display text-lg font-normal">{app.name}</strong><small className="font-mono text-[9px] text-muted-foreground">{app.spec}</small></span><span className="mt-1 block text-xs text-muted-foreground">{app.description}</span></span>
      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1"/>
    </Link>
  </motion.div>;
}
