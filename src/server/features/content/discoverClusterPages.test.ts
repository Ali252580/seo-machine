import { beforeEach, expect, it, vi } from "vitest";
import type * as SiteCategories from "./siteCategories";
const mocks = vi.hoisted(() => ({
  wp: vi.fn(),
  gsc: vi.fn(),
  discover: vi.fn(),
  read: vi.fn(),
  categories: vi.fn(),
  structure: vi.fn(),
}));
vi.mock("@/server/features/wordpress/WordPressService", () => ({
  listWordPressPages: mocks.wp,
  listWordPressCategories: mocks.categories,
}));
vi.mock("./siteCategories", async (importOriginal) => ({
  ...(await importOriginal<typeof SiteCategories>()),
  discoverSiteCategories: mocks.structure,
}));
vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: { getPerformance: mocks.gsc },
}));
vi.mock("@/server/lib/scrape", () => ({
  discoverSiteUrls: mocks.discover,
  readPages: mocks.read,
}));
import {
  discoverContentPages,
  discoverWritingPages,
} from "./discoverClusterPages";
const project = { id: "p1", domain: "example.com" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({ pages: [] });
  mocks.categories.mockResolvedValue([]);
  mocks.structure.mockResolvedValue([]);
});
it("finds site articles during writing without requiring prior manual discovery", async () => {
  mocks.discover.mockResolvedValue({ urls: [] });
  const article = {
    url: "https://example.com/care",
    title: "نگهداری باغ",
    kind: "article",
  };
  mocks.structure.mockResolvedValue([article]);
  expect(await discoverWritingPages(project)).toEqual({
    pages: [article],
    unavailable: false,
  });
});
it("reports fresh discovery failure so writing can use existing evidence", async () => {
  mocks.discover.mockRejectedValue(new Error("unavailable"));
  expect(await discoverWritingPages(project)).toEqual({
    pages: [],
    unavailable: true,
  });
});
it("does not mistake an unreachable fallback homepage for an empty site", async () => {
  mocks.discover.mockResolvedValue({
    urls: ["https://example.com/"],
    blocked: false,
  });
  expect((await discoverWritingPages(project)).unavailable).toBe(true);
  mocks.read.mockResolvedValue({
    pages: [{ url: "https://example.com/", title: "Garden studio" }],
  });
  expect((await discoverWritingPages(project)).unavailable).toBe(false);
});
it("discovers public pages without calling either integration and excludes external URLs", async () => {
  mocks.discover.mockResolvedValue({
    urls: [
      "https://example.com/garden",
      "https://example.com/garden",
      "https://other.com/page",
    ],
  });
  mocks.read.mockResolvedValue({
    pages: [{ url: "https://example.com/garden", title: "Garden design" }],
  });
  expect(await discoverContentPages(project, "sitemap", "")).toEqual([
    { url: "https://example.com/garden", title: "Garden design" },
  ]);
  expect(mocks.wp).not.toHaveBeenCalled();
  expect(mocks.gsc).not.toHaveBeenCalled();
});
it("finds GSC pages by query and scopes the request to the project", async () => {
  mocks.gsc.mockResolvedValue({
    rows: [
      { keys: ["https://example.com/123", "garden design"] },
      { keys: ["https://other.com/123", "garden"] },
    ],
  });
  expect(await discoverContentPages(project, "gsc", "garden")).toEqual([
    { url: "https://example.com/123", title: "123" },
  ]);
  expect(mocks.gsc).toHaveBeenCalledWith(
    expect.objectContaining({ projectId: "p1", dimensions: ["page", "query"] }),
  );
  expect(mocks.wp).not.toHaveBeenCalled();
  expect(mocks.discover).not.toHaveBeenCalled();
});
it("only exposes published same-site WordPress entries", async () => {
  mocks.wp.mockResolvedValue(
    ["publish", "draft"].map((status) => ({
      status,
      link: `https://example.com/${status}`,
      title: { rendered: "<b>Garden</b>" },
      slug: status,
    })),
  );
  expect(await discoverContentPages(project, "wordpress", "garden")).toEqual([
    { url: "https://example.com/publish", title: "Garden" },
  ]);
  expect(mocks.gsc).not.toHaveBeenCalled();
  expect(mocks.discover).not.toHaveBeenCalled();
});

it("includes uncategorized published posts as articles without misclassifying pages", async () => {
  mocks.wp.mockResolvedValue(
    ["page", "post"].map((kind) => ({
      kind,
      status: "publish",
      link: `https://example.com/${kind}`,
      title: { rendered: kind },
      slug: kind,
    })),
  );
  const result = await discoverContentPages(project, "wordpress", "");
  expect(result).toEqual([
    { url: "https://example.com/page", title: "page" },
    {
      url: "https://example.com/post",
      title: "post",
      kind: "article",
      categoryUrls: [],
    },
  ]);
});
