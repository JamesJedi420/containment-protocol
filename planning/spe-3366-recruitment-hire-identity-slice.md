# SPE-3366 — Recruitment hire identity collision & exact-once personnel

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3366](https://linear.app/spectranoir/issue/SPE-3366/recruitment-hire-identity-collision-and-exact-once-personnel) |
| **Parent** | none (leaf) |
| **Branch** | `jamesdyedbq/spe-3366-recruitment-hire-identity-collision-exact-once-personnel` |
| **Base main SHA** | `ead9e8b5` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `ead9e8b5`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md`)  
**Decision:** `delegated_approve` SPE-3366  

Linear comment on SPE-3366 records queue state (SPE-3124 Done @ `ead9e8b5` / PR #4446), selection among SPE-3451 / SPE-3056 / SPE-3181, contradiction review, and eligibility checklist. No new issue/child/parent/relationship created.

## Approved boundary

- Harden `src/domain/sim/hire.ts` `hireCandidate`: early identity gate before funding / faction / event / candidate / agent / staff mutation
- Fail closed on same-map unrelated occupancy and agent↔staff (incl. instructor→staff) cross-map collision
- Idempotent short-circuit when destination is provably the already-completed hire of this candidate (no second funding, faction, or hire event)
- Preserve candidate-ID → target personnel ID; normal hire creates exactly one target and removes candidate atomically
- Targeted Vitest `src/domain/sim/hire.identityCollision.test.ts`
- Do not redesign recruitment funnel; no global person registry

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| Candidate A cannot overwrite unrelated Agent A-ID | Test "rejects agent hire that would overwrite an unrelated agent…" |
| Candidate A cannot overwrite unrelated staff A-ID | Test "rejects staff hire that would overwrite an unrelated staff record…" |
| Cross-map agent↔staff / instructor→staff collision fail-closed | Tests "…occupied staff slot (cross-map)", "…occupied agent slot (cross-map)", instructor cross-map |
| Same-ID completed target resolves idempotently, no second effects | Tests agent/instructor/staff idempotent no-ops + "does not apply funding, faction, or hire-event effects a second time…" |
| Normal hire: exactly one target under candidate ID; candidate removed atomically | Test "creates exactly one agent under candidate id…" |
| Funding / faction / hire event exactly once | Second-hire retry after success + missing-candidate retry |
| Failure returns state unchanged aside from canonical normalization | Reject paths use `toBe(state)` identity; dirty-noop path unchanged in pipeline invariants |
| Save/load/retry cannot duplicate the transition | Missing-candidate after prior hire + stuck-candidate idempotent paths |

## Deferred

N/A — no in-boundary deferrals this slice.
