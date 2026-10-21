import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getWordPressConnection: vi.fn(),
  listWordPressPages: vi.fn(),
  getGscConnection: vi.fn(),
  getPerformance: vi.fn(),
  getGa4Connection: vi.fn(),
  getOpportunities: vi.fn(),
  getRankConfigs: vi.fn(),
  getLatestRankResults: vi.fn(),
  readPages: vi.fn(),
  projectRows: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: mocks.projectRows }) }),
    }),
  },
}));
vi.mock("@/db/schema", () => ({ projects: { id: "id", domain: "domain" } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/server/lib/scrape", () => ({ readPages: mocks.readPages }));

vi.mock("@/server/features/wordpress/WordPressService", () => ({
  getWordPressConnection: mocks.getWordPressConnection,
  listWordPressPages: mocks.listWordPressPages,
}));
vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: {
    getConnection: mocks.getGscConnection,
    getPerformance: mocks.getPerformance,
  },
}));
vi.mock("@/server/features/ga4/repositories/Ga4ConnectionRepository", () => ({
  Ga4ConnectionRepository: { getByProjectId: mocks.getGa4Connection },
}));
vi.mock("@/server/features/ga4/services/SearchOpportunityService", () => ({
  SearchOpportunityService: { getOpportunities: mocks.getOpportunities },
}));
vi.mock(
  "@/server/features/rank-tracking/repositories/RankTrackingRepository",
  () => ({
    RankTrackingRepository: { getConfigsForProject: mocks.getRankConfigs },
  }),
);
vi.mock("@/server/features/rank-tracking/services/rankTrackingResults", () => ({
  getLatestResults: mocks.getLatestRankResults,
}));

import { ContentResearchService } from "./ContentResearchService";

const input = {
  projectId: "project_1",
  keyword: "نصب رادیاتور",
  title: "نصب رادیاتور در غرب تهران",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getWordPressConnection.mockResolvedValue({
    siteUrl: "https://site.test",
  });
  mocks.getGscConnection.mockResolvedValue(null);
  mocks.getGa4Connection.mockResolvedValue(null);
  mocks.getRankConfigs.mockResolvedValue([]);
  mocks.listWordPressPages.mockResolvedValue([]);
  mocks.projectRows.mockResolvedValue([{ domain: "site.test" }]);
  mocks.readPages.mockResolvedValue({
    pages: [
      {
        url: "https://site.test/radiator",
        title: "نصب رادیاتور",
        text: "متن کنونی صفحه",
      },
    ],
  });
});

