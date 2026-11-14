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
import { sameSitePage, clusterLinkTargets } from "@/shared/contentClusters";

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
    const discovered = await readDiscoveredPages(context.projectId);
    const candidates = selectArticleLinks({
      domain: context.project.domain ?? "",
      topic: `${data.keyword} ${data.title}`,
      target: data.targetPage,
      mapped: clusterPlan?.targets ?? [],
      pages: [
        ...discovered,
        ...evidence.pages
          .filter((page) => page.status === "publish")
          .map((page) => ({ url: page.link, title: page.title.rendered })),
      ],
    });
    const internalLinks = await verifyArticleLinks(candidates);
    return {
      ...evidence,
      clusterPlan,
      internalLinks,
      discoveredPageCount: discovered.length,
    };
  });
