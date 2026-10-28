# SPE-2211 — Scene geometry registry (slice 1)

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-2211](https://linear.app/spectranoir/issue/SPE-2211/scene-geometry-registry-cover-concealment-line-of-effect-slice-1) |
| **Parent** | [SPE-529](https://linear.app/spectranoir/issue/SPE-529) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-2211-scene-geometry-registry-cover-concealment-line-of-effect` |
| **Base main SHA** | `5eac65c7` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `5eac65c7`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-2211  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-699 Done (#4477 @ `5eac65c7`); clean main; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-698 Medium larger; SPE-3166 blocked; SPE-2211 High compact.
3. **Winner lines** — Priority High; no blockers; pure geometry registry; condition state caller-owned.
4. **Duplication** — not in recentlyShipped; no `sceneGeometryRegistry` on main.
5. **Contradiction** — SPE-1384 sensing modality separate; SPE-1083 overlays separate; SPE-1727 condition owner preserved.
6. **Eligibility** — exists; In Progress; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-2211.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/sceneGeometryRegistry.ts`
- concealmentBand / coverBand / lineOfEffectBlocked / highGroundEdge / flankEdge / difficultTerrain / solidBarrier
- observation volume + occlusion region tags for sensing consumers
- caller-owned condition → coverBand mapping (no condition persistence)
- relative front/flank/rear exposure bands
- Targeted Vitest; no GameState; no hit/damage/armor; no RimWorld tile constants

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Object condition/use-state metadata authority | SPE-1727 | Separate owner; this slice consumes caller-owned condition strings |
| Sensing modality / channel effects | SPE-1384 | Geometry facts only |
| Defense/range overlay presentation | SPE-1083 | Presentation stays separate |

## Validation

- `npm run test:run -- src/test/sceneGeometryRegistry.test.ts`
