# SPE-854 — Intake ↔ extranormal event cross-link surfacing (slice 1)

One-page implementation plan. Follow-on from shipped [SPE-2354](https://linear.app/spectranoir/issue/SPE-2354) compose (`planning/information-intake-extranormal-cross-link-slice-1.md`, PR #2576). Mirror [SPE-2406](https://linear.app/spectranoir/issue/SPE-2406) naming-hazard surfacing pattern (`planning/naming-hazard-cross-link-surfacing-slice-1.md`, PR #2681).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2470 — Intake ↔ extranormal event cross-link surfacing in triage/report notes (slice 1)](https://linear.app/spectranoir/issue/SPE-2470) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — **Done**; registry anchor [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105) |
| **Branch** | `spe-854-intake-extranormal-cross-link-surfacing-slice-1`                                                  |
| **Status** | **Ready for PR**                                                                                         |
| **Base `main` SHA** | `236499f7`                                                                                          |

## Goal

Surface existing `composeIntakeExtranormalCrossLinks` / `composeAllIntakeExtranormalCrossLinks` output as read-only labels in mission triage and weekly report notes when intake reports and extranormal event records co-exist.

## Prerequisite (on `main` @ `236499f7`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-link compose   | `informationIntakeExtranormalCrossLink.ts` (SPE-2354 / PR #2576)       |
| Naming-hazard surfacing template | `informationIntakeNamingHazardCrossLinkSurfacing.ts` (SPE-2406 / PR #2681) |
| Mission intake chips | `missionTriageIntakeSignalView.ts` (SPE-2307)                           |
| Weekly intake notes  | `informationIntakeWeeklyReportNotes.ts` (SPE-2298)                     |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `informationIntakeExtranormalCrossLinkSurfacing.ts` label helpers  | SPE-2354 compose changes                      |
| Mission triage `Intake: extranormal` chip                          | New persistence fields                        |
| `informationIntakeExtranormalCrossLinkWeeklyReportNotes.ts`        | SPE-2105 parent closure                       |
| `information_intake.extranormal_cross_link` report note type       | Minor-anomaly / unexplained-location surfacing |
| View + `advanceWeek` integration tests                             | Mission triage full refresh                   |
| Slice doc (this file) + backlog handoff                            |                                               |

## Surfacing contract

- **Read-only** — compose at read time; no new GameState fields.
- **Safe labels** — report ids + topic refs; event ids + CP-neutral event labels from registry projection helpers.
- **Empty maps** — no-op; no throw.
- **Hydrated truth only** — include warning-only events when linked.
- **Weekly notes** — emit when linked maps coexist after the weekly tick (empty maps no-op).
- **Triage chip** — `intake-extranormal-cross-link` marker when mission topic keys match linked compose summaries.

## Acceptance

- [x] Empty maps no-op without throw
- [x] Triage chip surfaces for canal-bridge linked fixtures
- [x] Weekly report note uses safe event labels (no franchise tokens)
- [x] `advanceWeek` integration asserts cross-link note when fixtures coexist
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeExtranormalCrossLinkSurfacing.ts`, `src/domain/informationIntakeExtranormalCrossLinkWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| View   | `src/features/cases/missionTriageIntakeSignalView.ts`, `src/features/report/reportNoteView.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Tests  | `src/test/informationIntakeExtranormalCrossLinkSurfacing.test.ts`, `src/test/missionTriageIntakeSignalView.test.ts`, `src/test/advanceWeek.extranormalEvent.integration.test.ts` (or sibling), `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts` |
| Plan   | `planning/information-intake-extranormal-cross-link-surfacing-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Intake ↔ minor anomaly cross-link surfacing | SPE-854 follow-up | One sibling registry per slice — compose shipped (SPE-2355) |
| Intake ↔ unexplained location cross-link surfacing | SPE-854 follow-up | Compose shipped (SPE-2356) |
| Bundle compose chain integration | SPE-854 follow-up | Out of surfacing boundary |

## See also

- `planning/information-intake-extranormal-cross-link-slice-1.md`
- `planning/naming-hazard-cross-link-surfacing-slice-1.md`
- `planning/scope-discipline-grooming-pass.md` — §14 pass rationale
