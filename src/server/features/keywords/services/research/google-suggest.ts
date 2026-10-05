import type { EnrichedKeyword } from "./helpers";
import { normalizeKeyword } from "./helpers";

// Google does not publish search volume or CPC in Autocomplete. This source
// supplies ideas only; every metric remains null rather than being invented.
const PREFIXES = ["", " ا", " ب"];

export async function fetchGoogleSuggestRows(
  seed: string,
  limit: number,
  fetcher: typeof fetch = fetch,
): Promise<EnrichedKeyword[]> {
  const requests = PREFIXES.map(async (suffix) => {
    const url = new URL("https://suggestqueries.google.com/complete/search");
    url.search = new URLSearchParams({
      client: "firefox",
      hl: "fa",
      gl: "ir",
      q: `${seed}${suffix}`,
    }).toString();
    const response = await fetcher(url, { signal: AbortSignal.timeout(6_000) });
    if (!response.ok) throw new Error(`Google Suggest HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || !Array.isArray(payload[1])) {
      throw new Error("Invalid Google Suggest response");
    }
    return payload[1].filter(
      (value): value is string => typeof value === "string",
    );
  });

  const settled = await Promise.allSettled(requests);
  const seen = new Set<string>();
  const rows: EnrichedKeyword[] = [];
  for (const keyword of [
    seed,
    ...settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
  ]) {
    const normalized = normalizeKeyword(keyword);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    rows.push({
      keyword: normalized,
      searchVolume: null,
      trend: [],
      cpc: null,
      competition: null,
      keywordDifficulty: null,
      intent: "unknown",
    });
    if (rows.length >= limit) break;
  }
  if (
    rows.length === 1 &&
    settled.every((result) => result.status === "rejected")
  ) {
    throw new Error("Google Suggest is unavailable");
  }
  return rows;
}
