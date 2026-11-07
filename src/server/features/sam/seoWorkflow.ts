import { z } from "zod";
import type { RecommendationCandidate } from "./periodicRecommendationEvidence";

export const actionPlanSchema = z.object({
  decision: z.enum(["improve", "investigate", "keep"]),
  rationale: z.string().min(1).max(1200),
  steps: z.array(z.string().min(1).max(500)).min(1).max(6),
  suggestedTitle: z.string().max(180).nullable(),
  outline: z.array(z.string().max(180)).max(8),
  successMeasure: z.string().min(1).max(500),
  planning: z
    .object({
      priority: z.enum(["high", "medium", "low"]),
      priorityReason: z.string().min(1).max(500),
      effort: z.enum(["small", "medium", "large"]),
      dependencies: z.array(z.string().min(1).max(300)).max(5),
      reviewAfterDays: z.number().int().min(7).max(90),
    })
    .optional(),
});
export const workflowSchema = z.object({
  pagesRead: z.number().int().nonnegative(),
  analysis: z.enum(["completed", "unavailable", "no_candidates"]),
  message: z.string(),
});

// Model output may enrich existing candidates, never introduce a different project/page.
export function parseWorkflowPlans(
  text: string,
  candidates: RecommendationCandidate[],
  inspectedUrls: string[] = [],
) {
  const plans = z
    .array(actionPlanSchema.extend({ id: z.string() }))
    .max(5)
    .parse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  const seen = new Set<string>();
  return plans.flatMap(({ id, ...plan }) => {
    const candidate = candidates.find((item) => item.id === id);
    if (!candidate || seen.has(id)) return [];
    seen.add(id);
    if (!candidate.page || !inspectedUrls.includes(candidate.page)) {
      plan.decision = "investigate";
      plan.suggestedTitle = null;
      plan.outline = [];
      plan.rationale =
        "متن این صفحه در این اجرا خوانده نشد؛ داده‌های عملکرد به‌تنهایی برای تصمیم بازنویسی کافی نیستند.";
      plan.steps = [
        "دسترسی به متن صفحه را بررسی کنید و سپس قصد جست‌وجو و پوشش محتوا را با داده‌های ثبت‌شده تطبیق دهید.",
      ];
      // A rewrite estimate is no longer valid when the task becomes investigation.
      plan.planning = undefined;
    }
    return [{ ...candidate, plan }];
  });
}

export function projectPageUrls(
  domain: string | null,
  candidates: RecommendationCandidate[],
) {
  try {
    const host = new URL(
      domain?.includes("://") ? domain : `https://${domain}`,
    ).hostname.replace(/^www\./, "");
    if (!domain) return [];
    return [
      ...new Set(
        candidates.flatMap(({ page }) => {
          try {
            const url = new URL(page ?? "");
            return ["https:", "http:"].includes(url.protocol) &&
              !url.username &&
              !url.password &&
              url.hostname.replace(/^www\./, "") === host
              ? [url.href]
              : [];
          } catch {
            return [];
          }
        }),
      ),
    ].slice(0, 3);
  } catch {
    return [];
  }
}
