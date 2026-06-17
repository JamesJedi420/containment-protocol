# SPE-854 — Intake ↔ minor anomaly item cross-link surfacing (slice 1)

One-page implementation plan. Follow-on from shipped [SPE-2355](https://linear.app/spectranoir/issue/SPE-2355) compose (`planning/information-intake-minor-anomaly-cross-link-slice-1.md`, PR #2578). Mirror [SPE-2470](https://linear.app/spectranoir/issue/SPE-2470) extranormal surfacing pattern (`planning/information-intake-extranormal-cross-link-surfacing-slice-1.md`, PR #2859).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2471 — Intake ↔ minor anomaly item cross-link surfacing in triage/report notes (slice 1)](https://linear.app/spectranoir/issue/SPE-2471) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine; registry anchor [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104) |
| **Branch** | `spe-854-intake-minor-anomaly-cross-link-surfacing-slice-1`                                                  |
| **Status** | **Ready for PR**                                                                                         |
| **Base `main` SHA** | `69b3bd99`                                                                                          |

## Goal

Surface existing `composeIntakeMinorAnomalyCrossLinks` / `composeAllIntakeMinorAnomalyCrossLinks` output as read-only labels in mission triage and weekly report notes when intake reports and minor anomaly item records co-exist.

## Prerequisite (on `main` @ `69b3bd99`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-link compose   | `informationIntakeMinorAnomalyCrossLink.ts` (SPE-2355 / PR #2578)       |
| Extranormal surfacing template | `informationIntakeExtranormalCrossLinkSurfacing.ts` (SPE-2470 / PR #2859) |
| Naming-hazard surfacing template | `informationIntakeNamingHazardCrossLinkSurfacing.ts` (SPE-2406 / PR #2681) |
| Mission intake chips | `missionTriageIntakeSignalView.ts` (SPE-2307)                           |
| Weekly intake notes  | `informationIntakeWeeklyReportNotes.ts` (SPE-2298)                     |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `informationIntakeMinorAnomalyCrossLinkSurfacing.ts` label helpers  | SPE-2355 compose changes                      |
| Mission triage `Intake: minor anomaly` chip                          | New persistence fields                        |
| `informationIntakeMinorAnomalyCrossLinkWeeklyReportNotes.ts`        | SPE-2104 parent closure                       |
| `information_intake.minor_anomaly_cross_link` report note type       | Unexplained-location surfacing (SPE-2356 sibling) |
| View + `advanceWeek` integration tests                             | Mission triage full refresh                   |
| Slice doc (this file) + backlog handoff                            | Bundle compose chain integration              |

## Surfacing contract

- **Read-only** — compose at read time; no new GameState fields.
- **Safe labels** — report ids + topic refs; item ids + registry labels (`id (label)` pattern).
- **Empty maps** — no-op; no throw.
- **Hydrated truth only** — include warning-only items when linked.
- **Weekly notes** — emit when linked maps coexist after the weekly tick (empty maps no-op).
- **Triage chip** — `intake-minor-anomaly-cross-link` marker when mission topic keys match linked compose summaries.

## Acceptance

- [x] Empty maps no-op without throw
- [x] Triage chip surfaces for canal-bridge linked fixtures
- [x] Weekly report note uses safe item labels
- [x] `advanceWeek` integration asserts cross-link note when fixtures coexist
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeMinorAnomalyCrossLinkSurfacing.ts`, `src/domain/informationIntakeMinorAnomalyCrossLinkWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| View   | `src/features/cases/missionTriageIntakeSignalView.ts`, `src/features/report/reportNoteView.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Tests  | `src/test/informationIntakeMinorAnomalyCrossLinkSurfacing.test.ts`, `src/test/missionTriageIntakeSignalView.test.ts`, `src/test/advanceWeek.minorAnomalyItem.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts` |
| Plan   | `planning/information-intake-minor-anomaly-cross-link-surfacing-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Intake ↔ unexplained location cross-link surfacing | SPE-854 follow-up | One sibling registry per slice — compose shipped (SPE-2356) |
| Bundle compose chain integration | SPE-854 follow-up | Out of surfacing boundary |
| Mission triage full refresh | SPE-16 umbrella | Blocked umbrella work |

## See also

- `planning/information-intake-minor-anomaly-cross-link-slice-1.md`
- `planning/information-intake-extranormal-cross-link-surfacing-slice-1.md`
- `planning/scope-discipline-grooming-pass.md` — §14 pass rationale
