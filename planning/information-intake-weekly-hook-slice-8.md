# SPE-854 — Dedicated intake verification report note type (slice 8)

One-page implementation plan. Linear: [SPE-2299](https://linear.app/spectranoir/issue/SPE-2299). Follows shipped [SPE-2298](https://linear.app/spectranoir/issue/SPE-2298) (slice 7).

| Field      | Value |
| ---------- | ----- |
| **Linear** | [SPE-2299 — Dedicated intake verification report note type (slice 8)](https://linear.app/spectranoir/issue/SPE-2299) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine |
| **Branch** | `spe-854-information-intake-weekly-hook-slice-8` |
| **Status** | **In Progress** |

## Goal

Add dedicated `information_intake.verification` report note type with UI categorization bucket; switch weekly intake verification note builder from `system.week_delta`.

## Prerequisite (on `main` @ `6ea29a57f541585d14836d3ebe5f0c3d0cc91297`)

| Shipped | Anchor |
| ------- | ------ |
| Weekly intake verification report notes | `src/domain/informationIntakeWeeklyReportNotes.ts` (SPE-2298) |
| Weekly intake tick in `advanceWeek` | `src/domain/sim/advanceWeek.ts` (SPE-2295+) |

## Scope (this slice)

| In | Out |
| -- | --- |
| `ReportNoteType` union + audit registry | `InformationIntakeReportRecord` schema changes |
| `runTransfer` hydration allowlist + metadata keys | Intake tick order changes |
| `reportNoteView` `information_intake` category bucket | Parent SPE-854 closure |
| Switch intake note builder from `system.week_delta` | UI copy beyond categorization |
| Integration + audit/view tests | Dynamic narrative templates from case outcome metadata |

## Acceptance

- [ ] Intake verification notes use `information_intake.verification` with bounded metadata
- [ ] Audit registry, `REPORT_NOTE_TYPES`, and `reportNoteView` stay aligned (39 types)
- [ ] `npm run test:run -- src/test/reportNoteTypeAudit.test.ts src/features/report/reportNoteView.test.ts src/test/advanceWeek.informationIntake.integration.test.ts` and `npm run lint` pass

## File touch list (expected)

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/models.ts`, `src/domain/informationIntakeWeeklyReportNotes.ts` |
| Store | `src/app/store/runTransfer.ts` |
| UI | `src/features/report/reportNoteView.ts` |
| Tests | `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts`, `src/test/advanceWeek.informationIntake.integration.test.ts` |
| Plan | `planning/information-intake-weekly-hook-slice-8.md`, `planning/backlog.md` |

## Deferred (recorded for follow-up)

| Item | Suggested owner | Why deferred (slice 8 boundary) |
| ---- | --------------- | ----------------------------- |
| Dynamic narrative templates from case outcome metadata | SPE-854 child | Slice 8 types/categorizes existing bounded narratives only |
| Parent SPE-854 acceptance (mixed-source incident + operational routing) | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Child slice only |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **Backlog** until full parent acceptance ships.
