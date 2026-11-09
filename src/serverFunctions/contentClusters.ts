import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "./middleware";
import { requireOrgPermission } from "@/server/auth/org-gate";
import { hasOrgPermission } from "@/lib/org-permissions";
import {
  readContentClusters,
  writeContentClusters,
} from "@/server/features/content/contentClusters";
import {
  clusterSearchTopic,
  contentClustersSchema,
  sameSitePage,
} from "@/shared/contentClusters";
import { AppError } from "@/server/lib/errors";
import { discoverContentPages } from "@/server/features/content/discoverClusterPages";
const input = z.object({ projectId: z.string().min(1) });
export const getContentClusters = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(input)
  .handler(async ({ context }) => ({
    clusters: await readContentClusters(context.projectId),
    canManage: hasOrgPermission(context.role, { integration: ["manage"] }),
  }));
export const discoverClusterPages = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    input.extend({
      source: z.enum(["sitemap", "gsc", "wordpress"]).default("sitemap"),
      search: z
        .string()
        .max(4000)
        .transform(clusterSearchTopic)
        .pipe(z.string().max(100)),
    }),
  )
  .handler(({ context, data }) =>
    discoverContentPages(
      { id: context.projectId, domain: context.project.domain },
      data.source,
      data.search,
    ),
  );
export const saveContentClusters = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(input.extend({ clusters: contentClustersSchema }))
  .handler(async ({ context, data }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    for (const cluster of data.clusters) {
      const urls = [cluster.pillar, ...cluster.pages].map((page) => page.url);
      if (
        new Set(urls).size !== urls.length ||
        urls.some((url) => !sameSitePage(url, context.project.domain ?? ""))
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "صفحات باید یکتا و متعلق به همین سایت باشند.",
        );
    }
    await writeContentClusters(context.projectId, data.clusters);
    return { ok: true };
  });
