import { sort } from "remeda";
import { sameSitePage, titleOverlap } from "@/shared/contentClusters";
import { readPages } from "@/server/lib/scrape";

const normalize = (url: string) => {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.href.replace(/\/$/, "");
};
type LinkPage = {
  url: string;
  title: string;
  kind?: string;
  linkScore?: number;
  position?: number;
  impressions?: number;
};
export function selectArticleLinks(input: {
  domain: string;
  topic: string;
  target?: string;
  pages: LinkPage[];
  mapped: { url: string; title: string }[];
  rankRows?: { keys?: string[]; position: number; impressions: number }[];
}) {
  const mapped = new Map(input.mapped.map((page, index) => [page.url, index]));
  const articles = new Set(
    input.pages
      .filter((page) => page.kind === "article")
      .map((page) => page.url),
  );
  const ranks = new Map(
    (input.rankRows ?? []).flatMap((row) => {
      const url = row.keys?.[0];
      return url &&
        sameSitePage(url, input.domain) &&
        Number.isFinite(row.position) &&
        row.position > 0 &&
        row.impressions > 0
        ? [[normalize(url), row] as const]
        : [];
    }),
  );
  const unique = new Map<string, LinkPage & { score: number }>();
  for (const page of [...input.mapped, ...input.pages]) {
    if (!sameSitePage(page.url, input.domain)) continue;
    const url = normalize(page.url);
    if (input.target && url === normalize(input.target)) continue;
    let score = mapped.has(page.url)
      ? 100 + input.mapped.length - mapped.get(page.url)!
      : titleOverlap(input.topic, page.title);
    if (score <= 0 || unique.has(url)) continue;
    const article = articles.has(page.url);
    const rank = ranks.get(url);
    const opportunity = rank
      ? rank.position > 3 && rank.position <= 20
        ? 30
        : rank.position <= 3
          ? 10
          : 15
      : 0;
    const linkScore = Math.min(
      100,
      Math.min(40, titleOverlap(input.topic, page.title) * 10) +
        (mapped.has(page.url) ? 20 : 0) +
        (article ? 10 : 0) +
        opportunity,
    );
    if (input.rankRows) score = mapped.get(page.url) === 0 ? 101 : linkScore;
    unique.set(url, {
      ...page,
      score,
      ...(input.rankRows
        ? {
            linkScore,
            ...(rank
              ? { position: rank.position, impressions: rank.impressions }
              : {}),
          }
        : {}),
    });
  }
  const ranked = sort([...unique.values()], (a, b) => b.score - a.score);
  // Reserve a prompt slot for a relevant page outside the saved cluster.
  const outside = ranked.find((page) => !mapped.has(page.url));
  if (outside && ranked.indexOf(outside) > 2) {
    ranked.splice(ranked.indexOf(outside), 1);
    ranked.splice(2, 0, outside);
  }
  return ranked
    .slice(0, 6)
    .map(({ score: _score, kind: _kind, ...page }) => page);
}

export async function verifyArticleLinks(candidates: LinkPage[]) {
  const results = await Promise.all(
    candidates.map(async (candidate) => {
      const result = await readPages([candidate.url], 1);
      const page = result.pages.find((item) => item.url === candidate.url);
      return page
        ? [
            {
              ...candidate,
              title: page.title || candidate.title,
              excerpt: page.text.slice(0, 600),
            },
          ]
        : [];
    }),
  );
  return results.flat();
}
