import {
  sameSitePage,
  mergeDiscoveredPages,
  titleOverlap,
} from "@/shared/contentClusters";
import { GscService } from "@/server/features/gsc/services/GscService";
import { ProjectContextRepository } from "@/server/features/project-context/repositories/ProjectContextRepository";
import {
  getWordPressConnection,
  listWordPressPages,
} from "@/server/features/wordpress/WordPressService";
import { readContentClusters, readDiscoveredPages } from "./contentClusters";
import { discoverWritingPages } from "./discoverClusterPages";
import { overlappingTopicPages } from "./topicCoverage";

// Keep one inventory for all the keyword and title checks in a research run.
export async function loadSiteTopicCoverage(project: {
  id: string;
  domain: string | null;
}) {
  const [wp, gsc, stored, fresh, clusters, keyPages] = await Promise.all([
    getWordPressConnection(project.id),
    GscService.getConnection(project.id),
    readDiscoveredPages(project.id),
    discoverWritingPages(project),
    readContentClusters(project.id),
    ProjectContextRepository.listKeyPages(project.id),
  ]);
  const domain = project.domain ?? "";
  const inventory = [
    ...mergeDiscoveredPages([...fresh.pages, ...stored]),
    ...clusters.flatMap((cluster) => [cluster.pillar, ...cluster.pages]),
    ...keyPages.map((page) => ({ url: page.url, title: page.topic ?? "" })),
  ].filter((page) => sameSitePage(page.url, domain));

  return async (term: string) => {
    const [cms, performance] = await Promise.allSettled([
      wp ? listWordPressPages(project.id, term) : [],
      gsc
        ? GscService.getPerformance({
            projectId: project.id,
            dateRange: "last_3_months",
            dimensions: ["query", "page"],
            filters: [
              { dimension: "query", operator: "equals", expression: term },
            ],
            rowLimit: 100,
            type: "web",
            dataState: "final",
          })
        : null,
    ]);
    const sources = {
      discovery: !fresh.unavailable,
      wordpress: Boolean(wp) && cms.status === "fulfilled",
      searchConsole: Boolean(gsc) && performance.status === "fulfilled",
    };
    const pages = [
      ...overlappingTopicPages(term, inventory),
      ...(performance.status === "fulfilled"
        ? (performance.value?.rows ?? [])
        : []
      ).flatMap((row) =>
        row.keys?.[1] && sameSitePage(row.keys[1], domain)
          ? [{ title: row.keys[0] ?? term, url: row.keys[1] }]
          : [],
      ),
      ...(cms.status === "fulfilled" ? cms.value : []).map((page) => ({
        title: page.title.rendered.replace(/<[^>]*>/g, ""),
        url: page.link,
      })),
    ];
    return {
      checked:
        Boolean(domain) &&
        (sources.wordpress || sources.discovery) &&
        cms.status === "fulfilled" &&
        performance.status === "fulfilled",
      pages: [...new Map(pages.map((page) => [page.url, page])).values()],
      sources,
      nearby: inventory
        .map((page) => ({ page, overlap: titleOverlap(term, page.title) }))
        .filter((entry) => inventory.length <= 8 || entry.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 8)
        .map(({ page }) => ({ title: page.title, url: page.url })),
    };
  };
}
