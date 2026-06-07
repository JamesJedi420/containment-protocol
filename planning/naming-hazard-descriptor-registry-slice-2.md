# SPE-2116 — Naming-hazard descriptor registry GameState persistence (slice 2)

One-page implementation plan. Linear: child under [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) / parent anchor [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108). Follows shipped slice 1 (`planning/naming-hazard-descriptor-registry-slice-1.md`, PR #2435).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2357 — Naming-hazard descriptor registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2357) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) — Self-censoring information registry; registry anchor [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) |
| **Branch** | `spe-2116-naming-hazard-descriptor-registry-persistence-slice-2`                                           |
| **Base `main` SHA** | `8bb2760f`                                                                                          |

## Goal

Persist validated `NamingHazardDescriptorRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; UI substitution and weekly orchestration are slice 3+.

## Prerequisite (on `main` @ `8bb2760f`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/namingHazardDescriptorRegistry.ts` (SPE-2116 / PR #2435)   |
| Fixtures             | `DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE`, `COMPULSIVE_PHRASE_BRIEFING_FIXTURE` |
| Intake persistence pattern | `src/domain/unexplainedLocationRegistry.ts` + `planning/extranormal-event-registry-slice-2.md` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `namingHazardDescriptorRecords` map key on `GameState`               | Investigation UI substitution               |
| `sanitizeNamingHazardDescriptorRecords` + `runTransfer` hydrate wire | Intake report cross-link compose              |
| `validateNamingHazardDescriptorRecord` on hydrate; drop invalid, no throw | SPE-76 procedural naming integration     |
| Default `{}` in `createStartingState`                              | SPE-2108 parent Done                          |
| Sanitize unit tests + save/import round-trip (byte-stable pool order) | Shipped intake cross-link modules (SPE-2354–2356) |

## Acceptance

- [ ] Valid fixture round-trips through serialize/import with byte-stable `safeDescriptorPool` ordering
- [ ] Invalid/duplicate-id/franchise-token entries dropped safely on hydrate
- [ ] `npm run lint` + targeted tests + relevant save/hydration tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/namingHazardDescriptorRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/namingHazardDescriptorRegistryPersistence.test.ts`          |
| Plan   | `planning/naming-hazard-descriptor-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Investigation UI substitution | SPE-2116 slice 3+ | Persistence must land before surfacing |
| Intake report ↔ naming-hazard linkage | SPE-854 / SPE-2108 follow-up | Out of persistence-only boundary |
| SPE-76 procedural naming integration | SPE-76 | Distinct from registry persistence |

## See also

- `planning/naming-hazard-descriptor-registry-slice-1.md`
- `planning/extranormal-event-registry-slice-2.md`
- `planning/unexplained-location-registry-slice-2.md` (if present)
