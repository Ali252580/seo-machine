import { and, eq, like } from "drizzle-orm";
import robotsParser from "robots-parser";
import { XMLParser } from "fast-xml-parser";
import { db, withPgClient } from "@/db";
import { audits } from "@/db/schema";
import { AuditRepository } from "../repositories/AuditRepository";
import { nodeAuditFetch } from "@/server/lib/audit/node-fetch";
import { crawlPage } from "@/server/workflows/site-audit-workflow-helpers";
import { createCrawlThrottle } from "@/server/lib/audit/crawl-throttle";
import { deterministicAuditRowId } from "@/server/lib/audit/ids";
import {
  runPageReporters,
  type DetectedIssue,
} from "@/server/lib/audit/issues/page-reporters";
import { runMultipageChecks } from "@/server/lib/audit/issues/multipage";
import { parseAuditConfig } from "@/server/lib/audit/types";
import {
  enqueueNodePage,
  nodeCrawlStateSchema,
  nodeLeaseAvailable,
  NODE_AUDIT_PREFIX,
} from "./nodeCrawlState";

const BATCH_MS = 150_000;
const LEASE_MS = 240_000;
const sitemapParser = new XMLParser({
  isArray: (name) => name === "url" || name === "sitemap",
});

/** Each hop is IP-checked; document discovery never follows an off-site redirect. */
async function documentFetch(url: string, origin: string): Promise<Response> {
  for (let i = 0; i < 5; i++) {
    if (new URL(url).origin !== origin)
      throw new Error("Off-site discovery redirect");
    const response = await nodeAuditFetch(url);
    if (response.status < 300 || response.status >= 400) return response;
    const next = response.headers.get("location");
    if (!next) return response;
    url = new URL(next, url).href;
  }
  throw new Error("Too many discovery redirects");
}

export async function resolveNodeStartUrl(start: string): Promise<string> {
  let current = start;
  const host = new URL(start).hostname.replace(/^www\./, "");
  for (let i = 0; i < 5; i++) {
    if (new URL(current).hostname.replace(/^www\./, "") !== host)
      throw new Error("Start URL redirects outside the project domain");
    const response = await nodeAuditFetch(current);
    if (
      response.status < 300 ||
      response.status >= 400 ||
      !response.headers.get("location")
    )
      return current;
    current = new URL(response.headers.get("location")!, current).href;
  }
  throw new Error("Too many start URL redirects");
}

