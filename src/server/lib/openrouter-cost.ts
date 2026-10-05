import { z } from "zod";

const usageSchema = z.object({
  openrouter: z.object({ usage: z.object({ cost: z.number().nonnegative() }) }),
});

// OpenRouter's usage accounting is requested by buildChatAgentModel.
export function openRouterCostUsd(metadata: unknown): number | null {
  const parsed = usageSchema.safeParse(metadata);
  return parsed.success ? parsed.data.openrouter.usage.cost : null;
}
