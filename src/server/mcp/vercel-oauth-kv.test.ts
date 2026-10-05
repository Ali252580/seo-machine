import { beforeEach, expect, it, vi } from "vitest";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@/db/pg/client", () => ({ pgDb: { execute } }));

import { vercelOAuthKv } from "./vercel-oauth-kv";

beforeEach(() => execute.mockReset());

it("decodes stored OAuth grants and paginates keys without losing a record", async () => {
  execute.mockResolvedValueOnce([{ value: '{"userId":"user-1"}' }]);
  expect(await vercelOAuthKv.get("grant:user-1:one", { type: "json" })).toEqual(
    {
      userId: "user-1",
    },
  );

  execute.mockResolvedValueOnce([{ key: "grant:one" }, { key: "grant:two" }]);
  expect(await vercelOAuthKv.list({ prefix: "grant:", limit: 1 })).toEqual({
    keys: [{ name: "grant:one" }],
    cursor: "grant:one",
    list_complete: false,
    cacheStatus: null,
  });

  execute.mockResolvedValueOnce([{ key: "grant:two" }]);
  expect(
    await vercelOAuthKv.list({
      prefix: "grant:",
      cursor: "grant:one",
      limit: 1,
    }),
  ).toEqual({
    keys: [{ name: "grant:two" }],
    list_complete: true,
    cacheStatus: null,
  });
});
