# SPE-88 — Unexplained location registry GameState persistence (slice 2)

One-page implementation plan. Linear: child under [SPE-88](https://linear.app/spectranoir/issue/SPE-88) / [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106). Follows shipped slice 1 (`planning` harvest mirror + PR #2427).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2313 — Unexplained location registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2313) |
| **Status** | In progress                                                                                                |
| **Parent** | [SPE-88](https://linear.app/spectranoir/issue/SPE-88) — Anomaly compendium umbrella; registry anchor [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106) |
| **Branch** | `spe-2106-unexplained-location-registry-persistence-slice-2`                                             |
| **Base `main` SHA** | `017ec758`                                                                                          |

## Goal

Persist validated `UnexplainedLocationRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly lifecycle orchestration is out of scope.

## Prerequisite (on `main` @ `017ec758`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/unexplainedLocationRegistry.ts` (SPE-2106 / PR #2427)        |
| Fixtures             | `REMOTE_MONITOR_SITE_FIXTURE`, `LIFECYCLE_CHAIN_LOCATION_FIXTURE`      |
| Sibling persistence  | `extranormalEventRecords` pattern (SPE-2312 / PR #2488)                |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `unexplainedLocationRecords` on `GameState`                        | Weekly lifecycle advance hook                 |
| `sanitizeUnexplainedLocationRecords` + `runTransfer` hydrate wire  | UI / map board                                |
| `validateUnexplainedLocationRecord` on hydrate; drop invalid, no throw | Minor anomaly persistence (SPE-2104)     |
| Default `{}` in `createStartingState`                              | SPE-88 parent Done                            |
| Sanitize unit tests + save/import round-trip (byte-stable)         | SPE-2105 slice 3 weekly hook                  |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] `statusHistory` byte-stable after round-trip
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/unexplainedLocationRegistry.ts`, `src/domain/models.ts`   |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/unexplainedLocationRegistryPersistence.test.ts`              |
| Plan   | `planning/unexplained-location-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly lifecycle / monitoring cadence advance | SPE-2106 slice 3+ | Persistence must land before orchestration |
| Minor anomaly item persistence | SPE-2104 slice 2 | One registry per PR |
| Extranormal event weekly monitoring hook | SPE-2105 slice 3 | Separate parent; unblocked on main |

## See also

- `planning/extranormal-event-registry-slice-2.md`
- `planning/minor-anomaly-item-registry-slice-1.md`
