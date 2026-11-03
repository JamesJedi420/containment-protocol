# SPE-2108 — Self-censoring information registry GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2318](https://linear.app/spectranoir/issue/SPE-2318) (child under [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108)). Follows shipped slice 1 (`planning/self-censoring-information-registry-slice-1.md`, PR #2429).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2318 — Self-censoring information registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2318) |
| **Status** | **Shipped** — PR #2500 @ `9cd48aeb`                                                                        |
| **Parent** | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) — Self-censoring information registry; umbrella [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) |
| **Branch** | `spe-2108-self-censoring-information-registry-persistence-slice-2`                                         |
| **Base `main` SHA** | `39fee7c6`                                                                                          |

## Goal

Persist validated `SelfCensoringInformationRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly orchestration and investigation UI are slice 3+.

## Prerequisite (on `main` @ `39fee7c6`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108 / PR #2429) |
| Fixtures             | `REDISCOVERY_LOOP_RECORD_FIXTURE`, `STUDY_BLOCKED_ARCHIVE_FIXTURE`     |
| Sibling persistence  | `extranormalEventRecords` (SPE-2312), `unexplainedLocationRecords` (SPE-2313), `minorAnomalyItemRecords` (SPE-2314) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `selfCensoringInformationRecords` on `GameState`                   | Weekly `advanceWeek` hook                     |
| `sanitizeSelfCensoringInformationRecords` + `runTransfer` hydrate wire | Investigation UI / dossier surfacing      |
| `validateSelfCensoringInformationRecord` on hydrate; drop invalid, no throw | SPE-1309 parent Done                     |
| Default `{}` in `createStartingState`                              | Sibling registries                            |
| Sanitize unit tests + save/import round-trip (byte-stable)         | SPE-854 unusable-archive routing              |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] `negativeFacts` / `rediscoveryLoop` byte-stable after round-trip
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/selfCensoringInformationRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/selfCensoringInformationRegistryPersistence.test.ts`        |
| Plan   | `planning/self-censoring-information-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly retention-decay / rediscovery advance hook | SPE-2108 slice 3+ | Persistence must land before orchestration |
| Unified cognitive hazard engine wire-up | SPE-1309 | Parent umbrella; out of persistence-only boundary |
| Investigation exposure dossier surfacing | SPE-2159 / E54 | Out of persistence-only boundary |

## See also

- `planning/self-censoring-information-registry-slice-1.md`
- `planning/extranormal-event-registry-slice-2.md`
- `planning/minor-anomaly-item-registry-slice-2.md`
