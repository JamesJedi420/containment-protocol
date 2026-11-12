# SPE-3482 — Playwright player-smoke assert hardening + smoke-path requiredWhen

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** (PR #4499 @ `ca40c838`) |
| **Issue** | [SPE-3482](https://linear.app/spectranoir/issue/SPE-3482/playwright-player-smoke-assert-hardening-smoke-path-requiredwhen) |
| **Related** | SPE-3481 (Done), SPE-3458, SPE-3348 |
| **Branch** | `jamesdyedbq/spe-3482-playwright-player-smoke-assert-hardening-smoke-path` |
| **Base main SHA** | `f963db1a0411b5478a48a957fc8725087dc69b6c` |

## Goal

Close SPE-3481 follow-up gaps: harden hire/agency smoke asserts, add Containment Site player-path smoke, widen `playwright-e2e` requiredWhen to smoke-dependent UI surfaces, refresh harness docs.

## Boundary

In:

- `e2e/support/cpApp.ts` hire/agency assert hardening + containment helper
- `e2e/cp-smoke.spec.ts` containment smoke
- `validators.v1.json` requiredWhen expansion + selection tests
- `docs/playwright-e2e-harness.md`, `docs/repository-validation-requirements.md`
- Backlog handoff: clear stale SPE-3481 In Progress; track SPE-3482

Out:

- Unconditional Playwright for all `src/**`
- Deep sim assertions (Vitest)
- Wire unused `ContainmentSitePage` (live route is still `SystemBoundaryPage`; smoke covers that surface + Cases handoff)
- New npm deps

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Wire `ContainmentSitePage` + mutation smokes | future containment UI owner | Live `/containment-site` is still `SystemBoundaryPage` placeholder |
| Academy lifecycle E2E | Academy owners | Still deferred from SPE-3458 |

## Validation

- `npm run verify:requirements:test`
- `npx playwright test`
- `npm run verify:backlog-handoff`
