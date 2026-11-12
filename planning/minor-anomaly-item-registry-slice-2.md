# SPE-88 — Minor anomaly item registry GameState persistence (slice 2)

One-page implementation plan. Linear: child under [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104) / [SPE-88](https://linear.app/spectranoir/issue/SPE-88). Follows shipped slice 1 (`planning/minor-anomaly-item-registry-slice-1.md`, PR #2428).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2314 — Minor anomaly item registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2314) |
| **Status** | **Shipped** — PR #2492 @ `91c902f4`                                                                       |
| **Parent** | [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104) — Minor anomaly item registry; umbrella [SPE-88](https://linear.app/spectranoir/issue/SPE-88) |
| **Branch** | `spe-2104-minor-anomaly-item-registry-persistence-slice-2`                                                 |
| **Base `main` SHA** | `97463533`                                                                                          |

## Goal

Persist validated `MinorAnomalyRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; disposition weekly hooks and case lifecycle are out of scope.

## Prerequisite (on `main` @ `97463533`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/minorAnomalyItemRegistry.ts` (SPE-2104 / PR #2428)         |
| Fixtures             | `DISPOSITION_CHAIN_ITEM_FIXTURE`, `FALSE_POSITIVE_ITEM_FIXTURE`        |
| Sibling persistence  | `extranormalEventRecords` (SPE-2312), `unexplainedLocationRecords` (SPE-2313) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `minorAnomalyItemRecords` on `GameState`                           | Weekly disposition advance hook               |
| `sanitizeMinorAnomalyItemRecords` + `runTransfer` hydrate wire      | UI / compendium / map board                   |
| `validateMinorAnomalyRecord` on hydrate; drop invalid, no throw    | Case lifecycle wire-up (SPE-1310)             |
| Default `{}` in `createStartingState`                              | SPE-88 parent Done                            |
| Sanitize unit tests + save/import round-trip (byte-stable)         | SPE-2105 slice 3 weekly hook                  |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] `statusHistory` byte-stable after round-trip
- [x] Optional `investigationRef` / `destructionAuthorizationRef` preserved when valid
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/minorAnomalyItemRegistry.ts`, `src/domain/models.ts`      |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/minorAnomalyItemRegistryPersistence.test.ts`                |
| Plan   | `planning/minor-anomaly-item-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly disposition / custody advance hook | SPE-2104 slice 3+ | Persistence must land before orchestration |
| Storage policy enforcement | SPE-1314 | Out of persistence-only boundary |
| Extranormal event weekly monitoring hook | SPE-2105 slice 3 | Separate parent; unblocked after registry wave |

## See also

- `planning/unexplained-location-registry-slice-2.md`
- `planning/extranormal-event-registry-slice-2.md`
- `planning/minor-anomaly-item-registry-slice-1.md`
