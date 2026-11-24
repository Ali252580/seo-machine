import { expect, it } from "vitest";
import { overlappingTopicPages } from "./topicCoverage";

it("finds related site pages from title or URL, including Persian letter variants", () => {
  const pages = [
    { title: "راهنمای نگهداری روف گاردن", url: "https://example.com/a" },
    { title: "محصول", url: "https://example.com/روف-گاردن" },
    { title: "راهنمای استخر", url: "https://example.com/pool" },
    { title: "ساخت بام سبز", url: "https://example.com/b" },
  ];
  expect(
    overlappingTopicPages("روف گاردن", pages).map((page) => page.url),
  ).toEqual(["https://example.com/a", "https://example.com/روف-گاردن"]);
  expect(overlappingTopicPages("ساخت بام سبز", pages)).toEqual([pages[3]]);
  expect(overlappingTopicPages("طراحی حیاط", [])).toEqual([]);
});

it("distinguishes two questions about the same service and matches reordered Persian words", () => {
  const cost = {
    title: "هزینه طراحی روف گاردن",
    url: "https://example.com/cost",
  };
  expect(overlappingTopicPages("آبیاری روف گاردن", [cost])).toEqual([]);
  expect(overlappingTopicPages("طراحي روف گاردن هزینه", [cost])).toEqual([
    cost,
  ]);
});
