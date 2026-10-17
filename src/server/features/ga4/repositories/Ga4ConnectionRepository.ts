import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ga4Connections, projects } from "@/db/schema";
import { ga4StreamsMatchProjectDomain } from "@/server/features/ga4/ga4ProjectProperty";
import { createGa4AdminClient } from "@/server/lib/ga4Client";

export type Ga4Connection = typeof ga4Connections.$inferSelect;

async function getByProjectId(
  projectId: string,
): Promise<Ga4Connection | null> {
  const rows = await db
    .select({
      connection: ga4Connections,
      organizationId: projects.organizationId,
      domain: projects.domain,
    })
    .from(ga4Connections)
    .innerJoin(projects, eq(ga4Connections.projectId, projects.id))
    .where(eq(ga4Connections.projectId, projectId))
    .limit(1);
  const row = rows[0];
  if (
    !row ||
    row.connection.organizationId !== row.organizationId ||
    !row.domain
  ) {
    return null;
  }
  try {
    const streams = await createGa4AdminClient({
      userId: row.connection.connectedByUserId,
      ga4AccountId: row.connection.ga4AccountId,
    }).listDataStreams(row.connection.propertyId);
    return ga4StreamsMatchProjectDomain(streams, row.domain)
      ? row.connection
      : null;
  } catch {
    // Fail closed when an expired grant prevents domain verification.
    return null;
  }
}

async function upsert(input: {
  projectId: string;
  organizationId: string;
  propertyId: string;
  propertyDisplayName: string;
  propertyTimeZone: string;
  propertyCurrencyCode: string;
  connectedByUserId: string;
  ga4AccountId: string;
  connectedAccountEmail: string | null;
}): Promise<Ga4Connection> {
  const [row] = await db
    .insert(ga4Connections)
    .values({ id: crypto.randomUUID(), ...input })
    .onConflictDoUpdate({
      target: ga4Connections.projectId,
      set: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        propertyDisplayName: input.propertyDisplayName,
        propertyTimeZone: input.propertyTimeZone,
        propertyCurrencyCode: input.propertyCurrencyCode,
        connectedByUserId: input.connectedByUserId,
        ga4AccountId: input.ga4AccountId,
        connectedAccountEmail: sql`case
          when ${ga4Connections.connectedByUserId} = ${input.connectedByUserId}
            and ${ga4Connections.ga4AccountId} = ${input.ga4AccountId}
          then coalesce(${input.connectedAccountEmail}, ${ga4Connections.connectedAccountEmail})
          else ${input.connectedAccountEmail}
        end`,
        updatedAt: sql`(current_timestamp)`,
      },
    })
    .returning();
  if (!row) throw new Error("Failed to upsert ga4_connection");
  return row;
}

async function deleteByProjectId(projectId: string): Promise<void> {
  await db
    .delete(ga4Connections)
    .where(eq(ga4Connections.projectId, projectId));
}

export const Ga4ConnectionRepository = {
  getByProjectId,
  upsert,
  deleteByProjectId,
};
