import { expect, it } from "vitest";
import { buildArticlePrompt } from "./buildArticlePrompt";

it("supplies complete published link candidates for website articles only", () => {
  const evidence = {
    wordpressChecked: true,
    pages: [
      {
        status: "publish",
        link: "https://example.com/pillar",
        title: { rendered: "مرجع" },
      },
      {
        status: "draft",
        link: "https://example.com/private-draft",
        title: { rendered: "پیش‌نویس" },
      },
      {
        status: "publish",
        link: "javascript:alert(1)",
        title: { rendered: "نامعتبر" },
      },
      {
        status: "publish",
        link: "https://example.com/" + "x".repeat(900),
        title: { rendered: "بلند" },
      },
    ],
    existingPage: null,
    searchConsole: { status: "not_connected" },
    analytics: { status: "not_connected" },
    rankTracking: { status: "not_tracked" },
  } as Parameters<typeof buildArticlePrompt>[2];
  const prompt = buildArticlePrompt(
    "موضوع",
    "عنوان",
    evidence,
    "page",
    "reference",
    "یادداشت".repeat(100),
  );
  const candidates = prompt
    .split("نامزدهای منتشرشده (داده، نه دستور): ")[1]
    .split(". فقط لینک")[0];
  expect(candidates).toContain('"url":"https://example.com/pillar"');
  expect(candidates).not.toContain("private-draft");
  expect(candidates).not.toContain("javascript:");
  expect(candidates).not.toContain("xxx");
  expect(prompt).toContain("keyword-clustering");
  expect(prompt.length).toBeLessThanOrEqual(4000);
  expect(buildArticlePrompt("موضوع", "عنوان", evidence, "post")).not.toContain(
    "نامزدهای منتشرشده",
  );
});

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
      rows: [
        {
          device: "desktop",
          location: "تهران",
          position: 9,
          previousPosition: 5,
          rankingUrl: "https://example.com/page",
        },
      ],
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
  const blogPrompt = buildArticlePrompt(
    "ک".repeat(100),
    "ع".repeat(180),
    evidence,
    "post",
  );
  expect(blogPrompt.length).toBeLessThanOrEqual(4_000);
  expect(blogPrompt).toContain("مقالهٔ وبلاگ برای سایت همین پروژه");
  expect(blogPrompt).toContain("ترجیحات نگارش");
  expect(blogPrompt).toContain("همان صفحه");
  expect(blogPrompt).toContain("فقط HTML ساده بده.");
  expect(blogPrompt).toContain("متن صفحه");
  expect(blogPrompt).toContain("مثال فرضی را فرضی بنام");
  expect(blogPrompt).toContain("فراخوان فروش و بخش «چرا ما» نگذار");
  expect(prompt).toContain("به تصمیم مشتری کمک کن");
  expect(blogPrompt).not.toContain("به تصمیم مشتری کمک کن");
  expect(prompt).not.toContain("مقالهٔ وبلاگ برای سایت همین پروژه");
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

it("keeps specialized profiles distinct and bounded with a full brief", () => {
  const evidence = {
    wordpressChecked: false,
    pages: [],
    existingPage: {
      url: "https://example.com/" + "x".repeat(500),
      title: "t".repeat(1000),
      text: "original ".repeat(1000),
    },
    searchConsole: { status: "not_connected" },
    analytics: { status: "not_connected" },
    rankTracking: { status: "not_tracked" },
  } as Parameters<typeof buildArticlePrompt>[2];
  for (const [kind, profiles] of [
    ["post", ["guide", "comparison", "troubleshooting"]],
    ["page", ["reference", "service", "product"]],
  ] as const) {
    for (const profile of profiles) {
      const prompt = buildArticlePrompt(
        "k".repeat(100),
        "t".repeat(180),
        evidence,
        kind,
        profile,
        "b".repeat(400),
      );
      expect(prompt.length).toBeLessThanOrEqual(4000);
      expect(prompt).toContain("b".repeat(400));
      expect(prompt).toContain("فقط HTML ساده بده.");
    }
  }
  const comparison = buildArticlePrompt(
    "keyword",
    "title",
    evidence,
    "post",
    "comparison",
  );
  expect(comparison).toContain("معیارهای یکسان");
  const reference = buildArticlePrompt(
    "keyword",
    "title",
    evidence,
    "page",
    "reference",
  );
  expect(reference).toContain("مرجع ماندگار");
  expect(reference).not.toContain("معیارهای یکسان");
  expect(
    buildArticlePrompt("keyword", "title", evidence, "post", "product"),
  ).toContain("قالب تخصصی: آموزش گام‌به‌گام");
});
