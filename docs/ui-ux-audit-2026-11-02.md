# Application audit — 2026-11-02

## Scope and confirmed fixes

Reviewed project routes, draft transfer, domain research, saved keywords, rank history,
project context, shared chat actions, browser storage and clipboard callers.

- Chat actions were hidden until hover, including on touch devices. They are now
  visible on small screens and when keyboard focus enters the action bar.
- Chat, saved keyword selection, rank history, domain tables and support clipboard
  actions now wait for the browser and report permission failures. Failed copies
  do not show success or emit successful-copy analytics.
- Saved keywords and rank history distinguish query failure from an empty result,
  with a retry action. Project context also has a retry action.
- Moving an article from SAM to the editor now stops with a recoverable message
  if session storage is unavailable, rather than navigating without the article.
- Domain debugging no longer crashes domain queries and filter actions when
  browser storage is blocked.
- The obsolete dashboard test requiring external MCP setup now matches the
  existing in-app onboarding behavior; runtime onboarding was not changed.

## Verification

Before changes, the full Vitest run completed with 190 passing files and 9 failing
files: 1,449 passed tests, 20 failed tests and 3 unhandled errors. The failures were:

- `dashboardSteps.test.ts`: outdated external MCP step expectation (corrected).
- `subscription.test.ts`: old Autumn mocks versus current database billing.
- `RankCheckWorkflow.test.ts`, DataForSEO `client.test.ts`, and
  `promptExplorer.test.ts`: incomplete Cloudflare runtime mocks.
- `GoogleAccountService.test.ts`: Windows locked temporary SQLite file at cleanup.
- `pr-preview-access.test.ts`: Bash execution failures/timeouts on this host.
- MCP `oauth-provider.test.ts` and `oauth-refresh.e2e.test.ts`: timeouts in the full run.

After fixes, the targeted client/domain/content/rank/dashboard suite passed all
85 tests in 20 files. New regression tests first reproduced denied clipboard and
blocked-storage failures. TypeScript validation passed.

## Follow-up verification

The follow-up full run passed **1,495 tests in 201 files** using
`node node_modules/vitest/vitest.mjs run --maxWorkers=4 --reporter=dot`.
No test suites were skipped or timeouts increased. Four workers avoid the import
contention observed during the initial unrestricted run on this Windows host.

- Replaced obsolete Autumn assertions with SQLite wallet checks: repeat customer
  setup preserves spent credits, organizations stay isolated, depleted wallets
  are denied and database failures do not grant access.
- Fixed a production bug found by the new test: telemetry failure no longer
  replaces the depleted-credit response used by SAM and image generation.
- Updated provider and rank-workflow mocks to the current wallet interface;
  provider tests still cover metering billed failures and rejecting calls before
  execution when credits are exhausted.
- Google removal tests use one in-memory SQLite connection, including explicit
  transaction commit/rollback, avoiding native file-handle cleanup on Windows.
- Preview Access shell tests use Git Bash on Windows rather than the system WSL
  launcher. Access checks themselves remain unchanged.
- Prompt-explorer fixtures now include the runtime environment export.
- MCP OAuth tests passed in the full run without changing their assertions.

## Not verified

No authenticated production browser, real phone, live payment, Google OAuth, or
WordPress publishing test was performed. Mobile changes are code-level fixes;
visual verification and deployment status remain unconfirmed. This is an audit
of the inspected paths, not a claim that the entire product is defect-free.
