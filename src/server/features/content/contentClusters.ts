import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { projectContextSections } from "@/db/schema";
import {
  contentClustersSchema,
  type ContentCluster,
  type DiscoveredClusterPage,
  discoveredClusterPageSchema,
  mergeDiscoveredPages,
} from "@/shared/contentClusters";
const KEY = "system:content-clusters";
const PAGE_KEY = "system:discovered-page:";

export async function rememberDiscoveredPages(
  projectId: string,
  pages: DiscoveredClusterPage[],
) {
  const known = new Map(
    (await readDiscoveredPages(projectId)).map((page) => [page.url, page]),
  );
  const valid = [
    ...new Map(
      pages.flatMap((page) => {
        const parsed = discoveredClusterPageSchema.safeParse(page);
        return parsed.success ? [[page.url, parsed.data] as const] : [];
      }),
    ).values(),
  ];
  // Store independently so concurrent discovery requests cannot overwrite another source's pages.
  for (const page of valid) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(page.url),
    );
    const key =
      PAGE_KEY +
      [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    const values = {
      content: JSON.stringify(
        mergeDiscoveredPages([
          ...(known.has(page.url) ? [known.get(page.url)!] : []),
          page,
        ])[0],
      ),
      updatedAt: new Date().toISOString(),
      updatedBy: "sam" as const,
    };
    await db
      .insert(projectContextSections)
      .values({ projectId, key, ...values })
      .onConflictDoUpdate({
        target: [projectContextSections.projectId, projectContextSections.key],
        set: values,
      });
  }
}

export async function readDiscoveredPages(projectId: string) {
  const rows = await db
    .select({ content: projectContextSections.content })
    .from(projectContextSections)
    .where(
      and(
        eq(projectContextSections.projectId, projectId),
        like(projectContextSections.key, `${PAGE_KEY}%`),
      ),
    );
  return rows.flatMap((row) => {
    try {
      const page = discoveredClusterPageSchema.safeParse(
        JSON.parse(row.content),
      );
      return page.success ? [page.data] : [];
    } catch {
      return [];
    }
  });
}
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
