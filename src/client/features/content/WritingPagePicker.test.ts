import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  data: [] as { url: string; title: string }[],
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: state.data, refetch: vi.fn() }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) =>
    createElement("a", null, children),
}));
vi.mock("@/serverFunctions/contentClusters", () => ({
  getWritingPages: vi.fn(),
}));
vi.mock("./ClusterPageDiscovery", () => ({
  ClusterPageDiscovery: () => createElement("div", null, "Discovery"),
}));
import { WritingPagePicker } from "./WritingPagePicker";
it("shows every discovered page rather than only the current draft", () => {
  state.data = Array.from({ length: 12 }, (_, i) => ({
    url: `https://example.com/${i}`,
    title: `Page ${i}`,
  }));
  const html = renderToStaticMarkup(
    createElement(WritingPagePicker, {
      projectId: "a",
      targetPage: "https://example.com/0",
    }),
  );
  expect(html).toContain("Page 0");
  expect(html).toContain("Page 11");
  expect(html).toContain("صفحهٔ انتخاب‌شده");
  expect(html).toContain("Discovery");
});
it("explains how to populate an empty inventory", () => {
  state.data = [];
  const html = renderToStaticMarkup(
    createElement(WritingPagePicker, { projectId: "b" }),
  );
  expect(html).toContain("هنوز صفحه‌ای ذخیره نشده");
  expect(html).toContain("نقشهٔ سایت به اتصال حساب نیاز ندارد");
});
