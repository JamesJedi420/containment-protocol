# SPE-3348 — Repository validation requirement orchestration

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3348](https://linear.app/spectranoir/issue/SPE-3348/repository-validation-requirement-orchestration) |
| **Parent** | none (shared-system parent; no children) |
| **Branch** | `jamesdyedbq/spe-3348-repository-validation-requirement-orchestration` |
| **Base main SHA** | `d28e81f7` |

## Approved boundary

- Machine-readable change-class → validator registry (`scripts/validation/validators.v1.json`)
- Deterministic resolver + missing-required detection (`requirement-model.mjs`)
- Local/CI runner parity (`run-requirements.mjs`, `npm run verify:requirements`)
- Register existing validators (lint, unit-tests, format-check, audits-index, backlog-handoff, theme-contracts, governance-contract, architecture-index, playwright-e2e, academy-authored-content stub for SPE-3304)
- Playwright: required for harness path changes; advisory for player-path UI; not an unconditional CI flip
- Expand Chromium smoke with primary Agents roster path
- Docs: `docs/repository-validation-requirements.md` + Playwright harness CI notes
- Selection tests: `npm run verify:requirements:test`

## Out of boundary

- Redefining SPE-3304 Academy authored-content rules
- Implementing SPE-3271 governance projection conformance (may register later)
- Gameplay / GameState / runtime behavior
- Dependency-security or hosting policy candidates
- Weakening mandatory validators to pass unrelated changes

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Academy authored-content npm script + semantics | SPE-3304 | Orchestrator registers selection only; fail-closed when unavailable |
| Broader governance surface projection | SPE-3271 | Separate validator registration when shipped |
| Unconditional Playwright required on all PRs | — | Rejected; path-selected required/advisory only |

## Validation

- `npm run verify:requirements:test`
- `npm run verify:requirements -- --files …` (deterministic fixtures via tests)
- `npm run lint` / `npm run test:run` as selected
- `npm run verify:backlog-handoff` when planning touched
- `npm run test:e2e` for smoke expansion
