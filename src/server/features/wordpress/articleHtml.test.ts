import { expect, it } from "vitest";
import { validateArticleHtml } from "./articleHtml";

it("accepts simple article markup and rejects active HTML", () => {
  expect(() =>
    validateArticleHtml("<h2>روف گاردن</h2><p>خدمات تهران</p>"),
  ).not.toThrow();
  expect(() => validateArticleHtml("<img src=x onerror=alert(1)>")).toThrow();
  expect(() => validateArticleHtml('<p onclick="alert(1)">متن</p>')).toThrow();
  expect(() => validateArticleHtml("<script>alert(1)</script>")).toThrow();
});
