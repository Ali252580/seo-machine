import { expect, it } from "vitest";
import {
  canEditArticleVisually,
  normalizeEditorHtml,
} from "./articleEditorHtml";

it("preserves Persian text and supported formatting", () => {
  const html =
    "<h2>راهنما</h2><p>متن <strong>مهم</strong> &amp; دقیق</p><ul><li>اول</li></ul>";
  expect(canEditArticleVisually(html)).toBe(true);
  expect(normalizeEditorHtml(html)).toBe(html);
});

it("keeps unsupported source out of the visual editor", () => {
  for (const html of [
    '<p onclick="alert(1)">x</p>',
    "<img src=x>",
    "<script>alert(1)</script>",
    "<!-- comment -->",
  ]) {
    expect(canEditArticleVisually(html)).toBe(false);
  }
});

it("normalizes browser paragraphs and removes active markup", () => {
  expect(
    normalizeEditorHtml(
      "<div>سلام<br></div><b>مهم</b><script>alert(1)</script><img src=x onerror=alert(1)>",
    ),
  ).toBe("<p>سلام<br></p><strong>مهم</strong>");
  expect(normalizeEditorHtml("&lt;script&gt;")).toBe("&lt;script&gt;");
});
