import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/server/lib/audit/url-policy", () => ({
  normalizeAndValidateStartUrl: async (url: string) => url,
}));
import { discoverSiteUrls } from "./scrape";
afterEach(() => vi.unstubAllGlobals());
it("follows a robots-declared index, deduplicates pages, and rejects lookalike origins", async () => {
  const bodies: Record<string, string> = {
    "https://example.com/robots.txt": "Sitemap: https://example.com/custom.xml",
    "https://example.com/custom.xml":
      "<sitemapindex><sitemap><loc>https://example.com/posts.xml</loc></sitemap></sitemapindex>",
    "https://example.com/posts.xml":
      "<urlset><url><loc>https://example.com/a</loc></url><url><loc>https://example.com/a</loc></url><url><loc>https://example.com.evil.test/b</loc></url></urlset>",
  };
  const fetcher = vi.fn(
    async (url: string) =>
      new Response(bodies[url] ?? "", { status: bodies[url] ? 200 : 404 }),
  );
  vi.stubGlobal("fetch", fetcher);
  expect((await discoverSiteUrls("https://example.com/", 200)).urls).toEqual([
    "https://example.com/",
    "https://example.com/a",
  ]);
  expect(fetcher.mock.calls.some(([url]) => url.includes("evil.test"))).toBe(
    false,
  );
});
it("bounds cyclic sitemap indexes", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        "<sitemapindex><loc>https://example.com/sitemap.xml</loc></sitemapindex>",
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  await discoverSiteUrls("https://example.com/", 200);
  expect(fetcher.mock.calls.length).toBeLessThanOrEqual(9);
});
