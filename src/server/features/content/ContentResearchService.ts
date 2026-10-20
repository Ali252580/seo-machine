import { Ga4ConnectionRepository } from "@/server/features/ga4/repositories/Ga4ConnectionRepository";
import { SearchOpportunityService } from "@/server/features/ga4/services/SearchOpportunityService";
import { GscService } from "@/server/features/gsc/services/GscService";
import {
  getWordPressConnection,
  listWordPressPages,
} from "@/server/features/wordpress/WordPressService";
import { readPages } from "@/server/lib/scrape";
import { AppError } from "@/server/lib/errors";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

type Input = {
  projectId: string;
  keyword: string;
  title: string;
  targetPage?: string;
};

/** First-party evidence collected before asking the model to write anything. */
async function research(input: Input) {
  const { projectId, keyword, title, targetPage } = input;
  const [wordpress, gscConnection, ga4Connection] = await Promise.all([
    getWordPressConnection(projectId),
    GscService.getConnection(projectId),
    Ga4ConnectionRepository.getByProjectId(projectId),
  ]);

  let existingPage: { url: string; title: string | null; text: string } | null =
    null;
  if (targetPage) {
    const [project] = await db
      .select({ domain: projects.domain })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    const domain = project?.domain;
    if (!domain)
      throw new AppError("VALIDATION_ERROR", "دامنهٔ پروژه تنظیم نشده است.");
    const projectHost = new URL(
      domain.includes("://") ? domain : `https://${domain}`,
    ).hostname.replace(/^www\./, "");
    const requestedHost = new URL(targetPage).hostname.replace(/^www\./, "");
    if (projectHost !== requestedHost) {
      throw new AppError(
        "VALIDATION_ERROR",
        "صفحهٔ هدف باید متعلق به همین پروژه باشد.",
      );
    }
    existingPage = (await readPages([targetPage], 1)).pages[0] ?? null;
    if (!existingPage) {
      throw new AppError(
        "VALIDATION_ERROR",
        "متن صفحهٔ هدف خوانده نشد؛ نگارش بدون بررسی صفحه انجام نمی‌شود.",
      );
    }
  }

  // A failed CMS check must stop generation: claiming that no page exists
  // after an API failure would be worse than delaying a draft.
  const pages = wordpress
    ? (
        await Promise.all(
          [...new Set([keyword, title])].map((search) =>
            listWordPressPages(projectId, search),
          ),
        )
      )
        .flat()
        .filter(
          (page, index, all) =>
            all.findIndex(
              (candidate) =>
                candidate.id === page.id && candidate.kind === page.kind,
            ) === index,
        )
    : [];

  // Google integrations are optional. Keep failures visible as unavailable;
  // zero rows means a successful query with no observed demand, not a failure.
  let searchConsole:
    | {
        status: "connected";
        rows: Awaited<ReturnType<typeof GscService.getPerformance>>["rows"];
        trendRows: Awaited<
          ReturnType<typeof GscService.getPerformance>
        >["rows"];
      }
    | { status: "not_connected" | "unavailable" } = {
    status: "not_connected",
  };
  if (gscConnection) {
    try {
      const filters = [
        targetPage
          ? {
              dimension: "page" as const,
              operator: "equals" as const,
              expression: targetPage,
            }
          : {
              dimension: "query" as const,
              operator: "contains" as const,
              expression: keyword,
            },
      ];
      const [result, trend] = await Promise.allSettled([
        GscService.getPerformance({
          projectId,
          dateRange: "last_3_months",
          dimensions: ["query", "page"],
          filters,
          rowLimit: 100,
          type: "web",
          dataState: "final",
        }),
        GscService.getPerformance({
          projectId,
          dateRange: "last_28_days",
          dimensions: ["date"],
          filters,
          rowLimit: 32,
          type: "web",
          dataState: "final",
        }),
      ]);
      if (result.status === "rejected") throw result.reason;
      searchConsole = {
        status: "connected",
        rows: result.value.rows,
        trendRows: trend.status === "fulfilled" ? trend.value.rows : [],
      };
    } catch {
      searchConsole = { status: "unavailable" };
    }
  }

  let analytics:
    | {
        status: "connected";
        rows: Awaited<
          ReturnType<typeof SearchOpportunityService.getOpportunities>
        >["rows"];
        limited: boolean;
      }
    | { status: "not_connected" | "unavailable" } = {
    status: "not_connected",
  };
  if (ga4Connection && gscConnection) {
    try {
      const result = await SearchOpportunityService.getOpportunities({
        projectId,
        limit: 100,
      });
      // The joined report is page-level. Only send rows related to the target
      // or already found CMS content, rather than implying all rows matter.
      const targetUrls = new Set([
        ...pages.map((page) => page.link),
        ...(targetPage ? [targetPage] : []),
      ]);
      const relevant = result.rows.filter(
        (row) =>
          targetUrls.has(row.page) ||
          (searchConsole.status === "connected" &&
            searchConsole.rows.some((gsc) => gsc.keys?.[1] === row.page)),
      );
      analytics = {
        status: "connected",
        rows: relevant,
        limited: result.scoring.scoreDataLimited,
      };
    } catch {
      analytics = { status: "unavailable" };
    }
  }

  return {
    wordpressChecked: Boolean(wordpress),
    existingPage,
    pages,
    searchConsole,
    analytics,
  };
}

export const ContentResearchService = { research };
