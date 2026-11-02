import type { DatabaseSync } from "node:sqlite";
import { afterAll, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sqlite: null as DatabaseSync | null,
}));
vi.mock("@/db", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { drizzle } = await import("drizzle-orm/sqlite-proxy");
  const sqlite = new DatabaseSync(":memory:");
  state.sqlite = sqlite;
  return {
    db: drizzle(async (query, params, method) => {
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
vi.mock("@/db/runBatch", () => ({ runBatch: vi.fn() }));
vi.mock("@/server/lib/posthog", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));
import {
  assertUsageCreditsAvailable,
  customerHasPaidPlan,
  customerHasManagedAccess,
  getCreditBalance,
  getOrCreateOrganizationCustomer,
  checkUsageCreditsDepleted,
} from "./subscription";
import { captureServerEvent } from "@/server/lib/posthog";
const customer = {
  organizationId: "first",
  userId: "u",
  userEmail: "u@example.com",
};
beforeEach(() => {
  vi.mocked(captureServerEvent).mockReset().mockResolvedValue(undefined);
  state.sqlite!.exec(`DROP TABLE IF EXISTS billing_customer_status;
  CREATE TABLE billing_customer_status (
    organization_id TEXT PRIMARY KEY, is_paying INTEGER NOT NULL DEFAULT 0,
    paid_plan_id TEXT, paid_plan_status TEXT, credit_balance INTEGER NOT NULL DEFAULT 1000,
    customer_json TEXT NOT NULL, synced_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
});
afterAll(() => state.sqlite!.close());
it("creates one wallet and preserves spent credits when ensuring the same customer again", async () => {
  expect(await getOrCreateOrganizationCustomer(customer)).toEqual({
    id: "first",
  });
  expect(await getCreditBalance("first")).toBe(1000);
  state.sqlite!.exec("UPDATE billing_customer_status SET credit_balance=25");
  await getOrCreateOrganizationCustomer(customer);
  expect(await getCreditBalance("first")).toBe(25);
  expect(
    state
      .sqlite!.prepare("SELECT COUNT(*) AS n FROM billing_customer_status")
      .get(),
  ).toMatchObject({ n: 1 });
});
it("does not read another organization's wallet", async () => {
  await getOrCreateOrganizationCustomer(customer);
  expect(await customerHasPaidPlan("first")).toBe(true);
  expect(await customerHasPaidPlan("second")).toBe(false);
  expect(await getCreditBalance("second")).toBe(0);
  await expect(assertUsageCreditsAvailable("second")).rejects.toMatchObject({
    code: "INSUFFICIENT_CREDITS",
  });
});
it.each([0, -1])(
  "rejects exhausted balance %s while preserving managed access",
  async (balance) => {
    await getOrCreateOrganizationCustomer(customer);
    state
      .sqlite!.prepare("UPDATE billing_customer_status SET credit_balance=?")
      .run(balance);
    expect(await customerHasPaidPlan("first")).toBe(false);
    expect(await customerHasManagedAccess("first")).toBe(true);
    await expect(assertUsageCreditsAvailable("first")).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
    });
  },
);
it("returns current positive credit balance", async () => {
  await getOrCreateOrganizationCustomer(customer);
  await expect(assertUsageCreditsAvailable("first")).resolves.toEqual({
    monthlyRemaining: 1000,
  });
});
it("keeps the depleted-credit result when telemetry is unavailable", async () => {
  vi.mocked(captureServerEvent).mockRejectedValueOnce(
    new Error("telemetry offline"),
  );
  await expect(checkUsageCreditsDepleted(customer)).resolves.toEqual({
    depleted: true,
    monthlyRemaining: 0,
  });
});
it("propagates database failures instead of granting access", async () => {
  state.sqlite!.exec("DROP TABLE billing_customer_status");
  await expect(assertUsageCreditsAvailable("first")).rejects.toThrow();
});
