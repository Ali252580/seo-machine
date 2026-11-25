import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { buildChatAgentModel } from "./openrouter";
import { getEnvValueSync, getOptionalEnvValue } from "./runtime-env";

const APINEX_MODEL = "free/qwen-3.8-max";
const freeUsage = z.object({ usage: z.object({ cost_tokens: z.literal(0) }) });

function reportedFreeUsage(body: unknown) {
  return freeUsage.safeParse(body).success
    ? { apinex: { costUsd: 0 } }
    : undefined;
}

function selectModel(
  apinexKey?: string,
  routerKey?: string,
  routerModel?: string,
) {
  if (apinexKey) {
    const apinex = createOpenAICompatible({
      name: "apinex",
      baseURL: "https://api.apinex.bond/v1",
      apiKey: apinexKey,
      includeUsage: true,
      metadataExtractor: {
        extractMetadata: async ({ parsedBody }) =>
          reportedFreeUsage(parsedBody),
        createStreamExtractor: () => {
          let usage: ReturnType<typeof reportedFreeUsage>;
          return {
            processChunk(chunk) {
              usage = reportedFreeUsage(chunk) ?? usage;
            },
            buildMetadata: () => usage,
          };
        },
      },
      fetch: (url, init) => fetch(url, { ...init, redirect: "error" }),
    });
    return {
      provider: "apinex" as const,
      model: () => apinex.chatModel(APINEX_MODEL),
    };
  }
  if (!routerKey) return null;
  return {
    provider: "openrouter" as const,
    model: (effort: "low" | "max") =>
      buildChatAgentModel(routerKey, routerModel, effort),
  };
}

export async function getTextModel() {
  const [apinex, router, model] = await Promise.all([
    getOptionalEnvValue("APINEX_API_KEY"),
    getOptionalEnvValue("OPENROUTER_API_KEY"),
    getOptionalEnvValue("OPENROUTER_MODEL"),
  ]);
  return selectModel(apinex, router, model);
}

export function getTextModelSync(env: object) {
  return selectModel(
    getEnvValueSync(env, "APINEX_API_KEY"),
    getEnvValueSync(env, "OPENROUTER_API_KEY"),
    getEnvValueSync(env, "OPENROUTER_MODEL"),
  );
}
