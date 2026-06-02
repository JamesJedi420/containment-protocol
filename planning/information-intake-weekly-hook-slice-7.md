# SPE-854 — Weekly intake verification report notes (slice 7)

One-page implementation plan. Linear: [SPE-2298](https://linear.app/spectranoir/issue/SPE-2298). Follows shipped [SPE-2297](https://linear.app/spectranoir/issue/SPE-2297) (slice 6).

| Field      | Value |
| ---------- | ----- |
| **Linear** | [SPE-2298 — Weekly intake verification narratives in report notes (slice 7)](https://linear.app/spectranoir/issue/SPE-2298) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine |
| **Branch** | `spe-854-information-intake-weekly-hook-slice-7` |
| **Status** | **In Progress** |

## Goal

Project weekly intake verification narratives into weekly report notes using persisted corroboration/contradiction history and narrative `sourceRef` segments — domain-only; no `InformationIntakeReportRecord` schema changes.

## Prerequisite (on `main` @ `cd8f368217c89000c9fb7e2bca5172e9a0b1892e`)

| Shipped | Anchor |
| ------- | ------ |
| Narrative source-ref generator | `src/domain/informationIntakeWeeklyCorroboration.ts` (SPE-2297) |
| Weekly intake tick in `advanceWeek` | `src/domain/sim/advanceWeek.ts` (SPE-2295+) |

## Scope (this slice)

| In | Out |
| -- | --- |
| `buildWeeklyIntakeVerificationReportNotes` + narrative segment parsing | `InformationIntakeReportRecord` schema changes |
| Append notes to current weekly report after intake tick (preserve tick order) | UI report surfacing |
| Integration tests on `advanceWeek` intake path | Parent SPE-854 closure |
| Slice doc + backlog row | Dynamic templates from case outcome metadata |

## Acceptance

- [ ] Weekly report includes deterministic intake verification notes when synthetic events are added this tick
- [ ] Note content reflects `trace-*` / `channel-*` or `dispute-*` / `cue-*` segments from `sourceRef`
- [ ] Notes use `system.week_delta` with bounded metadata (`delta` only)
- [ ] `npm run test:run -- src/test/advanceWeek.informationIntake.integration.test.ts` and `npm run lint` pass

## File touch list (expected)

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/informationIntakeWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests | `src/test/advanceWeek.informationIntake.integration.test.ts` |
| Plan | `planning/information-intake-weekly-hook-slice-7.md`, `planning/backlog.md` |

## Deferred (recorded for follow-up)

| Item | Suggested owner | Why deferred (slice 7 boundary) |
| ---- | --------------- | ----------------------------- |
| Dedicated `information_intake.verification` report note type + UI bucket | SPE-854 child | Slice 7 uses existing `system.week_delta` metadata allowlist |
| Dynamic narrative templates from case outcome metadata | SPE-854 child | Slice 7 humanizes bounded deterministic tokens only |
| Parent SPE-854 acceptance (mixed-source incident + operational routing) | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Child slice only |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **In Progress** (or **Backlog** per team convention) until full parent acceptance ships.
