import { z } from "zod";
import { sort } from "remeda";

export const clusterPageSchema = z.object({
  url: z.string().url().max(1000),
  title: z.string().min(1).max(180),
});
export const contentClustersSchema = z
  .array(
    z.object({
      pillar: clusterPageSchema,
      pages: z.array(clusterPageSchema).min(1).max(20),
    }),
  )
  .max(20);
export type ContentCluster = z.infer<typeof contentClustersSchema>[number];
export const discoveredClusterPageSchema = clusterPageSchema.extend({
  kind: z.enum(["category", "navigation", "article"]).optional(),
  categoryLevel: z.enum(["root", "child"]).optional(),
  parentUrl: z.string().url().optional(),
  categoryUrls: z.array(z.string().url()).optional(),
});
export type DiscoveredClusterPage = z.infer<typeof discoveredClusterPageSchema>;

export function mergeDiscoveredPages(pages: DiscoveredClusterPage[]) {
  const merged = new Map<string, DiscoveredClusterPage>();
  for (const page of pages) {
    const previous = merged.get(page.url);
    merged.set(page.url, {
      ...previous,
      ...page,
      kind:
        previous?.kind === "category"
          ? "category"
          : previous?.kind === "article" && page.kind === "navigation"
            ? "article"
            : (page.kind ?? previous?.kind),
      ...(previous?.categoryUrls?.length || page.categoryUrls?.length
        ? {
            categoryUrls: [
              ...new Set([
                ...(previous?.categoryUrls ?? []),
                ...(page.categoryUrls ?? []),
              ]),
            ],
          }
        : {}),
    });
  }
  return [...merged.values()];
}

export function clusterSearchTopic(input: string): string {
  const value = input.trim();
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    const slug = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    return decodeURIComponent(slug).replace(/[-_]+/g, " ").trim();
  } catch {
    return value;
  }
}

export function sameSitePage(raw: string, domain: string): boolean {
  try {
    const url = new URL(raw);
    const site = new URL(domain.includes("://") ? domain : `https://${domain}`);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.hostname.replace(/^www\./, "") === site.hostname.replace(/^www\./, "")
    );
  } catch {
    return false;
  }
}

const titleStopWords = new Set(
  "برای درباره راهنمای مقاله بهترین چیست چگونه های است با از در به و the and for with guide how".split(
    " ",
  ),
);
const words = (title: string) =>
  new Set(
    title
      .replace(/<[^>]*>/g, " ")
      .replace(/[ي]/g, "ی")
      .replace(/ك/g, "ک")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 2 && !titleStopWords.has(word)),
  );
// shortcut: title words only; use content evidence when semantic relevance is required.
export function titleOverlap(left: string, right: string) {
  const terms = words(left);
  return [...words(right)].filter((word) => terms.has(word)).length;
}
/** Title overlap is a suggestion, never SERP validation. */
export function suggestClusterPages(
  pillar: DiscoveredClusterPage,
  pages: DiscoveredClusterPage[],
) {
  const ranked = pages
    .filter((page) => page.url !== pillar.url)
    .map((page) => ({
      page,
      score:
        pillar.kind === "category" &&
        (page.categoryUrls?.includes(pillar.url) ||
          page.parentUrl === pillar.url)
          ? 100 + titleOverlap(pillar.title, page.title)
          : page.kind === "category" || page.kind === "navigation"
            ? 0
            : titleOverlap(pillar.title, page.title),
    }))
    .filter(({ score }) => score > 0);
  return sort(ranked, (a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ page }) => page);
}

/** Draft groups from labels only; users confirm the pillar and intent before saving. */
export function suggestContentClusters(pages: DiscoveredClusterPage[]) {
  const categories = pages.filter((page) => page.kind === "category");
  const groups: ContentCluster[] = categories
    .map((pillar) => ({ pillar, pages: suggestClusterPages(pillar, pages) }))
    .filter((group) => group.pages.length > 0)
    .slice(0, 20);
  const assigned = new Set(
    groups.flatMap((group) => [
      group.pillar.url,
      ...group.pages.map((page) => page.url),
    ]),
  );
  let remaining = [
    ...new Map(
      pages
        .filter(
          (page) =>
            (!page.kind || page.kind === "article") && !assigned.has(page.url),
        )
        .map((page) => [page.url, page]),
    ).values(),
  ];
  while (remaining.length > 1 && groups.length < 20) {
    let best: ContentCluster | null = null;
    for (const pillar of remaining) {
      const related = suggestClusterPages(pillar, remaining);
      if (
        related.length &&
        (!best ||
          related.length > best.pages.length ||
          (related.length === best.pages.length &&
            pillar.title.length < best.pillar.title.length))
      ) {
        best = { pillar, pages: related };
      }
    }
    if (!best) break;
    groups.push(best);
    const used = new Set([
      best.pillar.url,
      ...best.pages.map((page) => page.url),
    ]);
    remaining = remaining.filter((page) => !used.has(page.url));
  }
  return groups;
}
