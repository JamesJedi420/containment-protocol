# SPE-3481 — Playwright player-critical path gate + acceptance smokes

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3481](https://linear.app/spectranoir/issue/SPE-3481/playwright-player-critical-path-gate-acceptance-smokes) |
| **Related** | SPE-3348 (orchestrator), SPE-3458 (harness) |
| **Branch** | `jamesdyedbq/spe-3481-playwright-player-critical-path-gate-acceptance-smokes` |
| **Base main SHA** | `19da0a41587e116179b97fc51c4dc0d31b3d243b` |

## Goal

Promote Chromium Playwright to **required** for a small set of player-critical paths (Front Desk, Advance Week control, campaign persist), and grow smokes along shipped player acceptance so CI answers whether a player can complete the loop in a browser.

## Boundary

In:

- `scripts/validation/validators.v1.json` `playwright-e2e.requiredWhen` expansion
- requirement-model selection tests + `docs/repository-validation-requirements.md`
- Playwright helpers + smokes for: launch/open a case, hire and/or assign, one agency action (plus existing Front Desk / Advance Week / persist)

Out:

- Unconditional Playwright for all `src/**`
- Deep sim assertions (remain Vitest)
- New npm dependencies

## Deferred

None planned for this slice.

## Validation

- `npm run verify:requirements:test`
- `npx playwright test` (or `npm run test:e2e`)
- `npm run verify:backlog-handoff`
