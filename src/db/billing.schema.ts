import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { organization } from "./better-auth-schema";

export const billingCustomerStatus = sqliteTable("billing_customer_status", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  isPaying: integer("is_paying", { mode: "boolean" }).notNull().default(false),
  paidPlanId: text("paid_plan_id"),
  paidPlanStatus: text("paid_plan_status"),
  creditBalance: integer("credit_balance").notNull().default(1000),
  // Full Autumn customer payload — escape hatch for any field we don't flatten,
  // queryable via json_extract so we never have to widen this table.
  customerJson: text("customer_json").notNull(),
  syncedAt: text("synced_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const billingPayments = sqliteTable(
  "billing_payments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["nextpay", "usdt_trc20"] }).notNull(),
    status: text("status", {
      enum: ["pending", "verified", "credited", "failed"],
    })
      .notNull()
      .default("pending"),
    amountCredits: integer("amount_credits").notNull(),
    amountIrt: integer("amount_irt"),
    amountUsdtMicros: integer("amount_usdt_micros"),
    providerRef: text("provider_ref"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("billing_payments_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    uniqueIndex("billing_payments_provider_ref_idx").on(
      table.provider,
      table.providerRef,
    ),
  ],
);

// Persistent billing audit trail; costs use integer microdollars to avoid
// floating-point accumulation. The wallet remains denominated in credits.
export const billingUsage = sqliteTable(
  "billing_usage",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    projectId: text("project_id"),
    feature: text("feature").notNull(),
    provider: text("provider").notNull(),
    rawCostMicros: integer("raw_cost_micros").notNull(),
    chargedCredits: integer("charged_credits").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("billing_usage_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);
