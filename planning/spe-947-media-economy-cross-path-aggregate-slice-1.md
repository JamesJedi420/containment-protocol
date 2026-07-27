# SPE-947 — Broader media-economy growth beyond two-actor compose (slice 1)

One-page implementation plan. Linear: [SPE-2613](https://linear.app/spectranoir/issue/SPE-2613/broader-media-economy-growth-beyond-two-actor-compose-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred sibling after shipped [SPE-2612](https://linear.app/spectranoir/issue/SPE-2612); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Propagation graph stays [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965.

| Field               | Value                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2613 — Broader media-economy growth beyond two-actor compose (slice 1)](https://linear.app/spectranoir/issue/SPE-2613/broader-media-economy-growth-beyond-two-actor-compose-slice-1)                                 |
| **Status**          | **In Progress**                                                                                                                                                                                                           |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                                                 |
| **Branch**          | `spe-947-media-economy-cross-path-aggregate-slice-1`                                                                                                                                                                      |
| **Base `main` SHA** | `7e6c41f7`                                                                                                                                                                                                                |

## Goal

Ship the smallest deterministic growth past SPE-2612’s two independent commercialization paths — authored cross-path aggregate (any / worse residual-risk reading over multi-path without mid-week mutation or shared-map sequential mutation) — without inventing a full internet simulator, SPE-956 propagation graph, or marking SPE-947 Done. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `7e6c41f7`)

| Shipped                           | Anchor                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Multi-actor media-economy compose | [SPE-2612](https://linear.app/spectranoir/issue/SPE-2612) — ≥2 paths / multi-path        |
| Single-path media-economy sim     | [SPE-2611](https://linear.app/spectranoir/issue/SPE-2611) — simulate/compose + EXAMPLE    |
| GameState economy-map persistence | [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610) — sanitize/hydrate weights/bindings |
| Compact media-economy continuity  | [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609) — resolve/compose + EXAMPLE     |
| Post-case media evaluator         | [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573)                                 |
| CP-neutral labeling               | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596)                                 |

## Cross-path aggregate contract

- **Reuse SPE-2612 multi-path** — `composeSpe947CommercializationEconomyMultiPath` per actor; same SPE-2610 persisted maps; no sequential map rewrite across actors.
- **Any / worse** — `anyRemainsRisky` / `anyWorsened` mirror multi-path; `worseReading` is the deterministic worst path (remainsRisky first, then highest sim persistence risk score, then earliest actor id code-unit).
- **Empty / missing** — empty actors → `empty_actors` / no false AC; empty persisted maps → `empty_maps` / `anyRemainsRisky: false` / `worseReading: null`.
- **Adaptation vs commercialization** — unchanged from SPE-2611/2612; adaptation never scaled.
- **Sanitize** — no SPE-2610 contract rewrite.

## Scope

| In                                                                                          | Out                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Pure cross-path aggregate over SPE-2612 multi-path (any/worse; no map mutation)             | Full internet / sprawling media-economy sim  |
| Focused Vitest: empty/no-op + growth beyond two independent paths (deterministic)           | Mid-week mutations                           |
| Extend SPE-2611/2612 path semantics (do not rewrite)                                        | SPE-2609 continuity status-semantics rewrite |
| Slice doc + backlog handoff; parent deferred pointer (SPE-2612 → Done)                      | SPE-2610 sanitize contract rewrite           |
|                                                                                             | SPE-2568–2574 evaluator contracts            |
|                                                                                             | SPE-947 parent Done                          |
|                                                                                             | SPE-956 propagation graph                    |
|                                                                                             | Third commercial path / week-close wire      |

## Acceptance

- [x] Empty / missing persisted economy maps do not throw or falsely satisfy parent AC
- [x] Authored cross-path aggregate over ≥2 independent paths yields deterministic any/worse reading without mid-week or shared-map mutation
- [x] SPE-2611 single-path and SPE-2612 multi-path semantics preserved (extend, do not rewrite)
- [x] Adaptation vs commercialization remain distinct (adaptation untouched)
- [x] SPE-2609 continuity status semantics unchanged; SPE-2610 sanitize round-trip remains valid
- [x] Factor < 1 / overflow stay invalid; no mid-week invent; no invented media-economy or propagation graph
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947MediaEconomySimulator.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                                            | Suggested owner              | Why deferred                         |
| --------------------------------------------------------------- | ---------------------------- | ------------------------------------ |
| Propagation graph wire-up                                       | SPE-956 / harvest #965       | Deferred since SPE-2111              |
| Further media-economy growth (third commercial path / week-close) | Later SPE-947 sibling      | Slice 1 = cross-path aggregate only; opened as [SPE-2614](https://linear.app/spectranoir/issue/SPE-2614) |
| Parent umbrella Done                                            | Later SPE-947 reconciliation | Wire-up still open                   |

## See also

- `planning/spe-947-media-economy-multi-actor-slice-1.md`
- `planning/spe-947-media-economy-simulator-slice-1.md`
- `planning/spe-947-media-economy-persistence-slice-1.md`
- `planning/spe-947-media-economy-continuity-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/backlog.md`
