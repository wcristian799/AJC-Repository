import { type ReactNode } from "react";
import { HelmDock, HelmCrown } from "./HelmDock";

export function AppShell({ crumb, children }: { crumb?: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[color:var(--background)]">
      <HelmCrown crumb={crumb} />
      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 pb-32 pt-6 sm:px-6 md:pb-28 md:pt-8 lg:px-10 xl:px-14">
        {children}
      </main>
      <HelmDock />
    </div>
  );
}
