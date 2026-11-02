import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ArticleTextEditor } from "./ArticleTextEditor";

it("offers visual editing and an accessible HTML alternative", () => {
  const html = renderToStaticMarkup(
    createElement(ArticleTextEditor, { value: "<p>متن</p>", onChange() {} }),
  );
  expect(html).toContain('contentEditable="true"');
  expect(html).toContain('aria-multiline="true"');
  expect(html).toContain("ویرایش HTML");
});

it("preserves unsupported content as escaped source rather than executing it", () => {
  const html = renderToStaticMarkup(
    createElement(ArticleTextEditor, {
      value: "<img src=x onerror=alert(1)>",
      onChange() {},
    }),
  );
  expect(html).toContain("&lt;img");
  expect(html).not.toContain("<img");
  expect(html).not.toContain('contentEditable="true"');
});
