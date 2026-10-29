# SPE-2917 — Tutorial registry and lifecycle kernel

| Field             | Value                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                    |
| **Issue**         | [SPE-2917](https://linear.app/spectranoir/issue/SPE-2917)               |
| **Parent**        | SPE-2743 (remains Backlog)                                              |
| **Branch**        | `jamesdyedbq/spe-2917-spe-2743-slice-1-versioned-tutorial-registry-and` |
| **Base main SHA** | `4bcd5ddb`                                                              |

## Selection and approval

The user explicitly requested autonomous issue selection, implementation, PR review and merge in a continuous loop on 2026-10-29. Compared SPE-3192 (required Academy branch missing), SPE-3450 (approval/prerequisite hold), SPE-792 (broader facility boundary), and SPE-3067 (larger integration). Selected this high-priority, unblocked existing child; it unlocks SPE-2918/2919. No new scope or issues created. No existing registry found; authored Front Desk tutorial choices retain their existing meaning. SPE-3043 and SPE-3121/3107 holds are untouched.

## Plan

1. Add `src/domain/tutorialLifecycle.ts`: immutable versioned registry, authored step order, validated identities and metadata references.
2. Consume caller-evaluated `ScreenRouteConditionEvaluation.passes` values for named authoritative conditions; require explicit trigger references. Missing eligibility fails closed.
3. Add pure revision-checked lifecycle commands. Preserve cursor through interruption/suppression, require explicit replay, and never execute production actions.
4. Test registry rejection, ordering, immutability, conditions/triggers, stale commands, step/flow completion, back/skip/dismiss, suppression, interruption, cancellation and replay.
5. Document API semantics; run targeted tests then repository-selected validation, review full diff, push PR, triage reviews and merge.

## Boundary

No persistence, GameState fields, UI, input/settings implementation, analytics, campaign-specific definitions, or simulation changes. Existing screen routing remains the condition authority. No dependency changes.

## Validation

Targeted Vitest (28 checks), full lint, changed-file format and handoff checks pass. Host Node is v24.18.0; no Node 22 executable was found in the installed Node locations. CI supplies required Node 22. Full CI-pool suite: 964 files and 10,461 tests passed (297.04s), using `npm run test:run:ci -- --maxWorkers=8 --reporter=dot`.

## Deferred

Persistence is SPE-2918; presentation/accessibility adapters are SPE-2919; archive/telemetry/store integration is SPE-2920. These existing children remain separate; parent is not complete.

## Pre-ship audit

Six passes: scope/integration, edge cases, determinism/state, regression, docs/authoring, and cleanup reviewed against the full approved child. Fixed sparse-array rejection and removed undeclared-field copying during the edge/immutability pass. Rechecked all passes; no remaining in-boundary findings. The existing Front Desk authored choices and production actions remain independent.

Targeted validation: 28 tests passed (tutorial registry/lifecycle plus boundary check), including canonical screen-route evaluation and no GameState mutation. Full repository lint passed; changed-file lint passed after the final test addition. Changed-file Prettier and `verify:backlog-handoff` passed. Forced TypeScript check reports existing repository diagnostics but none in tutorialLifecycle.ts or its test. Local Node is v24.18.0; Node 22 validation remains with CI. Both local vmThreads attempts were stopped after memory growth/stalling. The full suite uses the repository CI forks pool with eight workers for the final successful run; no tests or checks were removed.

Final audit correction: event triggers gate entry only; completion/resume recheck current authoritative conditions without requiring the already-consumed entry event. Regression coverage verifies both successful completion/resume and fail-closed missing current conditions. Final targeted 28 checks and changed-file lint pass after this correction. All six audit passes rechecked with no remaining findings.

Handoff status is effective on merge; Linear remains In Progress until the PR merges. Full-suite output included one existing React act warning in AffiliationPersonStatusMirrorPage.test.tsx; no test failures.

## PR review correction

Gitar identified that the typed state contract still permits suppressed state without `resumeStatus`, and malformed step arrays could throw. Added explicit status/resume-status vocabulary and array/entry validation, returning unchanged `invalid_state` with no event. Regression tests cover unknown status, missing/self resume status, unexpected resume state, non-array and sparse/invalid step arrays. Final targeted checks after the fix: 29 passed; full lint passed. The earlier full-suite result remains 964 files/10,461 tests; updated full-suite verification runs in PR CI on Node 22. Rechecked all six audit passes after the fix.
