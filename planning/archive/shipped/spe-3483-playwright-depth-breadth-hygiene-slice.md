# SPE-3483 — Playwright depth, gate breadth, and hygiene follow-through

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** (PR #4501 @ `5b01b9bc`) |
| **Issue** | [SPE-3483](https://linear.app/spectranoir/issue/SPE-3483/playwright-depth-gate-breadth-and-hygiene-follow-through) |
| **Related** | SPE-3481, SPE-3482 (Done), SPE-3458, SPE-3348 |
| **Branch** | `jamesdyedbq/spe-3483-playwright-depth-gate-breadth-and-hygiene-follow-through` |
| **Base main SHA** | `ca40c8380c46b41b7fb1cec7e17a146971c750d1` |

## Goal

Close remaining SPE-3481 gap-assessment follow-through: **depth** (manual Assign smoke), **gate breadth** (requiredWhen for shell/assign surfaces), **hygiene** (stale SPE-3482 handoff, CI comment, harness Scope list).

## Boundary

In:

- Manual Assign Chromium smoke + `cpApp` helper (distinct from Mission Board Launch)
- `validators.v1.json` requiredWhen: `AppShell.tsx`, `CaseDetailPage.tsx`, `caseView.ts` (smoke-path surfaces)
- Selection tests + harness Scope docs + workflow comment
- Backlog handoff: SPE-3482 → Recently shipped; SPE-3483 In Progress

Out:

- Unconditional Playwright for all `src/**`
- Wiring unused `ContainmentSitePage` product route
- Deep sim / Academy E2E
- New npm deps

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Wire `ContainmentSitePage` + mutation smokes | future containment UI owner | Live route remains `SystemBoundaryPage` |
| Academy lifecycle E2E | Academy owners | Deferred from SPE-3458 |

## Validation

- `npm run verify:requirements:test`
- `npx playwright test`
- `npm run verify:backlog-handoff`
