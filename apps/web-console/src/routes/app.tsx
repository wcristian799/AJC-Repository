import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMeAjc, hasStoredAuth, setStoredAuth } from "@/lib/ajc-api";

export const Route = createFileRoute("/app")({
  component: AppRoute,
});

function AppRoute() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasStoredAuth()) {
      navigate({ to: "/" });
      return;
    }

    let active = true;
    getMeAjc()
      .catch(() => {
        setStoredAuth(null);
        navigate({ to: "/" });
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  return <Outlet />;
}
