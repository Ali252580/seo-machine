import {
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  CREDIT_PACKAGES_USD,
} from "@/shared/billing";

type Usage = {
  userId: string;
  organizationId: string;
  feature: string;
  provider: string;
  rawCostMicros: number;
  chargedCredits: number;
};
type Payment = {
  status: string;
  amountCredits: number;
  amountIrt: number | null;
  amountUsdtMicros: number | null;
};

/** Aggregate integer amounts first; convert currencies only for display. */
export function summarizeBilling(usage: Usage[], payments: Payment[]) {
  const sum = (rows: Usage[]) => {
    const rawCostUsd =
      rows.reduce((n, r) => n + r.rawCostMicros, 0) / 1_000_000;
    const chargedUsd =
      rows.reduce((n, r) => n + r.chargedCredits, 0) /
      AUTUMN_SEO_DATA_CREDITS_PER_USD;
    return {
      calls: rows.length,
      rawCostUsd,
      chargedUsd,
      marginUsd: chargedUsd - rawCostUsd,
    };
  };
  const group = (
    key: keyof Pick<
      Usage,
      "userId" | "organizationId" | "feature" | "provider"
    >,
  ) => {
    const groups = new Map<string, Usage[]>();
    for (const row of usage) {
      const rows = groups.get(row[key]) ?? [];
      rows.push(row);
      groups.set(row[key], rows);
    }
    return [...groups]
      .map(([id, rows]) => ({ id, ...sum(rows) }))
      .sort((a, b) => b.chargedUsd - a.chargedUsd);
  };
  const credited = payments.filter((p) => p.status === "credited");
  return {
    ...sum(usage),
    paidIrt: credited.reduce((n, p) => n + (p.amountIrt ?? 0), 0),
    paidUsdt:
      credited.reduce((n, p) => n + (p.amountUsdtMicros ?? 0), 0) / 1_000_000,
    byUser: group("userId"),
    byOrganization: group("organizationId"),
    byFeature: group("feature"),
    byProvider: group("provider"),
    packages: CREDIT_PACKAGES_USD.map((amountUsd) => {
      const sales = credited.filter(
        (p) => p.amountCredits === amountUsd * AUTUMN_SEO_DATA_CREDITS_PER_USD,
      );
      return {
        amountUsd,
        count: sales.length,
        soldCredits: sales.reduce((n, p) => n + p.amountCredits, 0),
      };
    }),
  };
}
