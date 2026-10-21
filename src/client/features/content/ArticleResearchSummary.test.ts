import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { ArticleResearchSummary } from "./ArticleResearchSummary";

it("renders a project article's observed search trend on the server", () => {
  const evidence = {
    wordpressChecked: false,
    pages: [],
    existingPage: null,
    searchConsole: {
      status: "connected",
      rows: [],
      trendRows: [
        {
          keys: ["2026-10-01"],
          clicks: 2,
          impressions: 10,
          ctr: 0.2,
          position: 5,
        },
        {
          keys: ["2026-10-02"],
          clicks: 3,
          impressions: 15,
          ctr: 0.2,
          position: 4,
        },
      ],
    },
    analytics: { status: "not_connected" },
    rankTracking: { status: "not_tracked" },
  } as Parameters<typeof ArticleResearchSummary>[0]["evidence"];

  expect(
    renderToString(createElement(ArticleResearchSummary, { evidence })),
  ).toContain("روند کلیک");
});

it("explains why an existing page should be reviewed using observed rank data", () => {
  const evidence = {
    wordpressChecked: true,
    pages: [],
    existingPage: { url: "https://site.test/page", title: "صفحه", text: "متن" },
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
  } as Parameters<typeof ArticleResearchSummary>[0]["evidence"];
  const html = renderToString(
    createElement(ArticleResearchSummary, { evidence }),
  );

  expect(html).toContain("پیش‌نویس بهبود همان صفحه");
  expect(html).toContain("علت افت باید بررسی شود");
  expect(html).toContain("انتشار یا بازنویسی صفحهٔ زنده خودکار نیست");
});

it("explains a search opportunity without treating low CTR as proof of weak content", () => {
  const evidence = {
    wordpressChecked: true,
    pages: [
      {
        id: 1,
        kind: "page",
        slug: "page",
        title: { rendered: "صفحه" },
        link: "https://site.test/page",
        status: "publish",
      },
    ],
    existingPage: null,
    searchConsole: {
      status: "connected",
      rows: [
        {
          keys: ["موضوع", "https://site.test/page"],
          impressions: 200,
          clicks: 2,
          ctr: 0.01,
          position: 8,
        },
      ],
      trendRows: [],
    },
    analytics: { status: "not_connected" },
    rankTracking: { status: "not_tracked" },
  } as Parameters<typeof ArticleResearchSummary>[0]["evidence"];
  const html = renderToString(
    createElement(ArticleResearchSummary, { evidence }),
  );

  expect(html).toContain("ابتدا محتوای موجود را بررسی");
  expect(html).toContain("عنوان، تیترها و پاسخ صفحهٔ موجود");
  expect(html).toContain("این عدد به‌تنهایی کیفیت متن را");
});
