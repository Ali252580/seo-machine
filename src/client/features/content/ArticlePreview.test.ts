import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ArticlePreview } from "./ArticlePreview";

it("does not present the previous draft as the result while generating", () => {
  const html = renderToStaticMarkup(
    createElement(ArticlePreview, {
      content: "<p>previous draft</p>",
      keyword: "",
      title: "",
      articleText: "previous draft",
      wordCount: 2,
      generating: true,
    }),
  );
  expect(html).toContain("نگارش مقالهٔ جدید در حال انجام است");
  expect(html).not.toContain("<iframe");
  expect(html).not.toContain("previous draft");
});

it("labels preserved content after failed generation", () => {
  const html = renderToStaticMarkup(
    createElement(ArticlePreview, {
      content: "<p>previous draft</p>",
      keyword: "",
      title: "",
      articleText: "previous draft",
      wordCount: 2,
      generationFailed: true,
    }),
  );
  expect(html).toContain("متن زیر پیش‌نویس قبلی است");
  expect(html).toContain("previous draft");
});

it("explains an empty draft instead of showing a blank document", () => {
  const html = renderToStaticMarkup(
    createElement(ArticlePreview, {
      content: "",
      keyword: "",
      title: "",
      articleText: "",
      wordCount: 0,
    }),
  );
  expect(html).toContain("پس از نگارش یا واردکردن متن");
  expect(html).not.toContain("<iframe");
});

it("keeps generated markup sandboxed and wraps long text on small screens", () => {
  const html = renderToStaticMarkup(
    createElement(ArticlePreview, {
      content: "<h2>عنوان</h2><p>متن</p>",
      keyword: "",
      title: "",
      articleText: "متن",
      wordCount: 1,
    }),
  );
  expect(html).toContain('sandbox=""');
  expect(html).toContain("overflow-wrap:anywhere");
  expect(html).toContain("width=device-width");
});
