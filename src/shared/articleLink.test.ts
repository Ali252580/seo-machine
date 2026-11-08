import { expect, it } from "vitest";
import { isArticleLinkTag } from "./articleLink";
import {
  normalizeEditorHtml,
  canEditArticleVisually,
} from "@/client/features/content/articleEditorHtml";
import { validateArticleHtml } from "@/server/features/wordpress/articleHtml";

it("preserves safe article links through editing and CMS validation", () => {
  const html =
    '<p>مطالعهٔ <a href="https://example.com/pillar">مرجع موضوع</a></p>';
  expect(canEditArticleVisually(html)).toBe(true);
  expect(normalizeEditorHtml(html)).toBe(html);
  expect(() => validateArticleHtml(html)).not.toThrow();
});
it("rejects active URLs, credentials and additional attributes", () => {
  for (const tag of [
    '<a href="javascript:alert(1)">',
    '<a href="https://u:p@example.com">',
    '<a href="https://example.com" onclick="alert(1)">',
    '<a href="data:text/html,test">',
  ]) {
    expect(isArticleLinkTag(tag)).toBe(false);
    expect(() => validateArticleHtml(tag + "text</a>")).toThrow();
  }
});
