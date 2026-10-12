import { GscService } from "@/server/features/gsc/services/GscService";
import { sort } from "remeda";
import { GscNotConnectedError } from "@/server/lib/gscErrors";
import { Ga4ConnectionRepository } from "@/server/features/ga4/repositories/Ga4ConnectionRepository";
import { SearchOpportunityService } from "@/server/features/ga4/services/SearchOpportunityService";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { getLatestResults } from "@/server/features/rank-tracking/services/rankTrackingResults";

export type RecommendationCandidate = {
  id: string;
  skill: "keyword-research" | "seo-audit" | "seo-coach";
  title: string;
  action: string;
  evidence: string;
  page: string | null;
};

type GscRow = {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
};

type JoinedRow = {
  page: string;
  impressions: number;
  clicks: number;
  position: number;
  score: number | null;
  sessions: number;
  keyEvents: number;
};

type RankRow = {
  keyword: string;
  page: string | null;
  current: number | null;
  previous: number | null;
};

export type RecommendationEvidence = {
  sources: { gsc: string; ga4: string; rank: string };
  gscRows: GscRow[];
  joinedRows: JoinedRow[];
  rankRows: RankRow[];
};

function normalizedPage(page: string): string {
  try {
    const url = new URL(page);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return page;
  }
}

/** Only stored first-party observations enter the suggestion shortlist. */
export function buildRecommendationCandidates(
  evidence: RecommendationEvidence,
): RecommendationCandidate[] {
  const candidates: RecommendationCandidate[] = [];
  const coveredPages = new Set<string>();

  for (const row of sort(
    evidence.joinedRows.filter(
      (item) => item.score !== null && item.impressions >= 30,
    ),
    (a, b) => (b.score ?? 0) - (a.score ?? 0),
  ).slice(0, 4)) {
    const page = normalizedPage(row.page);
    coveredPages.add(page);
    candidates.push({
      id: `joined:${page}`,
      skill: "seo-audit",
      title: "بهبود صفحهٔ دارای فرصت رشد",
      action: "قصد جست‌وجو، عنوان و محتوای صفحهٔ موجود را بررسی و بهبود دهید.",
      evidence: `GSC: ${row.impressions} نمایش، ${row.clicks} کلیک، میانگین رتبه ${row.position.toFixed(1)}؛ GA4: ${row.sessions} نشست ارگانیک، ${row.keyEvents} رویداد کلیدی؛ امتیاز فرصت ${row.score}.`,
      page: row.page,
    });
  }

  for (const row of sort(
    evidence.gscRows.filter(
      (item) =>
        item.impressions >= 30 && item.position >= 4 && item.position <= 20,
    ),
    (a, b) => b.impressions - a.impressions,
  ).slice(0, 8)) {
    const page = normalizedPage(row.page);
    if (coveredPages.has(page)) continue;
    coveredPages.add(page);
    candidates.push({
      id: `gsc:${row.query}:${page}`,
      skill: "keyword-research",
      title: `فرصت بهبود برای «${row.query}»`,
      action:
        "صفحهٔ موجود را با نیاز جست‌وجوگر تطبیق دهید؛ پیش از ساخت صفحهٔ تازه، هم‌پوشانی محتوا را بررسی کنید.",
      evidence: `GSC در ۲۸ روز: ${row.impressions} نمایش، ${row.clicks} کلیک، میانگین رتبه ${row.position.toFixed(1)}، CTR ${(row.ctr * 100).toFixed(1)}٪.`,
      page: row.page,
    });
  }

  for (const row of sort(
    evidence.rankRows.filter(
      (item) =>
        item.previous !== null &&
        item.previous <= 20 &&
        (item.current === null || item.current - item.previous >= 3),
    ),
    (a, b) =>
      (b.current ?? 101) -
      (b.previous ?? 0) -
      ((a.current ?? 101) - (a.previous ?? 0)),
  ).slice(0, 4)) {
    candidates.push({
      id: `rank:${row.keyword}:${normalizedPage(row.page ?? "")}`,
      skill: "seo-audit",
      title: `بررسی افت رتبهٔ «${row.keyword}»`,
      action:
        "تغییرات صفحه و نتایج جست‌وجو را بررسی کنید؛ افت رتبه به‌تنهایی دلیل ساخت مقالهٔ تازه نیست.",
      evidence: `رتبهٔ قبلی ${row.previous}؛ رتبهٔ فعلی ${row.current ?? "خارج از نتایج ثبت‌شده"}.`,
      page: row.page,
    });
  }

  return candidates.slice(0, 10);
}

export async function collectRecommendationEvidence(
  projectId: string,
): Promise<RecommendationEvidence> {
  const [gsc, ga4, configs] = await Promise.allSettled([
    GscService.getPerformance({
      projectId,
      dimensions: ["query", "page"],
      dateRange: "last_28_days",
      rowLimit: 250,
      type: "web",
      dataState: "final",
    }),
    Ga4ConnectionRepository.getByProjectId(projectId),
    RankTrackingRepository.getConfigsForProject(projectId),
  ]);
  const ga4Connected = ga4.status === "fulfilled" && ga4.value !== null;
  const joinedResult =
    gsc.status === "fulfilled" && ga4Connected
      ? (
          await Promise.allSettled([
            SearchOpportunityService.getOpportunities({ projectId, limit: 20 }),
          ])
        )[0]
      : null;
  const rankConfigs = configs.status === "fulfilled" ? configs.value : [];
  const rankResults = await Promise.allSettled(
    rankConfigs
      .slice(0, 3)
      .map((config) => getLatestResults(config.id, projectId, "7d")),
  );
  const recentRankRows = rankResults.flatMap((result) => {
    if (result.status !== "fulfilled" || !result.value.run?.lastCheckedAt)
      return [];
    if (
      Date.now() - new Date(result.value.run.lastCheckedAt).getTime() >
      30 * 24 * 60 * 60 * 1000
    )
      return [];
    return result.value.rows.map((row) => {
      const device = row.desktop.position !== null ? row.desktop : row.mobile;
      return {
        keyword: row.keyword,
        page: device.rankingUrl,
        current: device.position,
        previous: device.previousPosition,
      };
    });
  });

  return {
    sources: {
      gsc:
        gsc.status === "fulfilled"
          ? gsc.value.rows.length > 0
            ? "connected"
            : "empty"
          : gsc.reason instanceof GscNotConnectedError
            ? "not_connected"
            : "unavailable",
      ga4:
        ga4.status === "rejected"
          ? "unavailable"
          : !ga4Connected
            ? "not_connected"
            : joinedResult?.status === "fulfilled"
              ? "connected"
              : "unavailable",
      rank:
        configs.status === "rejected"
          ? "unavailable"
          : rankConfigs.length === 0
            ? "not_configured"
            : recentRankRows.length > 0
              ? "connected"
              : "empty",
    },
    gscRows:
      gsc.status === "fulfilled"
        ? gsc.value.rows.map((row) => ({
            query: row.keys?.[0] ?? "",
            page: row.keys?.[1] ?? "",
            impressions: row.impressions,
            clicks: row.clicks,
            position: row.position,
            ctr: row.ctr,
          }))
        : [],
    joinedRows:
      joinedResult?.status === "fulfilled"
        ? joinedResult.value.rows.map((row) => ({
            page: row.page,
            impressions: row.impressions,
            clicks: row.clicks,
            position: row.position,
            score: row.score,
            sessions: row.ga4?.sessions ?? 0,
            keyEvents: row.ga4?.keyEvents ?? 0,
          }))
        : [],
    rankRows: recentRankRows,
  };
}
