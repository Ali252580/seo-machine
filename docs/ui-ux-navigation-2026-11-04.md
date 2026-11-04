# Shared navigation UX — 2026-11-04

Reviewed the shared sidebar, project picker, pagination, sortable headers and
route error/404 states used across project sections.

- Added the missing page-writing entry and grouped pages, blog, recommendations
  and reports under content/site improvement. Context now sits beside Dashboard.
- Sidebar labels wrap instead of truncating; links have 44px minimum targets and
  visible keyboard focus. All project links retain the current project ID.
- Shared pagination uses Persian labels/numbers, RTL arrows, wrapping controls,
  and disables navigation/page size changes during loading. Unknown totals no
  longer imply a full page of results.
- Project selection distinguishes loading, empty and failed queries, with retry.
- Error and missing-page screens have Persian explanations and recovery actions.

Verification: 202 client tests passed, plus 2 project-picker tests added afterward.
TypeScript passed including the final tests. Isolated Chrome checks
verified pagination next/last-page behavior, page-size reset and no horizontal
overflow at 320, 390 and 1280px; the 320px screenshot was visually reviewed.

No authenticated production walkthrough or live provider calls were performed.
This covers shared navigation controls, not every feature's complete workflow.
