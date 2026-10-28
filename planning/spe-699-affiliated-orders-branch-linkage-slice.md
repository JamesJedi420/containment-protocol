# SPE-699 — Affiliated orders, sects, and branch linkage

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-699](https://linear.app/spectranoir/issue/SPE-699/affiliated-orders-sects-and-branch-linkage) |
| **Parent** | [SPE-174](https://linear.app/spectranoir/issue/SPE-174) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-699-affiliated-orders-sects-and-branch-linkage` |
| **Base main SHA** | `df2d023e` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `df2d023e`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-699  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-700 Done/merged (#4476); clean `main` @ `df2d023e`; no open PRs; prior inProgress cleared.
2. **Candidates compared** — SPE-3338 tooling IP (skip); SPE-3166 blocked by SPE-3162; SPE-3162 umbrella; SPE-2999 blocked by SPE-1384; SPE-378/SPE-2803 too large; SPE-699 High compact sibling under SPE-174.
3. **Winner lines** — Priority High; no blockers; pure linked branch records; reuses SPE-698 umbrella/branchKey hooks without owning doctrine schema.
4. **Duplication** — not in recentlyShipped; InstitutionProfile only has optional umbrella/branchKey scaffolding.
5. **Contradiction** — SPE-698 remains institution profile/doctrine owner; SPE-700 calendars stay separate; no schism simulator.
6. **Eligibility** — exists; Backlog→In Progress; not umbrella; acceptance fits one coding slice; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-699.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/affiliatedOrderBranchLinkage.ts` linked branch / affiliated-order records
- Parent-child linkage via `parentInstitutionProfileId` + `umbrellaProfileId` + `branchKey`
- Visibility bands: public / semi_public / deniable_covert
- Distinct mandate, authority, resourcing, moral-limit tags; autonomy + doctrinal stance
- Mantle-style office continuity (successor + concealed replacement)
- Downstream access / legitimacy / faction-behavior surface
- Targeted Vitest; no GameState field; no full schism simulator; no UI

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Institution doctrine/profile schema expansion | SPE-698 | Separate owner; this slice consumes profile ids only |
| Live week-close faction/access wire | SPE-174 follow-up | Projection/record layer only this slice |
| Full schism / rivalry simulator | out of boundary | Explicit SPE-699 constraint |

## Validation

- `npm run test:run -- src/test/affiliatedOrderBranchLinkage.test.ts`
