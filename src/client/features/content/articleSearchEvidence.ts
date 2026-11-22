import { sameSitePage } from "@/shared/contentClusters";

export function findOwnSearchResults(
  items: { title: string; url: string }[],
  domain: string,
) {
  return items
    .filter((item) => sameSitePage(item.url, domain))
    .map((item) => ({ title: item.title, url: item.url }));
}
