# SPE-2111 — Visual-trigger hazard registry weekly transition surfacing (slice 5)

One-page implementation plan. Linear: [SPE-2489](https://linear.app/spectranoir/issue/SPE-2489) (child under [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111)). Follows shipped slice 4 (`planning/visual-trigger-hazard-registry-slice-4.md`, PR #2543). §14 pass: registry umbrella alternate #3 — weekly surfacing only; [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2489 — Visual-trigger hazard registry weekly transition surfacing (slice 5)](https://linear.app/spectranoir/issue/SPE-2489) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) — registry anchor (slice 1–4 shipped); umbrella [SPE-947](https://linear.app/spectranoir/issue/SPE-947) stays **Backlog** |
| **Branch** | `spe-2111-visual-trigger-hazard-weekly-surfacing-slice-5`                                                 |
| **Base `main` SHA** | `d31cba2f`                                                                                          |

## Goal

Surface post-tick visual-trigger hazard record transitions in weekly report notes after `applyWeeklyVisualTriggerHazardTick` — awareness-band, pursuit-state, and disposal/sweep posture changes with CP-neutral labels. Reuse SPE-2485 weekly note registration pattern; no new persistence fields.

## Prerequisite (on `main` @ `d31cba2f`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/visualTriggerHazardRegistry.ts` (SPE-2111 / PR #2432) |
| Persistence          | `visualTriggerHazardRecords` on `GameState` (SPE-2336 / PR #2539) |
| Weekly orchestration | `applyWeeklyVisualTriggerHazardTick` (SPE-2337 / PR #2541) |
| Planning mirror UI   | `visualTriggerHazardMirrorView` (SPE-2338 / PR #2543) |
| Weekly note template | `publishQueueWeeklyReportNotes.ts` (SPE-2485), `cognitiveHazardSimulationTriggerWeeklyReportNotes.ts` (SPE-1309 slice 5) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `visualTriggerHazardSurfacing.ts` transition summaries             | Platform nodes / propagation graph (SPE-947 deferred row 1) |
| `visualTriggerHazardWeeklyReportNotes.ts` + `ReportNoteType`       | Counter-memetic pipeline (SPE-947 deferred row 3) |
| `advanceWeek` prior vs post-tick note wire-up                      | Mission triage chips (blocked)                |
| Unit + `advanceWeek` integration tests                             | SPE-947 parent Done                           |
| Hydration allowlist drift fix (public_disclosure / cognitive_hazard / publish_queue types) | Entity-welfare reclassification slice 5 (SPE-1046 alternate) |
| Slice doc (this file) + backlog handoff                            | New persistence fields                        |

## Surfacing contract

- **Read-only compose** — compare pre-tick vs post-tick hydrated records; no mirror or tick contract changes.
- **Emit on change only** — awareness band, pursuit state, or sweep status advancement during the tick.
- **Empty map** — no-op; zero notes; no throw.
- **Idempotent re-tick** — unchanged records emit no new notes at the same week.
- **Safe labels** — record label + formatted enum labels; no franchise tokens.
- **Weekly note type** — `visual_trigger_hazard.weekly_transition`.

## Acceptance

- [x] Empty `visualTriggerHazardRecords` map emits no weekly transition notes
- [x] Pursuit resolution, awareness-band, and sweep-advance fixtures emit typed notes after `advanceWeek`
- [x] Idempotent re-tick at same week emits no duplicate transition notes
- [x] `REPORT_NOTE_TYPES` aligned with audit registry (includes drift fix for prior types)
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/visualTriggerHazardSurfacing.ts`, `src/domain/visualTriggerHazardWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| View   | `src/features/report/reportNoteView.ts`                               |
| Tests  | `src/test/visualTriggerHazardSurfacing.test.ts`, `src/test/advanceWeek.visualTriggerHazard.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts` |
| Plan   | `planning/visual-trigger-hazard-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Platform nodes (reach, uptime, audience) | SPE-947 child | Parent deferred row 1; not §14 slice 5 |
| Counter-memetic lore + distributor + uptake | SPE-947 child | Parent deferred row 3 |
| Content-owner takedown resistance | SPE-947 child | Parent deferred row 5 |
| Post-case media persistence wave | SPE-947 child / SPE-1085 | Parent deferred row 6 |
| Propagation graph wire-up | SPE-956 / harvest #965 | Deferred since SPE-2111 slice 1 |
| Mission triage visual-trigger chips | Backlog | Mission triage full refresh blocked |
| Entity-welfare reclassification slice 5 | SPE-2114 / SPE-1046 | Separate parent thread — alternate #3 sibling |
| SPE-947 parent Done | SPE-947 | Slice 5 is weekly surfacing only |

## See also

- `planning/visual-trigger-hazard-registry-slice-4.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/publish-queue-surfacing-slice-1.md`
