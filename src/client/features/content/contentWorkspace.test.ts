import { expect, it } from "vitest";
import { savedDraftEntries, articleIdeas } from "./contentWorkspaceData";
import { articleDraftKey } from "./useArticleDraft";
it("lists old and new drafts without mixing projects, modes or empty entries", () => {
  const values = new Map([
    ["openseo-article-a", JSON.stringify({ title: "Old", content: "keep" })],
    [
      "openseo-article-a:draft:123",
      JSON.stringify({ title: "New", content: "new" }),
    ],
    [
      "openseo-article-ab",
      JSON.stringify({ title: "Other", content: "other" }),
    ],
    ["openseo-blog-a", JSON.stringify({ title: "Blog", content: "blog" })],
    [
      "openseo-article-a:https://example.com/empty",
      JSON.stringify({ title: "Empty", content: "" }),
    ],
  ]);
  const storage = {
    length: values.size,
    key: (i: number) => [...values.keys()][i],
    getItem: (key: string) => values.get(key) ?? null,
  } as Storage;
  expect(savedDraftEntries(storage, "a", false)).toEqual([
    { title: "Old", draft: "legacy" },
    { title: "New", draft: "123" },
  ]);
  expect(savedDraftEntries(storage, "a", true)).toEqual([
    { title: "Blog", draft: "legacy" },
  ]);
  expect(articleDraftKey("a", undefined, false, "new")).not.toBe(
    articleDraftKey("a"),
  );
});
it("suggests different angles for reference pages and educational articles", () => {
  const pages = [{ title: "بام سبز" }];
  expect(articleIdeas(pages, false)).toEqual(["راهنمای انتخاب بام سبز"]);
  expect(articleIdeas(pages, true)).toEqual(["پرسش‌های رایج دربارهٔ بام سبز"]);
});
