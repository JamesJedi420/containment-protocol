# SPE-2117 — Recurrent catastrophe amelioration registry GameState persistence (slice 2)

One-page implementation plan. Linear: child [SPE-2363](https://linear.app/spectranoir/issue/SPE-2363) under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) / anchor [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117). Follows shipped slice 1 (`planning/recurrent-catastrophe-amelioration-registry-slice-1.md`, PR #2436).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2363 — Recurrent catastrophe amelioration registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2363) |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Case / facility lifecycle (stays open)         |
| **Anchor** | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) — Recurrent catastrophe amelioration registry slice 1 |
| **Branch** | `spe-2117-recurrent-catastrophe-persistence-slice-2`                                                     |
| **Base `main` SHA** | `11d57c13`                                                                                          |

## Goal

Persist validated `RecurrentCatastropheRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly recurrence orchestration is slice 3+.

## Prerequisite (on `main` @ `11d57c13`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/recurrentCatastropheAmeliorationRegistry.ts` (SPE-2117 / PR #2436) |
| Fixtures             | `IMPOSSIBLE_PREVENTION_DAMPENING_FIXTURE`, `RECURRENCE_DAMAGE_LEDGER_FIXTURE` |
| Sibling persistence pattern | `planning/extranormal-event-registry-slice-2.md` (SPE-2312 / PR #2488), `planning/naming-hazard-descriptor-registry-slice-2.md` (SPE-2357) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `recurrentCatastropheRecords` on `GameState`                       | Weekly `advanceWeek` recurrence hook          |
| `sanitizeRecurrentCatastropheRecords` + `runTransfer` hydrate wire | UI / dev overlay                              |
| `validateRecurrentCatastropheRecord` on hydrate; drop invalid, no throw | SPE-1310 parent closure                  |
| Default `{}` in `createStartingState`                              | SPE-868 post-incident review wire-up          |
| Sanitize unit tests + save/import round-trip (byte-stable)         | Changes to slice-1 validation semantics       |
| Warnings-only records persist (e.g. `recurrence_without_damage_ledger`) | Sibling registries (SPE-2123 persistence) |

## Acceptance

- [ ] Valid fixtures round-trip through serialize/import
- [ ] Invalid/duplicate-id entries dropped safely on hydrate (including `active_prevention_when_ceiling_impossible`)
- [ ] Warnings-only records persist through sanitize
- [ ] `npm run lint` + targeted tests + slice-1 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/recurrentCatastropheAmeliorationRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/recurrentCatastropheAmeliorationRegistryPersistence.test.ts` |
| Plan   | `planning/recurrent-catastrophe-amelioration-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly recurrence advance hook | SPE-2117 slice 3 | Persistence must land before orchestration |
| SPE-868 post-incident review refs wire-up | SPE-868 follow-up | Out of persistence-only boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |

## See also

- `planning/recurrent-catastrophe-amelioration-registry-slice-1.md`
- `planning/extranormal-event-registry-slice-2.md`
- `src/test/namingHazardDescriptorRegistryPersistence.test.ts`
