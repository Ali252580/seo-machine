import type { KeywordResearchRow } from "@/types/keywords";
import { normalizeTopicText } from "@/shared/contentClusters";

export function autoTopicCandidates(
  rows: KeywordResearchRow[],
  blog: boolean,
  seed: string,
  source: string,
) {
  const base = normalizeTopicText(seed);
  const seen = new Set<string>();
  return [...rows]
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .filter((row) => {
      const key = normalizeTopicText(row.keyword);
      if (key.length < 2 || row.keyword.length > 100 || seen.has(key))
        return false;
      if (
        row.intent === "navigational" ||
        (blog && row.intent === "transactional")
      )
        return false;
      const measured = (row.searchVolume ?? 0) > 0;
      // Older suggestion-only caches have source provenance at the result level.
      // The provider injects the seed even if Google never suggested it.
      const suggested =
        row.searchVolume === null &&
        key !== base &&
        (row.fromGoogleSuggest || source === "google_suggest");
      if (!measured && !suggested) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);
}
