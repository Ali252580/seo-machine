import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { requireProjectContext } from "@/serverFunctions/middleware";

const OPENROUTER_KEY_MISSING_MESSAGE =
  "کلید OPENROUTER_API_KEY برای این استقرار تنظیم نشده است. آن را در متغیرهای محیطی پروژه قرار دهید و یک استقرار تازه بسازید.";

const DATABASE_MISSING_MESSAGE =
  "پایگاه‌دادهٔ PostgreSQL برای ذخیرهٔ گفت‌وگوهای SAM در Vercel تنظیم نشده است.";

const projectScopedSchema = z.object({ projectId: z.string().min(1) });

type SamAccessStatus = {
  enabled: boolean;
  errorMessage: string | null;
  reason: "missing_key" | "missing_database" | null;
  hasApiKey: boolean;
  runtime: "vercel" | "cloudflare";
};

// The client picks the Vercel HTTP or Cloudflare DO transport from this status.
// Never disclose the API key or database URL, only whether each is present.
export const getSamAccessSetupStatus = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(projectScopedSchema)
  .handler(async (): Promise<SamAccessStatus> => {
    const hasApiKey = Boolean(await getOptionalEnvValue("OPENROUTER_API_KEY"));
    const isVercel =
      (await getOptionalEnvValue("VERCEL")) === "1" ||
      import.meta.env.MODE === "vercel";
    const runtime = isVercel ? "vercel" : "cloudflare";
    if (isVercel && !(await getOptionalEnvValue("DATABASE_URL"))) {
      return {
        enabled: false,
        errorMessage: DATABASE_MISSING_MESSAGE,
        reason: "missing_database",
        hasApiKey,
        runtime,
      };
    }
    if (!hasApiKey) {
      return {
        enabled: false,
        errorMessage: OPENROUTER_KEY_MISSING_MESSAGE,
        reason: "missing_key",
        hasApiKey: false,
        runtime,
      };
    }
    return {
      enabled: true,
      errorMessage: null,
      reason: null,
      hasApiKey: true,
      runtime,
    };
  });
