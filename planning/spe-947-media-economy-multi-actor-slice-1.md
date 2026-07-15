# SPE-947 — Broader multi-actor media-economy growth (slice 1)

One-page implementation plan. Linear: [SPE-2612](https://linear.app/spectranoir/issue/SPE-2612/broader-multi-actor-media-economy-growth-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred sibling after shipped [SPE-2611](https://linear.app/spectranoir/issue/SPE-2611); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Propagation graph stays [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965.

| Field               | Value                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2612 — Broader multi-actor media-economy growth (slice 1)](https://linear.app/spectranoir/issue/SPE-2612/broader-multi-actor-media-economy-growth-slice-1)                           |
| **Status**          | **Done** (merged PR #3126 @ `7e6c41f7`)                                                                                                                                                   |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                 |
| **Branch**          | `spe-947-media-economy-multi-actor-slice-1`                                                                                                                                               |
| **Base `main` SHA** | `cf289141`                                                                                                                                                                                |

## Goal

Ship the smallest deterministic expansion beyond SPE-2611’s single EXAMPLE actor — two authored commercialization actors / deterministic multi-path compose over the same persisted economy maps — without inventing a full internet simulator, SPE-956 propagation graph, mid-week mutations, or marking SPE-947 Done. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `cf289141`)

| Shipped                           | Anchor                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Single-path media-economy sim     | [SPE-2611](https://linear.app/spectranoir/issue/SPE-2611) — simulate/compose + EXAMPLE    |
| GameState economy-map persistence | [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610) — sanitize/hydrate weights/bindings |
| Compact media-economy continuity  | [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609) — resolve/compose + EXAMPLE     |
| Post-case media evaluator         | [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573)                                 |
| CP-neutral labeling               | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596)                                 |

## Multi-path contract

- **Authored actors (≥2)** — id / label / `continuityBindingId` / `actorWorsenFactor` (finite ≥ 1); no dual weight/case truth.
- **Single-path** — SPE-2611 `simulateSpe947CommercializationEconomyPath` semantics preserved (extend, do not rewrite).
- **Multi-path compose** — `composeSpe947CommercializationEconomyMultiPath` reuses SPE-2611 simulate per actor; deterministic id code-unit ascending; same SPE-2610 persisted maps for all paths.
- **Empty / missing** — empty actors → `empty_actors` / `anyRemainsRisky: false`; empty persisted maps → `empty_maps` / no false AC.
- **Adaptation vs commercialization** — adaptation never scaled; factor < 1 / overflow stay invalid.
- **Sanitize** — no SPE-2610 contract rewrite; round-trip through existing sanitizers remains valid.

## Scope

| In                                                                                               | Out                                          |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Pure multi-path compose over SPE-2610 persisted maps + ≥2 authored commercialization actors     | Full internet / sprawling media-economy sim  |
| Focused Vitest: empty/no-op + ≥2 authored commercialization actor paths (deterministic order) | Mid-week mutations                           |
| Extend SPE-2611 simulate/compose (do not rewrite single-path semantics)                          | SPE-2609 continuity status-semantics rewrite |
| Slice doc + backlog handoff; parent deferred pointer                                             | SPE-2610 sanitize contract rewrite           |
|                                                                                                  | SPE-2568–2574 evaluator contracts            |
|                                                                                                  | SPE-947 parent Done                          |
|                                                                                                  | SPE-956 propagation graph                    |

## Acceptance

- [x] Empty / missing persisted economy maps do not throw or falsely satisfy parent AC
- [x] ≥2 authored commercialization actor paths over the same persisted maps worsen residual risk in deterministic id order
- [x] SPE-2611 single-path semantics preserved (extend, do not rewrite)
- [x] Adaptation vs commercialization remain distinct (adaptation untouched)
- [x] SPE-2609 continuity status semantics unchanged; SPE-2610 sanitize round-trip remains valid
- [x] Factor < 1 / overflow stay invalid; no mid-week mutations; no invented media-economy or propagation graph
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947MediaEconomySimulator.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                               | Suggested owner              | Why deferred                    |
| -------------------------------------------------- | ---------------------------- | ------------------------------- |
| Propagation graph wire-up                          | SPE-956 / harvest #965       | Deferred since SPE-2111         |
| Broader media-economy growth beyond two-actor compose | [SPE-2613](https://linear.app/spectranoir/issue/SPE-2613) | Slice 1 = multi-path over sim; cross-path aggregate = next sibling |
| Parent umbrella Done                               | Later SPE-947 reconciliation | Wire-up still open              |

## See also

- `planning/spe-947-media-economy-simulator-slice-1.md`
- `planning/spe-947-media-economy-persistence-slice-1.md`
- `planning/spe-947-media-economy-continuity-slice-1.md`
- `planning/spe-947-adaptation-commercialization-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/backlog.md`
