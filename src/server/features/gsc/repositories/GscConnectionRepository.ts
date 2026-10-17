import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { gscConnections, projects } from "@/db/schema";
import { gscSiteMatchesProjectDomain } from "@/server/features/gsc/gscProjectSite";

export type GscConnection = typeof gscConnections.$inferSelect;

async function getByProjectId(
  projectId: string,
): Promise<GscConnection | null> {
  const rows = await db
    .select({
      connection: gscConnections,
      domain: projects.domain,
      organizationId: projects.organizationId,
    })
    .from(gscConnections)
    .innerJoin(projects, eq(gscConnections.projectId, projects.id))
    .where(eq(gscConnections.projectId, projectId))
    .limit(1);
  const row = rows[0];
  // Older connections may have been bound to a different project's property.
  return row &&
    row.connection.organizationId === row.organizationId &&
    gscSiteMatchesProjectDomain(row.connection.siteUrl, row.domain)
    ? row.connection
    : null;
}

async function upsert(input: {
  projectId: string;
  organizationId: string;
  siteUrl: string;
  connectedByUserId: string;
  gscAccountId: string;
  connectedAccountEmail: string | null;
}): Promise<GscConnection> {
  const [row] = await db
    .insert(gscConnections)
    .values({ id: crypto.randomUUID(), ...input })
    .onConflictDoUpdate({
      target: gscConnections.projectId,
      set: {
        siteUrl: input.siteUrl,
        organizationId: input.organizationId,
        connectedByUserId: input.connectedByUserId,
        gscAccountId: input.gscAccountId,
        connectedAccountEmail: sql`case
          when ${gscConnections.connectedByUserId} = ${input.connectedByUserId}
            and ${gscConnections.gscAccountId} = ${input.gscAccountId}
          then coalesce(${input.connectedAccountEmail}, ${gscConnections.connectedAccountEmail})
          else ${input.connectedAccountEmail}
        end`,
        updatedAt: sql`(current_timestamp)`,
      },
    })
    .returning();
  if (!row) {
    throw new Error("Failed to upsert gsc_connection");
  }
  return row;
}

async function deleteByProjectId(projectId: string): Promise<void> {
  await db
    .delete(gscConnections)
    .where(eq(gscConnections.projectId, projectId));
}

export const GscConnectionRepository = {
  getByProjectId,
  upsert,
  deleteByProjectId,
};
