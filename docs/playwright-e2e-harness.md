# Playwright E2E harness (SPE-3458)

Shared Chromium browser verification for Containment Protocol. Academy may later reuse the same config; do not add a second framework.

## Commands

| Task | Command |
| --- | --- |
| Local E2E | `npm run test:e2e` |
| CI-shaped E2E | `npm run test:e2e:ci` |
| Install Chromium | `npx playwright install chromium` |
| HTML report (after run) | `npx playwright show-report` |

Vite starts via Playwright `webServer` (`npm run dev` on `127.0.0.1:5173`). Locally, an already-running dev server is reused when `CI` is unset.

## Scope

Bounded smoke:

1. Startup + primary navigation with page-error detection
2. One Advance Week through `data-testid="topbar-advance-button"`
3. Hard reload continuity via existing Zustand `localStorage` key `containment-protocol-game-state`

Harness isolation specs live in `e2e/harness-isolation.spec.ts`.

## Artifacts

Failures retain Playwright traces and screenshots under `test-results/playwright/` and HTML under `playwright-report/`. Both are gitignored. CI uploads them from the advisory `playwright-e2e` job.

## CI selection (SPE-3348)

Playwright is registered in `scripts/validation/validators.v1.json` as `playwright-e2e`.

- **Required** when `e2e/**` or `playwright.config.ts` changes.
- **Advisory** when selected for player-path UI changes (`src/app/**`, `src/features/**`, …) without harness edits.
- **Not selected** when the change set does not match activation rules (job skips install/run).

The `playwright-e2e` job uses `emit-playwright-gate.mjs` for `selected` / `enforcement`. `continue-on-error` applies only when enforcement is not `required`. See [repository-validation-requirements.md](./repository-validation-requirements.md).

Existing Vitest/lint/governance gates run through the shared `verify:requirements` orchestrator in the `test` job (Playwright excluded there because of browser install).

## Dependency review (SPE-3458)

| Package | Version | License | Notes |
| --- | --- | --- | --- |
| `@playwright/test` | `1.64.1` | Apache-2.0 | DevDependency only; Chromium via `npx playwright install` |

Sonatype MCP was unavailable during install (`mcp_auth` timeout). npm registry metadata: maintained Apache-2.0 Playwright Test. Optional Snyk package health was not authenticated. Re-run Sonatype `/check-dependency` when MCP is ready; do not weaken lockfile discipline.

## Optional Cursor Playwright MCP

Local browser inspection only — not an implementation or approval agent.

1. Install the Playwright MCP / Cursor Playwright plugin in the Cursor UI (human install).
2. Keep credentials and MCP server lists in **local** `.cursor/mcp.json` (gitignored). Do not commit MCP config or tokens.
3. Prefer least privilege: navigate/snapshot/console against `http://127.0.0.1:5173` only.
4. Do not treat MCP sessions as CI evidence or as a rival work-selection authority.

## Flaky / unavailable environments

- Prefer one worker, Chromium-only, bounded retries (`playwright.config.ts`).
- Do not skip failing assertions to force green.
- If Vite/Chromium fails to boot, leave the failure visible and attribute underlying app/compiler defects to their owners (e.g. SPE-3375 / SPE-3376). Do not invent production debug commands for setup.

## Preflight evidence (base `5eac65c7`)

| Check | Result |
| --- | --- |
| Node | CI uses Node 22; local preflight observed Node 24 — harness targets CI Node 22 |
| `npm run dev` | Vite ready on `:5173` |
| Prior Chromium error | **Reproduced** before fix: `SyntaxError: Identifier 'buildReportCaseSnapshots' has already been declared` from `runTransfer.ts` importing and re-declaring the same binding |
| Attribution | Duplicate local export removed as SPE-3458 preflight unblock; broader TypeScript census remains SPE-3375 / SPE-3376 |
| After unblock | Front Desk renders; no page errors on cold load |

## Hermes / Cursor handoff

One approved Linear issue ([SPE-3458](https://linear.app/spectranoir/issue/SPE-3458)) owns this harness. Hermes may carry authorized handoffs; Playwright does not select work or approve backlog.
