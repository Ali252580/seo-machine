import { createServerFn } from "@tanstack/react-start";
import { and, desc, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  billingCustomerStatus,
  billingPayments,
  billingUsage,
  member,
  organization,
  user,
} from "@/db/schema";
import { AppError } from "@/server/lib/errors";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { AUTUMN_SEO_DATA_CREDITS_PER_USD } from "@/shared/billing";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import { isPlatformAdminEmail } from "@/server/billing/platform-admin";
import { summarizeBilling } from "@/server/billing/usage-report";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
  );
const reportRange = z.object({ from: day, to: day }).refine(({ from, to }) => {
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  return days >= 0 && days <= 366;
}, "بازهٔ گزارش باید بین صفر تا ۳۶۶ روز باشد.");

async function isPlatformAdmin(email: string) {
  return isPlatformAdminEmail(
    email,
    await getOptionalEnvValue("PLATFORM_ADMIN_EMAILS"),
  );
}

export const getPlatformAdminAccess = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(({ context }) => isPlatformAdmin(context.userEmail));

export const getAdminBillingOverview = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .validator(reportRange)
  .handler(async ({ context, data }) => {
    if (!(await isPlatformAdmin(context.userEmail))) {
      throw new AppError("FORBIDDEN");
    }

    // ponytail: in-memory joins are sufficient for the current small admin
    // dataset; add database pagination when this reaches thousands of rows.
    // Date-only boundaries cover both D1's space-separated and PG's ISO dates.
    const from = data.from;
    const to = new Date(Date.parse(data.to) + 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [users, organizations, memberships, statuses, payments, usage] =
      await Promise.all([
        db.select().from(user).orderBy(desc(user.createdAt)),
        db.select().from(organization).orderBy(desc(organization.createdAt)),
        db.select().from(member),
        db.select().from(billingCustomerStatus),
        db
          .select({
            id: billingPayments.id,
            organizationId: billingPayments.organizationId,
            provider: billingPayments.provider,
            status: billingPayments.status,
            amountCredits: billingPayments.amountCredits,
            amountIrt: billingPayments.amountIrt,
            amountUsdtMicros: billingPayments.amountUsdtMicros,
            createdAt: billingPayments.createdAt,
          })
          .from(billingPayments)
          .where(
            and(
              gte(billingPayments.createdAt, from),
              lt(billingPayments.createdAt, to),
            ),
          )
          .orderBy(desc(billingPayments.createdAt)),
        db
          .select()
          .from(billingUsage)
          .where(
            and(
              gte(billingUsage.createdAt, from),
              lt(billingUsage.createdAt, to),
            ),
          )
          .orderBy(desc(billingUsage.createdAt)),
      ]);

    const userById = new Map(users.map((row) => [row.id, row]));
    const report = summarizeBilling(usage, payments);
    const usageByOrganization = new Map(
      report.byOrganization.map((row) => [row.id, row]),
    );
    const usageByUser = new Map(report.byUser.map((row) => [row.id, row]));
    const membersByOrganization = new Map<string, typeof memberships>();
    for (const membership of memberships) {
      const rows = membersByOrganization.get(membership.organizationId) ?? [];
      rows.push(membership);
      membersByOrganization.set(membership.organizationId, rows);
    }
    const statusByOrganization = new Map(
      statuses.map((row) => [row.organizationId, row]),
    );
    const paymentsByOrganization = new Map<string, typeof payments>();
    for (const payment of payments) {
      const rows = paymentsByOrganization.get(payment.organizationId) ?? [];
      rows.push(payment);
      paymentsByOrganization.set(payment.organizationId, rows);
    }

    const workspaces = organizations.map((row) => {
      const orgMembers = membersByOrganization.get(row.id) ?? [];
      const owner = orgMembers.find((item) => item.role.includes("owner"));
      const orgPayments = paymentsByOrganization.get(row.id) ?? [];
      const credited = orgPayments.filter((item) => item.status === "credited");
      const balanceCredits =
        statusByOrganization.get(row.id)?.creditBalance ?? 0;
      const topupCredits = credited.reduce(
        (total, item) => total + item.amountCredits,
        0,
      );
      return {
        id: row.id,
        name: row.name,
        ownerEmail: owner ? (userById.get(owner.userId)?.email ?? null) : null,
        memberCount: orgMembers.length,
        balanceUsd: balanceCredits / AUTUMN_SEO_DATA_CREDITS_PER_USD,
        topupsUsd: topupCredits / AUTUMN_SEO_DATA_CREDITS_PER_USD,
        successfulPayments: credited.length,
        usageUsd: usageByOrganization.get(row.id)?.chargedUsd ?? 0,
        createdAt: row.createdAt,
      };
    });

    const totalBalanceUsd = workspaces.reduce(
      (total, row) => total + row.balanceUsd,
      0,
    );
    const totalTopupsUsd = workspaces.reduce(
      (total, row) => total + row.topupsUsd,
      0,
    );

    return {
      summary: {
        users: users.length,
        organizations: organizations.length,
        totalBalanceUsd,
        totalTopupsUsd,
        successfulPayments: payments.filter((row) => row.status === "credited")
          .length,
      },
      report,
      range: data,
      // Return only a bounded detail feed. Totals above cover the full range.
      usageCount: usage.length,
      usage: usage.slice(0, 500).map((row) => ({
        ...row,
        userEmail: userById.get(row.userId)?.email ?? "کاربر حذف‌شده",
        organizationName:
          organizations.find((org) => org.id === row.organizationId)?.name ??
          "—",
      })),
      users: users.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        usageUsd: usageByUser.get(row.id)?.chargedUsd ?? 0,
        calls: usageByUser.get(row.id)?.calls ?? 0,
        organizationCount: memberships.filter((item) => item.userId === row.id)
          .length,
        createdAt: row.createdAt,
      })),
      workspaces,
      payments: payments.map((row) => ({
        ...row,
        organizationName:
          organizations.find((item) => item.id === row.organizationId)?.name ??
          "—",
        amountUsd: row.amountCredits / AUTUMN_SEO_DATA_CREDITS_PER_USD,
      })),
    };
  });
