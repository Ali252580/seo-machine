import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { waitUntil } from "@vercel/functions";
import { withPgClient } from "@/db";
import {
  createOpenSeoOAuthProvider,
  type OpenSeoOAuthEnv,
} from "@/server/mcp/oauth-provider";
import { vercelOAuthKv } from "@/server/mcp/vercel-oauth-kv";

const startHandler = createStartHandler(defaultStreamHandler);
const oauthProvider = createOpenSeoOAuthProvider(startHandler);

// The provider adds authenticated props to this context before dispatching
// MCP tools. Vercel's waitUntil preserves background work after the response.
function createVercelContext(): ExecutionContext {
  return {
    waitUntil,
    passThroughOnException() {},
    props: undefined,
  } as ExecutionContext;
}

// The original routes and server functions run here; only the Cloudflare
// Worker entrypoint is replaced for the Vercel deployment.
export default {
  fetch(request: Request): Promise<Response> {
    return withPgClient(async () => {
      const response = await oauthProvider.fetch(
        request,
        {
          ...process.env,
          // This adapter implements the KV operations used by the provider.
          OAUTH_KV: vercelOAuthKv as unknown as KVNamespace,
        } as OpenSeoOAuthEnv,
        createVercelContext(),
      );
      if (
        !response.headers.get("content-type")?.startsWith("text/html") ||
        response.headers.has("content-security-policy")
      ) {
        return response;
      }
      const headers = new Headers(response.headers);
      headers.set("Content-Security-Policy", "frame-ancestors 'self'");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    });
  },
};
