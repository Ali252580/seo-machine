import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { billingCustomerStatus } from "@/db/schema";
import type { EnsuredUserContext } from "@/middleware/ensure-user/types";
import {
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  SEO_DATA_COST_MARKUP,
  roundUsdForBilling,
} from "@/shared/billing";
import type { CreditFeature } from "@/shared/billing-credit-features";
import { captureServerEvent } from "@/server/lib/posthog";
import { AppError } from "@/server/lib/errors";

export type BillingCustomerContext = Pick<
  EnsuredUserContext,
  "organizationId" | "userEmail" | "userId"
> & { projectId?: string };

export async function getOrCreateOrganizationCustomer(
  context: BillingCustomerContext,
): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await db
    .insert(billingCustomerStatus)
    .values({
      organizationId: context.organizationId,
      customerJson: "{}",
      syncedAt: now,
    })
    .onConflictDoNothing();
  return { id: context.organizationId };
}

async function getStatus(customerId: string) {
  const [status] = await db
    .select()
    .from(billingCustomerStatus)
    .where(eq(billingCustomerStatus.organizationId, customerId))
    .limit(1);
  return status;
}

export async function customerHasPaidPlan(
  customerId: string,
  _opts: { retryDenied?: boolean } = {},
) {
  return ((await getStatus(customerId))?.creditBalance ?? 0) > 0;
}

export async function customerHasManagedAccess(customerId: string) {
  return Boolean(await getStatus(customerId));
}

export async function getCreditBalance(customerId: string): Promise<number> {
  return (await getStatus(customerId))?.creditBalance ?? 0;
}

export async function checkUsageCreditsDepleted(
  customer: BillingCustomerContext,
): Promise<{ depleted: boolean; monthlyRemaining: number }> {
  const balance = await getCreditBalance(customer.organizationId);
  const depleted = balance <= 0;
  if (depleted) {
    await captureServerEvent({
      distinctId: customer.userId,
      event: "usage:credits_gate_refused",
      organizationId: customer.organizationId,
      properties: {
        project_id: customer.projectId,
        monthly_remaining: balance,
      },
    });
  }
  return { depleted, monthlyRemaining: balance };
}

export async function assertUsageCreditsAvailable(
  customerId: string,
): Promise<{ monthlyRemaining: number }> {
  const balance = await getCreditBalance(customerId);
  if (balance <= 0) throw new AppError("INSUFFICIENT_CREDITS");
  return { monthlyRemaining: balance };
}

export async function trackUsageCreditSpend(args: {
  customer: BillingCustomerContext;
  customerId: string;
  creditFeature: CreditFeature;
  costUsd: number;
  monthlyRemaining: number;
  properties?: Record<string, unknown>;
}): Promise<{ monthlyCredits: number; topupCredits: number }> {
  const totalCostUsd = roundUsdForBilling(args.costUsd * SEO_DATA_COST_MARKUP);
  const credits = Math.ceil(totalCostUsd * AUTUMN_SEO_DATA_CREDITS_PER_USD);
  if (credits <= 0) return { monthlyCredits: 0, topupCredits: 0 };

  const charged = await db
    .update(billingCustomerStatus)
    .set({
      creditBalance: sql`${billingCustomerStatus.creditBalance} - ${credits}`,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(billingCustomerStatus.organizationId, args.customerId),
        gte(billingCustomerStatus.creditBalance, credits),
      ),
    )
    .returning({ creditBalance: billingCustomerStatus.creditBalance });
  if (charged.length === 0) throw new AppError("INSUFFICIENT_CREDITS");

  await captureServerEvent({
    distinctId: args.customer.userId,
    event: "usage:credits_consume",
    organizationId: args.customer.organizationId,
    properties: {
      project_id: args.customer.projectId,
      credit_feature: args.creditFeature,
      monthly_credits: credits,
      topup_credits: 0,
      total_credits: credits,
      cost_usd: totalCostUsd,
      ...args.properties,
    },
  });
  return { monthlyCredits: credits, topupCredits: 0 };
}
