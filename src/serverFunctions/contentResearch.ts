import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ContentResearchService } from "@/server/features/content/ContentResearchService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { readContentClusters } from "@/server/features/content/contentClusters";
import { sameSitePage } from "@/shared/contentClusters";

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
          targets: [cluster.pillar, ...cluster.pages].filter(
            (page) =>
              page.url !== data.targetPage &&
              sameSitePage(page.url, context.project.domain ?? ""),
          ),
        }
      : null;
    return { ...evidence, clusterPlan };
  });
