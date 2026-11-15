import { createElement } from "react";
import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ClusterGraph } from "./ClusterGraph";

const state = vi.hoisted(() => ({ offset: 0 }));
vi.mock("react", async (original) => ({
  ...(await original<typeof React>()),
  useState: () => [state.offset, vi.fn()],
}));
const cluster = {
  pillar: { url: "https://example.com", title: "مرجع" },
  pages: Array.from({ length: 20 }, (_, i) => ({
    url: `https://example.com/${i}`,
    title: `article-${i}-end`,
  })),
};

it("bounds the graph to five branches and keeps the last branches reachable", () => {
  state.offset = 0;
  const first = renderToStaticMarkup(createElement(ClusterGraph, { cluster }));
  expect(first).toContain('viewBox="0 0 760 280"');
  expect(first).toContain("article-0-end");
  expect(first).not.toContain("article-5-end");
  state.offset = 3;
  const last = renderToStaticMarkup(createElement(ClusterGraph, { cluster }));
  expect(last).toContain("article-19-end");
  expect(last).not.toContain("article-0-end");
  const smaller = renderToStaticMarkup(
    createElement(ClusterGraph, {
      cluster: { ...cluster, pages: cluster.pages.slice(0, 2) },
    }),
  );
  expect(smaller).toContain("article-0-end");
  expect(smaller).toContain('viewBox="0 0 760 112"');
});
