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
