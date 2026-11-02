import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/lib/errors";
const { checkMock, trackMock, getOrCreateMock, isHostedServerAuthModeMock } =
  vi.hoisted(() => ({
    checkMock: vi.fn(),
    trackMock: vi.fn(),
    getOrCreateMock: vi.fn(),
    isHostedServerAuthModeMock: vi.fn(),
  }));
// Wallet arithmetic and persistence are exercised against SQLite in billing tests.
vi.mock("@/server/billing/subscription", () => ({
  assertUsageCreditsAvailable: checkMock,
  trackUsageCreditSpend: trackMock,
  getOrCreateOrganizationCustomer: getOrCreateMock,
}));
vi.mock("cloudflare:workers", () => ({ env: {}, waitUntil: vi.fn() }));
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: isHostedServerAuthModeMock,
}));
// Mock every section module the client wraps so meterDataforseoCall's
// `execute()` resolves to a controllable fixture.
vi.mock("@/server/lib/dataforseo/labs", () => ({
  fetchRelatedKeywords: vi.fn(),
  fetchKeywordSuggestions: vi.fn(),
  fetchKeywordIdeas: vi.fn(),
  fetchDomainRankOverview: vi.fn(),
  fetchRankedKeywords: vi.fn(),
  fetchRelevantPages: vi.fn(),
  fetchKeywordOverview: vi.fn(),
  fetchSerpCompetitors: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/serp", () => ({
  fetchLiveSerp: vi.fn(),
  fetchRankCheckSerp: vi.fn(),
  postRankCheckTasks: vi.fn(),
  fetchLocalSerp: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/business", () => ({
  fetchBusinessListingsSearch: vi.fn(),
  fetchQuestionsAnswers: vi.fn(),
  fetchMyBusinessInfo: vi.fn(),
  postGoogleReviewsTask: vi.fn(),
  postMyBusinessUpdatesTask: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/google-ads", () => ({
  fetchAdsKeywordIdeas: vi.fn(),
  fetchAdsSearchVolume: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/backlinks", () => ({
  fetchBacklinksSummary: vi.fn(),
  fetchBacklinksRows: vi.fn(),
  fetchReferringDomains: vi.fn(),
  fetchDomainPagesSummary: vi.fn(),
  fetchBacklinksHistory: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/lighthouse", () => ({
  fetchLighthouseResult: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/ai", () => ({
  fetchLlmMentionsSearch: vi.fn(),
  fetchLlmAggregatedMetrics: vi.fn(),
  fetchLlmTopPages: vi.fn(),
  fetchLlmCrossAggregatedMetrics: vi.fn(),
  fetchLlmResponse: vi.fn(),
}));

import {
  createDataforseoClient,
  mapDataforseoPathToCreditFeature,
} from "@/server/lib/dataforseo/client";
import { DataforseoChargedTaskError } from "@/server/lib/dataforseo/envelope";
import { fetchBacklinksSummary } from "@/server/lib/dataforseo/backlinks";

const billingCustomer = {
  organizationId: "org_123",
  userId: "user_123",
  userEmail: "alice@example.com",
};
const backlinksInput = { target: "example.com" };
const call = () =>
  createDataforseoClient(billingCustomer).backlinks.summary(backlinksInput);
