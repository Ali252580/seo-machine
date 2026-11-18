import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ArticleGenerationStatus } from "./ArticleGenerationStatus";

it("announces the active writing step", () => {
  const html = renderToStaticMarkup(
    createElement(ArticleGenerationStatus, {
      pending: true,
      success: false,
      error: null,
      stage: "نگارش با SAM",
    }),
  );
  expect(html).toContain('aria-current="step"');
  expect(html).toContain("نوشتن مقاله و لینک‌های داخلی");
  expect(html).toContain("✓");
});
it("gives Persian recovery guidance and keeps technical details available", () => {
  const html = renderToStaticMarkup(
    createElement(ArticleGenerationStatus, {
      pending: false,
      success: false,
      error: new Error("INTERNAL_ERROR"),
      stage: "نگارش با SAM",
    }),
  );
  expect(html).toContain("کمی بعد دوباره تلاش کنید");
  expect(html).toContain("متن قبلی شما تغییر نکرده");
  expect(html).toContain("<details");
});
it("links to the preview only after success", () => {
  const html = renderToStaticMarkup(
    createElement(ArticleGenerationStatus, {
      pending: false,
      success: true,
      error: null,
      stage: "نگارش با SAM",
    }),
  );
  expect(html).toContain('href="#article-preview"');
  expect(
    renderToStaticMarkup(
      createElement(ArticleGenerationStatus, {
        pending: false,
        success: false,
        error: null,
        stage: "بررسی شواهد",
      }),
    ),
  ).toBe("");
});
