import { Ga4ConnectionRepository } from "@/server/features/ga4/repositories/Ga4ConnectionRepository";
import { SearchOpportunityService } from "@/server/features/ga4/services/SearchOpportunityService";
import { GscService } from "@/server/features/gsc/services/GscService";
import {
  getWordPressConnection,
  listWordPressPages,
} from "@/server/features/wordpress/WordPressService";

type Input = { projectId: string; keyword: string; title: string };

/** First-party evidence collected before asking the model to write anything. */
async function research(input: Input) {
  const { projectId, keyword, title } = input;
  const [wordpress, gscConnection, ga4Connection] = await Promise.all([
    getWordPressConnection(projectId),
    GscService.getConnection(projectId),
    Ga4ConnectionRepository.getByProjectId(projectId),
  ]);

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
      }
    | { status: "not_connected" | "unavailable" } = {
    status: "not_connected",
  };
  if (gscConnection) {
    try {
      const result = await GscService.getPerformance({
        projectId,
        dateRange: "last_3_months",
        dimensions: ["query", "page"],
        filters: [
          { dimension: "query", operator: "contains", expression: keyword },
        ],
        rowLimit: 100,
        type: "web",
        dataState: "final",
      });
      searchConsole = { status: "connected", rows: result.rows };
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
      const targetUrls = new Set(pages.map((page) => page.link));
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
    pages,
    searchConsole,
    analytics,
  };
}

export const ContentResearchService = { research };
