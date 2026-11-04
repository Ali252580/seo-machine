import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), report: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query }));
vi.mock("@/serverFunctions/searchPerformance", () => ({
  getSearchPerformanceReport: mocks.report,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/client/features/search-performance/SearchPerformanceParts", () => ({
  TotalsCards: () => "REAL_PROJECT_TOTALS",
}));
import { IranDomainOverview } from "./IranDomainOverview";

it("requests Iran data only for the current project and keeps projects in separate cache entries", async () => {
  mocks.query.mockReturnValue({ isPending: true });
  for (const projectId of ["one", "two"]) {
    renderToStaticMarkup(
      createElement(IranDomainOverview, {
        projectId,
        projectDomain: "example.com",
        domain: "https://www.example.com/page",
      }),
    );
    const options = mocks.query.mock.lastCall![0];
    expect(options.enabled).toBe(true);
    expect(options.queryKey).toEqual([
      "searchPerformance",
      projectId,
      "last_28_days",
      "ALL",
      "irn",
    ]);
    await options.queryFn();
    expect(mocks.report).toHaveBeenLastCalledWith({
      data: { projectId, dateRange: "last_28_days", country: "irn" },
    });
  }
});

it("never shows cached project totals as a competitor's data", () => {
  mocks.query.mockReturnValue({ data: { connected: true } });
  const html = renderToStaticMarkup(
    createElement(IranDomainOverview, {
      projectId: "one",
      projectDomain: "example.com",
      domain: "competitor.com",
    }),
  );
  expect(mocks.query.mock.lastCall![0].enabled).toBe(false);
  expect(html).not.toContain("REAL_PROJECT_TOTALS");
  expect(html).toContain("برای دامنهٔ واردشده آمار ایران");
});

it("explains a missing connection", () => {
  mocks.query.mockReturnValue({ data: { connected: false } });
  const html = renderToStaticMarkup(
    createElement(IranDomainOverview, {
      projectId: "one",
      projectDomain: "example.com",
      domain: "",
    }),
  );
  expect(html).toContain("ابتدا سرچ کنسول همین پروژه را متصل کنید");
});
