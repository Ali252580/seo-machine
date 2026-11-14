import { expect, it, vi } from "vitest";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/server/lib/scrape", () => ({ readPages: read }));
import {
  selectArticleLinks,
  verifyArticleLinks,
} from "./articleLinkCandidates";
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
