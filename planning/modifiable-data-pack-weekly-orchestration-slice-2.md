# SPE-75 — Modifiable data-pack weekly orchestration (slice 2)

One-page implementation plan. Linear: [SPE-2493](https://linear.app/spectranoir/issue/SPE-2493) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2492](https://linear.app/spectranoir/issue/SPE-2492) per `planning/modifiable-data-pack-surfacing-slice-1.md` § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2493 — Modifiable data-pack weekly orchestration (slice 2)](https://linear.app/spectranoir/issue/SPE-2493) |
| **Status** | **In progress** — branch `spe-75-modifiable-data-pack-weekly-orchestration-slice-2` @ `c5bc6ac5`; PR pending |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-modifiable-data-pack-weekly-orchestration-slice-2` |
| **Base `main` SHA** | `bf149f84` |

## Goal

Wire weekly governance tick + operations-report notes for `modifiableDataPackRecords` into `advanceWeek`, mirroring the publish-queue weekly orchestration pattern — no mirror UI changes, publish-queue/GitHub API changes, or SPE-75 parent reopen.

## Prerequisite (on `main` @ `bf149f84`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Runtime persistence | `modifiableDataPackRecords` on `GameState` (SPE-2486) |
| Surfacing labels | `src/domain/modifiableDataPackSurfacing.ts` (SPE-2492) |
| Publish-queue weekly template | `publishQueueWeeklyOrchestration.ts` + `publishQueueWeeklyReportNotes.ts` (SPE-2485 / SPE-2491) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `modifiableDataPackWeeklyOrchestration.ts` weekly tick | Mirror UI changes |
| `modifiableDataPackWeeklyReportNotes.ts` + `ReportNoteType` registration | Publish-queue / GitHub API |
| Wire tick + notes in `advanceWeek` adjacent to publish-queue block | Mission triage chips (blocked) |
| Domain + `advanceWeek` integration tests | SPE-75 parent reopen |
| Slice doc (this file) + backlog handoff | Publish automation integration for pack import |

## Orchestration contract

| Input | Behavior |
| --- | --- |
| Empty map | No-op; zero notes; no throw |
| `applied` record | Re-validate; idempotent skip (`import_status_stable`); no report note |
| `needs_revision` record | Re-validate; governance observation receipt; weekly report note |
| Invalid on re-validation | Drop from map; `removed` receipt + report note |
| Rejected / unsanitized payloads | Absent from tick input (hydrate drops them) |
| Re-tick same week on stable applied | Idempotent; no duplicate notes |

## Acceptance

- [x] Empty `modifiableDataPackRecords` tick no-op without throw
- [x] `needs_revision` records produce governance report notes with safe labels
- [x] `applied` records do not produce governance report notes
- [x] Invalid drifted records drop from map on tick
- [ ] `npm run lint` + targeted tests green (unverified locally — Node.js not on agent PATH; IDE lints clean)

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/modifiableDataPackWeeklyOrchestration.ts`, `src/domain/modifiableDataPackWeeklyReportNotes.ts`, `src/domain/modifiableDataPackSurfacing.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Tests  | `src/test/modifiableDataPackWeeklyOrchestration.test.ts`, `src/test/modifiableDataPackWeeklyReportNotes.test.ts`, `src/test/advanceWeek.modifiableDataPack.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts` |
| Plan   | `planning/modifiable-data-pack-weekly-orchestration-slice-2.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Publish automation integration for pack import | SPE-75 follow-up child | Out of weekly orchestration boundary |
| GameState execution-receipt persistence | SPE-75 follow-up child | Optional ledger beyond governance receipts |
| Mission triage modifiable-pack chips | Backlog | Mission triage full refresh blocked |

## See also

- `planning/modifiable-data-pack-surfacing-slice-1.md`
- `planning/modifiable-data-pack-runtime-import-slice-1.md`
- `planning/publish-queue-surfacing-slice-1.md`
- `planning/backlog.md`
