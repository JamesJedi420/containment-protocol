# SPE-75 — Modifiable data-pack runtime import (slice 1)

One-page implementation plan. Linear: [SPE-2486](https://linear.app/spectranoir/issue/SPE-2486) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2479](https://linear.app/spectranoir/issue/SPE-2479) per `planning/modifiable-data-pack-validation-slice-1.md` § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2486 — Modifiable data-pack runtime import (slice 1)](https://linear.app/spectranoir/issue/SPE-2486) |
| **Status** | **Shipped** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-modifiable-data-pack-runtime-import-slice-1` |
| **Base `main` SHA** | `46d03bc1` |

## Goal

Wire validated modifiable data-pack import into the runtime load path with safe-fail envelope from SPE-2479 — persist on `GameState` with sanitize/hydration; no publish-queue or CI changes.

## Prerequisite (on `main` @ `46d03bc1`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Validation envelope  | `src/domain/modifiableDataPackValidation.ts` (SPE-2479) |
| Sanitize/hydrate pattern | `src/domain/publishAutomationCreditingHooks.ts` (SPE-2483) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `modifiableDataPackRecords` on `GameState` | Publish-queue or CI changes |
| `sanitizeModifiableDataPackRecords` + `runTransfer` hydrate wire | Route/UI changes |
| `composeModifiableDataPackRecord` read-only from validation decisions | Mission triage (blocked) |
| Default `{}` in `createStartingState` | SPE-75 parent reopen |
| Sanitize unit tests + save/import round-trip (byte-stable) | Weekly orchestration / surfacing |

## Acceptance

- [x] Valid canonical fixture round-trips through serialize/import
- [x] Invalid/duplicate-id/rejected entries dropped safely on hydrate
- [x] `composeModifiableDataPackRecord` matches canonical fixture from upstream chain
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/modifiableDataPackValidation.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/modifiableDataPackRuntimeImport.test.ts` |
| Plan   | `planning/modifiable-data-pack-runtime-import-slice-1.md`, `planning/backlog.md` |
| Docs   | optional cross-ref in `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Modifiable-pack UI / weekly orchestration | SPE-75 follow-up child | Persistence must land before surfacing |
| Publish automation integration for pack import | SPE-75 follow-up child | Out of runtime-import boundary |

## See also

- `planning/modifiable-data-pack-validation-slice-1.md`
- `planning/publish-queue-persistence-slice-1.md`
- `planning/backlog.md`
