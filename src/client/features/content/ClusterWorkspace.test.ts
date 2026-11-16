import { createElement } from "react";
import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ClusterWorkspace } from "./ClusterWorkspace";

const state = vi.hoisted(() => ({ values: ["", "", "pages"], index: 0 }));
vi.mock("react", async (original) => ({
  ...(await original<typeof React>()),
  useState: () => [state.values[state.index++], vi.fn()],
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) =>
    createElement("a", {}, children),
}));
vi.mock("./ClusterGraph", () => ({
  ClusterGraph: () => createElement("p", {}, "graph-view"),
}));
const clusters = [
  {
    pillar: { url: "https://site.test/a", title: "روف گاردن" },
    pages: [{ url: "https://site.test/b", title: "زهکشی" }],
  },
  {
    pillar: { url: "https://site.test/c", title: "دیوار سبز" },
    pages: [{ url: "https://site.test/d", title: "آبیاری" }],
  },
];
const render = (saved = true) =>
  renderToStaticMarkup(
    createElement(ClusterWorkspace, {
      clusters,
      projectId: "project",
      disabled: false,
      saved,
      onEdit: vi.fn(),
      onRemove: vi.fn(),
    }),
  );
beforeEach(() => {
  state.values = ["", "", "pages"];
  state.index = 0;
});
it("shows only the active group's pages and writing actions", () => {
  const html = render();
  expect(html).toContain("زهکشی");
  expect(html).not.toContain("آبیاری");
  expect(html).toContain("نگارش و بهبود");
});
it("finds groups through article titles even if another group was selected", () => {
  state.values = ["آبیاری", clusters[0].pillar.url, "pages"];
  const html = render(false);
  expect(html).toContain("دیوار سبز");
  expect(html).not.toContain("روف گاردن");
  expect(html).not.toContain("نگارش و بهبود");
  expect(html).toContain("ابتدا نقشه را ذخیره کنید");
});
it("offers a clear empty search state", () => {
  state.values[0] = "unmatched";
  expect(render()).toContain("پاک‌کردن جست‌وجو");
});
it("shows the bounded map when requested", () => {
  state.values[2] = "map";
  expect(render()).toContain("graph-view");
});
