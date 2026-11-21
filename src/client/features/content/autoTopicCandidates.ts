import type { KeywordResearchRow } from "@/types/keywords";

export function autoTopicCandidates(rows: KeywordResearchRow[], blog: boolean) {
  return rows
    .filter(
      (row) =>
        row.keyword.length >= 2 &&
        row.keyword.length <= 100 &&
        (row.searchVolume ?? 0) > 0 &&
        row.intent !== "navigational" &&
        (!blog || row.intent !== "transactional"),
    )
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, 15);
}

export function autoTopicIndices(value: string, count: number) {
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => /^\d+$/.test(part))
        .map(Number)
        .filter((index) => index < count),
    ),
  ].slice(0, 3);
}
