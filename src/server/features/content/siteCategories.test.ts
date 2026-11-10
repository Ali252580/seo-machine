import { expect, it } from "vitest";
import { taxonomyPages, structureLinks } from "./siteCategories";
import {
  suggestContentClusters,
  mergeDiscoveredPages,
} from "@/shared/contentClusters";

it("groups actual category membership even when titles have no shared words", () => {
  const pages = taxonomyPages(
    [
      {
        id: 1,
        name: "بام سبز",
        link: "https://example.com/category/roof/",
        parent: 0,
      },
      {
        id: 2,
        name: "نگهداری",
        link: "https://example.com/category/care/",
        parent: 1,
      },
      { id: 3, name: "External", link: "https://other.test/x", parent: 0 },
    ],
    [
      {
        link: "https://example.com/water",
        title: { rendered: "<b>آبیاری قطره‌ای</b>" },
        categories: [1],
      },
    ],
    "example.com",
  );
  expect(pages).toHaveLength(3);
  expect(pages[0].categoryLevel).toBe("root");
  expect(pages[1].categoryLevel).toBe("child");
  const groups = suggestContentClusters(pages);
  expect(groups[0].pillar.url).toBe("https://example.com/category/roof/");
  expect(groups[0].pages.map((page) => page.url)).toContain(
    "https://example.com/water",
  );
  expect(pages[1].parentUrl).toBe(pages[0].url);
});

it("distinguishes navigation from categories and reads archive article links without sidebar contamination", () => {
  const home = structureLinks(
    '<nav><a href="/services/">Services</a><a href="/category/garden/">Garden</a><a href="https://evil.test/">Outside</a></nav>',
    "https://example.com/",
  );
  expect(home.map((page) => page.kind)).toEqual(["navigation", "category"]);
  const posts = structureLinks(
    '<nav><a href="/contact">Contact</a></nav><article><h2><a href="/watering/">Watering</a></h2></article><aside><a href="/ad/">Ad</a></aside>',
    "https://example.com/category/garden/",
    true,
  );
  expect(posts).toEqual([
    {
      url: "https://example.com/watering/",
      title: "Watering",
      categoryUrls: ["https://example.com/category/garden/"],
    },
  ]);
});

it("keeps category evidence when another source supplies only a title", () => {
  const pages = mergeDiscoveredPages([
    { url: "https://example.com/a", title: "A", kind: "category" },
    { url: "https://example.com/a", title: "Updated" },
  ]);
  expect(pages[0].kind).toBe("category");
  expect(taxonomyPages({ error: "blocked" }, [], "example.com")).toEqual([]);
});
