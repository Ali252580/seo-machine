import { sort } from "remeda";
import { sameSitePage } from "@/shared/contentClusters";
import { readPages } from "@/server/lib/scrape";

const tokens = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 2),
  );
const normalize = (url: string) => {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.href.replace(/\/$/, "");
};
export function selectArticleLinks(input: {
  domain: string;
  topic: string;
  target?: string;
  pages: { url: string; title: string }[];
  mapped: { url: string; title: string }[];
}) {
  const terms = tokens(input.topic);
  const mapped = new Set(input.mapped.map((page) => page.url));
  const unique = new Map<
    string,
    { url: string; title: string; score: number }
  >();
  for (const page of [...input.mapped, ...input.pages]) {
    if (!sameSitePage(page.url, input.domain)) continue;
    const url = normalize(page.url);
    if (input.target && url === normalize(input.target)) continue;
    const score =
      [...tokens(page.title)].filter((word) => terms.has(word)).length +
      (mapped.has(page.url) ? 100 : 0);
    if (score > 0 && !unique.has(url)) unique.set(url, { ...page, score });
  }
  return sort([...unique.values()], (a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ url, title }) => ({ url, title }));
}

export async function verifyArticleLinks(
  candidates: { url: string; title: string }[],
) {
  const results = await Promise.all(
    candidates.map(async (candidate) => {
      const result = await readPages([candidate.url], 1);
      const page = result.pages.find((item) => item.url === candidate.url);
      return page
        ? [
            {
              url: candidate.url,
              title: page.title || candidate.title,
              excerpt: page.text.slice(0, 600),
            },
          ]
        : [];
    }),
  );
  return results.flat();
}
