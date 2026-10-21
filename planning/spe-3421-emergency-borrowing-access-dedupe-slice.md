# SPE-3421 — Refactor duplicated emergency borrowing access-condition validation

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-3421](https://linear.app/spectranoir/issue/SPE-3421)                                      |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                            |
| **Branch**        | `jamesdyedbq/spe-3421-refactor-duplicated-emergency-borrowing-access-condition`                |
| **Base main SHA** | `a4706fb3e7e4246e34f7f4b9fc6acc3b2313df47`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3421  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `a4706fb3`)  
**Date:** 2026-10-20  
**Continuation:** Hermes full-task delegation; explicit autonomous ship-loop after SPE-1022 Done (PR #4344 @ `a4706fb3`)

### Queue state

- Manifest `primary`: SPE-1052; stale handoff `inProgress` SPE-1022 cleared (Linear **Done** / PR #4344 @ `a4706fb3`)
- SPE coding In Progress at pick: none (open In Progress are DA-* content only: SPE-2977/2966/2937/2838/2832)
- Clean `main`, no open PRs; policy file byte-identical to `origin/main`
- Recommended next step named no concrete eligible leaf (SPE-1052 parent only)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent umbrella |
| SPE-1022 | Linear Done / merged — stale handoff only |
| SPE-1060 | High priority SPE-1052 child; **not one-slice ready** — multi-system room-quality/faction/cover/symbolic sprawl |
| SPE-1058 | Known remainder beyond one coherent slice (automation/succession/priority conflict) |
| SPE-3121 | Held for SPE-3107 reconciliation |
| SPE-3359 | UI register; broader surface than this debt follow-up |
| SPE-3360 / SPE-3188 / SPE-3189 / SPE-3406 | Eligible but larger contracts / no priority |
| **SPE-3421** | Eligible SPE-1052 leaf; Low priority; no children; no blockers; one behavior-preserving duplication refactor |

### Decision criteria

1. **Priority:** Highest-priority *eligible* child after skipping SPE-1060 (not one-slice).
2. **Dependency:** No open `blockedBy`; SPE-1173 Done supplies the module under edit.
3. **Feasibility:** Extract shared access-condition validate/dedupe helper in one file; contract tests already exist.
4. **Scope:** Sonar duplication fix only; no new borrowing rules / GameState / UI.
5. **Architectural readiness:** Touches only `emergencyBranchBorrowingFacility.ts` shipped by SPE-1173.
6. **Duplication check:** Not in `recentlyShipped`; distinct from SPE-1173 feature ACs (post-merge tech debt).
7. **Contradiction review:** No conflict with SPE-3043 STOP or SPE-3121 hold; SPE-1173 remains Done.
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

Behavior-preserving maintenance of `src/domain/emergencyBranchBorrowingFacility.ts`:

- Identify the duplicated `accessConditions` allowlist validation + stable dedupe loops in `evaluateEmergencyBorrowingAccess` and `projectBorrowingLaterCost`
- Extract one private helper reused by both call sites
- Preserve allowlist rejection, ordering, deduplication, immutable outputs, and all borrowing semantics
- No new borrowing rules, GameState, week-close, or UI

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live GameState / week-close wiring | future consumer / SPE-1052 children | Unchanged from SPE-1173 |
| Broader Sonar/repo duplication cleanup | out of issue | Only the confirmed access-condition span |
| Room quality / facility register / production chain | SPE-1060 / SPE-3359 / SPE-3360 | Separate issues; not this debt slice |

## Validation

- `npm exec vitest run -- src/test/emergencyBranchBorrowingFacility.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- SonarQube reanalysis after PR (record gate status in Linear/PR)
