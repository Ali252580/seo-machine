import { createFileRoute } from "@tanstack/react-router";
import { verifyNextPayTopup } from "@/server/billing/payments";

export const Route = createFileRoute("/api/billing/nextpay/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const transId =
          url.searchParams.get("trans_id") ??
          url.searchParams.get("id_trans") ??
          "";
        const success = transId ? await verifyNextPayTopup(transId) : false;
        return Response.redirect(
          new URL(`/billing?payment=${success ? "success" : "failed"}`, url),
          302,
        );
      },
    },
  },
});
