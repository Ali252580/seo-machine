import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertUsageCreditsAvailable: vi.fn(),
  getOrCreateOrganizationCustomer: vi.fn(),
  trackUsageCreditSpend: vi.fn(),
  getOptionalEnvValue: vi.fn(),
  isHostedServerAuthMode: vi.fn(),
}));

vi.mock("@/server/billing/subscription", () => ({
  assertUsageCreditsAvailable: mocks.assertUsageCreditsAvailable,
  getOrCreateOrganizationCustomer: mocks.getOrCreateOrganizationCustomer,
  trackUsageCreditSpend: mocks.trackUsageCreditSpend,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: mocks.getOptionalEnvValue,
  isHostedServerAuthMode: mocks.isHostedServerAuthMode,
}));
import {
  createSerpApiRankClient,
  estimateSerpMetrics,
  fetchSerpApiRankCheck,
} from "./rank-tracking";

const input = {
  keyword: "rank tracker",
  keywordId: "keyword-1",
  locationCode: 2840,
  languageCode: "en",
  device: "desktop" as const,
  targetDomain: "example.com",
  depth: 20,
};

function organicPage(
  links: string[],
  extras: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({
      search_metadata: { status: "Success" },
      organic_results: links.map((link, index) => ({
        position: index + 1,
        link,
      })),
      ...extras,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("SerpApi rank tracking", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("uses the project SerpApi key and records internal usage on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    mocks.getOptionalEnvValue.mockResolvedValue("secret");
    mocks.isHostedServerAuthMode.mockResolvedValue(true);
    mocks.getOrCreateOrganizationCustomer.mockResolvedValue({
      id: "customer-1",
    });
    mocks.assertUsageCreditsAvailable.mockResolvedValue({
      monthlyRemaining: 10,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(organicPage(["https://example.com/result"])),
    );

    const client = createSerpApiRankClient({
      userId: "user-1",
      userEmail: "owner@example.com",
      organizationId: "org-1",
    });
    const result = await client.rankCheck(input);

    expect(result.position).toBe(1);
    expect(mocks.assertUsageCreditsAvailable).toHaveBeenCalledWith(
      "customer-1",
    );
    expect(mocks.trackUsageCreditSpend).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "customer-1", costUsd: 0.025 }),
    );
  });

  it("matches the tracked domain and its subdomains", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        organicPage([
          "https://other.test/one",
          "https://blog.example.com/result",
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSerpApiRankCheck("secret", input);

    expect(result).toMatchObject({
      searchesUsed: 1,
      data: {
        position: 2,
        url: "https://blog.example.com/result",
      },
    });
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get("api_key")).toBe("secret");
    expect(url.searchParams.get("gl")).toBe("us");
    expect(url.searchParams.get("no_cache")).toBe("true");
  });

  it("targets Tehran coordinates for Iran rank checks", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(organicPage(["https://example.com/result"]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchSerpApiRankCheck("secret", {
      ...input,
      keyword: "روف گاردن",
      locationCode: 2364,
      languageCode: "fa",
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get("gl")).toBe("ir");
    expect(url.searchParams.get("hl")).toBe("fa");
    expect(url.searchParams.get("lat")).toBe("35.69439");
    expect(url.searchParams.get("lon")).toBe("51.42151");
    expect(url.searchParams.get("nfpr")).toBe("1");
    expect(url.searchParams.has("location")).toBe(false);
  });

  it("uses Tehran coordinates without sending the conflicting location parameter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(organicPage(["https://example.com/result"]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchSerpApiRankCheck("secret", {
      ...input,
      locationCode: 2364,
      languageCode: "fa",
      locationName: "Tehran,Tehran Province,Iran",
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get("lat")).toBe("35.69439");
    expect(url.searchParams.get("lon")).toBe("51.42151");
    expect(url.searchParams.has("location")).toBe(false);
  });

  it("does not override another explicitly selected Iranian city", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(organicPage(["https://example.com/result"]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchSerpApiRankCheck("secret", {
      ...input,
      locationCode: 2364,
      languageCode: "fa",
      locationName: "Shiraz,Fars Province,Iran",
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get("location")).toBe("Shiraz,Fars Province,Iran");
    expect(url.searchParams.has("lat")).toBe(false);
    expect(url.searchParams.has("lon")).toBe(false);
  });

  it("paginates and converts page-relative positions to absolute rank", async () => {
    const firstPage = Array.from(
      { length: 10 },
      (_, index) => "https://other" + index + ".test/",
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(organicPage(firstPage, { local_results: [{}] }))
      .mockResolvedValueOnce(
        organicPage(["https://another.test/", "https://example.com/winner"]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSerpApiRankCheck("secret", input);

    expect(result.data.position).toBe(12);
    expect(result.data.serpFeatures).toEqual(
      expect.arrayContaining(["organic", "local"]),
    );
    expect(result.searchesUsed).toBe(2);
    const secondUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(secondUrl.searchParams.get("start")).toBe("10");
  });

  it("follows SerpApi pagination when a rich SERP returns fewer than ten organic rows", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        organicPage(
          Array.from(
            { length: 8 },
            (_, index) => `https://other${index}.test/`,
          ),
          {
            serpapi_pagination: { next: "https://serpapi.com/search?start=10" },
          },
        ),
      )
      .mockResolvedValueOnce(organicPage(["https://example.com/winner"]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSerpApiRankCheck("secret", input);

    expect(result.data.position).toBe(11);
    expect(result.searchesUsed).toBe(2);
  });

  it("returns a null rank when the result depth is exhausted", async () => {
    const page = Array.from(
      { length: 10 },
      (_, index) => "https://other" + index + ".test/",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(organicPage(page))),
    );

    const result = await fetchSerpApiRankCheck("secret", input);

    expect(result.data.position).toBeNull();
    expect(result.data.url).toBeNull();
    expect(result.searchesUsed).toBe(2);
  });

  it("calculates repeatable estimated metrics from SERP signals", () => {
    const metrics = estimateSerpMetrics(
      {
        search_information: { total_results: 1_000_000 },
        organic_results: [
          { position: 1, title: "Buy SEO service", link: "https://one.test" },
          { position: 2, title: "SEO guide", link: "https://two.test" },
        ],
        top_ads: [{}, {}],
        shopping_results: [{}],
        related_questions: [{}],
      },
      { keyword: "buy seo service", locationCode: 2840 },
    );

    expect(metrics.searchVolume).toBe(10_000);
    expect(metrics.keywordDifficulty).toBe(70);
    expect(metrics.cpc).toBe(2);
  });

  it("unwraps Google redirect links and accepts a URL as the target domain", async () => {
    const destination = "https://example.com/right-page?ref=google";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          organicPage([
            `https://www.google.com/url?url=${encodeURIComponent(destination)}`,
          ]),
        ),
    );

    const result = await fetchSerpApiRankCheck("secret", {
      ...input,
      targetDomain: "https://www.example.com/path",
    });

    expect(result.data.url).toBe(destination);
  });
});
