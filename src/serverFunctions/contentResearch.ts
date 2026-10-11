import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ContentResearchService } from "@/server/features/content/ContentResearchService";
import { requireProjectContext } from "@/serverFunctions/middleware";

export const researchContentTarget = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    z.object({
      projectId: z.string().min(1),
      keyword: z.string().trim().min(2).max(100),
      title: z.string().trim().min(5).max(180),
    }),
  )
  .handler(({ context, data }) =>
    ContentResearchService.research({
      projectId: context.projectId,
      keyword: data.keyword,
      title: data.title,
    }),
  );
