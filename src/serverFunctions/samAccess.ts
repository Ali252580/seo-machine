import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { requireProjectContext } from "@/serverFunctions/middleware";

const OPENROUTER_KEY_MISSING_MESSAGE =
  "کلید OPENROUTER_API_KEY برای این استقرار تنظیم نشده است. آن را در متغیرهای محیطی پروژه قرار دهید و یک استقرار تازه بسازید.";

const VERCEL_RUNTIME_MESSAGE =
  "گفت‌وگوی SAM هنوز روی Vercel اجرا نمی‌شود. موتور فعلی آن به Cloudflare Durable Objects و WebSocket وابسته است و باید برای Vercel پیاده‌سازی شود.";

const projectScopedSchema = z.object({ projectId: z.string().min(1) });

type SamAccessStatus = {
  enabled: boolean;
  errorMessage: string | null;
  reason: "missing_key" | "unsupported_runtime" | null;
  hasApiKey: boolean;
};

// Check the actual deployment before allowing a chat. Vercel currently has no
// Durable Object transport for SAM, even when OpenRouter is configured.
export const getSamAccessSetupStatus = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(projectScopedSchema)
  .handler(async (): Promise<SamAccessStatus> => {
    const hasApiKey = Boolean(await getOptionalEnvValue("OPENROUTER_API_KEY"));
    const isVercel =
      (await getOptionalEnvValue("VERCEL")) === "1" ||
      import.meta.env.MODE === "vercel";
    if (isVercel) {
      return {
        enabled: false,
        errorMessage: VERCEL_RUNTIME_MESSAGE,
        reason: "unsupported_runtime",
        hasApiKey,
      };
    }
    if (!hasApiKey) {
      return {
        enabled: false,
        errorMessage: OPENROUTER_KEY_MISSING_MESSAGE,
        reason: "missing_key",
        hasApiKey: false,
      };
    }
    return {
      enabled: true,
      errorMessage: null,
      reason: null,
      hasApiKey: true,
    };
  });
