# SPE-947 — Week-close orchestration hook over media-economy aggregate (slice 1)

One-page implementation plan. Linear: [SPE-2615](https://linear.app/spectranoir/issue/SPE-2615/week-close-orchestration-hook-over-media-economy-aggregate-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred sibling after shipped [SPE-2614](https://linear.app/spectranoir/issue/SPE-2614); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Propagation graph stays out ([SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest 965).

| Field               | Value                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2615 — Week-close orchestration hook over media-economy aggregate (slice 1)](https://linear.app/spectranoir/issue/SPE-2615/week-close-orchestration-hook-over-media-economy-aggregate-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                                                       |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                             |
| **Branch**          | `spe-947-media-economy-week-close-orchestration-slice-1`                                                                                                                                              |
| **Base `main` SHA** | `731d0af5`                                                                                                                                                                                            |

## Goal

Ship the smallest pure deterministic week-close compose over the SPE-2613/2614 cross-path media-economy aggregate (SPE-2577 pattern) — optional `advanceWeek` wire that does not invent media-economy truth mid-week — without inventing a full internet simulator, SPE-956 propagation graph, or marking SPE-947 Done. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `731d0af5`)

| Shipped                           | Anchor                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Third commercial path             | [SPE-2614](https://linear.app/spectranoir/issue/SPE-2614) — three-path aggregate          |
| Cross-path aggregate              | [SPE-2613](https://linear.app/spectranoir/issue/SPE-2613) — any/worse over multi-path     |
| Multi-actor media-economy compose | [SPE-2612](https://linear.app/spectranoir/issue/SPE-2612) — ≥2 paths / multi-path        |
| Single-path media-economy sim     | [SPE-2611](https://linear.app/spectranoir/issue/SPE-2611) — simulate/compose + EXAMPLE    |
| GameState economy-map persistence | [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610) — sanitize/hydrate weights/bindings |
| Compact media-economy continuity  | [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609) — resolve/compose + EXAMPLE     |
| Evaluator week-close tick         | [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) — SPE-2577 pattern peer         |
| CP-neutral weekly notes           | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596) — optional if surfacing         |

## Week-close contract (slice 1)

- **Compose aggregate** — `applyWeeklySpe947MediaEconomyTick` reads SPE-2613/2614 cross-path aggregate over authored actors + SPE-2610 maps.
- **No invent** — empty actors / empty maps → empty_* status; `anyRemainsRisky` stays false.
- **No map mutation** — shared economy maps keep identity unless an authored weekly delta exists (SPE-2610 sanitize unchanged → no delta fields → always identity).
- **Idempotent** — `lastWeeklyTickWeek === week` → `already_ticked`.
- **advanceWeek** — optional call site with empty actors when not GameState-persisted (no invent mid-week).

## Scope

| In                                                                                          | Out                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Pure `applyWeeklySpe947MediaEconomyTick` over SPE-2613/2614 aggregate                       | Full internet / sprawling media-economy sim  |
| Focused Vitest: empty/no-op + week-close orchestrate + same-week idempotency                | Mid-week mutations                           |
| Optional `advanceWeek` wire that no-ops without persisted actors                            | SPE-2610 sanitize rewrite                    |
| Extend SPE-2611–2614 path/aggregate semantics (do not rewrite)                              | SPE-2609 status enum rewrite                 |
| Slice doc + backlog handoff; parent deferred pointer (SPE-2614 → Done)                      | SPE-2568–2574 evaluator contracts            |
|                                                                                             | SPE-947 parent Done                          |
|                                                                                             | SPE-956 propagation graph                    |
|                                                                                             | Persisted commercialization-actor map        |

## Acceptance

- [x] Empty / missing actors or persisted economy maps do not throw or falsely satisfy parent AC
- [x] Week-close orchestrate over aggregate yields deterministic SPE-2613/2614 any/worse reading without mid-week invent
- [x] Shared economy maps keep identity unless an authored weekly delta exists (slice 1: no invent)
- [x] Same-week re-tick is idempotent (`lastWeeklyTickWeek`)
- [x] Actor order stays code-unit; SPE-2611–2614 semantics preserved (extend)
- [x] SPE-2609 status semantics + SPE-2610 sanitize unchanged
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947MediaEconomyWeeklyOrchestration.test.ts src/test/advanceWeek.spe947Evaluator.integration.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                                            | Suggested owner              | Why deferred                                      |
| --------------------------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| Propagation graph wire-up                                       | SPE-956 / harvest 965        | Deferred since SPE-2111                           |
| Persisted commercialization-actor map + richer advanceWeek delta mutation | Later SPE-947 sibling | Actors not on GameState yet; pure compose is slice 1 |
| Parent umbrella Done                                            | Later SPE-947 reconciliation | Wire-up still open                                |

## See also

- `planning/spe-947-media-economy-third-commercial-path-slice-1.md`
- `planning/spe-947-media-economy-cross-path-aggregate-slice-1.md`
- `planning/spe-947-weekly-orchestration-slice-1.md`
- `planning/spe-947-weekly-report-notes-slice-1.md`
- `planning/backlog.md`
