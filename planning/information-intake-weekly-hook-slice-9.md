# SPE-854 — Dynamic intake narrative templates from case outcome metadata (slice 9)

One-page implementation plan. Linear: [SPE-2300](https://linear.app/spectranoir/issue/SPE-2300). Follows shipped [SPE-2299](https://linear.app/spectranoir/issue/SPE-2299) (slice 8).

| Field      | Value |
| ---------- | ----- |
| **Linear** | [SPE-2300 — Dynamic intake narrative templates from case outcome metadata (slice 9)](https://linear.app/spectranoir/issue/SPE-2300) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine |
| **Branch** | `spe-854-information-intake-weekly-hook-slice-9` |
| **Status** | **Shipped** (PR #2463) |

## Goal

Derive weekly intake corroboration/contradiction narrative content from linked case outcome metadata (stage, resolution/status, topic tags) instead of only humanizing bounded sourceRef tokens.

## Prerequisite (on `main` @ `ec57221d`)

| Shipped | Anchor |
| ------- | ------ |
| Dedicated intake verification report note type | `src/domain/informationIntakeWeeklyReportNotes.ts` (SPE-2299) |
| Narrative source-ref generator + case/topic linkage | `src/domain/informationIntakeWeeklyCorroboration.ts` (SPE-2297 / SPE-2296) |
| Weekly intake tick in `advanceWeek` | `src/domain/sim/advanceWeek.ts` (SPE-2295+) |

## Scope (this slice)

| In | Out |
| -- | --- |
| Template derivation helper from case outcome metadata | `InformationIntakeReportRecord` schema changes |
| Wire into weekly corroboration source-ref + report note paths | Report note type / UI categorization changes |
| Integration + focused unit tests | Intake tick order changes |
| Slice doc + backlog row | Parent SPE-854 closure |

## Acceptance

- [ ] Narrative tokens reflect linked case stage, status, and topic tags when available
- [ ] Deterministic fallback when metadata is partial or missing
- [ ] Existing idempotence and integration assertions preserved
- [ ] `npm run test:run -- src/test/informationIntakeWeeklyNarrativeTemplates.test.ts src/test/advanceWeek.informationIntake.integration.test.ts src/test/reportNoteTypeAudit.test.ts` and `npm run lint` pass

## File touch list (expected)

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/informationIntakeWeeklyNarrativeTemplates.ts`, `src/domain/informationIntakeWeeklyCorroboration.ts`, `src/domain/informationIntakeWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests | `src/test/informationIntakeWeeklyNarrativeTemplates.test.ts`, `src/test/advanceWeek.informationIntake.integration.test.ts` |
| Plan | `planning/information-intake-weekly-hook-slice-9.md`, `planning/backlog.md` |

## Deferred (recorded for follow-up)

| Item | Suggested owner | Why deferred (slice 9 boundary) |
| ---- | --------------- | ----------------------------- |
| Parent SPE-854 acceptance (mixed-source incident + operational routing) | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Child slice only |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **Backlog** until full parent acceptance ships (parent closure still deferred).
