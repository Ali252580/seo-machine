import { expect, it, vi } from "vitest";
const gsc = vi.hoisted(() => ({
  getConnection: vi.fn(),
  getPerformance: vi.fn(),
}));
vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: gsc,
}));
import { loadLinkRanking } from "./linkRanking";
it("requests page-level finalized data without the source-page filter", async () => {
  gsc.getConnection.mockResolvedValue({});
  gsc.getPerformance.mockResolvedValue({
    rows: [{ keys: ["https://example.com/a"], position: 9, impressions: 50 }],
  });
  expect((await loadLinkRanking("project")).status).toBe("connected");
  expect(gsc.getPerformance).toHaveBeenCalledWith({
    projectId: "project",
    dimensions: ["page"],
    dateRange: "last_28_days",
    rowLimit: 5000,
    type: "web",
    dataState: "final",
  });
});
it("keeps missing connection and failed requests distinct", async () => {
  gsc.getConnection.mockResolvedValue(null);
  expect((await loadLinkRanking("project")).status).toBe("not_connected");
  gsc.getConnection.mockRejectedValue(new Error("offline"));
  expect((await loadLinkRanking("project")).status).toBe("unavailable");
});
