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
  } as Parameters<typeof ArticleResearchSummary>[0]["evidence"];

  expect(
    renderToString(createElement(ArticleResearchSummary, { evidence })),
  ).toContain("روند کلیک");
});
