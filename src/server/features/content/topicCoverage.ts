import { clusterSearchTopic, sameTopicTitle } from "@/shared/contentClusters";

type Page = { url: string; title: string };

export function overlappingTopicPages(keyword: string, pages: Page[]): Page[] {
  return pages.filter((page) =>
    [page.title, clusterSearchTopic(page.url)].some((label) =>
      sameTopicTitle(keyword, label),
    ),
  );
}
