import { expect, it } from "vitest";
import { parseClusterUpload } from "./importClusterPages";

it("imports sitemap page locations, not image locations, and deduplicates fragments", () => {
  const result = parseClusterUpload(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://example.com/roof-garden?a=1&amp;b=2</loc><image:image><image:loc>https://example.com/image.jpg</image:loc></image:image></url><url><loc>https://example.com/roof-garden?a=1&amp;b=2#top</loc></url><url><loc>https://other.test/</loc></url></urlset>`,
    "xml",
    "example.com",
  );
  expect(result.pages).toEqual([
    { url: "https://example.com/roof-garden?a=1&b=2", title: "roof garden" },
  ]);
  expect(result.skipped).toBe(2);
});
it("preserves quoted Persian CSV titles and filters non-HTML, redirected and non-indexable rows", () => {
  const result = parseClusterUpload(
    '\uFEFFAddress,Title 1,Status Code,Content Type,Indexability\r\nhttps://example.com/a,"روف گاردن, راهنما",200,text/html,Indexable\r\nhttps://example.com/b,redirect,301,text/html,Indexable\r\nhttps://example.com/c,image,200,image/png,Indexable\r\nhttps://example.com/d,hidden,200,text/html,Non-Indexable',
    "csv",
    "example.com",
  );
  expect(result.pages).toEqual([
    { url: "https://example.com/a", title: "روف گاردن, راهنما" },
  ]);
  expect(result.skipped).toBe(3);
});
it.each([
  [
    "<sitemapindex><sitemap><loc>https://example.com/map.xml</loc></sitemap></sitemapindex>",
    "xml",
  ],
  ['<!DOCTYPE a [<!ENTITY x "boom">]><urlset/>', "xml"],
  ["<urlset><url>", "xml"],
  ["wrong,title\nhttps://example.com/a,test", "csv"],
  ["URL\nhttps://user:password@example.com/a", "csv"],
] as const)(
  "rejects unsupported or unsafe input without storing partial results",
  (text, format) => {
    expect(() => parseClusterUpload(text, format, "example.com")).toThrow();
  },
);
it("rejects oversize files and batches instead of silently truncating", () => {
  expect(() =>
    parseClusterUpload("a".repeat(2_000_001), "csv", "example.com"),
  ).toThrow();
  expect(() =>
    parseClusterUpload(
      "URL\n" +
        Array.from({ length: 201 }, (_, i) => `https://example.com/${i}`).join(
          "\n",
        ),
      "csv",
      "example.com",
    ),
  ).toThrow();
});
