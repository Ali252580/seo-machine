import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/subscribe")({
  component: () => <Navigate to="/billing" replace />,
});
