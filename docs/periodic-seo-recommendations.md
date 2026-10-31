# Periodic SEO recommendations

The dashboard shows project-specific recommendations from the last completed run. A daily scheduler processes projects that have not been checked for seven days. Each invocation handles up to three projects, so larger installations should invoke the same endpoint more often from their own scheduler.

## Data and analysis

- Search Console supplies actual query/page impressions, clicks, CTR and average position for the last 28 days.
- GA4 is joined to Search Console page opportunities when the project has a working GA4 connection. Missing or failed GA4 reads are shown as such.
- Rank tracking contributes measured drops only when a recent check and a previous position exist.
- Rules generate a bounded shortlist from observed data. When `OPENROUTER_API_KEY` and organization usage credits are available, SAM loads the bundled `seo-coach`, `keyword-research` and `seo-audit` instructions, the current project's context and up to three public page excerpts on that project's domain. It produces up to three structured action plans: decision, rationale, steps, optional title/outline and success measure. Candidate IDs and original metrics/page URLs remain server-controlled; free-text analysis is an AI suggestion, not verified fact. Missing page reads force an investigation decision with no proposed title or outline. Invalid model responses fall back to the observed shortlist. Model cost is charged to the organization's existing usage ledger.
- Results are stored under a reserved, project-scoped context key, hidden from the editable project memory. A failed refresh keeps the previous recommendations.

## Scheduling

On Vercel, set a strong `CRON_SECRET` environment variable for Production and redeploy. `vercel.json` requests `/api/recommendations/tick` daily at 04:00 UTC. The endpoint rejects requests without `Authorization: Bearer <CRON_SECRET>` and does not depend on a domain name. When moving to another host, call the same endpoint from that host's scheduler with the same header. Cloudflare's existing daily scheduled handler calls the runner directly.

The dashboard's **بررسی اکنون** button runs the current project on demand, with a one-hour minimum interval to avoid duplicate API charges.

## Automatic workflow scope

The existing schedule now automatically collects evidence, identifies opportunities,
reads selected pages, applies the bundled skills and stores action plans per project.
The recommendations screen shows the workflow outcome, page count, proposed changes
and how to measure them. Legacy snapshots remain readable without a workflow field.
This is a bounded analysis pipeline, not an autonomous publishing agent: it does not
run a new full crawl, refresh SERP checks, generate a complete article or publish to
WordPress. Those existing workflows remain separate. Skill instructions do not grant
this analysis call tools it does not have. Scheduler delivery and available model
credits are still prerequisites; UI activity alone does not enable a cron scheduler.
