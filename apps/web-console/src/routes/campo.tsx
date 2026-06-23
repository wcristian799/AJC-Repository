import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/campo")({
  component: () => <Outlet />,
});
