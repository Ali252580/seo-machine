import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ContentResearchService } from "@/server/features/content/ContentResearchService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  readContentClusters,
  readDiscoveredPages,
} from "@/server/features/content/contentClusters";
import {
  selectArticleLinks,
  verifyArticleLinks,
} from "@/server/features/content/articleLinkCandidates";
import {
  sameSitePage,
  clusterLinkTargets,
  mergeDiscoveredPages,
} from "@/shared/contentClusters";
import { discoverWritingPages } from "@/server/features/content/discoverClusterPages";
import { loadLinkRanking } from "@/server/features/content/linkRanking";
import { overlappingTopicPages } from "@/server/features/content/topicCoverage";
import { GscService } from "@/server/features/gsc/services/GscService";
import {
  getWordPressConnection,
  listWordPressPages,
} from "@/server/features/wordpress/WordPressService";

export const checkTopicCoverage = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    z.object({
      projectId: z.string().min(1),
      keyword: z.string().trim().min(2).max(100),
    }),
  )
  .handler(async ({ context, data }) => {
    const [connected, gsc, stored, fresh] = await Promise.all([
      getWordPressConnection(context.projectId),
      GscService.getConnection(context.projectId),
      readDiscoveredPages(context.projectId),
      discoverWritingPages({
        id: context.projectId,
        domain: context.project.domain,
      }),
    ]);
    const [wordpress, searchConsole] = await Promise.all([
      connected ? listWordPressPages(context.projectId, data.keyword) : [],
      gsc
        ? GscService.getPerformance({
            projectId: context.projectId,
            dateRange: "last_3_months",
            dimensions: ["query", "page"],
            filters: [
              {
                dimension: "query",
                operator: "contains",
                expression: data.keyword,
              },
            ],
            rowLimit: 100,
            type: "web",
            dataState: "final",
          })
        : null,
    ]);
    const discovered = mergeDiscoveredPages([...stored, ...fresh.pages]).filter(
      (page) => sameSitePage(page.url, context.project.domain ?? ""),
    );
    const matches = overlappingTopicPages(data.keyword, discovered);
    const rankedPages = (searchConsole?.rows ?? []).flatMap((row) =>
      row.keys?.[1] && sameSitePage(row.keys[1], context.project.domain ?? "")
        ? [{ title: row.keys[0] ?? data.keyword, url: row.keys[1] }]
        : [],
    );
    const pages = [
      ...matches,
      ...rankedPages,
      ...wordpress.map((page) => ({
        title: page.title.rendered,
        url: page.link,
      })),
    ];
    return {
      checked: Boolean(connected) || !fresh.unavailable,
      pages: [...new Map(pages.map((page) => [page.url, page])).values()],
      sources: {
        wordpress: Boolean(connected),
        searchConsole: Boolean(gsc),
        discovery: !fresh.unavailable,
      },
    };
  });

export const researchContentTarget = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    z.object({
      projectId: z.string().min(1),
      keyword: z.string().trim().min(2).max(100),
      title: z.string().trim().min(5).max(180),
      targetPage: z.string().url().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const evidence = await ContentResearchService.research({
      projectId: context.projectId,
      keyword: data.keyword,
      title: data.title,
      targetPage: data.targetPage,
    });
    const clusters = await readContentClusters(context.projectId);
    const cluster = clusters.find(
      (item) =>
        item.pillar.url === data.targetPage ||
        item.pages.some((page) => page.url === data.targetPage),
    );
    const clusterPlan = cluster
      ? {
          role:
            cluster.pillar.url === data.targetPage
              ? ("pillar" as const)
              : ("cluster" as const),
          targets: clusterLinkTargets(cluster, data.targetPage ?? "").filter(
            (page) =>
              page.url !== data.targetPage &&
              sameSitePage(page.url, context.project.domain ?? ""),
          ),
        }
      : null;
    const [stored, fresh, ranking] = await Promise.all([
      readDiscoveredPages(context.projectId),
      discoverWritingPages({
        id: context.projectId,
        domain: context.project.domain,
      }),
      loadLinkRanking(context.projectId),
    ]);
    const discovered = mergeDiscoveredPages([...stored, ...fresh.pages]);
    const candidates = selectArticleLinks({
      domain: context.project.domain ?? "",
      topic: `${data.keyword} ${data.title}`,
      target: data.targetPage,
      mapped: clusterPlan?.targets ?? [],
      rankRows: ranking.rows,
      pages: [
        ...discovered,
        ...evidence.pages
          .filter((page) => page.status === "publish")
          .map((page) => ({
            url: page.link,
            title: page.title.rendered,
            kind: page.kind === "post" ? "article" : undefined,
          })),
      ],
    });
    const internalLinks = await verifyArticleLinks(candidates);
    return {
      ...evidence,
      clusterPlan,
      internalLinks,
      discoveredPageCount: discovered.length,
      articleDiscoveryUnavailable: fresh.unavailable,
      linkRankingStatus: ranking.status,
    };
  });
