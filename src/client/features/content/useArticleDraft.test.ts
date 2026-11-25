import { afterEach, expect, it, vi } from "vitest";
import {
  articleDraftKey,
  loadArticleDraft,
  persistArticleDraft,
} from "./useArticleDraft";

afterEach(() => vi.unstubAllGlobals());

it("keeps the responding model with its own draft and leaves older drafts unattributed", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const draft = { title: "Sample", keyword: "", slug: "", content: "Text" };
  const generation = { provider: "apinex" as const, model: "reported-model" };
  persistArticleDraft("old", draft);
  persistArticleDraft("new", { ...draft, generation });
  expect(loadArticleDraft("new").draft.generation).toEqual(generation);
  expect(loadArticleDraft("old").draft.generation).toBeUndefined();
  expect(loadArticleDraft("old").draft.content).toBe(draft.content);
});

it("uses the researched keyword for a new draft without overwriting a saved draft", () => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "saved"
        ? JSON.stringify({
            keyword: "saved",
            title: "old",
            slug: "",
            content: "text",
          })
        : null,
  });
  expect(
    loadArticleDraft("new", undefined, "عنوان جدید", true, "کلمه هدف").draft
      .keyword,
  ).toBe("کلمه هدف");
  expect(
    loadArticleDraft("saved", undefined, "عنوان جدید", true, "کلمه هدف").draft
      .keyword,
  ).toBe("saved");
});

it("loads an empty draft for another project without carrying content or images", () => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "first"
        ? JSON.stringify({
            keyword: "a",
            title: "b",
            slug: "c",
            content: "private draft",
            image: null,
          })
        : null,
  });
  expect(loadArticleDraft("first").draft.content).toBe("private draft");
  expect(loadArticleDraft("second").draft).toMatchObject({
    keyword: "",
    title: "",
    content: "",
    image: null,
  });
});

it("survives denied storage and reports that the draft was not saved", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("Denied");
    },
    setItem: () => {
      throw new Error("Quota exceeded");
    },
  });
  const loaded = loadArticleDraft("first");
  expect(loaded.storageError).toBe(true);
  expect(loaded.draft.content).toBe("");
  expect(persistArticleDraft("first", loaded.draft)).toBe(false);
});

it("does not discard valid saved content because a target path contains a literal percent", () => {
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({
        keyword: "a",
        title: "b",
        slug: "old",
        content: "keep me",
      }),
  });
  const loaded = loadArticleDraft("first", "https://example.com/100%off");
  expect(loaded.draft.slug).toBe("100%off");
  expect(loaded.draft.content).toBe("keep me");
});

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
