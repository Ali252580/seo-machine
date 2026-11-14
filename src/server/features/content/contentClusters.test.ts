import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type * as ClusterStore from "./contentClusters";
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
let client: Client;
let store: typeof ClusterStore;
beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  vi.doMock("@/db", () => ({ db: drizzle(client) }));
  await client.execute(
    `CREATE TABLE project_context_sections (project_id TEXT NOT NULL, key TEXT NOT NULL, title TEXT, content TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL, PRIMARY KEY(project_id, key))`,
  );
  store = await import("./contentClusters");
});
afterAll(() => client.close());
it("retains article identity and category membership after reopening", async () => {
  const page = {
    url: "https://example.com/article",
    title: "نگهداری روف گاردن",
    kind: "article" as const,
    categoryUrls: ["https://example.com/category/roof"],
  };
  await store.rememberDiscoveredPages("metadata", [page]);
  expect(await store.readDiscoveredPages("metadata")).toEqual([page]);
  await store.rememberDiscoveredPages("metadata", [
    { url: page.url, title: "عنوان تازه" },
  ]);
  expect(await store.readDiscoveredPages("metadata")).toEqual([
    { ...page, title: "عنوان تازه" },
  ]);
});
it("remembers discovered pages across sources without leaking between projects", async () => {
  await store.rememberDiscoveredPages("links-a", [
    { url: "https://example.com/a", title: "A" },
  ]);
  await store.rememberDiscoveredPages("links-a", [
    { url: "https://example.com/b", title: "B" },
    { url: "https://example.com/a", title: "Updated" },
  ]);
  expect(await store.readDiscoveredPages("links-a")).toHaveLength(2);
  expect(await store.readDiscoveredPages("links-a")).toContainEqual({
    url: "https://example.com/a",
    title: "Updated",
  });
  expect(await store.readDiscoveredPages("links-b")).toEqual([]);
});
it("persists maps independently per project and supports replacing and clearing a map", async () => {
  const clusters = [
    {
      pillar: { url: "https://example.com/hub", title: "مرجع" },
      pages: [{ url: "https://example.com/spoke", title: "زیرموضوع" }],
    },
  ];
  expect(await store.readContentClusters("a")).toEqual([]);
  await store.writeContentClusters("a", clusters);
  expect(await store.readContentClusters("a")).toEqual(clusters);
  expect(await store.readContentClusters("b")).toEqual([]);
  await store.writeContentClusters("a", []);
  expect(await store.readContentClusters("a")).toEqual([]);
});
