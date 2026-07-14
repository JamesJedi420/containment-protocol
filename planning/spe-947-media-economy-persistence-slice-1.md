# SPE-947 — GameState persistence for media-economy continuity maps (slice 1)

One-page implementation plan. Linear: [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610/gamestate-persistence-for-media-economy-continuity-maps-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred sibling after shipped [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Propagation graph stays [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965.

| Field               | Value                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2610 — GameState persistence for media-economy continuity maps (slice 1)](https://linear.app/spectranoir/issue/SPE-2610/gamestate-persistence-for-media-economy-continuity-maps-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                                               |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                     |
| **Branch**          | `spe-947-media-economy-persistence-slice-1`                                                                                                                                                   |
| **Base `main` SHA** | `bcaa7115`                                                                                                                                                                                    |

## Goal

Ship the smallest deterministic **SPE-2576-style sanitize/hydrate + GameState maps** for SPE-2609 `spe947MediaEconomyWeights` / `spe947MediaEconomyContinuityBindings` (round-trip only) — without inventing a full media-economy simulator, SPE-956 propagation graph, mid-week mutations, or marking SPE-947 Done. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `bcaa7115`)

| Shipped                              | Anchor                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Compact media-economy continuity     | [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609) — compose types + EXAMPLE fixtures   |
| SPE-947 evaluator persistence        | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576) — sanitize/hydrate pattern           |
| CP-neutral labeling                  | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596)                                      |

## Persistence contract

- **Weights** — `spe947MediaEconomyWeights` keyed by weight id; `continuityFactor` required finite ≥ 0; optional incentive peers finite ≥ 0 or drop entry.
- **Bindings** — `spe947MediaEconomyContinuityBindings` keyed by binding id; require `id` / `caseId` / `economyWeightId`; optional `mediaArtifactId`.
- **Empty / missing** — default `{}`; sanitize never throws; empty defaults do not falsely satisfy parent AC.
- **Compose** — optional wire into existing SPE-2609 resolve/compose only; no status-semantic rewrite.

## Scope

| In                                                                                          | Out                                            |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Sanitize/hydrate + GameState maps for SPE-2609 weights / bindings                           | Full media-economy / internet simulator        |
| Focused Vitest: empty/no-op + one authored weight/binding round-trip                        | Mid-week mutations                             |
| Slice doc + backlog handoff; parent deferred pointer                                        | SPE-2609 continuity decision status rewrite    |
| SCHEMA_REGISTRY additive field rows under `spe-947-evaluator.v1`                            | SPE-2568–2574 evaluator contracts              |
|                                                                                             | SPE-947 parent Done                            |
|                                                                                             | SPE-956 propagation graph                      |

## Acceptance

- [x] Empty / missing economy maps do not throw or falsely satisfy parent AC
- [x] Invalid factors drop/sanitize safely
- [x] Authored weight + binding round-trips through sanitize/hydrate
- [x] SPE-2609 evaluate/compose contracts unchanged beyond optional map wiring
- [x] No mid-week mutations; no invented media-economy or propagation graph
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947MediaEconomyPersistence.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                   | Suggested owner              | Why deferred             |
| -------------------------------------- | ---------------------------- | ------------------------ |
| Propagation graph wire-up              | SPE-956 / harvest #965       | Deferred since SPE-2111  |
| Full commercialization / media-economy | Later SPE-947 sibling        | Compact persist only     |
| Parent umbrella Done                   | Later SPE-947 reconciliation | Wire-up still open       |

## See also

- `planning/spe-947-media-economy-continuity-slice-1.md`
- `planning/spe-947-gamestate-persistence-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/backlog.md`
