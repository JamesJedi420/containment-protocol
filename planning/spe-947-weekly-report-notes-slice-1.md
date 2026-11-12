# SPE-947 — Weekly report-note surfacing for evaluators (slice 1)

One-page implementation plan. Linear: [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596/weekly-report-note-surfacing-for-spe-947-evaluators-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next deferred row after shipped [SPE-2578](https://linear.app/spectranoir/issue/SPE-2578); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2596 — Weekly report-note surfacing for SPE-947 evaluators (slice 1)](https://linear.app/spectranoir/issue/SPE-2596/weekly-report-note-surfacing-for-spe-947-evaluators-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                                                         |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                               |
| **Branch**          | `spe-947-weekly-report-notes-slice-1`                                                                                                                                                                   |
| **Base `main` SHA** | `d9c9129f`                                                                                                                                                                                              |

## Goal

Ship pure week-close report notes when `spe947*` maps change under the SPE-2577 tick (plan elapsed weeks / authored platform view or uptime deltas). Wire into `advanceWeek` note append like SPE-2489. Empty/no-op maps emit no notes. Mirror Done ≠ umbrella Done.

## Prerequisite (on `main` @ `d9c9129f`)

| Shipped                      | Anchor                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| GameState persistence        | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576) — `spe947*` maps + sanitize/hydrate   |
| Weekly orchestration         | [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) — pure week-close tick                |
| Planning mirror              | [SPE-2578](https://linear.app/spectranoir/issue/SPE-2578) — read-only ops surface               |
| Weekly transition notes pattern | [SPE-2489](https://linear.app/spectranoir/issue/SPE-2489) — `createDeterministicReportNote` |

## Surfacing contract

- **Read-only compose** — compare pre-tick vs post-tick platforms and counter-memetic plans; no evaluator calls.
- **Emit on change only** — plan `elapsedPropagationWeeks` advance; platform `viewCount` and/or `uptimeState` change from authored deltas.
- **Empty / no-op maps** — zero notes; no throw; no false AC.
- **Same-week idempotent re-tick** — unchanged maps emit no duplicate notes.
- **Safe labels** — CP-neutral copy aligned with mirror enum formatting; no franchise tokens.
- **Weekly note type** — `spe947_evaluator.weekly_transition`.

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| `spe947EvaluatorSurfacing.ts` + `spe947EvaluatorWeeklyReportNotes.ts` | New domain evaluators                   |
| `advanceWeek` prior/next note append (SPE-2489 pattern)            | Propagation graph / internet simulator     |
| Report-note type registration (models / audit / transfer / view)   | Evaluator contract changes (SPE-2568–2574) |
| Focused Vitest + advanceWeek integration                           | Mid-week mutations                         |
| Slice doc + backlog handoff                                        | SPE-947 parent Done                        |

## Acceptance

- [x] Empty `spe947*` maps / no map deltas emit no weekly report notes
- [x] Authored plan elapsed-week and/or platform view/uptime transitions emit deterministic typed notes
- [x] Same-week idempotent re-tick does not duplicate notes
- [x] Notes are CP-neutral; type registered in `reportNoteTypeAudit`
- [x] Wired into `advanceWeek` note append like SPE-2489 when maps change under the tick
- [ ] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947EvaluatorSurfacing.test.ts src/test/advanceWeek.spe947Evaluator.integration.test.ts src/test/reportNoteTypeAudit.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                         | Suggested owner               | Why deferred                  |
| ---------------------------- | ----------------------------- | ----------------------------- |
| Propagation graph wire-up    | SPE-956 / harvest #965 family | Deferred since SPE-2111       |
| Full SPE-2111 registry linkage | SPE-947 follow-up child     | Compact evaluator inputs only |
| Parent umbrella Done         | Later SPE-947 reconciliation  | Wire-up still open            |

## See also

- `planning/spe-947-planning-mirror-surfacing-slice-1.md`
- `planning/spe-947-weekly-orchestration-slice-1.md`
- `planning/visual-trigger-hazard-registry-slice-5.md`
- `planning/backlog.md`
