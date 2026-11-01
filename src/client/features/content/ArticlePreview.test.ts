import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ArticlePreview } from "./ArticlePreview";

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
