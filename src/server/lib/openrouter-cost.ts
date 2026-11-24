import { z } from "zod";

const usageSchema = z.object({
  openrouter: z.object({ usage: z.object({ cost: z.number().nonnegative() }) }),
});

// OpenRouter's usage accounting is requested by buildChatAgentModel.
export function openRouterCostUsd(metadata: unknown): number | null {
  const parsed = usageSchema.safeParse(metadata);
  return parsed.success ? parsed.data.openrouter.usage.cost : null;
}

// APInex is pinned to its free GLM route. A paid route needs its own
// pricing contract before it can be selected for metered project work.
export function textModelCostUsd(
  provider: "apinex" | "openrouter",
  metadata: unknown,
) {
  if (provider === "openrouter") return openRouterCostUsd(metadata);
  return z
    .object({ apinex: z.object({ costUsd: z.literal(0) }) })
    .safeParse(metadata).success
    ? 0
    : null;
}
