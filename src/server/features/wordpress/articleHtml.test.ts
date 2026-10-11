import { expect, it } from "vitest";
import {
  validateArticleDraftStructure,
  validateArticleHtml,
} from "./articleHtml";

it("accepts simple article markup and rejects active HTML", () => {
  expect(() =>
    validateArticleHtml("<h2>روف گاردن</h2><p>خدمات تهران</p>"),
  ).not.toThrow();
  expect(() => validateArticleHtml("<img src=x onerror=alert(1)>")).toThrow();
  expect(() => validateArticleHtml('<p onclick="alert(1)">متن</p>')).toThrow();
  expect(() => validateArticleHtml("<script>alert(1)</script>")).toThrow();
});

it("blocks thin drafts before they reach WordPress", () => {
  expect(() =>
    validateArticleDraftStructure("<h2>خدمات</h2><p>متن کوتاه</p>"),
  ).toThrow();
  const body = Array.from({ length: 180 }, (_, index) => `نکته${index}`).join(
    " ",
  );
  expect(() =>
    validateArticleDraftStructure(
      `<h2>بررسی مشکل</h2><p>${body}</p><h2>روش انجام کار</h2>`,
    ),
  ).not.toThrow();
  expect(() =>
    validateArticleDraftStructure(
      `<h2>تکراری</h2><p>${body}</p><h2>تکراری</h2>`,
    ),
  ).toThrow();
});
