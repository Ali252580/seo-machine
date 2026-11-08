import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projectContextSections } from "@/db/schema";
import {
  contentClustersSchema,
  type ContentCluster,
} from "@/shared/contentClusters";
const KEY = "system:content-clusters";
export async function readContentClusters(projectId: string) {
  const [row] = await db
    .select({ content: projectContextSections.content })
    .from(projectContextSections)
    .where(
      and(
        eq(projectContextSections.projectId, projectId),
        eq(projectContextSections.key, KEY),
      ),
    )
    .limit(1);
  if (!row) return [];
  return contentClustersSchema.parse(JSON.parse(row.content));
}
export async function writeContentClusters(
  projectId: string,
  clusters: ContentCluster[],
) {
  const values = {
    content: JSON.stringify(clusters),
    updatedAt: new Date().toISOString(),
    updatedBy: "user" as const,
  };
  await db
    .insert(projectContextSections)
    .values({ projectId, key: KEY, ...values })
    .onConflictDoUpdate({
      target: [projectContextSections.projectId, projectContextSections.key],
      set: values,
    });
}
