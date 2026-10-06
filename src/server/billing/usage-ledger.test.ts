import type { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sqlite: null as DatabaseSync | null,
  failInsert: false,
}));
vi.mock("@/db", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { drizzle } = await import("drizzle-orm/sqlite-proxy");
  const sqlite = new DatabaseSync(":memory:");
  state.sqlite = sqlite;
  return {
    db: drizzle(async (query, params, method) => {
      if (state.failInsert && query.startsWith('insert into "billing_usage"'))
        throw new Error("ledger unavailable");
      const statement = sqlite.prepare(query);
      statement.setReturnArrays(true);
      if (method === "run") {
        statement.run(...params);
        return { rows: [] };
      }
      return { rows: statement.all(...params) };
    }),
  };
});
vi.mock("@/db/schema", async () => import("@/db/billing.schema"));
vi.mock("@/db/runBatch", async () => {
  const { db } = await import("@/db");
  return {
    runBatch: async (build: (tx: typeof db) => Promise<unknown>[]) => {
      state.sqlite!.exec("BEGIN");
      try {
        for (const query of build(db)) await query;
        state.sqlite!.exec("COMMIT");
      } catch (error) {
        state.sqlite!.exec("ROLLBACK");
        throw error;
      }
    },
  };
});
vi.mock("@/server/lib/posthog", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));
import { trackUsageCreditSpend } from "./subscription";
import { captureServerEvent } from "@/server/lib/posthog";

const customer = {
  organizationId: "o",
  userId: "u",
  userEmail: "u@example.com",
  projectId: "p",
};
const charge = () =>
  trackUsageCreditSpend({
    customer,
    customerId: "o",
    creditFeature: "agent",
    costUsd: 0.025,
    monthlyRemaining: 100,
    properties: { provider: "openrouter" },
  });
describe("atomic usage ledger", () => {
  beforeEach(() => {
    state.failInsert = false;
    vi.mocked(captureServerEvent).mockResolvedValue(undefined);
    state.sqlite!.exec(`
      DROP TABLE IF EXISTS billing_usage;
      DROP TABLE IF EXISTS billing_customer_status;
      CREATE TABLE billing_customer_status (organization_id TEXT PRIMARY KEY, credit_balance INTEGER, updated_at TEXT);
      CREATE TABLE billing_usage (id TEXT PRIMARY KEY, organization_id TEXT, user_id TEXT, project_id TEXT, feature TEXT, provider TEXT, raw_cost_micros INTEGER, charged_credits INTEGER, balance_after INTEGER, created_at TEXT);
      INSERT INTO billing_customer_status VALUES ('o', 100, '2026-10-06');
    `);
  });
  it("debits once and records the actor, provider and resulting balance", async () => {
    await expect(charge()).resolves.toEqual({
      monthlyCredits: 32,
      topupCredits: 0,
    });
    const row = state.sqlite!.prepare("SELECT * FROM billing_usage").get();
    expect(row).toMatchObject({
      user_id: "u",
      project_id: "p",
      provider: "openrouter",
      charged_credits: 32,
      raw_cost_micros: 25000,
      balance_after: 68,
    });
    expect(
      state
        .sqlite!.prepare(
          "SELECT credit_balance, updated_at FROM billing_customer_status",
        )
        .get(),
    ).toMatchObject({ credit_balance: 68 });
  });
  it("leaves both wallet and ledger unchanged when funds are insufficient", async () => {
    state.sqlite!.exec(
      "UPDATE billing_customer_status SET credit_balance = 10",
    );
    await expect(charge()).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
    });
    expect(
      state
        .sqlite!.prepare("SELECT credit_balance FROM billing_customer_status")
        .get(),
    ).toMatchObject({ credit_balance: 10 });
    expect(
      state.sqlite!.prepare("SELECT COUNT(*) AS n FROM billing_usage").get(),
    ).toMatchObject({ n: 0 });
  });
  it("rolls the debit back if writing the ledger fails", async () => {
    state.failInsert = true;
    await expect(charge()).rejects.toThrow();
    expect(
      state
        .sqlite!.prepare("SELECT credit_balance FROM billing_customer_status")
        .get(),
    ).toMatchObject({ credit_balance: 100 });
  });
  it("rejects a mismatched customer before changing money", async () => {
    await expect(
      trackUsageCreditSpend({
        customer,
        customerId: "another-org",
        creditFeature: "agent",
        costUsd: 1,
        monthlyRemaining: 100,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("does not fail a committed debit when analytics is down", async () => {
    vi.mocked(captureServerEvent).mockRejectedValueOnce(new Error("offline"));
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    await expect(charge()).resolves.toEqual({
      monthlyCredits: 32,
      topupCredits: 0,
    });
    expect(
      state
        .sqlite!.prepare("SELECT credit_balance FROM billing_customer_status")
        .get(),
    ).toMatchObject({ credit_balance: 68 });
    warning.mockRestore();
  });
});
