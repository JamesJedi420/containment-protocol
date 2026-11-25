# SPE-1431 — Backup-power evidence access timers (slice 1)

## Boundary

Pure domain contract for finite backup-power reserve countdown, selective dependency, degradation bands (`full` | `degraded` | `inaccessible`), and evidence-integrity loss reporting.

Does not own facility energy management, evidence custody, door control, refrigeration mechanics, or UI. Operator priority is an input flag only; drain is not reallocated.

## Acceptance covered

- Critical evidence surface degrades / becomes inaccessible on threshold crossing.
- Sample/record loses integrity when power fails before recovery.
- Selective surface remains partially usable while shared reserve is exhausted (choice is reported via priority flag).
- Targeted tests cover countdown, selective dependency, degradation, and integrity loss.

## Files

- `src/domain/backupPowerEvidenceAccessTimers.ts`
- `src/domain/backupPowerEvidenceAccessTimers.test.ts`

## Next

Codex/Cursor: independent review, CI, any mechanical rebase, merge when ready. No GameState wiring in this slice.
