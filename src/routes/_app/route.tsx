import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { useHostedAuthRouteGuard } from "@/client/features/auth/useHostedAuthRouteGuard";
import { AuthenticatedAppLayout } from "@/client/layout/AppShell";
import { useOnboardingRedirect } from "@/client/features/onboarding/useOnboardingRedirect";

export const Route = createFileRoute("/_app")({
  component: AppRouteLayout,
});

function AppRouteLayout() {
  const location = useLocation();
  const isPublicHomepage = location.pathname === "/";
  const authGate = useHostedAuthRouteGuard({
    allowUnauthenticated: isPublicHomepage,
  });
  useOnboardingRedirect();

  if (!authGate.canRenderAuthenticatedContent) {
    if (isPublicHomepage) return <Outlet />;
    return null;
  }

  return (
    <AuthenticatedAppLayout>
      <Outlet />
    </AuthenticatedAppLayout>
  );
}
