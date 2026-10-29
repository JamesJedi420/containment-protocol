# SPE-807 — Cross-zone contamination propagation profiles

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-807](https://linear.app/spectranoir/issue/SPE-807/cross-zone-contamination-propagation-profiles) |
| **Parent** | none (standalone) |
| **Branch** | `jamesdyedbq/spe-807-cross-zone-contamination-propagation-profiles` |
| **Base main SHA** | `ab42048d` |

## Delegated approval

**Date:** 2026-10-29  
**main SHA:** `ab42048d`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-807  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-408 Done (#4487); clean main; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-3469 contradiction-only; SPE-73/68/1023 large/umbrella; SPE-2271 child; SPE-807 High compact.
3. **Winner lines** — Priority High; no children; pure zone-contamination profile packets.
4. **Duplication** — not recentlyShipped.
5. **Contradiction** — SPE-408 surfaceAdjacency stays distinct from zone-to-zone contamination.
6. **Eligibility** — exists Backlog; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-807.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/crossZoneContamination.ts`
- Source → linked destination symptom profiles
- Actor-tag susceptibility filtering
- Distance/proximity severity scaling
- Targeted Vitest; no GameState; no plague simulator

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Surface-adjacency hazard routing | SPE-408 | Distinct conduit family (Done) |
| Dreamspace / transformation clock wire-up | adjacent owners | Out of compact packet slice |

## Validation

- `npm run test:run -- src/test/crossZoneContamination.test.ts`