describe("content research before writing", () => {
  it("checks both the keyword and title and deduplicates CMS matches", async () => {
    const page = {
      id: 5,
      kind: "page",
      title: { rendered: "نصب رادیاتور" },
      link: "https://site.test/radiator",
      status: "publish",
    };
    mocks.listWordPressPages.mockResolvedValue([page]);

    const result = await ContentResearchService.research(input);

    expect(mocks.listWordPressPages).toHaveBeenCalledTimes(2);
    expect(mocks.listWordPressPages).toHaveBeenCalledWith(
      "project_1",
      input.keyword,
    );
    expect(mocks.listWordPressPages).toHaveBeenCalledWith(
      "project_1",
      input.title,
    );
    expect(result.pages).toEqual([page]);
    expect(result.wordpressChecked).toBe(true);
  });

  it("stops if the connected CMS cannot be checked", async () => {
    mocks.listWordPressPages.mockRejectedValue(
      new Error("WordPress unavailable"),
    );
    await expect(ContentResearchService.research(input)).rejects.toThrow(
      "WordPress unavailable",
    );
  });

  it("marks failed Google reads unavailable rather than reporting zero demand", async () => {
    mocks.getGscConnection.mockResolvedValue({ siteUrl: "https://site.test" });
    mocks.getGa4Connection.mockResolvedValue({ propertyId: "123" });
    mocks.getPerformance.mockRejectedValue(new Error("grant expired"));
    mocks.getOpportunities.mockRejectedValue(new Error("grant expired"));

    const result = await ContentResearchService.research(input);

    expect(result.searchConsole).toEqual({ status: "unavailable" });
    expect(result.analytics).toEqual({ status: "unavailable" });
  });

  it("reads only an existing page on the selected project domain and queries that page", async () => {
    mocks.getGscConnection.mockResolvedValue({ siteUrl: "https://site.test" });
    mocks.getPerformance.mockResolvedValue({ rows: [] });
    const targetPage = "https://site.test/radiator";
    const result = await ContentResearchService.research({
      ...input,
      targetPage,
    });
    expect(mocks.readPages).toHaveBeenCalledWith([targetPage], 1);
    expect(mocks.getPerformance).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [
          { dimension: "page", operator: "equals", expression: targetPage },
        ],
      }),
    );
    expect(result.existingPage?.text).toBe("متن کنونی صفحه");
  });

  it("requests the article trend for the selected project and target page", async () => {
    mocks.getGscConnection.mockResolvedValue({ siteUrl: "https://site.test" });
    mocks.getPerformance.mockResolvedValue({
      rows: [{ keys: ["2026-10-01"], clicks: 3 }],
    });
    const result = await ContentResearchService.research({
      ...input,
      targetPage: "https://site.test/radiator",
    });
    expect(mocks.getPerformance).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        dimensions: ["date"],
        filters: [
          {
            dimension: "page",
            operator: "equals",
            expression: "https://site.test/radiator",
          },
        ],
      }),
    );
    expect(result.searchConsole).toMatchObject({
      status: "connected",
      trendRows: [{ clicks: 3 }],
    });
  });

  it("rejects a target page from another project before reading it", async () => {
    await expect(
      ContentResearchService.research({
        ...input,
        targetPage: "https://other.test/radiator",
      }),
    ).rejects.toThrow("همین پروژه");
    expect(mocks.readPages).not.toHaveBeenCalled();
  });

  it("uses only a fresh, exact project keyword rank without starting a paid check", async () => {
    mocks.getRankConfigs.mockResolvedValue([
      { id: "rank_1", locationName: "تهران" },
    ]);
    mocks.getLatestRankResults.mockResolvedValue({
      run: { lastCheckedAt: new Date().toISOString() },
      rows: [
        {
          keyword: input.keyword,
          desktop: {
            position: 9,
            previousPosition: 5,
            rankingUrl: "https://site.test/radiator",
          },
          mobile: { position: null, previousPosition: null, rankingUrl: null },
        },
        {
          keyword: "نصب رادیاتور برقی",
          desktop: {
            position: 3,
            previousPosition: 4,
            rankingUrl: "https://site.test/other",
          },
          mobile: { position: null, previousPosition: null, rankingUrl: null },
        },
      ],
    });

    const result = await ContentResearchService.research(input);

    expect(mocks.getRankConfigs).toHaveBeenCalledWith("project_1");
    expect(mocks.getLatestRankResults).toHaveBeenCalledWith(
      "rank_1",
      "project_1",
      "7d",
    );
    expect(result.rankTracking).toEqual({
      status: "connected",
      rows: [
        {
          device: "desktop",
          location: "تهران",
          position: 9,
          previousPosition: 5,
          rankingUrl: "https://site.test/radiator",
        },
      ],
    });
  });

  it("does not present an old rank snapshot as current evidence", async () => {
    mocks.getRankConfigs.mockResolvedValue([
      { id: "rank_1", locationName: null },
    ]);
    mocks.getLatestRankResults.mockResolvedValue({
      run: { lastCheckedAt: "2020-01-01T00:00:00.000Z" },
      rows: [
        {
          keyword: input.keyword,
          desktop: {
            position: 1,
            previousPosition: 2,
            rankingUrl: "https://site.test/radiator",
          },
          mobile: { position: null, previousPosition: null, rankingUrl: null },
        },
      ],
    });

    const result = await ContentResearchService.research(input);

    expect(result.rankTracking).toEqual({ status: "not_tracked" });
  });
});
