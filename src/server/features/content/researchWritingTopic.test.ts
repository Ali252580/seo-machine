import { beforeEach, expect, it, vi } from "vitest";
import { researchWritingTopic } from "./researchWritingTopic";

const mock = vi.hoisted(() => ({
  model: vi.fn(),
  research: vi.fn(),
  serp: vi.fn(),
  coverage: vi.fn(),
  home: vi.fn(),
}));
vi.mock("ai", () => ({ generateText: mock.model }));
vi.mock("@/server/lib/openrouter", () => ({ buildChatAgentModel: () => ({}) }));
vi.mock("@/server/lib/openrouter-cost", () => ({ openRouterCostUsd: () => 0 }));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: () => "configured",
}));
vi.mock("@/server/billing/subscription", () => ({
  checkUsageCreditsDepleted: () => ({ depleted: false, monthlyRemaining: 10 }),
  trackUsageCreditSpend: vi.fn(),
}));
vi.mock(
  "@/server/features/project-context/services/ProjectContextService",
  () => ({
    ProjectContextService: {
      getProjectContext: () => ({
        sections: [],
        keyPages: [],
        competitors: [],
      }),
    },
  }),
);
vi.mock("@/server/features/keywords/services/KeywordResearchService", () => ({
  KeywordResearchService: {
    getSavedKeywords: () => ({ rows: [] }),
    research: mock.research,
    getSerpAnalysis: mock.serp,
  },
}));
vi.mock("@/server/lib/scrape", () => ({ readPages: mock.home }));
vi.mock("./siteTopicCoverage", () => ({
  loadSiteTopicCoverage: () => mock.coverage,
}));

const keyword = "آبیاری باغچه";
const title = "چگونه باغچه را در تابستان آبیاری کنیم؟";
const page = {
  title: "راهنمای آبیاری باغچه",
  url: "https://garden.example/guide",
};
const clear = {
  checked: true,
  pages: [],
  nearby: [],
  sources: { discovery: true, wordpress: false, searchConsole: false },
};
const run = () =>
  researchWritingTopic(
    {
      id: "garden",
      domain: "garden.example",
      locationCode: 2364,
      languageCode: "fa",
    },
    true,
    { userId: "u", organizationId: "o", userEmail: "u@example.com" },
  );

beforeEach(() => {
  mock.home.mockResolvedValue({
    pages: [{ title: "باغبانی", text: "نگهداری باغچه" }],
  });
  mock.model.mockImplementation(async ({ system }: { system: string }) => {
    const task = system.split("Current task: ").at(-1) ?? "";
    const answer = task.startsWith("Choose one")
      ? { seed: "باغچه" }
      : task.startsWith("Choose up to")
        ? { indices: [0] }
        : {
            proposal: { title, angle: "زمان و مقدار آبیاری در تابستان" },
            existingIndex: null,
          };
    return { text: JSON.stringify(answer) };
  });
  mock.research.mockResolvedValue({
    rows: [
      {
        keyword,
        searchVolume: null,
        fromGoogleSuggest: true,
        intent: "unknown",
      },
    ],
    source: "google_ads",
  });
  mock.serp.mockResolvedValue({
    items: [{ title, description: "", url: "https://other.example/guide" }],
  });
  mock.coverage.mockResolvedValue(clear);
});

it("finds a topic for a homepage-only project and preserves the qualitative source", async () => {
  expect(await run()).toMatchObject({
    status: "ready",
    keyword,
    title,
    demand: { source: "google_suggest" },
  });
  expect(mock.coverage.mock.calls.map(([term]) => term)).toEqual([
    keyword,
    title,
  ]);
});

it("returns an existing article even when only the proposed headline overlaps", async () => {
  mock.coverage
    .mockResolvedValueOnce(clear)
    .mockResolvedValueOnce({ ...clear, pages: [page] });
  expect(await run()).toEqual({ status: "covered", pages: [page] });
});

it("blocks a topic when the site's blog subdomain already ranks", async () => {
  const subdomain = { ...page, url: "https://blog.garden.example/guide" };
  mock.serp.mockResolvedValue({ items: [subdomain] });
  expect(await run()).toEqual({ status: "covered", pages: [subdomain] });
});

it("holds back a proposal when inventory is unavailable", async () => {
  mock.coverage.mockResolvedValue({ ...clear, checked: false });
  expect(await run()).toEqual({ status: "unverified" });
  expect(mock.serp).not.toHaveBeenCalled();
});
