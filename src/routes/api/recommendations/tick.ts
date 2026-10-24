import { createFileRoute } from "@tanstack/react-router";
import { withPgClient } from "@/db";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { runDuePeriodicRecommendations } from "@/server/features/sam/periodicRecommendations";

export const Route = createFileRoute("/api/recommendations/tick")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const secret = await getOptionalEnvValue("CRON_SECRET");
        if (
          !secret ||
          request.headers.get("authorization") !== `Bearer ${secret}`
        ) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (process.env.VERCEL === "1" || process.env.AUDIT_RUNNER === "node") {
          const { waitUntil } = await import("cloudflare:workers");
          waitUntil(
            withPgClient(async () => {
              const { runPendingNodeAudits } =
                await import("@/server/features/audit/services/nodeAuditRunner");
              return runPendingNodeAudits();
            }),
          );
        }
        const result = await withPgClient(() =>
          runDuePeriodicRecommendations(),
        );
        return Response.json(result);
      },
    },
  },
});
