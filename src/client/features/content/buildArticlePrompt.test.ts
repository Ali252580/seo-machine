import { expect, it } from "vitest";
import { buildArticlePrompt } from "./buildArticlePrompt";

it("keeps a researched existing-page prompt within SAM's 4,000-character limit", () => {
  const evidence = {
    wordpressChecked: false,
    pages: [],
    searchConsole: { status: "connected", rows: [], trendRows: [] },
    analytics: { status: "connected", rows: [] },
    existingPage: {
      url: `https://example.com/${"a".repeat(500)}`,
      title: "نمونه",
      text: "متن صفحه ".repeat(1_000),
    },
  } as unknown as Parameters<typeof buildArticlePrompt>[2];
  const prompt = buildArticlePrompt("کلیدواژه", "عنوان", evidence);

  expect(prompt.length).toBeLessThanOrEqual(4_000);
  expect(prompt).toContain("seo-audit");
  expect(prompt).toContain("همان صفحه");
  expect(prompt).toContain("فقط HTML ساده بده.");
});
