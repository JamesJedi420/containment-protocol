# SPE-947 — Authored weekly media-economy delta fields (slice 1)

One-page implementation plan. Linear: [SPE-2617](https://linear.app/spectranoir/issue/SPE-2617/authored-weekly-media-economy-delta-fields-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred sibling after shipped [SPE-2616](https://linear.app/spectranoir/issue/SPE-2616); [SPE-956](https://linear.app/spectranoir/issue/SPE-956) stays out. Parent stays **Backlog**.

| Field               | Value                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2617 — Authored weekly media-economy delta fields (slice 1)](https://linear.app/spectranoir/issue/SPE-2617/authored-weekly-media-economy-delta-fields-slice-1) |
| **Status**          | **Done** (PR #3136 @ `6e88d513`)                                                                                                                                    |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                           |
| **Branch**          | `spe-947-media-economy-weekly-delta-slice-1`                                                                                                                        |
| **Base `main` SHA** | `4de14e4e`                                                                                                                                                          |

## Goal

Ship the smallest authored weekly delta fields on SPE-2610 weight/binding maps so `hasSpe947MediaEconomyWeeklyDelta` can return true and the SPE-2615 week-close tick can mutate maps when authored — without inventing mid-week truth, a full internet sim, or marking SPE-947 Done.

## Prerequisite (on `main` @ `4de14e4e`)

| Shipped                            | Anchor                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Persisted commercialization actors | [SPE-2616](https://linear.app/spectranoir/issue/SPE-2616) — actor map + tick stamp          |
| Week-close orchestration           | [SPE-2615](https://linear.app/spectranoir/issue/SPE-2615) — aggregate tick over actors/maps |
| GameState economy-map persistence  | [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610) — weight/binding sanitize         |
| Evaluator week-close tick          | [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) — `weeklyViewDelta` pattern peer  |

## Week-close contract (slice 1)

- **Weight delta** — optional `weeklyContinuityFactorDelta` (finite ≥ 0) adds to `continuityFactor` once per orchestration tick.
- **Binding delta** — optional `weeklyEconomyWeightId` replaces `economyWeightId` once per orchestration tick (SPE-2577 `weeklyUptimeState` peer).
- **hasDelta** — `hasSpe947MediaEconomyWeeklyDelta` true when any authored delta field survives sanitize.
- **mapsMutated** — true only when apply produces a real field change; zero deltas / same replacement id ⇒ identity.
- **Idempotent** — same-week re-tick via `spe947MediaEconomyLastWeeklyTickWeek` ⇒ `already_ticked` (no double-apply).
- **advanceWeek** — existing mapsMutated wire applies mutated maps when tick reports change.

## Scope

| In                                                                                      | Out                                         |
| --------------------------------------------------------------------------------------- | ------------------------------------------- |
| `weeklyContinuityFactorDelta` on weights + sanitize                                     | Full internet / sprawling media-economy sim |
| `weeklyEconomyWeightId` on bindings + sanitize                                          | Mid-week mutations                          |
| `hasSpe947MediaEconomyWeeklyDelta` + `applyWeeklySpe947MediaEconomyMapDeltas`           | SPE-2611–2616 path/aggregate/actor rewrite  |
| SPE-2615 tick apply + advanceWeek mapsMutated wire                                      | SPE-947 parent Done                         |
| Focused Vitest: identity / authored mutate / same-week retick / advanceWeek integration | SPE-956 propagation graph                   |
| Slice doc + backlog handoff (SPE-2616 → Done)                                           |                                             |

## Acceptance

- [x] Empty/missing deltas keep identity
- [x] Malformed delta fields drop on sanitize
- [x] Same-week already_ticked must not re-apply deltas
- [x] Authored-only (no invent)
- [x] mapsMutated only when real delta applied
- [x] `npm run lint` + targeted tests green
- [x] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947MediaEconomyContinuity.test.ts src/test/spe947MediaEconomyWeeklyOrchestration.test.ts src/test/advanceWeek.spe947Evaluator.integration.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                      | Suggested owner              | Why deferred                                                                        |
| ------------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| Propagation graph wire-up | SPE-956 / harvest 965        | Deferred since SPE-2111                                                             |
| Parent umbrella Done      | Later SPE-947 reconciliation | Wire-up complete — see `planning/spe-947-parent-umbrella-reconciliation-slice-2.md` |

## See also

- `planning/spe-947-commercialization-actor-persistence-slice-1.md`
- `planning/spe-947-media-economy-week-close-orchestration-slice-1.md`
- `planning/backlog.md`
