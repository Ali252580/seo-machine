import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { TablePagination } from "./TablePagination";

function render(
  overrides: Partial<Parameters<typeof TablePagination>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(TablePagination, {
      page: 1,
      pageSize: 25,
      pageSizes: [25, 50],
      totalCount: 30,
      hasNextPage: true,
      isLoading: false,
      onPageChange: () => {},
      onPageSizeChange: () => {},
      ...overrides,
    }),
  );
}

it("shows the real final-page range in Persian and disables forward navigation", () => {
  const html = render({ page: 2 });
  expect(html).toContain("۲۶ تا ۳۰ از ۳۰ نتیجه");
  expect(html).toMatch(/aria-label="صفحهٔ بعد"[^>]*disabled/);
  expect(html).not.toMatch(/aria-label="صفحهٔ قبل"[^>]*disabled/);
});

it("does not claim a full page of results when the total is unknown", () => {
  const html = render({ totalCount: null, hasNextPage: false });
  expect(html).not.toContain("۲۵ نتیجه");
  expect(html).toContain("صفحهٔ ۱");
  expect(html).toMatch(/aria-label="صفحهٔ بعد"[^>]*disabled/);
});

it("handles empty and loading states without allowing overlapping page requests", () => {
  expect(render({ totalCount: 0 })).toContain("بدون نتیجه");
  const html = render({ page: 2, totalCount: 100, isLoading: true });
  expect(html).toMatch(/<select[^>]*disabled/);
  expect(html).toMatch(/aria-label="صفحهٔ قبل"[^>]*disabled/);
  expect(html).toMatch(/aria-label="صفحهٔ بعد"[^>]*disabled/);
});
