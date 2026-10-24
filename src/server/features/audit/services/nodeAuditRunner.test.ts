import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialNodeCrawlState } from "./nodeCrawlState";
vi.mock("cloudflare:workers", () => ({ env: {} }));

const mocks = vi.hoisted(() => ({
  getAudit: vi.fn(),
  insert: vi.fn(),
  complete: vi.fn(),
  fetch: vi.fn(),
  returning: vi.fn(),
  set: vi.fn(),
  page: vi.fn(),
}));
vi.mock("@/db", () => ({
  withPgClient: (fn: () => Promise<unknown>) => fn(),
  db: {
    update: () => ({
      set: (value: unknown) => {
        mocks.set(value);
        return { where: () => ({ returning: mocks.returning }) };
      },
    }),
  },
}));
vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: {
    getAuditForProject: mocks.getAudit,
    insertCrawledBatch: mocks.insert,
    getPagesForAudit: async () => [
      {
        id: "page",
        url: "https://example.com/",
        fetchClass: "ok",
        statusCode: 200,
      },
    ],
    insertIssues: vi.fn(),
    completeAudit: mocks.complete,
  },
}));
vi.mock("@/server/lib/audit/node-fetch", () => ({
  nodeAuditFetch: mocks.fetch,
}));
vi.mock("@/server/workflows/site-audit-workflow-helpers", () => ({
  crawlPage: mocks.page,
}));
vi.mock("@/server/lib/audit/issues/page-reporters", () => ({
  runPageReporters: () => [],
}));
vi.mock("@/server/lib/audit/issues/multipage", () => ({
  runMultipageChecks: async () => [],
}));
import { runNodeAudit } from "./nodeAuditRunner";

describe("persistent Node crawler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const crawl = initialNodeCrawlState("https://example.com/");
    crawl.robots = "User-agent: *\nDisallow: /blocked";
    crawl.sitemaps = [];
    mocks.getAudit.mockResolvedValue({
      id: "audit",
      projectId: "project",
      workflowInstanceId: "node:audit",
      status: "running",
      pagesCrawled: 0,
      startUrl: "https://example.com/",
      config: JSON.stringify({
        maxPages: 10,
        lighthouseStrategy: "none",
        crawl,
      }),
    });
    mocks.returning.mockResolvedValue([{ id: "audit" }]);
    mocks.page.mockImplementation(async (url: string) => ({
      url,
      title: "Real page",
      statusCode: 200,
      links: [
        { targetUrl: "https://example.com/blocked", isInternal: true },
        { targetUrl: "https://elsewhere.com/", isInternal: false },
      ],
    }));
  });
  it("persists pages and honors robots without following other sites", async () => {
    await runNodeAudit("audit", "project");
    expect(mocks.getAudit).toHaveBeenCalledWith("audit", "project");
    expect(mocks.page).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(
      mocks.set.mock.calls.filter(([value]) => value.status === "failed"),
    ).toEqual([]);
    expect(mocks.complete).toHaveBeenCalledWith("audit", "node:audit", {
      pagesCrawled: 1,
      pagesTotal: 1,
    });
  });
  it("does no work for another project or an occupied lease", async () => {
    mocks.getAudit.mockResolvedValueOnce(null);
    await runNodeAudit("audit", "other-project");
    expect(mocks.page).not.toHaveBeenCalled();
    mocks.returning.mockResolvedValueOnce([]);
    await runNodeAudit("audit", "project");
    expect(mocks.page).not.toHaveBeenCalled();
  });
});
