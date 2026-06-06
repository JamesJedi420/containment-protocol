# SPE-2111 — Visual-trigger hazard registry GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2336](https://linear.app/spectranoir/issue/SPE-2336) (child under [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111)). Follows shipped slice 1 (`planning/visual-trigger-hazard-registry-slice-1.md`, PR #2432).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2336 — Visual-trigger hazard registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2336) |
| **Status** | **In Progress** |
| **Parent** | [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) — Visual-trigger hazard registry; umbrella [SPE-947](https://linear.app/spectranoir/issue/SPE-947) |
| **Branch** | `spe-2111-visual-trigger-hazard-registry-persistence-slice-2`                                        |
| **Base `main` SHA** | `ccb4fdff`                                                                                          |

## Goal

Persist validated `VisualTriggerHazardRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly orchestration and propagation graph wire-up are slice 3+.

## Prerequisite (on `main` @ `ccb4fdff`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/visualTriggerHazardRegistry.ts` (SPE-2111 / PR #2432) |
| Fixtures             | `BACKGROUND_FRAGMENT_LATENT_FIXTURE`, `COVERED_PURSUIT_RESOLUTION_FIXTURE`, `DISPOSAL_DEADLINE_SWEEP_FIXTURE` |
| Sibling persistence  | `massAnomalousPopulationEmergenceRecords` (SPE-2332), `patternSourceSeriesRecords` (SPE-2327) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `visualTriggerHazardRecords` on `GameState`           | Weekly `advanceWeek` hook    |
| `sanitizeVisualTriggerHazardRecords` + `runTransfer` hydrate wire | Propagation graph wire-up (#965 family) |
| `validateVisualTriggerHazardRecord` on hydrate; drop invalid, no throw | Pursuit vector simulator integration        |
| Default `{}` in `createStartingState`                              | Countermeasure ledger link           |
| Sanitize unit tests + save/import round-trip (byte-stable)         | SPE-947 parent Done             |

## Acceptance

- [ ] Valid fixture round-trips through serialize/import
- [ ] Invalid/duplicate-id entries dropped safely on hydrate
- [ ] Franchise/branded token guards preserved on hydrate
- [ ] Nested hazardous media / target refs byte-stable after round-trip
- [ ] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/visualTriggerHazardRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/visualTriggerHazardRegistryPersistence.test.ts` |
| Plan   | `planning/visual-trigger-hazard-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly visual-trigger hazard orchestration hook | SPE-2111 slice 3+ | Persistence must land before orchestration |
| Propagation graph wire-up | SPE-956 / #965 family | Deferred per slice 1 doc |
| Pursuit vector simulator integration | SPE-947 | Parent umbrella; out of persistence-only boundary |
| Countermeasure ledger link | SPE-645 | Out of registry mirror boundary |
| Field UI | SPE-947 follow-up | Out of persistence-only boundary |

## See also

- `planning/visual-trigger-hazard-registry-slice-1.md`
- `planning/mass-anomalous-population-emergence-registry-slice-2.md`
