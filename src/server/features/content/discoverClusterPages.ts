import { GscService } from "@/server/features/gsc/services/GscService";
import { listWordPressPages } from "@/server/features/wordpress/WordPressService";
import { discoverSiteUrls, readPages } from "@/server/lib/scrape";
import { sameSitePage, clusterSearchTopic } from "@/shared/contentClusters";

export async function discoverContentPages(
  project: { id: string; domain: string | null },
  source: "sitemap" | "gsc" | "wordpress",
  search: string,
) {
  const domain = project.domain ?? "";
  if (source === "wordpress") {
    const pages = await listWordPressPages(project.id, search);
    return pages
      .filter(
        (page) => page.status === "publish" && sameSitePage(page.link, domain),
      )
      .map((page) => ({
        url: page.link,
        title:
          page.title.rendered.replace(/<[^>]*>/g, "").slice(0, 180) ||
          page.slug,
      }));
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
  return pages
    .map((page) => ({
      ...page,
      title: (titles.get(page.url) ?? page.title).slice(0, 180),
    }))
    .filter((page) =>
      matches(`${page.title} ${(queries.get(page.url) ?? []).join(" ")}`),
    );
}
