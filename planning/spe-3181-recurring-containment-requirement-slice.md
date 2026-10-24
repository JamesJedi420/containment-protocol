# SPE-3181 — Recurring containment requirement fulfillment and deficiency

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-3181](https://linear.app/spectranoir/issue/SPE-3181)                                      |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                             |
| **Branch**        | `jamesdyedbq/spe-3181-recurring-containment-requirement-fulfillment-and-deficiency`            |
| **Base main SHA** | `3c65f387f00468231742aa739b00911a17399396`                                                     |

## Approved boundary

Caller-owned definition/evaluation packets in `src/domain/containmentRequirementFulfillment.ts` plus their smallest approved GameState/save integration:

- Stable requirement id + subjectRef; information vs material/service families
- Cadence window evaluation from caller-supplied campaign week (SPE-1071 consume)
- Fulfillment against referenced inputs with quantity/quality/freshness/novelty/repetition gates
- Pending → satisfied / deficient states; recovery when authored; idempotent same-window fulfill
- Durable packet hydrate/round-trip and required closed-window history markers
- Optional canonical `GameState.containmentRequirementStates` registry, validated in the existing `runTransfer.ts` import/export path; manual saves and legacy run exports use that same path
- SPE-3041 activation *intent* emission only when `createsWork` (passive never mints tasks)
- SPE-1135 duty *consumption* projection; requirement remains authority
- Explainable status packet for existing surfaces

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Week-close / authored cadence evaluation | SPE-3181 consuming SPE-1071 / SPE-1052 | Current persisted-window expiry now evaluated at authoritative `advanceWeek`; new cadence-window authoring/rollover remains external |
| Live SPE-3041 activation into SPE-1287 queue | SPE-3041 | Intent seam only |
| Duty registry implementation | SPE-1135 | Consumption projection only |
| Procedure/labor eligibility truth | SPE-874 / SPE-1058 | External refs |
| Facility register UI | SPE-3359 | No UI |

## Validation

- `npm exec vitest run -- src/test/containmentRequirementFulfillment.contract.test.ts`
- `npm run verify:backlog-handoff`

## Review corrections and incomplete acceptance

Post-PR review identified contradictory persistence, unreachable states, unsafe recovery chronology and cross-subject activation collisions. The current bounded domain implementation:

- validates and freezes authored/default constraints, including strict optional boolean types;
- uses one documented pending → satisfied/deficient lifecycle, without inventing a separate grace period or private clock;
- hydrates only consistent settled-window markers and fulfillment metadata, rejecting duplicate replay markers;
- provides `advanceContainmentRequirementWindow` for strictly later windows, preserving prior fulfillment, novelty and SPE-3041 emission history, requiring the previous window to be settled;
- prevents backdated deficiency recovery and any later fulfillment from moving durable last-fulfillment time backward;
- requires caller-provided canonical campaign week when projecting **or marking** a SPE-3041 activation intent; refuses both premature and after-window emission;
- includes subject, requirement and window identities in a collision-safe activation key;
- treats each window as satisfied by one accepted complete fulfillment. A zero per-window repetition limit denies the attempt; positive limits are necessarily redundant under this bounded single-fulfillment contract, not a new partial-contribution task system;
- tests these paths through exported APIs rather than hand-crafted synthetic histories.

**Completion guardrail:** These are definition/runtime packets, an additive canonical GameState save/load registry, intent/projection **seams** and tests. The issue's full completion rule also calls for canonical GameState/week-close consumption, actual SPE-3041 work activation when work is produced, SPE-1135 duty consumption and explainability through existing consumer surfaces. Those integrations are **not implemented** by this PR, whose status is intentionally Draft. No new Linear owner, relation, issue or duplicate scheduler is approved by this document. Keep SPE-3181 open (currently **In Review** in Linear, with **In progress** as the repository handoff label) and SPE-1052 Backlog until full acceptance has verified evidence.

**Verification:** review findings tracked in [PR #4356](https://github.com/JamesJedi420/containment-protocol/pull/4356). At this checkpoint latest full CI and independent review remain pending; earlier-successful runs do not establish latest-head validation.

## Additional persisted-window integrity (2026-10-23)

The latest approved-in-boundary review hardening adds the following to the still-unshipped pure packet contract:

- **`processedWindowIds` is required** on runtime packets and hydration. The constructor initializes it empty. Each transition to the next authoritative window records the outgoing **satisfied or deficient** window ID; replay of *any* previously processed ID is rejected, including a passive deficiency that emitted no task. This state has not been merged or installed in a live save schema, so it must not be represented as a released migration.
- Hydration validates unique markers and relationships among closed-window IDs, fulfilled IDs and emitted-intent IDs. An absent `processedWindowIds` in a purported current packet is rejected rather than silently losing an older deficient-window marker.
- Hydration rejects fabricated `satisfied` records under `repetitionMaxPerWindow: 0` and rejects a late settled fulfillment where `allowsRecoveryAfterDeficiency` is false. Legitimate explicitly authored late recovery still round-trips.
- SPE-3041 work activation is also blocked if the proposed campaign week precedes the most recently recorded fulfillment, even if an older window's cadence bounds contain that week. The owning SPE-1071 caller must still supply genuine authoritative time and each successive cadence window; this helper is not a scheduler.
- The in-branch regression tests cover all four failure modes and preserve existing valid cases.

**Important distinction:** This is a stricter **unshipped packet format**, not proof of an installed GameState field, migration, live SPE-3041 queue, duty registry, or UI. Those remain under the already-approved SPE-3181 completion requirements and canonical subsystem owners. PR #4356 must remain **Draft** and SPE-3181 open (**In Review** in Linear; **In progress** in the repository handoff), not Done, until those integrations and their end-to-end acceptance evidence are verified.

## Canonical GameState persistence integration — current draft

The existing `src/app/store/runTransfer.ts` import/export and `src/app/store/saveSystem.ts` wrappers are the **single canonical** persistence path for SPE-3181 data. The domain package provides `ContainmentRequirementRegistry`, `containmentRequirementRegistryKey(subjectRef, requirementId)`, and a fail-closed registry parser. `GameState.containmentRequirementStates` is optional for backward-compatible saves. If the field is present but invalid, save/export and hydrate/import **reject** it rather than silently clearing replay markers. The parser limits registry size to 256, validates subject+requirement keys and each history packet, and preserves per-subject identity.

This is an additive optional-field migration for legacy saves: a legacy save without the field continues to load with no synthesized requirement history; the existing save schema wrapper does not require a format-version bump for an optional additive field. It does **not** migrate or reconstruct nonexistent historical requirements, auto-activate work, or implement the shared calendar. The new `saveSystem.test.ts` cases exercise different subject requirement families, a missed-window marker, persisted fulfillment, repeated import/export, malformed registries, and legacy omissions.

This work is unmerged in PR #4356. Although it closes part of SPE-3181's persistence obligation, **authoritative generation/rollover of successive cadence windows, task enqueue via SPE-3041/SPE-1287, SPE-1135 duty consumption and consumer explainability remain incomplete**. Do not merge it as full SPE-3181 completion, or duplicate Backlog-owned queue/duty/calendar implementations inside this issue.

## Authoritative week-close expiry consumption — current draft

`src/domain/sim/advanceWeek.ts` now calls `advanceContainmentRequirementsAtWeekClose` in its existing `advanceQueues` stage, **after** `settleWeekState` has advanced the canonical `GameState.week`. That helper reads the existing persisted `GameState.containmentRequirementStates`, evaluates each current window in deterministic key order via `evaluateRequirementAgainstCampaignWeek`, and replaces the frozen registry only when a state actually changes. Expired pending windows become deficient on the first canonical week following their `endWeek`; satisfied or already-deficient requirements are idempotent. A missing/empty registry is a no-op. The caller does not create a new clock, new cadence windows, artificial tasks, duty records, resource settlements or synthetic events. This is **expiry evaluation only**, not full SPE-1071 calendar/cadence support.

New `containmentRequirementFulfillment.contract.test.ts` integration tests exercise an actual `advanceWeek` crossing, multiple subject requirement states, a passive deficiency with no synthesized activation, save/load continuation, idempotence, and legacy no-registry state. Existing SPE-3041/SPE-1287 and SPE-1135 owners still control real activation/obligation consumption; **those integrations and existing consumer explainability remain incomplete**. PR stays Draft. Do not mark SPE-3181 complete until the full acceptance rule has direct evidence.

## Visibility gate for existing containment status surfaces (2026-10-23)

The approved SPE-3181 completion rule requires explaining current requirement state through **existing** planning/status surfaces, without a new parallel UI. The existing `src/features/containment/ContainmentSitePage.tsx` consumes `GameState` through `useGameStore` and shows incident/case-derived pressure through `buildEncounterStructureState` and `buildEndgameScalingState`. It is **not** evidence that an arbitrary `ContainmentRequirementDefinition.subjectRef` is a player-visible case or authorized to be displayed: SPE-3181 expressly permits contained anomalies, entities, objects, and other non-case subjects.

**Before presenting a requirement row:** the owning subject/information visibility authority must supply a proven visible subject binding, including an allowed display label and permitted requirement detail level. Do not equate `subjectRef` with a `CaseInstance.id` without an authored binding. Raw `subjectRef`, `requirementId`, `fulfillmentRef`, input/procedure/resource/personnel references, `deficiencyConsequenceRef`, and opaque `reasonCodes` must not be surfaced merely because a packet exists in `GameState.containmentRequirementStates`. Status presentation must consume `projectExplainableRequirementStatus` or another approved read-only projection; any public strings must be visibility-filtered and human-explainable, and projection must never mutate requirement authority or enqueue work.

**Disposition:** visibility/read authority is a prerequisite contradiction check **inside the already-approved SPE-3181 consumer-explainability boundary**, not authorization to invent another knowledge system or a new Linear issue. No Containment Control UI integration is claimed by the current PR. If the needed binding belongs to another canonical owner and is not already approved, reconcile it through the project's Phase 1 → 2 → 3 scope gates before changing relationships or implementation ownership. Keep this draft unmerged and SPE-3181 open until the existing-surface acceptance case is validated without hidden-information leakage.

**Verification checkpoint:** prior head `7e71045a7a0abaad951fae456c8be986a33cc33d` passed full CI workflow [#40021596709](https://github.com/JamesJedi420/containment-protocol/actions/runs/40021596709). This documentation-only change requires its own latest-head CI verification; do not infer it from the previous head. No recurring task queue, duty registry, calendar authority, subject visibility projection or UI was created as part of this checkpoint.
