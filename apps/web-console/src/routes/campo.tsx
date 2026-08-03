import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMeAjc, getStoredAuth, setStoredAuth } from "@/lib/ajc-api";
import { requiredFieldPermission } from "@/lib/field-apps";

export const Route = createFileRoute("/campo")({
  component: CampoAccessGate,
});

function CampoAccessGate() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [state, setState] = useState<"loading"|"allowed"|"denied">(pathname === "/campo/login" ? "allowed" : "loading");

  useEffect(() => {
    if (pathname === "/campo/login") { setState("allowed"); return; }
    const stored = getStoredAuth();
    if (!stored) { void navigate({ to:"/campo/login", replace:true }); return; }
    getMeAjc().then((user) => {
      setStoredAuth({ ...stored, user });
      const required = requiredFieldPermission(pathname);
      const hasAny = user.permissions.some((permission) => permission.startsWith("campo."));
      setState(hasAny && (!required || user.permissions.includes(required)) ? "allowed" : "denied");
    }).catch(() => { setStoredAuth(null); void navigate({ to:"/campo/login", replace:true }); });
  }, [navigate, pathname]);

  if (state === "loading") return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Validando acesso...</div>;
  if (state === "denied") return <div className="grid min-h-screen place-items-center bg-background px-6 text-center"><div><h1 className="font-display text-2xl">Acesso nao autorizado</h1><p className="mt-2 text-sm text-muted-foreground">Sua funcao nao possui permissao para este aplicativo.</p><button className="mt-5 rounded-lg bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white" onClick={() => void navigate({to:"/campo"})}>Voltar aos aplicativos</button></div></div>;
  return <Outlet />;
}
