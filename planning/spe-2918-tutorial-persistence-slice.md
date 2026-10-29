# SPE-2918 — Tutorial persistence and migration

| Field             | Value                                                                          |
| ----------------- | ------------------------------------------------------------------------------ |
| **Status**        | **Recently shipped**                                                           |
| **Issue**         | [SPE-2918](https://linear.app/spectranoir/issue/SPE-2918)                      |
| **Parent**        | SPE-2743 (remains Backlog)                                                     |
| **Branch**        | `jamesdyedbq/spe-2918-spe-2743-slice-2-persisted-tutorial-lifecycle-hydration` |
| **Base main SHA** | `c1187a42`                                                                     |

## Selection and plan

User authorized continuous shipping. SPE-2917 merged; select high-priority SPE-2918 before medium-priority SPE-2919. SPE-2920 remains blocked. No new issue/scope mutations. Advisor preflight returned parent_runtime_unavailable; its skill allows root work to proceed.

1. Add an optional schema-versioned `RuntimeState.tutorials` branch, bounded per-ID lifecycle records and ordered step-ID snapshots. Absent old saves remain absent; malformed siblings and unsupported future formats fail closed.
2. Reuse the lifecycle validator and existing runtime/save normalization. Add managed game-state writes plus one existing-store action; no second store or storage key.
3. Resolve definition versions lazily against explicitly registered definitions. Same-version snapshot disagreement and definition downgrades fail closed. Version upgrades preserve terminal/suppressed outcomes and completed/skipped identities. Identical step layouts retain legal cursor/progress. Structural layout changes conservatively cancel active/interrupted guidance (including suppressed resume state), retaining mapped completion history; replay requires explicit user command. No obsolete or inserted step is auto-completed or auto-activated.
4. Test production save/load and export/import, ordinary runtime writes, malformed/future/legacy saves, same-layout resume, added/removed/reordered layout cancellation, terminal/suppression preservation, replay and duplicate commands.
5. Update schema/API docs and handoff. Run specific tests, lint, required validators and six-pass audit, then PR/review/CI/merge/main sync.

## Boundary and risks

No authored tutorial, UI, campaign initialization, production action execution, input/settings, telemetry transport, or dependency change. The stored branch is guidance only. Definition-aware migration is safely derived at read and committed on the next successful managed command; hydration itself needs no authored definition catalog. Structural migration favors cancellation over silently replaying obsolete guidance. Parent remains open for the other approved children.

## Validation

See validation and audit evidence below.

## Deferred

SPE-2919 owns presentation adapters; SPE-2920 owns archive/delivery/telemetry integration. No in-boundary deferrals planned.

## Pre-ship audit and validation

Six passes completed: scope/integration (single RuntimeState branch and existing store/save authority); edge cases (malformed/future/legacy payloads, caps, identity/version mismatch); determinism/state (pure derived migrations, immutable copies, stale revision rejection, no production actions); regression (save/run-transfer/runtime and browser checks); docs/schema/handoff; cleanup (no-op commands preserve store/game object identity; unrelated legacy formatting preserved). Repeated after corrections; no remaining in-boundary findings.

Full suite: 965 files / 10,490 tests passed (`test:run:ci -- --maxWorkers=8 --reporter=dot`, 307.07s). After final no-op cleanup, focused six-file suite: 493 passed; changed-file lint passed. Full lint passed before that cleanup. Required Chromium: 11 passed, including reload continuity and week advance. Scoped Prettier and handoff validator pass. Forced compiler diagnostics exactly match the prior baseline after normalizing shifted source line/column numbers; no tutorial diagnostics. Local Node 24.18.0; PR CI verifies Node 22. No dependencies changed.

Advisor architecture and completion preflights both returned parent_runtime_unavailable; no consultation process ran and the skill explicitly permits root work to proceed. Handoff Recently shipped status below becomes effective on merge; Linear remains In Progress until the approved boundary merges.

## Independent PR review corrections

Full diff reviewed against main, including schema, normalizer, managed/store integration, migration policy, tests and handoff. Root review and Codex independently found malformed records consuming the hydration cap; the cap now counts accepted records, with a regression preserving a valid sibling after 128 malformed entries. Adopted the store updater-callback pattern requested by Amazon Q, returning the current store object for no-op commands. Added a direct production Zustand storage-envelope rehydration test. Final focused suite: 495 tests across six files passed; changed-file lint passes. All six passes rechecked; no remaining in-boundary findings.

## Quality-gate and counter boundary corrections

SonarCloud reported S3735 (fallback `void`), S2871 (implicit sort comparator), and S7744 (unnecessary empty spread). Replaced the fallback exclusion with deletion on a local clone, used an explicit code-point comparator matching the registry, and removed the redundant spread fallback. No validation rules were weakened. A final counter-boundary probe found that the last safe completion revision could be generated but then rejected by hydration; structural validation now preserves exhausted safe counters while command execution prevents further increments. Regression covers save/load preservation, stale delivery and overflow refusal. Focused six-file suite: 496 passed; final two-file suite after the last assertion: 59 passed; changed-file lint passes. Six audit passes rechecked.

## Final progress-coherence and migration-boundary review

Added semantic hydration checks so well-typed but contradictory active/suppressed records cannot replay completed steps; terminal migration snapshots remain valid. Gitar identified the corresponding upgrade boundary after counters became inclusive: version migration now increments safely or retains a saturated read-only MAX revision, preserving completed upgrades at MAX-1 and MAX without permitting further commands. Added same-layout/structural upgrade regressions for both boundaries. Focused six-file suite: 499 passed; lint passed. No scope expansion or new storage authority.
