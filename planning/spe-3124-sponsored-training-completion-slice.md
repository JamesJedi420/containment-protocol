# SPE-3124 — Sponsored training completion and personnel transfer

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3124](https://linear.app/spectranoir/issue/SPE-3124) |
| **Parent** | [SPE-2794](https://linear.app/spectranoir/issue/SPE-2794) — persistent assignment lifecycle (umbrella) |
| **Branch** | `jamesdyedbq/spe-3124-sponsored-training-completion-and-personnel-transfer` |
| **Base main SHA** | `22ba1174` |

## Approved boundary

- Pure domain `src/domain/sponsoredTrainingCompletion.ts` — sponsored assignment packets, SPE-2794-shaped lifecycle enums (local until parent ships), idempotent closeout orchestration, trainee spawn guard, outcome bundle refs (payment/reimbursement/trust as compact refs)
- Permanent personnel ownership mutations only via SPE-2738 `authorizeTransferRequest` + `completeOwnershipTransfer` on `transfer_ownership` branch
- Vitest `src/domain/sponsoredTrainingCompletion.test.ts` — retained, transfer, failure, invalidation, voluntary/target-unavailable cancel, commitment-locked, idempotency, parse, trainee identity
- SCHEMA_REGISTRY evidence-only note
- SPE-14 training authority consumed as producer fixture refs only; no GameState field or UI

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| Retained completion, no ownership mutation | Test "completes with trainee retained" |
| Transfer via SPE-2738 + provenance | Test "transfer branch invokes SPE-2738" |
| Qualification failure bounded, no success bundle | Test "qualification failure retains trainee" |
| Transfer bundle exactly once | Test "transfer bundle applies terminal state… once" |
| Target invalidation, no dangling live ref | Test "target invalidation terminates assignment" |
| Target-unavailable: producer consequence, not full abandonment | Test "target-unavailable cancellation…" |
| Commitment-locked non-cancellable | Test "commitment-locked assignments reject cancellation" |
| Save/load + duplicate closeout idempotency | Test "parse/hydrate round-trip…" |
| Unique trainee identity / spawn guard | Tests "blocks duplicate trainee" + "off-roster trainee remains blocked" |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| GameState persistence / week-close wiring | Future SPE-3124+ or SPE-2794 | Pure registry + parse first per slice constraint |
| Full SPE-2794 lifecycle engine | SPE-2794 parent | Local enums only in this module |
| Economy/trust effect application | Existing payment/relationship owners | Ref-only seams in outcome record |
