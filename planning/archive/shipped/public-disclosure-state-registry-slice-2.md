# SPE-2109 — Public disclosure state registry GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2325](https://linear.app/spectranoir/issue/SPE-2325) (child under [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109)). Follows shipped slice 1 (`planning/public-disclosure-state-registry-slice-1.md`, PR #2430).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2325 — Public disclosure state registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2325) |
| **Status** | **Shipped** — PR #2517 @ `ff0955a1`                                                                        |
| **Parent** | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) — Public disclosure state registry; umbrella [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) |
| **Branch** | `spe-2109-public-disclosure-state-registry-persistence-slice-2`                                            |
| **Base `main` SHA** | `f6c08c6e`                                                                                          |

## Goal

Persist validated `PublicDisclosureRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly orchestration and campaign UI are slice 3+.

## Prerequisite (on `main` @ `f6c08c6e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109 / PR #2430)    |
| Fixtures             | `DISCLOSURE_PROGRESSION_FIXTURE`, `NORMALIZATION_INPUT_FIXTURE`        |
| Sibling persistence  | `selfCensoringInformationRecords` (SPE-2318), intake registry maps (SPE-2312–2314) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publicDisclosureRecords` on `GameState`                            | Weekly `advanceWeek` hook                     |
| `sanitizePublicDisclosureRecords` + `runTransfer` hydrate wire     | Disclosure campaign UI                        |
| `validatePublicDisclosureRecord` on hydrate; drop invalid, no throw | SPE-1343 parent Done                     |
| Default `{}` in `createStartingState`                              | SPE-861 public-trust engine wire-up           |
| Sanitize unit tests + save/import round-trip (byte-stable)         | Cover-story capacity (SPE-1347)               |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] `transitionHistory` / `trustByRegion` byte-stable after round-trip
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publicDisclosureStateRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/publicDisclosureStateRegistryPersistence.test.ts`           |
| Plan   | `planning/public-disclosure-state-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly disclosure progression / fallout advance hook | SPE-2109 slice 3+ | Persistence must land before orchestration |
| Public-trust engine wire-up | SPE-861 | Parent umbrella; out of persistence-only boundary |
| Disclosure campaign UI | SPE-1343 | Out of persistence-only boundary |

## See also

- `planning/public-disclosure-state-registry-slice-1.md`
- `planning/self-censoring-information-registry-slice-2.md`
