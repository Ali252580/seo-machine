import { expect, it } from "vitest";
import { autoTopicCandidates, autoTopicIndices } from "./autoTopicCandidates";
import type { KeywordResearchRow } from "@/types/keywords";

it("selects demand with suitable intent and validates model choices", () => {
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
  expect(autoTopicCandidates(rows, true).map((item) => item.keyword)).toEqual([
    "راهنما",
    "آموزش",
  ]);
  expect(autoTopicIndices("1, 0, 1, -1, 99, x", 2)).toEqual([1, 0]);
});
