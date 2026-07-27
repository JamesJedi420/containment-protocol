# SPE-947 — Full commercialization / media-economy simulator (slice 1)

One-page implementation plan. Linear: [SPE-2611](https://linear.app/spectranoir/issue/SPE-2611/full-commercialization-media-economy-simulator-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred sibling after shipped [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Propagation graph stays [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965.

| Field               | Value                                                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2611 — Full commercialization / media-economy simulator (slice 1)](https://linear.app/spectranoir/issue/SPE-2611/full-commercialization-media-economy-simulator-slice-1)                       |
| **Status**          | **Done** (merged PR #3124 @ `cf289141`)                                                                                                                                                             |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                           |
| **Branch**          | `spe-947-media-economy-simulator-slice-1`                                                                                                                                                           |
| **Base `main` SHA** | `cfc4f3b8`                                                                                                                                                                                          |

## Goal

Ship the smallest deterministic **commercialization / media-economy simulator** surface beyond SPE-2609/SPE-2610 compact continuity weights — one authored commercialization actor/path that can worsen residual risk via persisted economy maps — without inventing a full internet simulator, SPE-956 propagation graph, mid-week mutations, or marking SPE-947 Done. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `cfc4f3b8`)

| Shipped                              | Anchor                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Compact media-economy continuity     | [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609) — resolve/compose + EXAMPLE        |
| GameState economy-map persistence    | [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610) — sanitize/hydrate weights/bindings |
| Adaptation / commercialization kinds | [SPE-2606](https://linear.app/spectranoir/issue/SPE-2606)                                    |
| Post-case media evaluator            | [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573)                                    |
| CP-neutral labeling                  | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596)                                    |

## Simulator contract

- **Authored actor** — id / label / `continuityBindingId` / `actorWorsenFactor` (finite ≥ 0); no dual weight/case truth.
- **Compose/sim** — resolve SPE-2609 continuity over SPE-2610 persisted maps, then amplify matching **commercialization** `riskWeight` by actor factor; pass into SPE-2573. **Adaptation never scaled.**
- **Empty / missing** — empty persisted weight+binding maps → `empty_maps` / `remainsRisky: false`; missing binding → unresolved without throw; empty defaults do not falsely satisfy parent AC.
- **Sanitize** — no SPE-2610 contract rewrite; round-trip through existing sanitizers remains valid.

## Scope

| In                                                                                          | Out                                            |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Pure simulate/compose over SPE-2610 persisted maps + one authored commercialization actor   | Full internet / sprawling media-economy sim    |
| Focused Vitest: empty/no-op + one authored commercialization economy path                   | Mid-week mutations                             |
| Slice doc + backlog handoff; parent deferred pointer                                        | SPE-2609 continuity status-semantics rewrite   |
|                                                                                             | SPE-2610 sanitize contract rewrite             |
|                                                                                             | SPE-2568–2574 evaluator contracts              |
|                                                                                             | SPE-947 parent Done                            |
|                                                                                             | SPE-956 propagation graph                      |

## Acceptance

- [x] Empty / missing persisted economy maps do not throw or falsely satisfy parent AC
- [x] Authored commercialization actor path worsens residual risk via persisted economy maps
- [x] Adaptation vs commercialization remain distinct (adaptation untouched)
- [x] SPE-2609 continuity status semantics unchanged; SPE-2610 sanitize round-trip remains valid
- [x] No mid-week mutations; no invented media-economy or propagation graph
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947MediaEconomySimulator.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                   | Suggested owner              | Why deferred             |
| -------------------------------------- | ---------------------------- | ------------------------ |
| Propagation graph wire-up              | SPE-956 / harvest #965       | Deferred since SPE-2111  |
| Broader multi-actor media-economy growth | [SPE-2612](https://linear.app/spectranoir/issue/SPE-2612) | Slice 1 = one authored path; multi-actor = next sibling |
| Parent umbrella Done                   | Later SPE-947 reconciliation | Wire-up still open       |

## See also

- `planning/spe-947-media-economy-persistence-slice-1.md`
- `planning/spe-947-media-economy-continuity-slice-1.md`
- `planning/spe-947-adaptation-commercialization-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/backlog.md`
