import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPTY_FILTERS } from "@/client/features/keywords/keywordResearchTypes";
import { useLocalKeywordFilters } from "@/client/features/keywords/hooks/useLocalKeywordFilters";
import { useBacklinksFilters } from "@/client/features/backlinks/useBacklinksFilters";
import { useBrandLookupFilters } from "@/client/features/ai-search/useBrandLookupFilters";

afterEach(() => vi.unstubAllGlobals());

describe("project filter persistence", () => {
  const cases = [
    {
      key: (projectId: string) => `keyword-default-filters:${projectId}`,
      legacyKey: "keyword-default-filters",
      read: (projectId: string) =>
        useLocalKeywordFilters(projectId).values.include,
    },
    {
      key: (projectId: string) => `backlinks-filters:${projectId}:backlinks`,
      legacyKey: "backlinks-filters:backlinks",
      read: (projectId: string) =>
        useBacklinksFilters(projectId).backlinks.values.include,
    },
    {
      key: (projectId: string) =>
        `brand-lookup-filters-v3:${projectId}:queries`,
      legacyKey: "brand-lookup-filters-v3:queries",
      read: (projectId: string) =>
        useBrandLookupFilters(projectId).queries.values.include,
    },
  ];

  it.each(cases)(
    "isolates $legacyKey when mounting another project",
    ({ key, legacyKey, read }) => {
      const storage = new Map([
        [
          legacyKey,
          JSON.stringify({ ...EMPTY_FILTERS, include: "legacy shared terms" }),
        ],
        [
          key("site-a"),
          JSON.stringify({ ...EMPTY_FILTERS, include: "roof garden" }),
        ],
        [
          key("site-b"),
          JSON.stringify({ ...EMPTY_FILTERS, include: "motor repair" }),
        ],
      ]);
      vi.stubGlobal("localStorage", {
        getItem: (name: string) => storage.get(name) ?? null,
      });
      function Filters({ projectId }: { projectId: string }) {
        return createElement("span", null, read(projectId));
      }
      const render = (projectId: string) =>
        renderToString(createElement(Filters, { projectId }));
      expect(render("site-a")).toBe("<span>roof garden</span>");
      expect(render("site-b")).toBe("<span>motor repair</span>");
      expect(render("new-site")).toBe("<span></span>");
      expect(render("site-a")).toBe("<span>roof garden</span>");
    },
  );
});
