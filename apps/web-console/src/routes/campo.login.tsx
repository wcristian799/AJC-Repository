import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LockKeyhole, LogIn, UserRound } from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { getStoredAuth, loginAjc, logoutAjc } from "@/lib/ajc-api";
import { authorizedFieldApps } from "@/lib/field-apps";

export const Route = createFileRoute("/campo/login")({
  head: () => ({ meta:[{title:"Acesso aos aplicativos · AJC"}] }),
  component: FieldLogin,
});

function FieldLogin() {
  const navigate = useNavigate();
  const [login,setLogin] = useState(""); const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  useEffect(() => { if (getStoredAuth()) void logoutAjc(); }, []);
  async function submit(event:FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const session = await loginAjc({login,password,dispositivo:"field-app"});
      const apps = authorizedFieldApps(session.user.permissions);
      if (!apps.length) { await logoutAjc(); setError("Sua funcao nao possui acesso a aplicativos de campo."); return; }
      await navigate({to:apps.length === 1 ? apps[0].to : "/campo"});
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Nao foi possivel entrar agora."); }
    finally { setBusy(false); }
  }
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10">
    <div className="pointer-events-none absolute -top-48 h-96 w-96 rounded-full bg-[color:var(--brand)] opacity-10 blur-3xl" />
    <section className="surface-card relative w-full max-w-md p-6 sm:p-8">
      <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl ring-1 ring-[color:var(--hairline-champagne)]"><BrandMark size={24}/></span><div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[color:var(--brand)]">AJC · Operacao</p><h1 className="font-display text-2xl">Aplicativos de campo</h1></div></div>
      <p className="mt-5 text-sm leading-6 text-muted-foreground">Entre com seu usuario operacional. Os aplicativos liberados dependem da funcao cadastrada pela administracao.</p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuario</span><span className="flex h-12 items-center gap-3 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface-elev)] px-4"><UserRound className="h-4 w-4 text-muted-foreground"/><input autoComplete="username" autoFocus required className="min-w-0 flex-1 bg-transparent text-base outline-none" value={login} onChange={e=>setLogin(e.target.value)}/></span></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</span><span className="flex h-12 items-center gap-3 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface-elev)] px-4"><LockKeyhole className="h-4 w-4 text-muted-foreground"/><input type="password" autoComplete="current-password" required className="min-w-0 flex-1 bg-transparent text-base outline-none" value={password} onChange={e=>setPassword(e.target.value)}/></span></label>
        {error && <p role="alert" className="rounded-lg border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 p-3 text-sm text-[color:var(--danger)]">{error}</p>}
        <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand)] font-semibold text-white transition-opacity disabled:opacity-50"><LogIn className="h-4 w-4"/>{busy?"Entrando...":"Entrar"}</button>
      </form>
    </section>
  </main>;
}
