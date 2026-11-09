import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projectContextSections } from "@/db/schema";

// Internal key cannot be edited through the public project-memory schema.
export const AUTOMATION_KEY = "system:weekly-seo-automation";
export const SKILL_AUTOMATION_KEY = "system:seo-skill-automation";

export function enabledAutomationProjects(key = AUTOMATION_KEY) {
  return db
    .select({ id: projectContextSections.projectId })
    .from(projectContextSections)
    .where(
      and(
        eq(projectContextSections.key, key),
        eq(projectContextSections.content, "true"),
      ),
    );
}

export async function getAutomationEnabled(
  projectId: string,
  key = AUTOMATION_KEY,
) {
  const [row] = await db
    .select({ content: projectContextSections.content })
    .from(projectContextSections)
    .where(
      and(
        eq(projectContextSections.projectId, projectId),
        eq(projectContextSections.key, key),
      ),
    )
    .limit(1);
  return row?.content === "true";
}

export async function setAutomationEnabled(
  projectId: string,
  enabled: boolean,
  key = AUTOMATION_KEY,
) {
  const values = {
    content: String(enabled),
    updatedAt: new Date().toISOString(),
    updatedBy: "user" as const,
  };
  await db
    .insert(projectContextSections)
    .values({ projectId, key, ...values })
    .onConflictDoUpdate({
      target: [projectContextSections.projectId, projectContextSections.key],
      set: values,
    });
  return { enabled };
}
