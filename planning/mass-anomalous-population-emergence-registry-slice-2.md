# SPE-2122 — Mass anomalous population emergence registry GameState persistence (slice 2)

One-page implementation plan. Linear: child under [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122). Follows shipped slice 1 (`planning/mass-anomalous-population-emergence-registry-slice-1.md`, PR #2441).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2332 — Mass anomalous population emergence registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2332) |
| **Status** | **Shipped** — PR #2531 @ `8a84c519` |
| **Parent** | [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) — Mass anomalous population emergence registry; umbrella [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) |
| **Branch** | `spe-2122-mass-anomalous-population-emergence-persistence-slice-2`                                        |
| **Base `main` SHA** | `a5e6e4dc`                                                                                          |

## Goal

Persist validated `PopulationEmergenceRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly governance-surge orchestration and disclosure wire-up are slice 3+.

## Prerequisite (on `main` @ `a5e6e4dc`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/massAnomalousPopulationEmergenceRegistry.ts` (SPE-2122 / PR #2441) |
| Fixtures             | `MANAGED_DISCLOSURE_BACKLOG_FIXTURE`, `COLLAPSED_MASQUERADE_EDUCATION_FIXTURE` |
| Sibling persistence  | `publicDisclosureRecords` (SPE-2325), `patternSourceSeriesRecords` (SPE-2327) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `massAnomalousPopulationEmergenceRecords` on `GameState`           | Weekly `advanceWeek` governance-surge hook    |
| `sanitizeMassAnomalousPopulationEmergenceRecords` + `runTransfer` hydrate wire | SPE-2109 disclosure normalization wire-up |
| `validatePopulationEmergenceRecord` on hydrate; drop invalid, no throw | SPE-1343 disclosure campaign UI        |
| Default `{}` in `createStartingState`                              | SPE-861 public-trust engine wire-up           |
| Sanitize unit tests + save/import round-trip (byte-stable)         | SPE-1046 affiliation bulk updates             |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] `triageLanes` / `securitySurgeRefs` / `rightsReviewQueueRefs` byte-stable after round-trip
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/massAnomalousPopulationEmergenceRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/massAnomalousPopulationEmergenceRegistryPersistence.test.ts` |
| Plan   | `planning/mass-anomalous-population-emergence-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly governance-surge / backlog advance hook | SPE-2122 slice 3+ | Persistence must land before orchestration |
| Mass-anomalous population emergence wire-up to normalization inputs | SPE-2122 / SPE-2109 | Deferred per public-disclosure slice 4 doc |
| Default ladder auto-progression without pre-scheduled history | SPE-2109 follow-up | Deferred per public-disclosure slice 3 doc |
| Public-trust engine wire-up | SPE-861 | Parent umbrella; out of persistence-only boundary |
| Disclosure campaign player UI | SPE-1343 | Out of registry mirror boundary |

## See also

- `planning/mass-anomalous-population-emergence-registry-slice-1.md`
- `planning/public-disclosure-state-registry-slice-2.md`
