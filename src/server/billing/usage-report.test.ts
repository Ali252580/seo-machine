import { describe, expect, it } from "vitest";
import { calculateUsageCharge } from "./usage-cost";
import { summarizeBilling } from "./usage-report";
import { billingUsageCsv } from "@/client/features/billing/admin-export";

describe("billing accounting", () => {
  it("rounds charged credits up and rejects invalid provider costs", () => {
    expect(calculateUsageCharge(0.025)).toEqual({
      rawCostMicros: 25000,
      credits: 32,
    });
    expect(calculateUsageCharge(0)).toEqual({ rawCostMicros: 0, credits: 0 });
    for (const cost of [-1, NaN, Infinity, 2001])
      expect(() => calculateUsageCharge(cost)).toThrow();
  });
  it("counts only credited sales and separates currency receipts from consumption", () => {
    const report = summarizeBilling(
      [
        {
          userId: "u",
          organizationId: "o",
          feature: "agent",
          provider: "openrouter",
          rawCostMicros: 25000,
          chargedCredits: 32,
        },
        {
          userId: "u",
          organizationId: "o",
          feature: "rank_tracking",
          provider: "serpapi",
          rawCostMicros: 50000,
          chargedCredits: 64,
        },
      ],
      [
        {
          status: "credited",
          amountCredits: 10000,
          amountIrt: 900000,
          amountUsdtMicros: null,
        },
        {
          status: "pending",
          amountCredits: 25000,
          amountIrt: null,
          amountUsdtMicros: 25000000,
        },
      ],
    );
    expect(report.chargedUsd).toBe(0.096);
    expect(report.rawCostUsd).toBe(0.075);
    expect(report.byUser[0].calls).toBe(2);
    expect(report.packages.map((p) => p.count)).toEqual([1, 0, 0]);
    expect(report.paidIrt).toBe(900000);
    expect(report.paidUsdt).toBe(0);
  });
  it("escapes quotes and prevents spreadsheet formulas in CSV", () => {
    const csv = billingUsageCsv([
      {
        id: "1",
        userEmail: "u",
        organizationName: '=HYPERLINK("bad")',
        projectId: null,
        feature: "agent",
        provider: "openrouter",
        rawCostMicros: 1,
        chargedCredits: 1,
        balanceAfter: 1,
        createdAt: "2026-10-06",
      },
    ]);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  });
});
