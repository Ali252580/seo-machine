import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projectContextSections } from "@/db/schema";

// Internal key cannot be edited through the public project-memory schema.
export const AUTOMATION_KEY = "system:weekly-seo-automation";

export function enabledAutomationProjects() {
  return db
    .select({ id: projectContextSections.projectId })
    .from(projectContextSections)
    .where(
      and(
        eq(projectContextSections.key, AUTOMATION_KEY),
        eq(projectContextSections.content, "true"),
      ),
    );
}

export async function getAutomationEnabled(projectId: string) {
  const [row] = await db
    .select({ content: projectContextSections.content })
    .from(projectContextSections)
    .where(
      and(
        eq(projectContextSections.projectId, projectId),
        eq(projectContextSections.key, AUTOMATION_KEY),
      ),
    )
    .limit(1);
  return row?.content === "true";
}

export async function setAutomationEnabled(
  projectId: string,
  enabled: boolean,
) {
  const values = {
    content: String(enabled),
    updatedAt: new Date().toISOString(),
    updatedBy: "user" as const,
  };
  await db
    .insert(projectContextSections)
    .values({ projectId, key: AUTOMATION_KEY, ...values })
    .onConflictDoUpdate({
      target: [projectContextSections.projectId, projectContextSections.key],
      set: values,
    });
  return { enabled };
}
