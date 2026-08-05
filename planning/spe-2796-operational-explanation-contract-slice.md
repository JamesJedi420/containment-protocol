# SPE-2796 — Operational explanation contract and workshop/readiness adapters

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Linear** | SPE-2796 |
| **GitHub** | #3470 |
| **Parent** | SPE-2688 / #3270 |

## Shipped boundary in this slice

- One immutable `OperationalExplanationRecord` presentation contract.
- Stable source-derived IDs, namespaced reason codes, deterministic lifecycle/severity/code-unit ordering, validation, and summary/detail/diagnostic projections.
- Department workshop room-contamination adapter over durable work lanes, completion receipts, and the existing authored live-facility derivation.
- Department Workshop Mirror summary/detail consumer with visible non-hover reason text.
- Deployable readiness adapter over validated `ReadinessCompositionRecord` values as the second-producer proof.
- Focused contract, adapter, reconstruction, validation, and consumer tests.

## Authority boundaries

Workshop grading and persistence remain owned by the existing completion-quality resolver and durable receipt registry. Readiness score and band derivation remain owned by `deployableReadiness.ts`. Explanation state is reconstructed and is not persisted. The adapters do not inspect hidden state, infer mission suitability, add simulation mechanics, or introduce a second grading or week-close path.

## Explicit exclusions

- No explanation hydration key or independent UI state.
- No event bus, notification inbox, toast framework, interruption routing, or broad redesign.
- No mission consequence inference from readiness.
- No new workshop reason precedence, facility mapping, or completion grading.
- No claim that SPE-2688 is complete; broader producer, lifecycle, uncertainty, accessibility, and cross-surface adoption remain parent scope.

## Validation

Required before merge:

- lint;
- design-audit verification;
- backlog-handoff verification;
- external-theme-contract verification;
- full non-watch test suite;
- zero unresolved current review threads.
