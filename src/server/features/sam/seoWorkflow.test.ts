import { describe, expect, it } from "vitest";
import { parseWorkflowPlans, projectPageUrls } from "./seoWorkflow";
import type { RecommendationCandidate } from "./periodicRecommendationEvidence";

const candidate: RecommendationCandidate = {
  id: "known",
  skill: "seo-audit",
  title: "فرصت",
  action: "بررسی",
  evidence: "100 نمایش",
  page: "https://example.com/page",
};
const plan = {
  id: "known",
  decision: "improve",
  rationale: "توضیح",
  steps: ["اصلاح"],
  suggestedTitle: "عنوان",
  outline: ["مقدمه"],
  successMeasure: "مقایسه پس از ۲۸ روز",
};

describe("automatic SEO workflow", () => {
  it("rejects other domains, credentials and protocols before any page read", () => {
    const urls = [
      candidate.page,
      "https://other.test/page",
      "https://example.com.evil.test",
      "https://user:pass@example.com",
      "ftp://example.com/page",
      candidate.page,
    ];
    expect(
      projectPageUrls(
        "example.com",
        urls.map((page) => ({ ...candidate, page })),
      ),
    ).toEqual([candidate.page]);
    expect(projectPageUrls(null, [candidate])).toEqual([]);
  });
  it("keeps observed evidence and discards invented or repeated candidate IDs", () => {
    const result = parseWorkflowPlans(
      JSON.stringify([
        plan,
        { ...plan, id: "other-project", page: "https://other.test" },
        plan,
      ]),
      [candidate],
      [candidate.page!],
    );
    expect(result).toHaveLength(1);
    expect(result[0].page).toBe(candidate.page);
    expect(result[0].evidence).toBe(candidate.evidence);
    expect(result[0].plan.decision).toBe("improve");
  });
  it("does not propose a rewrite without reading the page", () => {
    const [result] = parseWorkflowPlans(JSON.stringify([plan]), [candidate]);
    expect(result.plan.decision).toBe("investigate");
    expect(result.plan.suggestedTitle).toBeNull();
    expect(result.plan.outline).toEqual([]);
  });
  it("rejects malformed or oversized model plans", () => {
    expect(() => parseWorkflowPlans("invalid", [candidate])).toThrow();
    expect(() =>
      parseWorkflowPlans(JSON.stringify([{ ...plan, steps: [] }]), [candidate]),
    ).toThrow();
    expect(() =>
      parseWorkflowPlans(
        JSON.stringify([{ ...plan, rationale: "x".repeat(1201) }]),
        [candidate],
      ),
    ).toThrow();
  });
});
