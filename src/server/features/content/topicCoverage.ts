import { clusterSearchTopic, titleOverlap } from "@/shared/contentClusters";

type Page = { url: string; title: string };

// shortcut: title and URL word overlap cannot prove semantic equivalence; use page content and intent review for complete coverage.
export function overlappingTopicPages(keyword: string, pages: Page[]): Page[] {
  const normalize = (value: string) =>
    value
      .replace(/[ي]/g, "ی")
      .replace(/ك/g, "ک")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const target = normalize(keyword);
  return pages.filter((page) => {
    const labels = [page.title, clusterSearchTopic(page.url)];
    return labels.some((label) => {
      const value = normalize(label);
      return (
        (target.length >= 3 && ` ${value} `.includes(` ${target} `)) ||
        titleOverlap(keyword, label) >= 2
      );
    });
  });
}
