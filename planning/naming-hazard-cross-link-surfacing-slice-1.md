# SPE-854 — Intake ↔ naming-hazard cross-link surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2406](https://linear.app/spectranoir/issue/SPE-2406) (child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854)). Closes deferred item from [SPE-2358](https://linear.app/spectranoir/issue/SPE-2358), [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) slices 3–5.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2406 — Intake ↔ naming-hazard cross-link surfacing in triage/report notes (slice 1)](https://linear.app/spectranoir/issue/SPE-2406) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Done; registry anchor [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) / [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) |
| **Branch** | `spe-854-naming-hazard-cross-link-surfacing-slice-1`                                                       |
| **Status** | **In progress**                                                                                            |
| **Base `main` SHA** | `49025251`                                                                                          |

## Goal

Surface existing `composeIntakeNamingHazardCrossLinks` / `composeAllIntakeNamingHazardCrossLinks` output as read-only labels in mission triage and weekly report notes when intake reports and naming-hazard descriptors co-exist.

## Prerequisite (on `main` @ `49025251`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-link compose   | `informationIntakeNamingHazardCrossLink.ts` (SPE-2358 / PR #2584)      |
| Mirror cross-links   | `namingHazardDescriptorMirrorView.ts` (SPE-2405 / PR #2679)            |
| Mission intake chips | `missionTriageIntakeSignalView.ts` (SPE-2307)                           |
| Weekly intake notes  | `informationIntakeWeeklyReportNotes.ts` (SPE-2298)                     |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `informationIntakeNamingHazardCrossLinkSurfacing.ts` label helpers | SPE-2358 compose changes                      |
| Mission triage `Intake: naming hazard` chip                        | Weekly orchestration / investigation substitution |
| `informationIntakeNamingHazardCrossLinkWeeklyReportNotes.ts`     | New persistence fields                        |
| `information_intake.naming_hazard_cross_link` report note type   | Bundle compose chain                          |
| View + `advanceWeek` integration tests                             | SPE-2116 parent closure                       |
| Slice doc (this file) + backlog handoff                            |                                               |

## Surfacing contract

- **Read-only** — compose at read time; no new GameState fields.
- **Safe labels** — report ids + topic refs; descriptor ids + `projectSafeLabel` briefing projection.
- **Empty maps** — no-op; no throw.
- **Warning-only descriptors** — included when hydrated and linked.
- **Weekly notes** — emit when linked maps coexist after the weekly tick (empty maps no-op).
- **Triage chip** — `intake-naming-hazard-cross-link` marker when mission topic keys match linked compose summaries.

## Acceptance

- [x] Empty maps no-op without throw
- [x] Triage chip surfaces for canal-bridge linked fixtures
- [x] Weekly report note uses safe descriptor labels (no raw `record.label` when forbidden)
- [x] `advanceWeek` integration asserts cross-link note when fixtures coexist
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/informationIntakeNamingHazardCrossLinkSurfacing.ts`, `src/domain/informationIntakeNamingHazardCrossLinkWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| View   | `src/features/cases/missionTriageIntakeSignalView.ts`, `src/features/operations/namingHazardDescriptorMirrorView.ts`, `src/features/report/reportNoteView.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Tests  | `src/test/informationIntakeNamingHazardCrossLinkSurfacing.test.ts`, `src/test/missionTriageIntakeSignalView.test.ts`, `src/test/advanceWeek.namingHazardDescriptor.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts` |
| Plan   | `planning/naming-hazard-cross-link-surfacing-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Bundle compose chain integration | SPE-854 / SPE-2108 follow-up | Out of surfacing boundary |
| SPE-868 slice 30 closeout reward payout lines | SPE-868 | Alternative owner-choice slice |

## See also

- `planning/information-intake-naming-hazard-cross-link-slice-1.md`
- `planning/naming-hazard-descriptor-registry-slice-5.md`
