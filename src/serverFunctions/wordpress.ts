import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hasOrgPermission } from "@/lib/org-permissions";
import { requireOrgPermission } from "@/server/auth/org-gate";
import { AppError } from "@/server/lib/errors";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  connectWordPress,
  createWordPressDraft,
  disconnectWordPress,
  getWordPressConnection,
  listWordPressPages,
} from "@/server/features/wordpress/WordPressService";

const scoped = z.object({ projectId: z.string().min(1) });

export const getWordPressStatus = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(scoped)
  .handler(async ({ context }) => ({
    connection: await getWordPressConnection(context.projectId),
    canManage: hasOrgPermission(context.role, { integration: ["manage"] }),
  }));

export const findWordPressPages = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(scoped.extend({ search: z.string().trim().min(2).max(100) }))
  .handler(({ context, data }) =>
    listWordPressPages(context.projectId, data.search),
  );

export const saveWordPressConnection = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    scoped.extend({
      siteUrl: z.string().url(),
      username: z.string().min(1),
      password: z.string().min(1),
    }),
  )
  .handler(async ({ context, data }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    if (!context.project.domain)
      throw new AppError("VALIDATION_ERROR", "Set the project domain first.");
    await connectWordPress({
      projectId: context.projectId,
      organizationId: context.organizationId,
      userId: context.userId,
      projectDomain: context.project.domain,
      siteUrl: data.siteUrl,
      username: data.username,
      password: data.password,
    });
    return { connected: true };
  });

export const removeWordPressConnection = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(scoped)
  .handler(async ({ context }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    await disconnectWordPress(context.projectId);
    return { connected: false };
  });

export const saveWordPressDraft = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    scoped.extend({
      title: z.string().min(5).max(180),
      slug: z
        .string()
        .min(2)
        .max(180)
        .regex(/^[\p{L}\p{N}-]+$/u),
      content: z.string().min(200).max(20_000),
      kind: z.enum(["page", "post"]).default("page"),
    }),
  )
  .handler(async ({ context, data }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    return createWordPressDraft(
      context.projectId,
      data.title,
      data.content,
      data.slug,
      data.kind,
    );
  });
