import { afterEach, expect, it, vi } from "vitest";
import { fetchIranPlaywrightResults } from "./iran-playwright-client";

afterEach(() => vi.unstubAllGlobals());
const input = {
  keyword: "سئو",
  languageCode: "fa",
  device: "desktop" as const,
  depth: 10,
};
it.each([
  {},
  { search_metadata: { status: "Error" }, organic_results: [] },
  { search_metadata: { status: "Success" } },
])(
  "rejects incomplete or unsuccessful provider responses: %j",
  async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(
      fetchIranPlaywrightResults(
        "https://service.test/search",
        "secret",
        input,
      ),
    ).rejects.toThrow();
  },
);
it("accepts explicitly completed empty results", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          search_metadata: { status: "Success" },
          organic_results: [],
        }),
      ),
  );
  expect(
    (
      await fetchIranPlaywrightResults(
        "https://service.test/search",
        "secret",
        input,
      )
    ).organic_results,
  ).toEqual([]);
});
