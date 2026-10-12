import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: {},
}));
vi.mock("@/server/features/ga4/repositories/Ga4ConnectionRepository", () => ({
  Ga4ConnectionRepository: {},
}));
vi.mock("@/server/features/ga4/services/SearchOpportunityService", () => ({
  SearchOpportunityService: {},
}));
vi.mock(
  "@/server/features/rank-tracking/repositories/RankTrackingRepository",
  () => ({ RankTrackingRepository: {} }),
);
vi.mock("@/server/features/rank-tracking/services/rankTrackingResults", () => ({
  getLatestResults: vi.fn(),
}));
import {
  buildRecommendationCandidates,
  type RecommendationEvidence,
} from "./periodicRecommendationEvidence";

function evidence(
  patch: Partial<RecommendationEvidence>,
): RecommendationEvidence {
  return {
    sources: { gsc: "connected", ga4: "connected", rank: "connected" },
    gscRows: [],
    joinedRows: [],
    rankRows: [],
    ...patch,
  };
}

describe("periodic recommendation evidence", () => {
  it("does not propose work without observed demand or a rank drop", () => {
    expect(
      buildRecommendationCandidates(
        evidence({
          gscRows: [
            {
              query: "آموزش سئو",
              page: "https://example.com/guide",
              impressions: 12,
              clicks: 0,
              position: 8,
              ctr: 0,
            },
          ],
          rankRows: [{ keyword: "سئو", page: null, previous: 4, current: 5 }],
        }),
      ),
    ).toEqual([]);
  });

  it("deduplicates GSC and GA4 opportunities for the same page", () => {
    const candidates = buildRecommendationCandidates(
      evidence({
        joinedRows: [
          {
            page: "https://example.com/guide/",
            impressions: 100,
            clicks: 4,
            position: 8,
            score: 71,
            sessions: 5,
            keyEvents: 1,
          },
        ],
        gscRows: [
          {
            query: "راهنمای سئو",
            page: "https://www.example.com/guide",
            impressions: 100,
            clicks: 4,
            position: 8,
            ctr: 0.04,
          },
        ],
      }),
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.evidence).toContain("GA4");
  });

  it("reports a measured drop without inventing a new page", () => {
    const candidates = buildRecommendationCandidates(
      evidence({
        rankRows: [
          {
            keyword: "سئو محلی",
            page: "https://example.com/local",
            previous: 3,
            current: 9,
          },
        ],
      }),
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.evidence).toContain("رتبهٔ قبلی 3");
    expect(candidates[0]?.action).toContain("ساخت مقالهٔ تازه نیست");
  });
});
