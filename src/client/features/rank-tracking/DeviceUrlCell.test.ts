import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DeviceUrlCell } from "./RankTrackingTableParts";

function render(rankingUrl: string | null) {
  return renderToStaticMarkup(
    createElement(DeviceUrlCell, {
      domain: "example.com",
      result: {
        rankingUrl,
        position: 3,
        previousPosition: null,
        serpFeatures: [],
      },
    }),
  );
}

it("shows a readable Persian page name while preserving the navigation URL", () => {
  const html = render(
    "https://example.com/services/%D8%AA%D8%B3%D8%AA-page?q=1",
  );
  expect(html).toContain("تست page");
  expect(html).toContain(
    'href="https://example.com/services/%D8%AA%D8%B3%D8%AA-page?q=1"',
  );
  expect(html).toContain("نشانی کامل");
  expect(html).toContain("example.com");
});

it("supports relative URLs and homepages", () => {
  expect(render("/repair-guide")).toContain("repair guide");
  expect(render("/")).toContain("صفحهٔ اصلی");
});

it("handles missing, unsafe and malformed URLs without breaking the table", () => {
  expect(render(null)).not.toContain("<a ");
  expect(render("javascript:alert(1)")).not.toContain("<a ");
  expect(render("/broken%XX")).toContain("broken%XX");
});
