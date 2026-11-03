# SPE-947 — Persisted commercialization-actor map + richer advanceWeek delta mutation (slice 1)

One-page implementation plan. Linear: [SPE-2616](https://linear.app/spectranoir/issue/SPE-2616/persisted-commercialization-actor-map-richer-advanceweek-delta) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred sibling after shipped [SPE-2615](https://linear.app/spectranoir/issue/SPE-2615); [SPE-956](https://linear.app/spectranoir/issue/SPE-956) stays out. Parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2616 — Persisted commercialization-actor map + richer advanceWeek delta mutation (slice 1)](https://linear.app/spectranoir/issue/SPE-2616/persisted-commercialization-actor-map-richer-advanceweek-delta) |
| **Status**          | **In Progress**                                                                                                                                                                                       |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                             |
| **Branch**          | `spe-947-commercialization-actor-persistence-slice-1`                                                                                                                                                 |
| **Base `main` SHA** | `cc05bf50`                                                                                                                                                                                            |

## Goal

Ship the smallest SPE-2576-style sanitize/hydrate for authored commercialization actors on GameState and wire `advanceWeek` to pass persisted actors into the SPE-2615 week-close tick with persisted `lastWeeklyTickWeek`. Authored weekly deltas only — no invent mid-week — without marking SPE-947 Done.

## Prerequisite (on `main` @ `cc05bf50`)

| Shipped                           | Anchor                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Week-close orchestration          | [SPE-2615](https://linear.app/spectranoir/issue/SPE-2615) — aggregate tick over actors/maps |
| Third commercial path             | [SPE-2614](https://linear.app/spectranoir/issue/SPE-2614) — three-path aggregate          |
| Cross-path aggregate              | [SPE-2613](https://linear.app/spectranoir/issue/SPE-2613) — any/worse over multi-path     |
| Multi-actor compose               | [SPE-2612](https://linear.app/spectranoir/issue/SPE-2612) — ≥2 paths                     |
| Single-path sim                   | [SPE-2611](https://linear.app/spectranoir/issue/SPE-2611) — actor shape + EXAMPLE         |
| GameState economy-map persistence | [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610) — weight/binding sanitize        |

## Week-close contract (slice 1)

- **Persist actors** — `spe947MediaEconomyCommercializationActors` keyed map + `sanitizeSpe947MediaEconomyCommercializationActors`.
- **Tick stamp** — `spe947MediaEconomyLastWeeklyTickWeek` on GameState; round-trip via hydrate.
- **advanceWeek** — `listSpe947MediaEconomyCommercializationActors` feeds SPE-2615 tick; empty map ⇒ `empty_actors` no-op.
- **No invent** — no mid-week actor creation; economy maps keep identity unless authored weekly delta exists (still none in slice 1).
- **Idempotent** — same-week re-tick via persisted `lastWeeklyTickWeek` ⇒ `already_ticked`.

## Scope

| In                                                                                          | Out                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `sanitizeSpe947MediaEconomyCommercializationActors` + GameState field                       | Full internet / sprawling media-economy sim  |
| `spe947MediaEconomyLastWeeklyTickWeek` idempotency stamp                                    | SPE-2610 weight/binding sanitize rewrite     |
| `advanceWeek` reads persisted actors into SPE-2615 tick                                     | Mid-week mutations                           |
| Focused Vitest: sanitize round-trip + empty/no-op + advanceWeek orchestrated + already_ticked | SPE-2611–2615 path/aggregate/tick rewrite    |
| Slice doc + backlog handoff (SPE-2615 → Done)                                               | SPE-947 parent Done                          |
|                                                                                             | SPE-956 propagation graph                    |
|                                                                                             | Authored weekly economy-map delta fields     |

## Acceptance

- [ ] Empty/missing actor map must not falsely satisfy AC
- [ ] Malformed actors drop like SPE-2610
- [ ] No mid-week invent
- [ ] Tick stamp round-trips for same-week idempotency
- [ ] Actor order stays code-unit
- [ ] Economy maps keep identity unless authored delta exists
- [ ] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947MediaEconomyCommercializationActorPersistence.test.ts src/test/advanceWeek.spe947Evaluator.integration.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                         | Suggested owner              | Why deferred                                      |
| ---------------------------- | ---------------------------- | ------------------------------------------------- |
| Authored weekly economy-map delta fields | **Done** — [SPE-2617](https://linear.app/spectranoir/issue/SPE-2617) | `weeklyContinuityFactorDelta` / `weeklyEconomyWeightId` + week-close apply |
| Propagation graph wire-up    | SPE-956 / harvest 965        | Deferred since SPE-2111                           |
| Parent umbrella Done         | Later SPE-947 reconciliation | Wire-up still open                                |

## See also

- `planning/spe-947-media-economy-week-close-orchestration-slice-1.md`
- `planning/spe-947-media-economy-third-commercial-path-slice-1.md`
- `planning/backlog.md`
