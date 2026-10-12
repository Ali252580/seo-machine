# Periodic SEO recommendations

The dashboard shows project-specific recommendations from the last completed run. A daily scheduler processes projects that have not been checked for seven days. Each invocation handles up to three projects, so larger installations should invoke the same endpoint more often from their own scheduler.

## Data and analysis

- Search Console supplies actual query/page impressions, clicks, CTR and average position for the last 28 days.
- GA4 is joined to Search Console page opportunities when the project has a working GA4 connection. Missing or failed GA4 reads are shown as such.
- Rank tracking contributes measured drops only when a recent check and a previous position exist.
- Rules generate a bounded shortlist from observed data. When `OPENROUTER_API_KEY` and organization usage credits are available, SAM loads the bundled `seo-coach`, `keyword-research` and `seo-audit` skill instructions to prioritize that shortlist. The AI may select only existing candidate IDs; it cannot invent metrics or pages. Its model cost is charged to that organization's usage ledger. Rules remain available if the model is unavailable.
- Results are stored under a reserved, project-scoped context key, hidden from the editable project memory. A failed refresh keeps the previous recommendations.

## Scheduling

On Vercel, set a strong `CRON_SECRET` environment variable for Production and redeploy. `vercel.json` requests `/api/recommendations/tick` daily at 04:00 UTC. The endpoint rejects requests without `Authorization: Bearer <CRON_SECRET>` and does not depend on a domain name. When moving to another host, call the same endpoint from that host's scheduler with the same header. Cloudflare's existing daily scheduled handler calls the runner directly.

The dashboard's **بررسی اکنون** button runs the current project on demand, with a one-hour minimum interval to avoid duplicate API charges.
