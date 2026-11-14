import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ClusterSuggestions } from "./ClusterSuggestions";

it("keeps category inventory and group members collapsed while including article titles", () => {
  const html = renderToStaticMarkup(
    createElement(ClusterSuggestions, {
      pages: [
        {
          url: "https://example.com/roof",
          title: "روف گاردن",
          kind: "category",
        },
        {
          url: "https://example.com/care",
          title: "نگهداری روف گاردن",
          kind: "article",
        },
      ],
      clusters: [],
      disabled: false,
      onChoose: vi.fn(),
    }),
  );
  expect(html).toContain("نگهداری روف گاردن");
  expect(html).toContain("مقالهٔ شناسایی‌شده");
  expect(html.match(/<details[ >]/g)).toHaveLength(2);
  expect(html).not.toMatch(/<details[^>]*\bopen/);
  expect(html).toContain("جست‌وجوی گروه با عنوان مقاله یا صفحه");
});
