import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "./middleware";
import { requireOrgPermission } from "@/server/auth/org-gate";
import { hasOrgPermission } from "@/lib/org-permissions";
import {
  getAutomationEnabled,
  setAutomationEnabled,
} from "@/server/features/sam/automationSettings";

const input = z.object({ projectId: z.string().min(1) });
export const getProjectAutomation = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(input)
  .handler(async ({ context }) => ({
    enabled: await getAutomationEnabled(context.projectId),
    canManage: hasOrgPermission(context.role, { integration: ["manage"] }),
  }));

export const saveProjectAutomation = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(input.extend({ enabled: z.boolean() }))
  .handler(({ context, data }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    return setAutomationEnabled(context.projectId, data.enabled);
  });
