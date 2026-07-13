# SPE-947 — Compact media-economy / commercialization continuity (slice 1)

One-page implementation plan. Linear: [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609/compact-media-economy-commercialization-continuity-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred row after shipped [SPE-2606](https://linear.app/spectranoir/issue/SPE-2606); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Coordinate with [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) (co-own continuity flavor only); propagation graph stays [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965.

| Field               | Value                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2609 — Compact media-economy / commercialization continuity (slice 1)](https://linear.app/spectranoir/issue/SPE-2609/compact-media-economy-commercialization-continuity-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                         |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                               |
| **Branch**          | `spe-947-media-economy-continuity-slice-1`                                                                                                                              |
| **Base `main` SHA** | `635aa445`                                                                                                                                                              |

## Goal

Ship the smallest deterministic **authored media-economy / commercialization continuity** surface (weights / incentive factors over SPE-2606 commercialization kind, or sibling compose helper) so lingering commercialization can modulate residual risk after local containment — without inventing a full media-economy or internet simulator, SPE-956 propagation graph, mid-week mutations, or marking SPE-947 Done. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `635aa445`)

| Shipped                         | Anchor                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Adaptation / commercialization  | [SPE-2606](https://linear.app/spectranoir/issue/SPE-2606) — `POST_CASE_MEDIA_KINDS` expansion  |
| Post-case media evaluator       | [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573) — `evaluatePostCaseMediaPersistence` |
| Compact evaluator maps          | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576) — sanitize inherits kind list        |
| Owner incentive pattern peer    | [SPE-2572](https://linear.app/spectranoir/issue/SPE-2572) — compose only; no takedown rewrite  |
| CP-neutral labeling patterns    | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596)                                      |

## Continuity contract

- **Authored economy weights** — `continuityFactor` (+ optional `profitIncentive` / `attentionIncentive` peers) as compact SPE-2572-style factors; not a full media-economy sim.
- **Authored bindings** — post-case media case (+ optional commercialization artifact id) → economy weight id; ids only, no dual commercialization truth.
- **Compose** — multiply matching **commercialization** `riskWeight` by effective factor; pass composed input into SPE-2573. **Adaptation never scaled.**
- **Empty / missing** — empty bindings → empty list; missing case/weight → unresolved without throw; empty defaults do not falsely satisfy parent AC.
- **SPE-1085** — coordination only; do not rewrite canon continuity.

## Scope

| In                                                                                          | Out                                            |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Pure resolve/compose + authored economy weights over commercialization                      | Full media-economy / internet simulator        |
| Focused Vitest: empty/no-op + one authored commercialization continuity path                | SPE-2606 kind vocabulary rewrite               |
| Slice doc + backlog handoff; SPE-1085 coordination comment                                  | Mid-week mutations                             |
|                                                                                             | SPE-947 parent Done                            |
|                                                                                             | SPE-956 propagation graph                      |
|                                                                                             | Full SPE-1085 canon continuity rewrite         |
|                                                                                             | SPE-2568–2574 evaluator rewrite (beyond compose inputs) |

## Acceptance

- [x] Empty / missing economy weights do not throw or falsely satisfy parent AC
- [x] Authored commercialization continuity path modulates residual risk after local containment
- [x] Adaptation vs commercialization remain distinct (adaptation untouched)
- [x] No new GameState fields this slice (compose maps only — SPE-2605 pattern); no false AC from empty defaults
- [x] No mid-week mutations; no invented media-economy or propagation graph
- [x] SPE-2568–2574 evaluator decision contracts otherwise unchanged
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947MediaEconomyContinuity.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                   | Suggested owner              | Why deferred             |
| -------------------------------------- | ---------------------------- | ------------------------ |
| Propagation graph wire-up              | SPE-956 / harvest #965       | Deferred since SPE-2111  |
| Full SPE-1085 canon continuity         | SPE-1085                     | Co-own coordination only |
| Full commercialization / media-economy | Later SPE-947 sibling        | Compact weights only     |
| GameState persistence for economy maps | Later SPE-947 sibling        | Compose-only this slice  |
| Parent umbrella Done                   | Later SPE-947 reconciliation | Wire-up still open       |

## See also

- `planning/spe-947-adaptation-commercialization-slice-1.md`
- `planning/spe-947-countermeasure-ledger-slice-1.md`
- `planning/spe-947-post-case-media-persistence-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/backlog.md`
