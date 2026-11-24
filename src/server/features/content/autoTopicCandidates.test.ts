import { expect, it } from "vitest";
import { autoTopicCandidates } from "./autoTopicCandidates";
import type { KeywordResearchRow } from "@/types/keywords";

it("selects measured demand or observed non-seed suggestions with suitable intent", () => {
  const row = (
    keyword: string,
    searchVolume: number | null,
    intent: KeywordResearchRow["intent"],
  ): KeywordResearchRow => ({
    keyword,
    searchVolume,
    intent,
    trend: [],
    keywordDifficulty: null,
    cpc: null,
    competition: null,
  });
  const rows = [
    row("ناوبری", 100, "navigational"),
    row("خرید", 90, "transactional"),
    row("آموزش", 20, "informational"),
    row("نامعلوم", null, "unknown"),
    row("راهنما", 30, "informational"),
  ];
  expect(
    autoTopicCandidates(rows, true, "نامعلوم", "google_ads").map(
      (item) => item.keyword,
    ),
  ).toEqual(["راهنما", "آموزش"]);
  rows.push({
    ...row("نگهداری گیاه", null, "unknown"),
    fromGoogleSuggest: true,
  });
  expect(
    autoTopicCandidates(rows, true, "نامعلوم", "google_suggest").map(
      (item) => item.keyword,
    ),
  ).toEqual(["راهنما", "آموزش", "نگهداری گیاه"]);
});
