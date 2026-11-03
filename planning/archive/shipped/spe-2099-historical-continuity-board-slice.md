# SPE-2099 — Historical continuity board (slice 1)

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-2099](https://linear.app/spectranoir/issue/SPE-2099/historical-continuity-board-records-chronology-validation-and-layered) |
| **Parent** | [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-2099-historical-continuity-board-records-chronology-validation` |
| **Base main SHA** | `bde1f82c` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `bde1f82c`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-2099  

## Approved boundary

- Pure `historicalContinuityBoard` records + `validateHistoricalChronology` + `projectHistoricalRecordForPlayer`
- Layered truth; supersession preserves prior records; no auto-merge / auto-resolve
- SCHEMA_REGISTRY + targeted tests
- No GameState, site generator, franchise imports, or archive UI

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| GameState persistence / archive UI | out of slice | Explicit deferred |
| Incident chronology engines | SPE-822 / SPE-3030 | Distinct owners |
| Shared-universe entity registry | SPE-3335 | Adjacent larger slice |

## Validation

- `npx vitest run src/test/historicalContinuityBoard.test.ts`
