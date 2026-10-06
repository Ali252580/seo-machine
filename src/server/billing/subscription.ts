import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { billingCustomerStatus, billingUsage } from "@/db/schema";
import { runBatch } from "@/db/runBatch";
import { calculateUsageCharge } from "./usage-cost";
import type { EnsuredUserContext } from "@/middleware/ensure-user/types";
import { AUTUMN_SEO_DATA_CREDITS_PER_USD } from "@/shared/billing";
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
  if (args.customerId !== args.customer.organizationId)
    throw new AppError("FORBIDDEN");
  const { credits, rawCostMicros } = calculateUsageCharge(args.costUsd);
  const totalCostUsd = credits / AUTUMN_SEO_DATA_CREDITS_PER_USD;
  if (credits <= 0) return { monthlyCredits: 0, topupCredits: 0 };

  const chargeId = crypto.randomUUID();
  const now = new Date().toISOString();
  // A private marker links the conditional debit to its ledger insert. All
  // three statements are one transaction; the marker is never committed.
  // PostgreSQL holds the wallet row lock; D1 serializes the atomic batch.
  await runBatch((tx) => [
    tx
      .update(billingCustomerStatus)
      .set({
        creditBalance: sql`${billingCustomerStatus.creditBalance} - ${credits}`,
        updatedAt: chargeId,
      })
      .where(
        and(
          eq(billingCustomerStatus.organizationId, args.customerId),
          gte(billingCustomerStatus.creditBalance, credits),
        ),
      ),
    tx.insert(billingUsage).select(
      tx
        .select({
          id: sql<string>`${chargeId}`.as("id"),
          organizationId: billingCustomerStatus.organizationId,
          userId: sql<string>`${args.customer.userId}`.as("user_id"),
          projectId: sql<string | null>`${args.customer.projectId ?? null}`.as(
            "project_id",
          ),
          feature: sql<string>`${args.creditFeature}`.as("feature"),
          provider:
            sql<string>`${typeof args.properties?.provider === "string" ? args.properties.provider : "unknown"}`.as(
              "provider",
            ),
          rawCostMicros: sql<number>`${rawCostMicros}`.as("raw_cost_micros"),
          chargedCredits: sql<number>`${credits}`.as("charged_credits"),
          balanceAfter: billingCustomerStatus.creditBalance,
          createdAt: sql<string>`${now}`.as("created_at"),
        })
        .from(billingCustomerStatus)
        .where(
          and(
            eq(billingCustomerStatus.organizationId, args.customerId),
            eq(billingCustomerStatus.updatedAt, chargeId),
          ),
        ),
    ),
    tx
      .update(billingCustomerStatus)
      .set({ updatedAt: now })
      .where(
        and(
          eq(billingCustomerStatus.organizationId, args.customerId),
          eq(billingCustomerStatus.updatedAt, chargeId),
        ),
      ),
  ]);
  const charged = await db
    .select({ id: billingUsage.id })
    .from(billingUsage)
    .where(eq(billingUsage.id, chargeId))
    .limit(1);
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
  }).catch(() => {
    // The committed ledger is authoritative. An analytics outage must not
    // turn a successful debit into a failed request that users repeat.
    console.warn("billing usage analytics unavailable");
  });
  return { monthlyCredits: credits, topupCredits: 0 };
}
