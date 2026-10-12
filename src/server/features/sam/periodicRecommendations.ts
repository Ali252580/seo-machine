import { and, asc, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { generateText } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { member, projectContextSections, projects, user } from "@/db/schema";
import {
  checkUsageCreditsDepleted,
  trackUsageCreditSpend,
} from "@/server/billing/subscription";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { buildChatAgentModel } from "@/server/lib/openrouter";
import { openRouterCostUsd } from "@/server/lib/openrouter-cost";
import { buildSamSkillSource } from "./samSkills";
import {
  buildRecommendationCandidates,
  collectRecommendationEvidence,
  type RecommendationCandidate,
} from "./periodicRecommendationEvidence";

const SECTION_KEY = "custom:periodic-seo-recommendations";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const snapshotSchema = z.object({
  status: z.enum(["ready", "no_data", "running", "error"]),
  updatedAt: z.string().nullable(),
  sources: z.object({ gsc: z.string(), ga4: z.string(), rank: z.string() }),
  analysis: z.enum(["skills", "rules"]).nullable(),
  items: z.array(
    z.object({
      id: z.string(),
      skill: z.enum(["keyword-research", "seo-audit", "seo-coach"]),
      title: z.string(),
      action: z.string(),
      evidence: z.string(),
      page: z.string().nullable(),
    }),
  ),
});
export type PeriodicRecommendations = z.infer<typeof snapshotSchema>;

const empty: PeriodicRecommendations = {
  status: "no_data",
  updatedAt: null,
  sources: {
    gsc: "not_connected",
    ga4: "not_connected",
    rank: "not_configured",
  },
  analysis: null,
  items: [],
};

function parseSnapshot(content: string | undefined): PeriodicRecommendations {
  if (!content) return empty;
  try {
    return snapshotSchema.parse(JSON.parse(content));
  } catch {
    return empty;
  }
}

export async function getPeriodicRecommendations(projectId: string) {
  const [row] = await db
    .select({ content: projectContextSections.content })
    .from(projectContextSections)
    .where(
      and(
        eq(projectContextSections.projectId, projectId),
        eq(projectContextSections.key, SECTION_KEY),
      ),
    )
    .limit(1);
  return parseSnapshot(row?.content);
}

// Claim with a conditional write so overlapping cron calls cannot bill twice.
async function claim(
  projectId: string,
  cutoff: string,
): Promise<string | null> {
  const now = new Date().toISOString();
  const inserted = await db
    .insert(projectContextSections)
    .values({
      projectId,
      key: SECTION_KEY,
      title: "Periodic SEO recommendations",
      content: JSON.stringify({ ...empty, status: "running" }),
      updatedAt: now,
      updatedBy: "sam",
    })
    .onConflictDoNothing()
    .returning({ projectId: projectContextSections.projectId });
  if (inserted.length) return now;
  const updated = await db
    .update(projectContextSections)
    .set({ updatedAt: now, updatedBy: "sam" })
    .where(
      and(
        eq(projectContextSections.projectId, projectId),
        eq(projectContextSections.key, SECTION_KEY),
        lt(projectContextSections.updatedAt, cutoff),
      ),
    )
    .returning({ projectId: projectContextSections.projectId });
  return updated.length ? now : null;
}

async function finish(
  projectId: string,
  claimedAt: string,
  snapshot: PeriodicRecommendations,
) {
  await db
    .update(projectContextSections)
    .set({ content: JSON.stringify(snapshot), updatedBy: "sam" })
    .where(
      and(
        eq(projectContextSections.projectId, projectId),
        eq(projectContextSections.key, SECTION_KEY),
        eq(projectContextSections.updatedAt, claimedAt),
      ),
    );
}

async function skillPrioritize(
  projectId: string,
  candidates: RecommendationCandidate[],
): Promise<RecommendationCandidate[] | null> {
  const apiKey = await getOptionalEnvValue("OPENROUTER_API_KEY");
  if (!apiKey || candidates.length === 0) return null;
  const [owner] = await db
    .select({
      organizationId: projects.organizationId,
      userId: user.id,
      email: user.email,
    })
    .from(projects)
    .innerJoin(member, eq(member.organizationId, projects.organizationId))
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(projects.id, projectId), eq(member.role, "owner")))
    .limit(1);
  if (!owner) return null;
  const customer = {
    userId: owner.userId,
    userEmail: owner.email,
    organizationId: owner.organizationId,
    projectId,
  };
  const balance = await checkUsageCreditsDepleted(customer);
  if (balance.depleted) return null;
  const skills = buildSamSkillSource();
  const instructions = await Promise.all(
    ["seo-coach", "keyword-research", "seo-audit"].map((name) =>
      skills.load(name),
    ),
  );
  const result = await generateText({
    model: buildChatAgentModel(
      apiKey,
      await getOptionalEnvValue("OPENROUTER_MODEL"),
      "low",
    ),
    system: `You are prioritizing verified SEO opportunities for one project. Follow the bundled skill instructions below. Select up to five candidate IDs. Do not invent metrics, pages, or keywords. Return ONLY a JSON array of ID strings.\n\n${instructions.map((skill) => skill?.body.slice(0, 3500) ?? "").join("\n\n")}`,
    prompt: JSON.stringify(candidates),
    maxOutputTokens: 300,
    abortSignal: AbortSignal.timeout(25_000),
    onStepFinish: async (step) => {
      const cost = openRouterCostUsd(step.providerMetadata);
      if (cost === null)
        throw new Error("OpenRouter did not return usage cost");
      await trackUsageCreditSpend({
        customer,
        customerId: owner.organizationId,
        creditFeature: "agent",
        costUsd: cost,
        monthlyRemaining: balance.monthlyRemaining,
        properties: {
          provider: "openrouter",
          operation: "periodic_recommendations",
        },
      });
    },
  });
  const parsed: unknown = JSON.parse(
    result.text.replace(/^```(?:json)?\s*|\s*```$/g, ""),
  );
  if (!Array.isArray(parsed)) return null;
  const selected = [...new Set(parsed)].flatMap(
    (id) => candidates.find((candidate) => candidate.id === id) ?? [],
  );
  return selected.length ? selected.slice(0, 5) : null;
}

