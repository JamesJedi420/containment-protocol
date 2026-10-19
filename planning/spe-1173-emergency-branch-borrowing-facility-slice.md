# SPE-1173 — Emergency branch borrowing facility

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                               |
| **Issue**         | [SPE-1173](https://linear.app/spectranoir/issue/SPE-1173)                          |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                |
| **Branch**        | `jamesdyedbq/spe-1173-emergency-branch-borrowing-facility`                          |
| **Base main SHA** | `17894eb1885ae0d0a6a56ba2c407fe6e2fca75bb`                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-1173  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `17894eb1`)  
**Date:** 2026-10-18  
**Continuation:** Hermes full-task delegation; explicit autonomous ship-loop after SPE-1263 merge (PR #4325)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-1263 cleared (Linear Done / PR #4325 @ `17894eb1`)
- Containment Protocol Linear In Progress: none at pick time (SPE-1263 already Done)
- Clean `main`, no open PRs; policy file byte-identical to `origin/main`
- Recommended next step still named SPE-1263 (stale) — not eligible

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent umbrella |
| SPE-1263 | Linear Done / merged — stale handoff only |
| SPE-1564 / SPE-1896 / SPE-3150 | Have open Linear children (umbrellas) |
| SPE-3406 / SPE-3362 / SPE-3360 / SPE-3361 / SPE-3359 | Eligible SPE-1052 children; no priority; higher SPE ids / broader or UI-bound |
| SPE-3181 / SPE-3188 / SPE-3189 | Eligible; larger contracts; higher SPE ids |
| SPE-3121 | Held for SPE-3107 reconciliation |
| **SPE-1173** | Eligible SPE-1052 child; no children; no open blockers; four ACs fit one pure borrowing-facility packet layer; lowest SPE id among priority-tied eligibles |

### Decision criteria

1. **Priority:** All remaining SPE-1052 Backlog children are No priority; SPE-1173 wins lowest SPE id among eligibles.
2. **Dependency:** No open blockers in Linear relations snapshot.
3. **Feasibility:** Pure domain access/event/cost/outcome packets; no GameState/UI required for AC.
4. **Scope:** Compact emergency borrowing facility + later-cost + branch-outcome delta — not a finance simulator.
5. **Architectural readiness:** Fits beside facility/reserve consumers without duplicating stockpile or emergency-cache timing (SPE-2892).
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-1263 permeability and SPE-3177 co-location.
7. **Contradiction review:** No conflict with shipped facility stack; SPE-3043 STOP unchanged; SPE-3121 hold untouched.
8. **Prohibitions:** No new issue/child/parent; parent not selected; PR review preserved.

### Eligibility checklist

- Exists in Linear: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no open children: true
- AC fit one slice: true
- No open blockedBy: true
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true

## Approved boundary

Pure caller-owned emergency branch borrowing facility in `src/domain/emergencyBranchBorrowingFacility.ts`.

- Temporary emergency support grants through a shared facility for authored reserve classes
- Access decisions (grant / deny / conceal) under strain with collateral/supervision/stigma/audit conditions
- Later costs from borrowing (stigma, audit pressure, tighter supervision, depleted future flexibility)
- Branch outcome deltas when the facility is used, denied, or concealed
- No GameState field, week-close wire, facility UI, or infinite free bailout path

## API

`src/domain/emergencyBranchBorrowingFacility.ts`

| Symbol | Behavior |
| --- | --- |
| `evaluateEmergencyBorrowingAccess` | Facility access under strain + conditions |
| `projectEmergencyBorrowingEvent` | Temporary support grant / deny / conceal |
| `projectBorrowingLaterCost` | Post-borrow cost surface |
| `projectBranchBorrowingOutcomeDelta` | Outcome differs by facility disposition |
| `authoredStrainedBranchBorrowingFixture` | Acceptance fixture |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live GameState / week-close wiring | future consumer / SPE-1052 children | Pure layer only |
| Full finance / reserve simulator | out of issue constraints | Explicitly excluded |
| Facility register UI | SPE-3359 | UI out of boundary |

## Validation

- `npm exec vitest run -- src/test/emergencyBranchBorrowingFacility.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
