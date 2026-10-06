import {
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  applyBillingMarkupUsd,
} from "@/shared/billing";

/** Keep the charged amount identical to estimates, including credit rounding. */
export function calculateUsageCharge(costUsd: number) {
  if (!Number.isFinite(costUsd) || costUsd < 0 || costUsd > 2_000) {
    throw new Error("Invalid provider usage cost");
  }
  return {
    rawCostMicros: Math.round(costUsd * 1_000_000),
    credits: Math.ceil(
      applyBillingMarkupUsd(costUsd) * AUTUMN_SEO_DATA_CREDITS_PER_USD,
    ),
  };
}
