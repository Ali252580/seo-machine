# Node site crawler

The existing **Site audit** screen and SAM audit tools use the Node runner on
Vercel (`VERCEL=1`). A Node deployment can select it with `AUDIT_RUNNER=node`.
It uses the existing audit database tables; no new database migration or paid
crawling provider is required. Existing subscription/capacity gates still apply.

## Operation

- Open a project → Site audit → choose up to 100 pages → start crawling.
- The start URL must match the project's configured domain. Apex/www redirects
  are allowed; cross-domain redirects are refused.
- Robots rules, sitemaps and same-origin internal links determine the frontier.
- Each page and its SEO findings are persisted. The audit's config stores the
  pending frontier, recent progress, crawl pacing and a compare-and-swap lease.
- Each batch has a 150-second soft deadline and a 240-second lease. Request
  handlers schedule it with `waitUntil`. Configure the deployment's function
  duration to at least 240 seconds. An interrupted batch can resume after its
  lease expires, and stable page IDs make replay idempotent.
- Status polling resumes available batches. The existing authenticated
  `/api/recommendations/tick` cron also resumes up to two available audit jobs.
  On Hobby's daily schedule, a job interrupted after the browser closes can
  wait until the next daily tick. On a Node host, invoke that endpoint with
  `Authorization: Bearer <CRON_SECRET>` on your chosen schedule, or call
  `runPendingNodeAudits()` within `withPgClient` from your scheduler.
- Stop preserves collected results. Delete removes the audit and its results.

## Boundaries

HTML only: no browser rendering or Lighthouse. Sitemap discovery is bounded to
20 documents; each response to 2 MiB; discovered URLs to 1,000; the audit to 100
pages. Query-string links and common binary files are excluded. Reports are a
bounded sample, not a guarantee of whole-site coverage. No GSC seed import or
unchanged-page caching is implemented in this version.

Private IPs, credentials in URLs and nonstandard ports are rejected. DNS answers
are checked and the connection is pinned to a validated IP. Each redirect is
checked separately. Robots fetch failures stop the audit rather than assuming
permission. Rate-limited/blocked pages are recorded as such, never as successful
HTML analysis. Duplicate-page and broken-link findings refer only to observed
pages; absence from this crawl is not evidence that a page does not exist.

SAM's existing `get_audit_status` / `get_audit_issues` tools read these same
project-scoped reports. The crawler does not edit or publish website content.
