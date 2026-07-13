# SPE-947 — Adaptation / commercialization persistence kinds (slice 1)

One-page implementation plan. Linear: [SPE-2606](https://linear.app/spectranoir/issue/SPE-2606/adaptation-commercialization-persistence-kinds-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred row after shipped [SPE-2605](https://linear.app/spectranoir/issue/SPE-2605); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Coordinate with [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) (co-own flavor only); propagation graph stays [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965.

| Field               | Value                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2606 — Adaptation / commercialization persistence kinds (slice 1)](https://linear.app/spectranoir/issue/SPE-2606/adaptation-commercialization-persistence-kinds-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                               |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                     |
| **Branch**          | `spe-947-adaptation-commercialization-slice-1`                                                                                                                                |
| **Base `main` SHA** | `25328220`                                                                                                                                                                    |

## Goal

Ship the smallest deterministic expansion of SPE-2573 post-case media kinds so **adaptation** and **commercialization** derivative kinds can keep a case risky after local containment — without inventing a full media-economy simulator, SPE-956 propagation graph, mid-week mutations, or marking SPE-947 Done. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `25328220`)

| Shipped                      | Anchor                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Post-case media evaluator    | [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573) — `evaluatePostCaseMediaPersistence` |
| Compact evaluator maps       | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576) — sanitize inherits kind list        |
| Countermeasure ledger link   | [SPE-2605](https://linear.app/spectranoir/issue/SPE-2605) — prior deferred sibling             |
| CP-neutral labeling patterns | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596)                                      |

## Kind expansion contract

- **Kinds** — extend `POST_CASE_MEDIA_KINDS` with `adaptation` and `commercialization` (distinct; no dual truth / collapsed label).
- **Reason codes** — `adaptation_persists` / `commercialization_persists` via existing `kindPersistReason` exhaustive switch.
- **Sanitize** — SPE-2576 `isMediaKind` reads `POST_CASE_MEDIA_KINDS`; no parallel kind table.
- **Empty / unknown** — unknown kinds still `blocked` with `invalid_media_kind`; empty defaults do not falsely satisfy parent AC.
- **SPE-1085** — coordination only; do not rewrite canon continuity.

## Scope

| In                                                                                     | Out                                            |
| -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Kind vocabulary + persist reason codes + authored adaptation/commercialization fixture | Full media-economy / commercialization sim     |
| Focused Vitest: empty/unknown + persist-risk path + sanitize round-trip                | Mid-week mutations                             |
| Slice doc + backlog handoff; SPE-1085 coordination comment                             | SPE-947 parent Done                            |
|                                                                                        | SPE-956 propagation graph                      |
|                                                                                        | Full SPE-1085 canon continuity rewrite         |
|                                                                                        | SPE-2568–2574 evaluator rewrite (beyond kinds) |

## Acceptance

- [x] Empty / unknown kinds do not throw or falsely satisfy parent AC
- [x] Authored adaptation + commercialization persistence path yields `remains_risky` after local containment
- [x] Adaptation and commercialization are distinct kinds with distinct persist reason codes
- [x] Persistence round-trip accepts new kinds via SPE-2576 sanitize
- [x] Empty defaults do not falsely satisfy parent AC scenarios
- [x] No mid-week mutations; no invented media-economy or propagation graph
- [x] SPE-2568–2574 evaluator decision contracts otherwise unchanged
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/postCaseMediaPersistence.test.ts src/test/spe947EvaluatorPersistence.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                   | Suggested owner              | Why deferred             |
| -------------------------------------- | ---------------------------- | ------------------------ |
| Propagation graph wire-up              | SPE-956 / harvest #965       | Deferred since SPE-2111  |
| Full SPE-1085 canon continuity         | SPE-1085                     | Co-own coordination only |
| Full commercialization / media-economy | **SPE-2609** (continuity slice 1) | Compact kinds only here; weights/compose owned by SPE-2609 |
| Parent umbrella Done                   | Later SPE-947 reconciliation | Wire-up still open       |

## See also

- `planning/spe-947-post-case-media-persistence-slice-1.md`
- `planning/spe-947-countermeasure-ledger-slice-1.md`
- `planning/spe-947-gamestate-persistence-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/backlog.md`
