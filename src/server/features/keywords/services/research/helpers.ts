import type { KeywordIntent, MonthlySearch } from "@/types/keywords";

export type EnrichedKeyword = {
  keyword: string;
  searchVolume: number | null;
  trend: MonthlySearch[];
  cpc: number | null;
  competition: number | null;
  keywordDifficulty: number | null;
  intent: KeywordIntent;
};

export function normalizeKeyword(input: string): string {
  return input.trim().toLowerCase();
}

// Preserve intentional Latin searches, but keep Persian searches from
// collecting unrelated English-only suggestions from worldwide Ads data.
export function matchesPersianSeed(seed: string, keyword: string): boolean {
  return !/\p{Script=Arabic}/u.test(seed) || /\p{Script=Arabic}/u.test(keyword);
}

export function normalizeIntent(raw: string | null | undefined): KeywordIntent {
  if (!raw) return "unknown";
  const value = raw.toLowerCase();
  if (value.includes("inform")) return "informational";
  if (value.includes("commerc")) return "commercial";
  if (value.includes("transact")) return "transactional";
  if (value.includes("navig")) return "navigational";
  return "unknown";
}
