import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ArticleClusterSummary } from "./ArticleClusterSummary";

it("explains the workflow before research and shows every discovered page after research", () => {
  expect(renderToStaticMarkup(createElement(ArticleClusterSummary))).toContain(
    "پس از",
  );
  const evidence = {
    wordpressChecked: true,
    pages: Array.from({ length: 10 }, (_, id) => ({
      id,
      kind: "page",
      status: id === 9 ? "draft" : "publish",
      title: { rendered: `Page ${id}` },
      link: `https://example.com/${id}`,
    })),
  } as Parameters<typeof ArticleClusterSummary>[0]["evidence"];
  const html = renderToStaticMarkup(
    createElement(ArticleClusterSummary, { evidence }),
  );
  expect(html).toContain("Page 9");
  expect(html).toContain("منتشرنشده");
  expect(html).toContain("حداکثر سه نامزد");
  expect(html).toContain("هنوز نقشهٔ خوشه‌بندی تأییدشده");
});
