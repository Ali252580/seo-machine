import { createElement } from "react";
import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ClusterPagePicker } from "./ClusterPagePicker";

const state = vi.hoisted(() => ({ search: "" }));
vi.mock("react", async (original) => ({
  ...(await original<typeof React>()),
  useState: () => [state.search, vi.fn()],
}));

it("shows alternatives and filters them without changing selected group members", () => {
  const setSelected = vi.fn();
  const props = {
    pages: [
      { url: "https://site.test/hub", title: "Hub" },
      { url: "https://site.test/old", title: "Old suggestion" },
      { url: "https://site.test/replacement", title: "Another topic" },
    ],
    pillarUrl: "https://site.test/hub",
    selected: ["https://site.test/old"],
    setPillarUrl: vi.fn(),
    setSelected,
  };
  state.search = "";
  const all = renderToStaticMarkup(createElement(ClusterPagePicker, props));
  expect(all.match(/type="checkbox"/g)).toHaveLength(2);
  expect(all).toContain("Another topic");
  state.search = "replacement";
  const filtered = renderToStaticMarkup(
    createElement(ClusterPagePicker, props),
  );
  expect(filtered.match(/type="checkbox"/g)).toHaveLength(1);
  expect(filtered).toContain("Another topic");
  expect(setSelected).not.toHaveBeenCalled();
  state.search = "missing";
  expect(
    renderToStaticMarkup(createElement(ClusterPagePicker, props)),
  ).toContain("صفحه‌ای با این جست‌وجو پیدا نشد");
});
