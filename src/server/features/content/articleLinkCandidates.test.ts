import { expect, it, vi } from "vitest";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/server/lib/scrape", () => ({ readPages: read }));
import {
  selectArticleLinks,
  verifyArticleLinks,
} from "./articleLinkCandidates";
it("scores related articles using page-level GSC opportunities without admitting unrelated pages", () => {
  const result = selectArticleLinks({
    domain: "example.com",
    topic: "آبیاری باغ",
    mapped: [],
    pages: [
      { url: "https://example.com/top", title: "آبیاری باغ", kind: "article" },
      {
        url: "https://example.com/opportunity",
        title: "آبیاری باغ",
        kind: "article",
      },
      { url: "https://example.com/unknown", title: "آبیاری باغ" },
      { url: "https://example.com/car", title: "خودرو" },
    ],
    rankRows: [
      { keys: ["https://example.com/top/"], position: 2, impressions: 100 },
      {
        keys: ["https://example.com/opportunity"],
        position: 12,
        impressions: 50,
      },
      { keys: ["https://example.com/car"], position: 8, impressions: 1000 },
    ],
  });
  expect(result.map((page) => page.url)).toEqual([
    "https://example.com/opportunity",
    "https://example.com/top",
    "https://example.com/unknown",
  ]);
  expect(result[0]).toMatchObject({
    linkScore: 60,
    position: 12,
    impressions: 50,
  });
  expect(result[2].position).toBeUndefined();
});
it("prioritizes mapped targets then relevant discovered pages and rejects self and external links", () => {
  const result = selectArticleLinks({
    domain: "example.com",
    topic: "طراحی باغ",
    target: "https://example.com/self/",
    mapped: [{ url: "https://example.com/hub", title: "مرجع" }],
    pages: [
      { url: "https://example.com/garden", title: "طراحی فضای باغ" },
      { url: "https://example.com/self#part", title: "طراحی باغ" },
      { url: "https://evil.test/page", title: "طراحی باغ" },
      { url: "https://example.com/car", title: "تعمیر موتور" },
    ],
  });
  expect(result.map((page) => page.url)).toEqual([
    "https://example.com/hub",
    "https://example.com/garden",
  ]);
});
it("excludes pages which cannot currently be read", async () => {
  read.mockImplementation(async ([url]: string[]) => ({
    pages: url.endsWith("ok") ? [{ url, title: "Live", text: "Evidence" }] : [],
  }));
  expect(
    await verifyArticleLinks([
      { url: "https://example.com/ok", title: "Old" },
      { url: "https://example.com/gone", title: "Gone" },
    ]),
  ).toEqual([
    { url: "https://example.com/ok", title: "Live", excerpt: "Evidence" },
  ]);
});
it("preserves ranking evidence after checking the destination", async () => {
  read.mockResolvedValue({
    pages: [
      { url: "https://example.com/article", title: "Article", text: "Body" },
    ],
  });
  expect(
    await verifyArticleLinks([
      {
        url: "https://example.com/article",
        title: "Article",
        linkScore: 60,
        position: 12,
        impressions: 50,
      },
    ]),
  ).toEqual([
    {
      url: "https://example.com/article",
      title: "Article",
      linkScore: 60,
      position: 12,
      impressions: 50,
      excerpt: "Body",
    },
  ]);
});

it("keeps the pillar first even when a sibling title is a closer match", () => {
  const mapped = [
    { url: "https://example.com/hub", title: "مرجع" },
    { url: "https://example.com/a", title: "آبیاری باغ" },
  ];
  expect(
    selectArticleLinks({
      domain: "example.com",
      topic: "آبیاری باغ",
      mapped,
      pages: [],
    }),
  ).toEqual(mapped);
});
it("includes a related site article in the first three even when the map is full", () => {
  const mapped = Array.from({ length: 8 }, (_, i) => ({
    url: `https://example.com/map-${i}`,
    title: "باغ",
  }));
  const article = {
    url: "https://example.com/article",
    title: "روش آبیاری باغ",
  };
  const result = selectArticleLinks({
    domain: "example.com",
    topic: "آبیاری باغ",
    mapped,
    pages: [article, { url: "https://example.com/car", title: "خودرو" }],
  });
  expect(result.slice(0, 3)).toEqual([mapped[0], mapped[1], article]);
  expect(result).toHaveLength(6);
  expect(result.map((page) => page.url)).not.toContain(
    "https://example.com/car",
  );
});

it("selects articles by topic words rather than shared generic title wording", () => {
  expect(
    selectArticleLinks({
      domain: "example.com",
      topic: "راهنمای نگهداری روف گاردن",
      mapped: [],
      pages: [
        { url: "https://example.com/car", title: "راهنمای خرید خودرو" },
        { url: "https://example.com/roof", title: "آبیاری روف گاردن" },
      ],
    }),
  ).toEqual([{ url: "https://example.com/roof", title: "آبیاری روف گاردن" }]);
});
