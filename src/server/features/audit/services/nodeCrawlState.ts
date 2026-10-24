import { z } from "zod";
import { normalizeUrl } from "@/server/lib/audit/url-utils";
import { isCrawlableUrl } from "@/server/lib/audit/url-policy";

export const NODE_AUDIT_MAX_PAGES = 100;
export const NODE_AUDIT_PREFIX = "node:";
export const nodeCrawlStateSchema = z.object({
  leaseUntil: z.number(),
  robots: z.string().nullable(),
  pending: z.array(
    z.object({
      url: z.string(),
      depth: z.number().nullable(),
      sitemap: z.boolean(),
    }),
  ),
  seen: z.array(z.string()),
  sitemaps: z.array(z.string()),
  seenSitemaps: z.array(z.string()),
  edges: z.record(z.string(), z.array(z.string())),
  skippedRobots: z.number(),
  recent: z
    .array(
      z.object({
        url: z.string(),
        title: z.string(),
        statusCode: z.number(),
        crawledAt: z.number(),
      }),
    )
    .default([]),
  throttle: z
    .object({
      intervalMs: z.number(),
      nextRequestAt: z.number(),
      pausedUntil: z.number(),
      consecutiveRateLimits: z.number(),
      cooldownMs: z.number(),
    })
    .optional(),
});
export type NodeCrawlState = z.infer<typeof nodeCrawlStateSchema>;

export function initialNodeCrawlState(startUrl: string): NodeCrawlState {
  return {
    leaseUntil: 0,
    robots: null,
    pending: [{ url: startUrl, depth: 0, sitemap: false }],
    seen: [startUrl],
    sitemaps: [new URL("/sitemap.xml", startUrl).href],
    seenSitemaps: [],
    edges: {},
    skippedRobots: 0,
    recent: [],
  };
}

export function enqueueNodePage(
  state: NodeCrawlState,
  raw: string,
  origin: string,
  depth: number | null,
  sitemap: boolean,
) {
  const url = normalizeUrl(raw, origin);
  if (
    !url ||
    !isCrawlableUrl(url) ||
    new URL(url).origin !== origin ||
    state.seen.includes(url) ||
    state.seen.length >= 1000
  )
    return;
  // Avoid faceted navigation/calendar traps; queried URLs can still be the explicit start page.
  if (
    new URL(url).search ||
    /\.(pdf|zip|jpg|jpeg|png|gif|svg|webp|css|js|mp4|woff2?)$/i.test(
      new URL(url).pathname,
    )
  )
    return;
  state.seen.push(url);
  state.pending.push({ url, depth, sitemap });
}

export function nodeLeaseAvailable(config: string, now: number): boolean {
  try {
    const parsed = nodeCrawlStateSchema.safeParse(JSON.parse(config).crawl);
    return parsed.success && parsed.data.leaseUntil <= now;
  } catch {
    return false;
  }
}
