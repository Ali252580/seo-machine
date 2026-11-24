import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "./middleware";
import { requireOrgPermission } from "@/server/auth/org-gate";
import { hasOrgPermission } from "@/lib/org-permissions";
import {
  getAutomationEnabled,
  setAutomationEnabled,
  SKILL_AUTOMATION_KEY,
} from "@/server/features/sam/automationSettings";
import { getAutomaticSkillRuns } from "@/server/features/sam/automaticSkills";

const input = z.object({ projectId: z.string().min(1) });
export const getProjectAutomation = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(input)
  .handler(async ({ context }) => ({
    enabled: await getAutomationEnabled(context.projectId),
    skillsEnabled: await getAutomationEnabled(
      context.projectId,
      SKILL_AUTOMATION_KEY,
    ),
    canManage: hasOrgPermission(context.role, { integration: ["manage"] }),
  }));

export const saveProjectAutomation = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(input.extend({ enabled: z.boolean() }))
  .handler(({ context, data }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    return setAutomationEnabled(context.projectId, data.enabled);
  });

export const getProjectSkillRuns = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(input)
  .handler(({ context }) => getAutomaticSkillRuns(context.projectId));

export const getArticleTopicAutomation = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(input)
  .handler(async ({ context }) => {
    const [runs, enabled] = await Promise.all([
      getAutomaticSkillRuns(context.projectId),
      getAutomationEnabled(context.projectId, SKILL_AUTOMATION_KEY),
    ]);
    const run = runs.find((run) => run.name === "keyword-research");
    const scope = run?.topicMarket;
    const current =
      scope &&
      scope.domain === context.project.domain &&
      scope.locationCode === context.project.locationCode &&
      scope.languageCode === context.project.languageCode;
    return {
      enabled,
      topic: current ? run?.writingTopic : undefined,
      updatedAt: current ? run?.updatedAt : undefined,
      failed: run?.status === "error",
    };
  });

export const saveProjectSkillAutomation = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(input.extend({ enabled: z.boolean() }))
  .handler(({ context, data }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    return setAutomationEnabled(
      context.projectId,
      data.enabled,
      SKILL_AUTOMATION_KEY,
    );
  });
