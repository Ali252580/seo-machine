import { GscService } from "@/server/features/gsc/services/GscService";
import {
  listWordPressPages,
  listWordPressCategories,
} from "@/server/features/wordpress/WordPressService";
import { discoverSiteUrls, readPages } from "@/server/lib/scrape";
import {
  sameSitePage,
  clusterSearchTopic,
  mergeDiscoveredPages,
  type DiscoveredClusterPage,
} from "@/shared/contentClusters";
import { discoverSiteCategories, taxonomyPages } from "./siteCategories";

export async function discoverContentPages(
  project: { id: string; domain: string | null },
  source: "sitemap" | "gsc" | "wordpress",
  search: string,
) {
  const domain = project.domain ?? "";
  if (source === "wordpress") {
    const pages = await listWordPressPages(project.id, search);
    const categories = await listWordPressCategories(project.id).catch(
      () => null,
    );
    const published = pages
      .filter(
        (page) => page.status === "publish" && sameSitePage(page.link, domain),
      )
      .map((page) => ({
        url: page.link,
        title:
          page.title.rendered.replace(/<[^>]*>/g, "").slice(0, 180) ||
          page.slug,
      }));
    const taxonomy = taxonomyPages(
      categories,
      pages
        .filter((page) => page.status === "publish")
        .map((page) => ({ ...page, categories: page.categories ?? [] })),
      domain,
    );
    return mergeDiscoveredPages([
      ...published,
      ...(await discoverSiteCategories(domain, published)),
      ...taxonomy,
    ]);
  }
  let urls: string[];
  const queries = new Map<string, string[]>();
  if (source === "gsc") {
    const result = await GscService.getPerformance({
      projectId: project.id,
      dimensions: ["page", "query"],
      dateRange: "last_28_days",
      rowLimit: 500,
    });
    urls = result.rows.flatMap((row) => {
      const url = row.keys?.[0];
      if (!url) return [];
      const terms = queries.get(url) ?? [];
      if (row.keys?.[1] && terms.length < 5) terms.push(row.keys[1]);
      queries.set(url, terms);
      return [url];
    });
  } else {
    urls = (await discoverSiteUrls(domain, 200)).urls;
  }
  const candidates = [...new Set(urls)].filter((url) =>
    sameSitePage(url, domain),
  );
  const matches = (text: string) =>
    !search || text.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  const pages = candidates.map((url) => ({
    url,
    title: clusterSearchTopic(url).slice(0, 180) || domain,
  }));
  // Read a small batch for real titles; remaining labels are explicitly URL-derived in the UI.
  const preferred = search
    ? pages.filter((page) =>
        matches(`${page.title} ${(queries.get(page.url) ?? []).join(" ")}`),
      )
    : pages;
  const toRead = (preferred.length ? preferred : pages).slice(0, 12);
  const readings = await Promise.all(
    toRead.map((page) => readPages([page.url], 1)),
  );
  const titles = new Map(
    readings.flatMap((result) =>
      result.pages
        .filter((page) => page.title)
        .map((page) => [page.url, page.title!] as const),
    ),
  );
  const titled: DiscoveredClusterPage[] = pages.map((page) => ({
    ...page,
    title: (titles.get(page.url) ?? page.title).slice(0, 180),
  }));
  const combined = mergeDiscoveredPages([
    ...titled,
    ...(await discoverSiteCategories(domain, titled)),
  ]);
  const matchingCategories = new Set(
    combined
      .filter((page) => page.kind === "category" && matches(page.title))
      .map((page) => page.url),
  );
  return combined.filter(
    (page) =>
      matches(`${page.title} ${(queries.get(page.url) ?? []).join(" ")}`) ||
      page.categoryUrls?.some((url) => matchingCategories.has(url)),
  );
}
