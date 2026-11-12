# SPE-854 — Intake ↔ unexplained location cross-link surfacing (slice 1)

One-page implementation plan. Follow-on from shipped [SPE-2356](https://linear.app/spectranoir/issue/SPE-2356) compose (`planning/information-intake-unexplained-location-cross-link-slice-1.md`, PR #2580). Mirror [SPE-2471](https://linear.app/spectranoir/issue/SPE-2471) minor-anomaly surfacing pattern (`planning/information-intake-minor-anomaly-cross-link-surfacing-slice-1.md`, PR #2861).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2472 — Intake ↔ unexplained location cross-link surfacing in triage/report notes (slice 1)](https://linear.app/spectranoir/issue/SPE-2472) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine; registry anchor [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106) |
| **Branch** | `spe-854-intake-unexplained-location-cross-link-surfacing-slice-1`                                                  |
| **Status** | **Shipped** — PR #2863 @ `278ad57c`                                                                                         |
| **Base `main` SHA** | `9cb520a4`                                                                                          |

## Goal

Surface existing `composeIntakeUnexplainedLocationCrossLinks` / `composeAllIntakeUnexplainedLocationCrossLinks` output as read-only labels in mission triage and weekly report notes when intake reports and unexplained location records co-exist.

## Prerequisite (on `main` @ `9cb520a4`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-link compose   | `informationIntakeUnexplainedLocationCrossLink.ts` (SPE-2356 / PR #2580)       |
| Minor-anomaly surfacing template | `informationIntakeMinorAnomalyCrossLinkSurfacing.ts` (SPE-2471 / PR #2861) |
| Extranormal surfacing template | `informationIntakeExtranormalCrossLinkSurfacing.ts` (SPE-2470 / PR #2859) |
| Mission intake chips | `missionTriageIntakeSignalView.ts` (SPE-2307)                           |
| Weekly intake notes  | `informationIntakeWeeklyReportNotes.ts` (SPE-2298)                     |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `informationIntakeUnexplainedLocationCrossLinkSurfacing.ts` label helpers  | SPE-2356 compose changes                      |
| Mission triage `Intake: location` chip                          | New persistence fields                        |
| `informationIntakeUnexplainedLocationCrossLinkWeeklyReportNotes.ts`        | SPE-2106 parent closure                       |
| `information_intake.unexplained_location_cross_link` report note type       | Bundle compose chain integration              |
| View + `advanceWeek` integration tests                             | Mission triage full refresh                   |
| Slice doc (this file) + backlog handoff                            | SPE-854 parent reopen                         |

## Surfacing contract

- **Read-only** — compose at read time; no new GameState fields.
- **Safe labels** — report ids + topic refs; location ids + registry labels (`id (label)` pattern).
- **Empty maps** — no-op; no throw.
- **Hydrated truth only** — include warning-only locations when linked.
- **Weekly notes** — emit when linked maps coexist after the weekly tick (empty maps no-op).
- **Triage chip** — `intake-unexplained-location-cross-link` marker when mission topic keys match linked compose summaries.

## Acceptance

- [x] Empty maps no-op without throw
- [x] Triage chip surfaces for canal-bridge linked fixtures
- [x] Weekly report note uses safe location labels
- [x] `advanceWeek` integration asserts cross-link note when fixtures coexist
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeUnexplainedLocationCrossLinkSurfacing.ts`, `src/domain/informationIntakeUnexplainedLocationCrossLinkWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| View   | `src/features/cases/missionTriageIntakeSignalView.ts`, `src/features/report/reportNoteView.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Tests  | `src/test/informationIntakeUnexplainedLocationCrossLinkSurfacing.test.ts`, `src/test/missionTriageIntakeSignalView.test.ts`, `src/test/advanceWeek.unexplainedLocation.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts` |
| Plan   | `planning/information-intake-unexplained-location-cross-link-surfacing-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Bundle compose chain integration | SPE-854 follow-up | Out of surfacing boundary |
| Mission triage full refresh | SPE-16 umbrella | Blocked umbrella work |

## See also

- `planning/information-intake-unexplained-location-cross-link-slice-1.md`
- `planning/information-intake-minor-anomaly-cross-link-surfacing-slice-1.md`
- `planning/scope-discipline-grooming-pass.md` — §14 pass rationale