export async function runNodeAudit(auditId: string, projectId: string) {
  return withPgClient(async () => {
    const audit = await AuditRepository.getAuditForProject(auditId, projectId);
    if (
      !audit ||
      audit.status !== "running" ||
      !audit.workflowInstanceId?.startsWith(NODE_AUDIT_PREFIX) ||
      !nodeLeaseAvailable(audit.config, Date.now())
    )
      return;
    const config = parseAuditConfig(audit.config);
    if (!config) return;
    const state = nodeCrawlStateSchema.parse(JSON.parse(audit.config).crawl);
    state.leaseUntil = Date.now() + LEASE_MS;
    let stored = audit.config;
    const where = () =>
      and(
        eq(audits.id, auditId),
        eq(audits.projectId, projectId),
        eq(audits.status, "running"),
        eq(audits.config, stored),
      );
    const checkpoint = async (pagesCrawled: number, phase: string) => {
      const next = JSON.stringify({ ...config, crawl: state });
      const updated = await db
        .update(audits)
        .set({
          config: next,
          pagesCrawled,
          pagesTotal: Math.min(
            config.maxPages,
            state.seen.length - state.skippedRobots,
          ),
          currentPhase: phase,
        })
        .where(where())
        .returning({ id: audits.id });
      if (!updated.length) throw new Error("Crawl lease lost or audit removed");
      stored = next;
    };
    // Compare-and-swap elects one runner even when cron and browser polling overlap.
    const leased = JSON.stringify({ ...config, crawl: state });
    const claimed = await db
      .update(audits)
      .set({ config: leased })
      .where(where())
      .returning({ id: audits.id });
    if (!claimed.length) return;
    stored = leased;
    let crawled = audit.pagesCrawled;
    const deadline = Date.now() + BATCH_MS;
    const origin = new URL(audit.startUrl).origin;
    try {
      if (state.robots === null) {
        const response = await documentFetch(`${origin}/robots.txt`, origin);
        if (!response.ok && response.status !== 404 && response.status !== 410)
          throw new Error(
            `robots.txt unavailable (${response.status}); crawl stopped`,
          );
        state.robots = response.ok
          ? (await response.text()).slice(0, 500 * 1024)
          : "";
        const robots = robotsParser(`${origin}/robots.txt`, state.robots);
        state.sitemaps.push(
          ...robots
            .getSitemaps()
            .filter((url) => {
              try {
                return new URL(url).origin === origin;
              } catch {
                return false;
              }
            })
            .slice(0, 20),
        );
        await checkpoint(crawled, "discovery");
      }
      const robots = robotsParser(`${origin}/robots.txt`, state.robots);
      const delay =
        Math.max(1, robots.getCrawlDelay("OpenSEO-Audit") ?? 1) * 1000;
      if (delay > 30_000)
        throw new Error(
          "Requested crawl delay exceeds this runner's limit; no pages fetched",
        );
      // Bound sitemap work and checkpoint each document, including sitemap indexes.
      while (
        state.sitemaps.length &&
        state.seenSitemaps.length < 20 &&
        Date.now() < deadline - 20_000
      ) {
        const url = state.sitemaps[0];
        if (
          !state.seenSitemaps.includes(url) &&
          new URL(url).origin === origin &&
          robots.isAllowed(url, "OpenSEO-Audit") !== false
        ) {
          const response = await documentFetch(url, origin);
          if (response.status === 429 || response.status >= 500)
            throw new Error(
              `Sitemap temporarily unavailable (${response.status})`,
            );
          if (response.ok) {
            const parsed = sitemapParser.parse(await response.text());
            for (const entry of parsed?.urlset?.url ?? []) {
              if (typeof entry.loc === "string")
                enqueueNodePage(state, entry.loc, origin, null, true);
            }
            for (const entry of parsed?.sitemapindex?.sitemap ?? []) {
              if (typeof entry.loc === "string" && state.sitemaps.length < 20) {
                try {
                  if (
                    new URL(entry.loc).origin === origin &&
                    !state.seenSitemaps.includes(entry.loc)
                  )
                    state.sitemaps.push(entry.loc);
                } catch {
                  /* Ignore invalid sitemap entries. */
                }
              }
            }
          }
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(delay, 30_000)),
          );
        }
        state.seenSitemaps.push(url);
        state.sitemaps.shift();
        await checkpoint(crawled, "discovery");
      }
      const throttle = createCrawlThrottle(
        deadline - 20_000,
        state.throttle ?? {
          intervalMs: delay,
          nextRequestAt: Date.now(),
          pausedUntil: 0,
          consecutiveRateLimits: 0,
          cooldownMs: 0,
        },
        async (next) => {
          state.throttle = next;
          await checkpoint(crawled, "crawling");
        },
      );
      while (
        state.pending.length &&
        crawled < config.maxPages &&
        Date.now() < deadline - 20_000
      ) {
        const entry = state.pending[0];
        if (robots.isAllowed(entry.url, "OpenSEO-Audit") === false) {
          state.pending.shift();
          state.skippedRobots++;
          await checkpoint(crawled, "crawling");
          continue;
        }
        const page = await crawlPage(
          entry.url,
          entry.depth,
          entry.sitemap,
          throttle,
          nodeAuditFetch,
        );
        if (!page) break;
        page.id = await deterministicAuditRowId(auditId, page.url);
        await AuditRepository.insertCrawledBatch(
          auditId,
          [page],
          runPageReporters(page),
        );
        state.edges[page.url] = page.links
          .filter((link) => link.isInternal)
          .slice(0, 500)
          .map((link) => link.targetUrl);
        for (const target of state.edges[page.url])
          enqueueNodePage(
            state,
            target,
            origin,
            entry.depth === null ? null : entry.depth + 1,
            false,
          );
        if (page.redirectUrl)
          enqueueNodePage(state, page.redirectUrl, origin, entry.depth, false);
        state.pending.shift();
        crawled++;
        state.throttle = throttle.state;
        state.recent = [
          {
            url: page.url,
            title: page.title.slice(0, 300),
            statusCode: page.statusCode,
            crawledAt: Date.now(),
          },
          ...state.recent,
        ].slice(0, 100);
        await checkpoint(crawled, "crawling");
        if (page.statusCode === 429)
          throw new Error("Site rate limit reached; partial results retained");
      }
      if (
        (!state.pending.length &&
          (!state.sitemaps.length || state.seenSitemaps.length >= 20)) ||
        crawled >= config.maxPages
      ) {
        await checkpoint(crawled, "finalizing");
        const pages = await AuditRepository.getPagesForAudit(auditId);
        if (
          !pages.some(
            (page) =>
              page.fetchClass === "ok" &&
              (page.statusCode ?? 0) >= 200 &&
              (page.statusCode ?? 0) < 300,
          )
        ) {
          throw new Error(
            "No accessible pages were crawled; check robots.txt and site access",
          );
        }
        const byUrl = new Map(pages.map((page) => [page.url, page]));
        const issues: DetectedIssue[] = await runMultipageChecks({ auditId });
        for (const [source, targets] of Object.entries(state.edges)) {
          for (const target of targets) {
            const destination = byUrl.get(target);
            if (
              destination &&
              (destination.statusCode ?? 0) >= 400 &&
              destination.fetchClass === "ok"
            ) {
              issues.push({
                issueType: "broken-internal-link",
                pageId: byUrl.get(source)?.id ?? null,
                pageUrl: source,
                details: {
                  targetUrl: target,
                  statusCode: destination.statusCode,
                },
                dedupeKey: target,
              });
            }
          }
        }
        await AuditRepository.insertIssues(auditId, issues);
        await AuditRepository.completeAudit(auditId, audit.workflowInstanceId, {
          pagesCrawled: crawled,
          pagesTotal: crawled,
        });
      } else {
        state.leaseUntil = 0;
        await checkpoint(crawled, "crawling");
      }
    } catch (error) {
      await db
        .update(audits)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          currentPhase: "failed",
          errorCode: "unknown",
          errorDetail: (error instanceof Error
            ? error.message
            : String(error)
          ).slice(0, 1000),
          failedPhase: "crawling",
        })
        .where(where());
    }
  });
}

/** Cron resumes interrupted batches; the same entry point can be scheduled on a Node host. */
export async function runPendingNodeAudits() {
  const rows = await db
    .select()
    .from(audits)
    .where(
      and(
        eq(audits.status, "running"),
        like(audits.workflowInstanceId, `${NODE_AUDIT_PREFIX}%`),
      ),
    )
    .limit(100);
  const due = rows
    .filter((row) => nodeLeaseAvailable(row.config, Date.now()))
    .slice(0, 2);
  await Promise.all(due.map((row) => runNodeAudit(row.id, row.projectId)));
  return { resumed: due.length };
}
