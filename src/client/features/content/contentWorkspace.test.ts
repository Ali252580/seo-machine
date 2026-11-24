import { expect, it } from "vitest";
import { savedDraftEntries, topicDraftKey } from "./contentWorkspaceData";
import { articleDraftKey } from "./useArticleDraft";
it("reopens the same topic draft across equivalent Persian spellings", () => {
  expect(topicDraftKey("آب‌یاری گياه")).toBe(topicDraftKey("آب یاری گیاه"));
  expect(topicDraftKey("تکثیر گیاه")).not.toBe(topicDraftKey("آبیاری گیاه"));
});
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
it("uses an existing heading for untitled drafts without changing saved content", () => {
  const saved = JSON.stringify({
    title: "  ",
    content: "<h1>راهنمای <strong>بام سبز</strong></h1><p>متن</p>",
  });
  const storage = {
    length: 1,
    key: () => "openseo-article-a",
    getItem: () => saved,
  } as unknown as Storage;
  expect(savedDraftEntries(storage, "a", false)).toEqual([
    { title: "راهنمای بام سبز", draft: "legacy" },
  ]);
  expect(storage.getItem("openseo-article-a")).toBe(saved);
});
