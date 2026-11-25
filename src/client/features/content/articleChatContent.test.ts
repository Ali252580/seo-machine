import { expect, it } from "vitest";
import {
  articleHtml,
  articlePreviewHtml,
  articleRequestSummary,
  requireGeneratedArticle,
} from "./articleChatUtils";
it("rejects empty or conversational responses instead of replacing the draft", () => {
  for (const response of [
    "",
    "موضوع مقاله را بفرستید",
    "برای این درخواست پاسخی دریافت نشد.",
  ]) {
    expect(() => requireGeneratedArticle(response)).toThrow(
      "پیش‌نویس قبلی حفظ شده",
    );
  }
  expect(
    requireGeneratedArticle("```html\n<h2>موضوع</h2><p>متن مقاله</p>\n```"),
  ).toBe("<h2>موضوع</h2><p>متن مقاله</p>");
});

it("rejects a truncated response even if it contains valid article markup", () => {
  expect(() =>
    requireGeneratedArticle("<h2>موضوع</h2><p>بخش اول</p>", "length"),
  ).toThrow("سقف پاسخ");
});

it("summarizes an article request without exposing its long evidence URL", () => {
  expect(
    articleRequestSummary(
      "برای کلمهٔ «تعمیر کولر آبی» و عنوان «تعمیر کولر» یک متن بنویس. شواهد واقعی پیش از نگارش: https://example.com/a",
    ),
  ).toEqual({
    keyword: "تعمیر کولر آبی",
    title: "تعمیر کولر",
  });
  expect(articleRequestSummary("سلام")).toBeNull();
});

it("previews passive article HTML and rejects active markup", () => {
  expect(articleHtml("```html\n<h2>عنوان</h2><p>متن</p>\n```")).toBe(
    "<h2>عنوان</h2><p>متن</p>",
  );
  expect(articleHtml('<h2>عنوان</h2><p onclick="alert(1)">متن</p>')).toBeNull();
  expect(
    articlePreviewHtml('<h2>عنوان</h2><p onclick="alert(1)">متن</p>'),
  ).not.toBeNull();
});
