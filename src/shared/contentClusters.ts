import { z } from "zod";

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

const words = (title: string) =>
  new Set(
    title
      .replace(/<[^>]*>/g, " ")
      .replace(/[ي]/g, "ی")
      .replace(/ك/g, "ک")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 2),
  );
/** Title overlap is a suggestion, never SERP validation. */
export function suggestClusterPages(
  pillar: { url: string; title: string },
  pages: { url: string; title: string }[],
) {
  const terms = words(pillar.title);
  return pages
    .filter(
      (page) =>
        page.url !== pillar.url &&
        [...words(page.title)].some((word) => terms.has(word)),
    )
    .slice(0, 20);
}

/** Draft groups from labels only; users confirm the pillar and intent before saving. */
export function suggestContentClusters(
  pages: { url: string; title: string }[],
) {
  let remaining = [...new Map(pages.map((page) => [page.url, page])).values()];
  const groups: ContentCluster[] = [];
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
