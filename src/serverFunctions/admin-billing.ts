import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import {
  billingCustomerStatus,
  billingPayments,
  member,
  organization,
  user,
} from "@/db/schema";
import { AppError } from "@/server/lib/errors";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { AUTUMN_SEO_DATA_CREDITS_PER_USD } from "@/shared/billing";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import { isPlatformAdminEmail } from "@/server/billing/platform-admin";

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
  .handler(async ({ context }) => {
    if (!(await isPlatformAdmin(context.userEmail))) {
      throw new AppError("FORBIDDEN");
    }

    // ponytail: in-memory joins are sufficient for the current small admin
    // dataset; add database pagination when this reaches thousands of rows.
    const [users, organizations, memberships, statuses, payments] =
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
            createdAt: billingPayments.createdAt,
          })
          .from(billingPayments)
          .orderBy(desc(billingPayments.createdAt)),
      ]);

    const userById = new Map(users.map((row) => [row.id, row]));
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
      users: users.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
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
