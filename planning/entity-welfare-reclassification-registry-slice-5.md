# SPE-2114 — Entity welfare reclassification registry weekly transition surfacing (slice 5)

One-page implementation plan. Linear: [SPE-2490](https://linear.app/spectranoir/issue/SPE-2490) (child under [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114)). Follows shipped slice 4 (`planning/entity-welfare-reclassification-registry-slice-4.md`, PR #2549). §14 pass: registry umbrella alternate #3 — weekly surfacing only; [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2490 — Entity welfare reclassification registry weekly transition surfacing (slice 5)](https://linear.app/spectranoir/issue/SPE-2490) |
| **Status** | **Shipped** — PR #2900 @ `d5b795ae` |
| **Parent** | [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) — registry anchor (slice 1–4 shipped); umbrella [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) stays **Backlog** |
| **Branch** | `spe-2114-entity-welfare-reclassification-weekly-surfacing-slice-5`                                       |
| **Base `main` SHA** | `8c670f52`                                                                                          |

## Goal

Surface post-tick entity welfare reclassification record transitions in weekly report notes after `applyWeeklyEntityWelfareReclassificationTick` — reclassificationState and reviewGate changes with CP-neutral labels. Reuse SPE-2485 weekly note registration pattern; no new persistence fields.

## Prerequisite (on `main` @ `8c670f52`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/entityWelfareReclassificationRegistry.ts` (SPE-2114 / PR #2433) |
| Persistence          | `entityWelfareReclassificationRecords` on `GameState` (SPE-2339 / PR #2545) |
| Weekly orchestration | `applyWeeklyEntityWelfareReclassificationTick` (SPE-2340 / PR #2547) |
| Planning mirror UI   | `entityWelfareReclassificationMirrorView` (SPE-2341 / PR #2549) |
| Weekly note template | `publishQueueWeeklyReportNotes.ts` (SPE-2485), `visualTriggerHazardWeeklyReportNotes.ts` (SPE-2489 slice 5) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `entityWelfareReclassificationSurfacing.ts` transition summaries   | Platform nodes / propagation graph (SPE-947 deferred row 1) |
| `entityWelfareReclassificationWeeklyReportNotes.ts` + `ReportNoteType` | Counter-memetic pipeline (SPE-947 deferred row 3) |
| `advanceWeek` prior vs post-tick note wire-up                      | Mission triage chips (blocked)                |
| Unit + `advanceWeek` integration tests                             | SPE-1046 parent Done                           |
| Slice doc (this file) + backlog handoff                            | New persistence fields                        |
| Permission sets, onboarding pipeline, site-specific clearance      | SPE-2114 parent Done (slice 5 is additive child) |

## Surfacing contract

- **Read-only compose** — compare pre-tick vs post-tick hydrated records; no mirror or tick contract changes.
- **Emit on change only** — reclassificationState or reviewGate advancement during the tick.
- **Empty map** — no-op; zero notes; no throw.
- **Idempotent re-tick** — unchanged records emit no new notes at the same week.
- **Terminal states** — approved/denied/reverted records do not schedule further transitions; unchanged terminals emit no notes.
- **Safe labels** — record label + formatted enum labels; no franchise tokens.
- **Weekly note type** — `entity_welfare_reclassification.weekly_transition`.

## Acceptance

- [x] Empty `entityWelfareReclassificationRecords` map emits no weekly transition notes
- [x] Scheduled reclassificationState and reviewGate fixtures emit typed notes after `advanceWeek`
- [x] Idempotent re-tick at same week emits no duplicate transition notes
- [x] `REPORT_NOTE_TYPES` aligned with audit registry
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/entityWelfareReclassificationSurfacing.ts`, `src/domain/entityWelfareReclassificationWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| View   | `src/features/report/reportNoteView.ts`                               |
| Tests  | `src/test/entityWelfareReclassificationSurfacing.test.ts`, `src/test/advanceWeek.entityWelfareReclassification.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts` |
| Plan   | `planning/entity-welfare-reclassification-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Platform nodes (reach, uptime, audience) | SPE-947 child | Parent deferred row 1; not §14 slice 5 |
| Counter-memetic lore + distributor + uptake | SPE-947 child | Parent deferred row 3 |
| Content-owner takedown resistance | SPE-947 child | Parent deferred row 5 |
| Post-case media persistence wave | SPE-947 child / SPE-1085 | Parent deferred row 6 |
| Permission sets / onboarding / site clearance | SPE-1046 child | Parent umbrella scope |
| Mission triage entity-welfare chips | Backlog | Mission triage full refresh blocked |
| Visual-trigger hazard slice 5 | SPE-2489 | Shipped sibling — alternate #3 SPE-947 thread |
| SPE-1046 parent Done | SPE-1046 | Slice 5 is weekly surfacing only |

## See also

- `planning/entity-welfare-reclassification-registry-slice-4.md`
- `planning/visual-trigger-hazard-registry-slice-5.md` (template)
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
