type UsageRow = {
  id: string;
  userEmail: string;
  organizationName: string;
  projectId: string | null;
  feature: string;
  provider: string;
  rawCostMicros: number;
  chargedCredits: number;
  balanceAfter: number;
  createdAt: string;
};

export function billingUsageCsv(rows: UsageRow[]) {
  // Neutralize spreadsheet formulas in user-supplied names and identifiers.
  const cell = (value: string | number | null) => {
    const text = String(value ?? "");
    const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [
    [
      "ID",
      "User",
      "Account",
      "Project",
      "Feature",
      "Provider",
      "Base cost USD",
      "Credits used",
      "Balance after",
      "Date UTC",
    ],
    ...rows.map((row) => [
      row.id,
      row.userEmail,
      row.organizationName,
      row.projectId,
      row.feature,
      row.provider,
      row.rawCostMicros / 1_000_000,
      row.chargedCredits,
      row.balanceAfter,
      row.createdAt,
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}
