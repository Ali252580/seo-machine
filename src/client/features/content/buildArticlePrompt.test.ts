import { expect, it } from "vitest";
import { buildArticlePrompt } from "./buildArticlePrompt";

it("keeps a researched existing-page prompt within SAM's 4,000-character limit", () => {
  const evidence = {
    wordpressChecked: false,
    pages: [],
    searchConsole: {
      status: "connected",
      rows: Array.from({ length: 5 }, () => ({
        keys: ["کلیدواژه", `https://example.com/${"long".repeat(100)}`],
        impressions: 100,
        clicks: 2,
        position: 8,
      })),
      trendRows: [],
    },
    analytics: { status: "connected", rows: [] },
    rankTracking: {
      status: "connected",
      rows: [{ device: "desktop", location: "تهران", position: 9, previousPosition: 5, rankingUrl: "https://example.com/page" }],
    },
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
  expect(prompt).toContain("رتبه 9");
  expect(prompt).toContain("فقط HTML ساده بده.");
});

it("includes saved keyword rank evidence in the article request", () => {
  const evidence = {
    wordpressChecked: true,
    pages: [],
    existingPage: null,
    searchConsole: { status: "not_connected" },
    analytics: { status: "not_connected" },
    rankTracking: {
      status: "connected",
      rows: [
        {
          device: "desktop",
          location: "تهران",
          position: 9,
          previousPosition: 5,
          rankingUrl: "https://site.test/page",
        },
      ],
    },
  } as Parameters<typeof buildArticlePrompt>[2];

  expect(buildArticlePrompt("کلیدواژه", "عنوان صفحه", evidence)).toContain(
    "رتبه 9",
  );
});