describe("provider calls with the internal wallet", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isHostedServerAuthModeMock.mockResolvedValue(true);
    getOrCreateMock.mockResolvedValue({ id: "org_123" });
    checkMock.mockResolvedValue({ monthlyRemaining: 5000 });
    trackMock.mockResolvedValue({ monthlyCredits: 64, topupCredits: 0 });
    vi.mocked(fetchBacklinksSummary).mockResolvedValue({
      data: { rank: 42 },
      billing: { costUsd: 0.05, path: ["backlinks", "summary"] },
    });
  });
  it("returns provider data and attributes one charge to the correct wallet and feature", async () => {
    expect(await call()).toEqual({ rank: 42 });
    expect(getOrCreateMock).toHaveBeenCalledWith(billingCustomer);
    expect(checkMock).toHaveBeenCalledWith("org_123");
    expect(trackMock).toHaveBeenCalledExactlyOnceWith({
      customer: billingCustomer,
      customerId: "org_123",
      creditFeature: "backlinks",
      costUsd: 0.05,
      monthlyRemaining: 5000,
      properties: {
        provider: "dataforseo",
        paths: ["backlinks/summary"],
        fromCache: false,
      },
    });
  });
  it("does not invoke the paid provider when the wallet is depleted", async () => {
    checkMock.mockRejectedValue(new AppError("INSUFFICIENT_CREDITS"));
    await expect(call()).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
    });
    expect(fetchBacklinksSummary).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });
  it("skips billing in non-hosted mode", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(false);
    expect(await call()).toEqual({ rank: 42 });
    expect(checkMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });
  it("does not charge an ordinary provider failure", async () => {
    vi.mocked(fetchBacklinksSummary).mockRejectedValue(new Error("offline"));
    await expect(call()).rejects.toThrow("offline");
    expect(trackMock).not.toHaveBeenCalled();
  });
  it("does not charge unbilled invalid-field failures", async () => {
    vi.mocked(fetchBacklinksSummary).mockRejectedValue(
      new DataforseoChargedTaskError(
        "Invalid Field",
        { costUsd: 0, path: ["backlinks", "summary"] },
        true,
      ),
    );
    await expect(call()).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(trackMock).not.toHaveBeenCalled();
  });
  it("records billed failures before surfacing the provider error", async () => {
    vi.mocked(fetchBacklinksSummary).mockRejectedValue(
      new DataforseoChargedTaskError(
        "Invalid Field",
        { costUsd: 0.05, path: ["backlinks", "summary"] },
        true,
      ),
    );
    await expect(call()).rejects.toThrow("Invalid Field");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ costUsd: 0.05, customerId: "org_123" }),
    );
  });
  it("attributes an explicit feature override", async () => {
    await createDataforseoClient(billingCustomer).backlinks.summary({
      ...backlinksInput,
      creditFeature: "agent",
    });
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ creditFeature: "agent" }),
    );
  });
  it("does not claim success when committing the charge fails", async () => {
    trackMock.mockRejectedValue(new Error("ledger unavailable"));
    await expect(call()).rejects.toThrow("ledger unavailable");
  });
});
describe("mapDataforseoPathToCreditFeature", () => {
  it("maps real keyword research paths", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "related_keywords",
        "live",
      ]),
    ).toBe("keyword_research");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "keyword_suggestions",
        "live",
      ]),
    ).toBe("keyword_research");
  });

  it("maps real serp paths", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "serp",
        "google",
        "organic",
        "live",
        "regular",
      ]),
    ).toBe("keyword_research");
  });

  it("maps real domain paths", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "domain_rank_overview",
        "live",
      ]),
    ).toBe("domain_overview");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "ranked_keywords",
        "live",
      ]),
    ).toBe("domain_overview");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "relevant_pages",
        "live",
      ]),
    ).toBe("domain_overview");
  });

  it("maps real backlinks paths", () => {
    expect(
      mapDataforseoPathToCreditFeature(["v3", "backlinks", "summary", "live"]),
    ).toBe("backlinks");
    expect(mapDataforseoPathToCreditFeature(["backlinks", "summary"])).toBe(
      "backlinks",
    );
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "backlinks",
        "referring_domains",
        "live",
      ]),
    ).toBe("backlinks");
  });

  it("maps real lighthouse/on_page paths to site_audit", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "on_page",
        "lighthouse",
        "live",
        "json",
      ]),
    ).toBe("site_audit");
  });

  it("maps ai_optimization llm_mentions paths to ai_citations", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "ai_optimization",
        "llm_mentions",
        "search",
        "live",
      ]),
    ).toBe("ai_citations");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "ai_optimization",
        "llm_mentions",
        "aggregated_metrics",
        "live",
      ]),
    ).toBe("ai_citations");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "ai_optimization",
        "llm_mentions",
        "top_pages",
        "live",
      ]),
    ).toBe("ai_citations");
  });

  it("maps ai_optimization provider llm_responses paths to ai_prompt_responses", () => {
    for (const provider of ["chat_gpt", "claude", "gemini", "perplexity"]) {
      expect(
        mapDataforseoPathToCreditFeature([
          "v3",
          "ai_optimization",
          provider,
          "llm_responses",
          "live",
        ]),
      ).toBe("ai_prompt_responses");
    }
  });

  it("maps local and supporting paths to the intended credit features", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "business_data",
        "business_listings",
        "search",
        "live",
      ]),
    ).toBe("local_seo");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "serp",
        "google",
        "local_finder",
        "live",
        "advanced",
      ]),
    ).toBe("local_seo");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "serp",
        "google",
        "maps",
        "live",
        "advanced",
      ]),
    ).toBe("local_seo");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "keywords_data",
        "google_ads",
        "search_volume",
        "live",
      ]),
    ).toBe("keyword_research");
  });
});