export async function refreshPeriodicRecommendations(
  projectId: string,
  force = false,
): Promise<boolean> {
  const claimedAt = await claim(
    projectId,
    new Date(Date.now() - (force ? 60 * 60 * 1000 : WEEK_MS)).toISOString(),
  );
  if (!claimedAt) return false;
  const previous = await getPeriodicRecommendations(projectId);
  try {
    const evidence = await collectRecommendationEvidence(projectId);
    const candidates = buildRecommendationCandidates(evidence);
    let items = candidates.slice(0, 5);
    let analysis: PeriodicRecommendations["analysis"] = "rules";
    try {
      const selected = await skillPrioritize(projectId, candidates);
      if (selected) {
        items = selected;
        analysis = "skills";
      }
    } catch (error) {
      console.error("[recommendations] skill analysis failed", error);
    }
    await finish(projectId, claimedAt, {
      status: candidates.length ? "ready" : "no_data",
      updatedAt: new Date().toISOString(),
      sources: evidence.sources,
      analysis,
      items,
    });
  } catch (error) {
    console.error("[recommendations] refresh failed", error);
    await finish(projectId, claimedAt, { ...previous, status: "error" });
  }
  return true;
}

// A bounded batch keeps the HTTP invocation short; the next tick continues the queue.
export async function runDuePeriodicRecommendations(limit = 3) {
  const cutoff = new Date(Date.now() - WEEK_MS).toISOString();
  const due = await db
    .select({ id: projects.id })
    .from(projects)
    .leftJoin(
      projectContextSections,
      and(
        eq(projectContextSections.projectId, projects.id),
        eq(projectContextSections.key, SECTION_KEY),
      ),
    )
    .where(
      and(
        isNull(projects.archivedAt),
        isNotNull(projects.domain),
        or(
          isNull(projectContextSections.projectId),
          lt(projectContextSections.updatedAt, cutoff),
        ),
      ),
    )
    .orderBy(asc(projectContextSections.updatedAt))
    .limit(limit);
  const results = await Promise.allSettled(
    due.map((project) => refreshPeriodicRecommendations(project.id)),
  );
  return {
    selected: due.length,
    completed: results.filter(
      (result) => result.status === "fulfilled" && result.value,
    ).length,
  };
}
