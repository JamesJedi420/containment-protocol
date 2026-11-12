# SPE-2189 — Forced-movement collision resolver (slice 1)

| Field      | Value                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped** (effective on merge); Linear remains open for the broader integration audit     |
| **Linear** | [SPE-2189](https://linear.app/spectranoir/issue/SPE-2189/forced-movement-collision-resolver-slice-1) |
| **Parent** | [SPE-399](https://linear.app/spectranoir/issue/SPE-399), independently evaluated                     |
| **Branch** | `jamesdyedbq/spe-2189-forced-movement-collision-resolver-slice-1`                                    |
| **Base**   | `370131ef4ab314f8fa0db75a2852cd7e6a418f53`                                                           |

## Boundary and plan

Add a pure deterministic forced-movement collision resolver. It validates caller-owned displacement vectors and impact/stability inputs, then returns typed clear, actor-collision, or object-collision outcomes with obstruction, bounded occupied-space harm, and knockdown. It never mutates actors, objects, maps, or infrastructure.

## Deferred

| Item                                    | Owner    | Boundary                                                              |
| --------------------------------------- | -------- | --------------------------------------------------------------------- |
| Stability-based displacement resistance | SPE-2209 | This slice consumes caller-owned stability only.                      |
| Direction taxonomy                      | SPE-2210 | This slice preserves a vector without owning authored direction tags. |
| Infrastructure damage propagation       | SPE-2212 | Outcome is explicitly `not_evaluated`; no infrastructure mutation.    |
| Live resolver consumers / routing       | SPE-2189 | Linear remains open for the recorded broader integration audit.       |

## Validation

- `npm run test:run -- src/test/forcedMovementCollisionResolver.test.ts src/test/forcedMovementHazard.test.ts`
- `npm run test:run` — 983 files / 10,657 tests passed
- `npm run lint`
- `npx prettier --check src/domain/forcedMovementCollisionResolver.ts src/test/forcedMovementCollisionResolver.test.ts planning/spe-2189-forced-movement-collision-resolver-slice.md`
- `npm run verify:backlog-handoff`
- `git diff --check`
