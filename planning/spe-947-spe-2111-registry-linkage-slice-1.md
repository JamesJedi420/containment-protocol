# SPE-947 — Full SPE-2111 registry linkage for evaluators (slice 1)

One-page implementation plan. Linear: [SPE-2602](https://linear.app/spectranoir/issue/SPE-2602/full-spe-2111-registry-linkage-for-spe-947-evaluators-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred row after shipped [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2602 — Full SPE-2111 registry linkage for SPE-947 evaluators (slice 1)](https://linear.app/spectranoir/issue/SPE-2602/full-spe-2111-registry-linkage-for-spe-947-evaluators-slice-1) |
| **Status**          | **Shipped** — PR #3108 @ `fae99f42`                                                                                                                                                                     |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                               |
| **Branch**          | `spe-947-spe-2111-registry-linkage-slice-1`                                                                                                                                                             |
| **Base `main` SHA** | `c0f3e38e`                                                                                                                                                                                              |

## Goal

Ship the smallest deterministic **read/compose** link from compact SPE-2576 `spe947*` evaluator maps to persisted SPE-2111 / SPE-2336 `visualTriggerHazardRecords`. Authored bindings only — no invented propagation graph, no new internet simulator, no evaluator contract changes. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `c0f3e38e`)

| Shipped                         | Anchor                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Compact evaluator maps          | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576) — `spe947*` maps + sanitize/hydrate   |
| Weekly / mirror / report notes  | [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) / [SPE-2578](https://linear.app/spectranoir/issue/SPE-2578) / [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596) |
| Visual-trigger registry + persist | [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) / [SPE-2336](https://linear.app/spectranoir/issue/SPE-2336) — `visualTriggerHazardRecords` |
| Surfacing label/note patterns   | [SPE-2489](https://linear.app/spectranoir/issue/SPE-2489) / [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596) |

## Linkage contract

- **Authored bindings only** — `spe947VisualTriggerHazardBindings` maps `spe947*` entity refs → `visualTriggerHazardId`.
- **Read/compose** — resolve against `visualTriggerHazardRecords`; do not mutate registry or evaluator inputs.
- **Empty / missing** — empty bindings or unknown registry ids → empty/`missing_registry` without throw; no false parent AC.
- **No dual truth** — registry fields stay on `visualTriggerHazardRecords`; bindings hold ids only.
- **CP-neutral labels** — compose uses existing entity/registry labels; no franchise tokens invented.

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| Binding map + sanitize/hydrate on GameState                        | Propagation graph / internet simulator     |
| Pure resolve/compose helpers                                       | Evaluator contract changes (SPE-2568–2574) |
| EXAMPLE fixture authored linkage path                              | Mid-week mutations                         |
| Focused Vitest: empty/no-op + one resolved link + round-trip       | SPE-947 parent Done                        |
| Slice doc + backlog handoff + SCHEMA_REGISTRY note                 | SPE-956 propagation graph                  |

## Acceptance

- [x] Empty bindings / missing registry ids resolve as no-op without throw
- [x] One authored EXAMPLE linkage path resolves a persisted registry record deterministically
- [x] Binding sanitize/hydrate round-trips; invalid entries dropped safely
- [x] Empty defaults do not falsely satisfy parent AC scenarios
- [x] Evaluator contracts (SPE-2568–2574) unchanged
- [x] CP-neutral labels only
- [ ] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947VisualTriggerHazardLinkage.test.ts src/test/spe947EvaluatorPersistence.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                      | Suggested owner               | Why deferred                |
| ------------------------- | ----------------------------- | --------------------------- |
| Propagation graph wire-up | SPE-956 / harvest #965 family | Deferred since SPE-2111     |
| Pursuit / countermeasure siblings | SPE-947 siblings        | Out of linkage slice        |
| Parent umbrella Done      | Later SPE-947 reconciliation  | Wire-up still open          |

## See also

- `planning/spe-947-weekly-report-notes-slice-1.md`
- `planning/spe-947-gamestate-persistence-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/visual-trigger-hazard-registry-slice-2.md`
- `planning/backlog.md`
