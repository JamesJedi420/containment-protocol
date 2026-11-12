# SPE-2122 — Mass anomalous population emergence registry weekly governance hook (slice 3)

One-page implementation plan. Linear: [SPE-2333](https://linear.app/spectranoir/issue/SPE-2333) (child under [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122)). Follows shipped slice 2 (`planning/mass-anomalous-population-emergence-registry-slice-2.md`, PR #2531).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2333 — Mass anomalous population emergence registry weekly governance hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2333) |
| **Status** | **Shipped** — PR #2533 @ `832cbfa5` |
| **Parent** | [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) — registry anchor (slice 1–2 shipped); umbrella [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) stays open |
| **Branch** | `spe-2122-mass-anomalous-population-emergence-weekly-hook-slice-3`                                         |
| **Base `main` SHA** | `ce173c80`                                                                                          |

## Goal

Wire persisted `massAnomalousPopulationEmergenceRecords` into `advanceWeek` with a pure domain tick: registration backlog decay plus read-time governance-surge reprojection via `projectGovernanceSurge` policy.

## Prerequisite (on `main` @ `ce173c80`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/massAnomalousPopulationEmergenceRegistry.ts` (SPE-2122 / PR #2441) |
| Persistence          | `massAnomalousPopulationEmergenceRecords` on `GameState` (SPE-2332 / PR #2531) |
| Sibling weekly hook  | `src/domain/publicDisclosureWeeklyProgression.ts` (SPE-2326)           |

## Governance tick contract (slice 3)

- **Backlog decay** — each weekly tick decrements `registrationBacklogWeeks` by 1 while positive; floor at 0.
- **Surge-band reprojection** — `resolvePopulationEmergenceGovernanceSurgeForWeek(record, week)` calls `projectGovernanceSurge` with `currentWeek` policy; not persisted on GameState.
- **One step per week** — at most one backlog decrement per record per tick; re-tick same week is idempotent when backlog is already 0.
- **No-op** — empty map, zero backlog, or invalid post-tick candidate (validation failure preserves source record).

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyPopulationEmergenceGovernanceTick` in domain module      | New persistence fields, UI                    |
| Call from `advanceWeek` after week increment (`result.week`)       | SPE-2109 normalization wire-up                |
| Targeted domain + `advanceWeek` integration tests                    | SPE-861 / SPE-1343 wire-up                    |
| Slice doc (this file) + backlog handoff                              | Sanitize/hydration changes (slice 2)          |

## Acceptance

- [x] Empty `massAnomalousPopulationEmergenceRecords` map is a no-op without throw
- [x] `registrationBacklogWeeks` decrements by 1 per tick while > 0
- [x] Re-applying tick when backlog is 0 is idempotent for the same week
- [x] Invalid post-tick record must not mutate source record
- [x] Unrelated record fields byte-stable when backlog decays
- [x] Governance surge reprojection deterministic via `currentWeek` policy
- [x] `npm run lint` + targeted tests + persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/massAnomalousPopulationEmergenceWeeklyGovernance.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/massAnomalousPopulationEmergenceWeeklyGovernance.test.ts`, `src/test/advanceWeek.massAnomalousPopulationEmergence.integration.test.ts` |
| Plan   | `planning/mass-anomalous-population-emergence-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mass-anomalous population emergence wire-up to normalization inputs | SPE-2122 / SPE-2109 | Deferred per public-disclosure slice 4 doc |
| Default ladder auto-progression without pre-scheduled history | SPE-2109 follow-up | Deferred per public-disclosure slice 3 doc |
| Public-trust engine wire-up | SPE-861 | Parent umbrella; out of weekly-hook boundary |
| Disclosure campaign player UI | SPE-1343 | Out of weekly-hook boundary |

## See also

- `planning/mass-anomalous-population-emergence-registry-slice-2.md`
- `planning/public-disclosure-state-registry-slice-3.md`
