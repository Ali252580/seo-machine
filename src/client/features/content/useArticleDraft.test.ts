import { expect, it } from "vitest";
import { articleDraftKey } from "./useArticleDraft";

it("isolates blog drafts from other projects and the existing page editor", () => {
  expect(
    new Set([
      articleDraftKey("first", undefined, true),
      articleDraftKey("second", undefined, true),
      articleDraftKey("first"),
      articleDraftKey("first", "https://example.com/page"),
    ]).size,
  ).toBe(4);
  expect(articleDraftKey("first")).toBe("openseo-article-first");
  expect(articleDraftKey("first", undefined, true)).toBe("openseo-blog-first");
});
