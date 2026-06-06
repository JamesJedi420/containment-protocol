# SPE-2122 — Mass anomalous population emergence normalization inputs wire-up (slice 5)

One-page implementation plan. Linear: [SPE-2335](https://linear.app/spectranoir/issue/SPE-2335) (child under [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122)). Follows shipped slice 4 (`planning/mass-anomalous-population-emergence-registry-slice-4.md`, PR #2535).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2335 — Mass anomalous population emergence normalization inputs wire-up (slice 5)](https://linear.app/spectranoir/issue/SPE-2335) |
| **Status** | **Shipped** — PR #2537 @ `f92c90d0` |
| **Parent** | [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) — registry anchor (slice 1–4 shipped); umbrella [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) stays open |
| **Branch** | `spe-2122-mass-anomalous-population-emergence-normalization-wire-slice-5`                                  |
| **Base `main` SHA** | `60da9665`                                                                                          |

## Goal

Pure domain derive + compose wire-up: derive `NormalizationInput[]` from persisted `massAnomalousPopulationEmergenceRecords` and merge into `publicDisclosureRecords.normalizationInputs` for consumption by public-disclosure normalization paths.

## Prerequisite (on `main` @ `60da9665`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/massAnomalousPopulationEmergenceRegistry.ts` (SPE-2122 / PR #2441) |
| Persistence          | `massAnomalousPopulationEmergenceRecords` on `GameState` (SPE-2332 / PR #2531) |
| Weekly governance hook | `applyWeeklyPopulationEmergenceGovernanceTick` (SPE-2333 / PR #2533) |
| Disclosure schema    | `NormalizationInput` + `mass_anomalous_population_emergence` kind (SPE-2109 / PR #2430) |
| Disclosure persistence | `publicDisclosureRecords` on `GameState` (SPE-2325 / PR #2517)       |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `deriveNormalizationInputsFromPopulationEmergenceRecords`          | New persistence fields                     |
| `composePopulationEmergenceNormalizationIntoDisclosureRecords`     | Mirror UI (slice 4)                           |
| Call compose from `advanceWeek` after emergence + disclosure ticks | Weekly tick / sanitize contract changes       |
| Unit + integration tests                                           | SPE-2109 parent Done                            |
| Slice doc (this file) + backlog handoff                            | SPE-861 / SPE-1343 player UI                    |

## Derive contract

- **Hydrated truth only** — derive from persisted map entries; skip invalid records without re-surfacing dropped payloads.
- **Governance-mode kinds** — `secrecy_restore` → `cleanup_front`; `managed_disclosure` → `mass_anomalous_population_emergence`; `collapsed_masquerade` → `community_integration_program`.
- **Week drift** — descriptor includes `resolvePopulationEmergenceGovernanceSurgeForWeek` surge band when projection is available.
- **Ordering** — sorted by population-emergence record id.
- **Copy** — CP-neutral descriptors; no franchise tokens.

## Compose contract

- **Qualifying disclosure records** — `official_disclosure` and `normalization` awareness levels only.
- **Merge** — preserve authored normalization inputs; replace prior wired inputs identified by `population-emergence:` ref prefix.
- **Strip** — remove wired inputs from pre-disclosure awareness records.
- **Validation** — invalid post-compose candidate preserves source record.

## Acceptance

- [x] Empty population emergence map is a no-op without throw
- [x] Derived inputs use governance-mode-specific kinds with deterministic ordering
- [x] Wired inputs appear on disclosure records when fixtures coexist through `advanceWeek`
- [x] Authored normalization inputs preserved; invalid/dropped emergence records not re-surfaced
- [x] Persistence regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/massAnomalousPopulationEmergenceNormalizationInputs.ts`, `src/domain/publicDisclosureNormalizationCompose.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/massAnomalousPopulationEmergenceNormalizationInputs.test.ts`, `src/test/publicDisclosureNormalizationCompose.test.ts`, `src/test/advanceWeek.populationEmergenceNormalization.integration.test.ts` |
| Plan   | `planning/mass-anomalous-population-emergence-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Default ladder auto-progression without pre-scheduled history | SPE-2109 follow-up | Deferred per public-disclosure slice 3 doc |
| Public-trust engine wire-up | SPE-861 | Parent umbrella; out of normalization compose boundary |
| Disclosure campaign player UI | SPE-1343 | Out of domain wire-up boundary |

## See also

- `planning/mass-anomalous-population-emergence-registry-slice-4.md`
- `planning/public-disclosure-state-registry-slice-4.md` — deferred normalization wire-up source
