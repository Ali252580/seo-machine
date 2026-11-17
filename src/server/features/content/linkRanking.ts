import { GscService } from "@/server/features/gsc/services/GscService";

export async function loadLinkRanking(projectId: string) {
  try {
    if (!(await GscService.getConnection(projectId)))
      return { status: "not_connected" as const, rows: [] };
    const result = await GscService.getPerformance({
      projectId,
      dateRange: "last_28_days",
      dimensions: ["page"],
      rowLimit: 5000,
      type: "web",
      dataState: "final",
    });
    return { status: "connected" as const, rows: result.rows };
  } catch {
    return { status: "unavailable" as const, rows: [] };
  }
}
