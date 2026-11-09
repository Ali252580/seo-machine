import type { ToolSet } from "ai";
import type { AutomaticSkill } from "@/shared/automaticSkills";

const reading = ["map_links", "read_pages"];
const performance = [
  "get_search_console_performance",
  "get_google_analytics_organic_overview",
  "get_rank_tracker",
];
const allowed: Record<AutomaticSkill, string[]> = {
  "seo-project-setup": [...reading, "list_saved_keywords"],
  "seo-coach": [...performance, "get_audit_issues"],
  "seo-audit": [
    ...reading,
    "get_audit_issues",
    "get_audit_pages",
    "get_backlinks_overview",
    "get_domain_overview",
  ],
  "keyword-research": [
    ...reading,
    "list_saved_keywords",
    "get_search_console_performance",
    "research_keywords",
    "get_keyword_metrics",
    "get_serp_results",
  ],
  "keyword-clustering": [
    ...reading,
    "list_saved_keywords",
    "get_search_console_performance",
    "get_serp_results",
  ],
  "competitive-landscape": [
    ...reading,
    "find_serp_competitors",
    "get_serp_results",
    "get_domain_overview",
    "get_ranked_keywords",
  ],
  "competitor-analysis": [
    ...reading,
    "get_domain_overview",
    "get_ranked_keywords",
    "get_backlinks_overview",
    "get_serp_results",
  ],
  "link-prospecting": [
    ...reading,
    "get_serp_results",
    "get_backlinks_profile",
    "get_backlinks_overview",
  ],
  "local-seo": [
    ...reading,
    "search_local_businesses",
    "get_local_serp_results",
    "get_business_profile",
  ],
};

// Bound request size as well as call count: one bulk request can incur many charges.
export function boundedSkillArgs(name: string, args: unknown) {
  const values = { ...(args as Record<string, unknown>) };
  for (const key of ["queries", "keywords", "seeds", "urls"]) {
    if (Array.isArray(values[key]))
      values[key] = values[key].slice(0, key === "seeds" ? 1 : 3);
  }
  if (name === "research_keywords") {
    values.resultLimit = 150;
    values.includeClickstreamData = false;
  }
  if (name === "get_serp_results") values.depth = 10;
  for (const key of ["limit", "depth"]) {
    if (typeof values[key] === "number")
      values[key] = Math.min(values[key], 50);
  }
  return values;
}

export function automaticSkillTools(
  all: ToolSet,
  name: AutomaticSkill,
  beforeCall: () => Promise<void>,
  used: string[],
): ToolSet {
  let busy = false;
  return Object.fromEntries(
    allowed[name].flatMap((toolName) => {
      const base = all[toolName];
      const execute = base?.execute;
      if (!execute) return [];
      return [
        [
          toolName,
          {
            ...base,
            execute: async (
              args: unknown,
              options: Parameters<typeof execute>[1],
            ) => {
              if (busy || used.length >= 4)
                return {
                  error:
                    "Automatic run limit reached; summarize available evidence.",
                };
              busy = true;
              try {
                await beforeCall();
                used.push(toolName);
                return await execute(boundedSkillArgs(toolName, args), options);
              } finally {
                busy = false;
              }
            },
          },
        ],
      ];
    }),
  );
}
