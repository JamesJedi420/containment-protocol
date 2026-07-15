# SPE-947 — Further media-economy growth (third commercial path) (slice 1)

One-page implementation plan. Linear: [SPE-2614](https://linear.app/spectranoir/issue/SPE-2614/further-media-economy-growth-third-commercial-path-week-close-wire) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred sibling after shipped [SPE-2613](https://linear.app/spectranoir/issue/SPE-2613); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Week-close wire and propagation graph stay out ([SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest 965).

| Field               | Value                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2614 — Further media-economy growth (third commercial path / week-close wire) (slice 1)](https://linear.app/spectranoir/issue/SPE-2614/further-media-economy-growth-third-commercial-path-week-close-wire)             |
| **Status**          | **In Progress**                                                                                                                                                                                                           |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                                                 |
| **Branch**          | `spe-947-media-economy-third-commercial-path-slice-1`                                                                                                                                                                     |
| **Base `main` SHA** | `d81425c5`                                                                                                                                                                                                                |

## Goal

Ship the smallest deterministic growth past SPE-2613’s two-actor cross-path aggregate — a third distinct authored commercialization path over shared SPE-2610 maps (EXAMPLE + three-path aggregate any/worse) — without inventing a full internet simulator, SPE-956 propagation graph, week-close/`advanceWeek` wire, or marking SPE-947 Done. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `d81425c5`)

| Shipped                           | Anchor                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Cross-path aggregate              | [SPE-2613](https://linear.app/spectranoir/issue/SPE-2613) — any/worse over multi-path     |
| Multi-actor media-economy compose | [SPE-2612](https://linear.app/spectranoir/issue/SPE-2612) — ≥2 paths / multi-path        |
| Single-path media-economy sim     | [SPE-2611](https://linear.app/spectranoir/issue/SPE-2611) — simulate/compose + EXAMPLE    |
| GameState economy-map persistence | [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610) — sanitize/hydrate weights/bindings |
| Compact media-economy continuity  | [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609) — resolve/compose + EXAMPLE     |
| Post-case media evaluator         | [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573)                                 |
| CP-neutral labeling               | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596)                                 |

## Third commercial path contract

- **Reuse SPE-2613 aggregate** — `composeSpe947CommercializationEconomyCrossPathAggregate` over ≥3 actors; same SPE-2610 persisted maps; no sequential map rewrite.
- **Third EXAMPLE** — distinct id / label / worsen factor from merch and livestream; same continuity binding; factor ≥ 1 (worsen-only).
- **Any / worse** — unchanged SPE-2613 selection (remainsRisky first, then highest sim score, then earliest actor id code-unit).
- **Two-actor EXAMPLE lists** — SPE-2612/2613 two-actor fixtures stay valid (extend with a separate three-path list; do not rewrite).
- **Empty / missing** — empty actors / empty maps still no false AC.
- **Adaptation vs commercialization** — unchanged; adaptation never scaled.
- **Sanitize** — no SPE-2610 contract rewrite.
- **Out** — week-close / `advanceWeek` orchestration (later sibling).

## Scope

| In                                                                                          | Out                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Third distinct authored commercialization EXAMPLE over shared maps                          | Full internet / sprawling media-economy sim  |
| Three-path fixture + aggregate growth past SPE-2613 two-actor EXAMPLE                       | Mid-week mutations                           |
| Focused Vitest: empty/no-op + deterministic three-path worse pick                           | Week-close / `advanceWeek` wire              |
| Extend SPE-2611/2612/2613 path/aggregate semantics (do not rewrite)                         | SPE-2609 continuity status-semantics rewrite |
| Slice doc + backlog handoff; parent deferred pointer (SPE-2613 → Done)                      | SPE-2610 sanitize contract rewrite           |
|                                                                                             | SPE-2568–2574 evaluator contracts            |
|                                                                                             | SPE-947 parent Done                          |
|                                                                                             | SPE-956 propagation graph                    |

## Acceptance

- [x] Empty / missing persisted economy maps do not throw or falsely satisfy parent AC
- [x] Authored third commercialization path + three-path aggregate yields deterministic any/worse reading beyond SPE-2613 two-actor EXAMPLE without mid-week or shared-map mutation
- [x] SPE-2611/2612/2613 path and aggregate semantics preserved (extend, do not rewrite)
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
| Propagation graph wire-up                                       | SPE-956 / harvest 965        | Deferred since SPE-2111              |
| Week-close orchestration hook over media-economy aggregate      | [SPE-2615](https://linear.app/spectranoir/issue/SPE-2615) | Opened as next SPE-947 sibling after third commercial path |
| Parent umbrella Done                                            | Later SPE-947 reconciliation | Wire-up still open                   |

## See also

- `planning/spe-947-media-economy-cross-path-aggregate-slice-1.md`
- `planning/spe-947-media-economy-multi-actor-slice-1.md`
- `planning/spe-947-media-economy-simulator-slice-1.md`
- `planning/spe-947-media-economy-persistence-slice-1.md`
- `planning/spe-947-media-economy-continuity-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/backlog.md`
