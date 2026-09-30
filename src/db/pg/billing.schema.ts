import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./better-auth-schema";

// See src/db/pg/app.schema.ts for why timestamps are ISO-8601 UTC text.
const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const billingCustomerStatus = pgTable("billing_customer_status", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  isPaying: boolean("is_paying").notNull().default(false),
  paidPlanId: text("paid_plan_id"),
  paidPlanStatus: text("paid_plan_status"),
  creditBalance: integer("credit_balance").notNull().default(1000),
  // Full Autumn customer payload — escape hatch for any field we don't flatten,
  // queryable via json_extract so we never have to widen this table.
  customerJson: text("customer_json").notNull(),
  syncedAt: text("synced_at").notNull(),
  createdAt: text("created_at").notNull().default(isoNow),
  updatedAt: text("updated_at").notNull().default(isoNow),
});

export const billingPayments = pgTable(
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
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
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
