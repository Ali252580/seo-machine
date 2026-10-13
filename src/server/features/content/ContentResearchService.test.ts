import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getWordPressConnection: vi.fn(),
  listWordPressPages: vi.fn(),
  getGscConnection: vi.fn(),
  getPerformance: vi.fn(),
  getGa4Connection: vi.fn(),
  getOpportunities: vi.fn(),
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

  it("rejects a target page from another project before reading it", async () => {
    await expect(
      ContentResearchService.research({
        ...input,
        targetPage: "https://other.test/radiator",
      }),
    ).rejects.toThrow("همین پروژه");
    expect(mocks.readPages).not.toHaveBeenCalled();
  });
});
