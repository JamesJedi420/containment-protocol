# SPE-408 — Persistent area shapes and hazard surfaces

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-408](https://linear.app/spectranoir/issue/SPE-408/persistent-area-shapes-and-hazard-surfaces) |
| **Parent** | none (standalone) |
| **Branch** | `jamesdyedbq/spe-408-persistent-area-shapes-and-hazard-surfaces` |
| **Base main SHA** | `a8c2c1db` |

## Delegated approval

**Date:** 2026-10-29  
**main SHA:** `a8c2c1db`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-408  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-263 Done (#4486); clean main; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-3469 contradiction-only; SPE-873/877/878/2749 large/umbrella; SPE-408 High compact packets.
3. **Winner lines** — Priority High; no children; pure shape/hazard/surface-adjacency packets.
4. **Duplication** — not recentlyShipped.
5. **Contradiction** — SPE-807 zone contamination stays separate; SPE-2192/2991 own delivery/lifecycle for mobile-anchor follow-ups.
6. **Eligibility** — exists Backlog; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-408.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/persistentAreaShapes.ts`
- Distinct cloud vs wall shape families under one model
- Layered hazard effects + dwell-time escalation
- `surfaceAdjacency` conduit routing across contiguous surfaces
- Mobile-anchor footprint relocation without duplicate exposure
- Targeted Vitest; no GameState; no volumetric physics simulator

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cross-zone contamination profiles | SPE-807 | Distinct conduit family |
| Delivery geometry / active-effect lifecycle | SPE-2192 / SPE-2991 | Adjacent owners |

## Validation

- `npm run test:run -- src/test/persistentAreaShapes.test.ts`
