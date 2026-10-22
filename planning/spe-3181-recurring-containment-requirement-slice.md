# SPE-3181 — Recurring containment requirement fulfillment and deficiency

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-3181](https://linear.app/spectranoir/issue/SPE-3181)                                      |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                             |
| **Branch**        | `jamesdyedbq/spe-3181-recurring-containment-requirement-fulfillment-and-deficiency`            |
| **Base main SHA** | `3c65f387f00468231742aa739b00911a17399396`                                                     |

## Approved boundary

Pure caller-owned packets in `src/domain/containmentRequirementFulfillment.ts`:

- Stable requirement id + subjectRef; information vs material/service families
- Cadence window evaluation from caller-supplied campaign week (SPE-1071 consume)
- Fulfillment against referenced inputs with quantity/quality/freshness/novelty/repetition gates
- Pending → satisfied / deficient states; recovery when authored; idempotent same-window fulfill
- Durable packet hydrate/round-trip (no GameState field this slice)
- SPE-3041 activation *intent* emission only when `createsWork` (passive never mints tasks)
- SPE-1135 duty *consumption* projection; requirement remains authority
- Explainable status packet for existing surfaces

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| GameState / week-close wire | SPE-1052 / follow-up | Pure packets first |
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

**Completion guardrail:** These are pure definition/runtime packets, durable packet round-trips, intent/projection **seams** and tests. The issue's full completion rule also calls for canonical GameState/week-close consumption, actual SPE-3041 work activation when work is produced, SPE-1135 duty consumption and explainability through existing consumer surfaces. Those integrations are **not implemented** by this PR, whose status is intentionally Draft. No new Linear owner, relation, issue or duplicate scheduler is approved by this document. Keep SPE-3181 In Progress and SPE-1052 Backlog until full acceptance has verified evidence.

**Verification:** review findings tracked in [PR #4356](https://github.com/JamesJedi420/containment-protocol/pull/4356). At this checkpoint latest full CI and independent review remain pending; earlier-successful runs do not establish latest-head validation.
