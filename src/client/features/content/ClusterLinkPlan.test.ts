import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ClusterLinkPlan } from "./ClusterLinkPlan";

it("shows directed proposed links without claiming they are installed", () => {
  const html = renderToStaticMarkup(
    createElement(ClusterLinkPlan, {
      cluster: {
        pillar: { url: "https://example.com/hub", title: "مرجع" },
        pages: [{ url: "https://example.com/article", title: "مقاله" }],
      },
    }),
  );
  expect(html).toContain("از: مرجع");
  expect(html).toContain("از: مقاله");
  expect(html).toContain('href="https://example.com/hub"');
  expect(html).toContain('href="https://example.com/article"');
  expect(html).toContain("هنوز روی سایت اجرا نشده");
});
