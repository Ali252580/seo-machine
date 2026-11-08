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
