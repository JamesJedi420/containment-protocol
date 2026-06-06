# SPE-2115 — Contained-person therapeutic care registry GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2342](https://linear.app/spectranoir/issue/SPE-2342) (child under [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115)). Follows shipped slice 1 (`planning/contained-person-therapeutic-care-registry-slice-1.md`, PR #2434).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2342 — Contained-person therapeutic care registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2342) |
| **Status** | **In Progress** |
| **Parent** | [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) — Contained-person therapeutic care schedule registry; umbrella [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) |
| **Branch** | `spe-2115-contained-person-therapeutic-care-persistence-slice-2`                                        |
| **Base `main` SHA** | `96f1c9be`                                                                                          |

## Goal

Persist validated `TherapeuticCareScheduleRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly orchestration and SPE-1889 integrated health bundle wire-up are slice 3+.

## Prerequisite (on `main` @ `96f1c9be`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/containedPersonTherapeuticCareRegistry.ts` (SPE-2115 / PR #2434) |
| Fixtures             | `WEEKLY_PSYCH_SCREENING_FIXTURE`, `MISSED_STREAK_ELEVATED_RISK_FIXTURE` |
| Sibling persistence  | `entityWelfareReclassificationRecords` (SPE-2339), `visualTriggerHazardRecords` (SPE-2336) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `containedPersonTherapeuticCareRecords` on `GameState`           | Weekly `advanceWeek` hook    |
| `sanitizeTherapeuticCareScheduleRecords` + `runTransfer` hydrate wire | SPE-1889 integrated health bundle wire-up |
| `validateTherapeuticCareScheduleRecord` on hydrate; drop invalid, no throw | Mirror UI |
| Default `{}` in `createStartingState`                              | SPE-1889 parent Done             |
| Sanitize unit tests + save/import round-trip (byte-stable)         | Registry schema/validation changes |

## Acceptance

- [ ] Valid fixture round-trips through serialize/import
- [ ] Invalid/duplicate-id entries dropped safely on hydrate
- [ ] Franchise/branded token guards preserved on hydrate
- [ ] Nested staffAssigneeRefs byte-stable after round-trip
- [ ] Warning-only records persist
- [ ] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/containedPersonTherapeuticCareRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/containedPersonTherapeuticCareRegistryPersistence.test.ts` |
| Plan   | `planning/contained-person-therapeutic-care-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly therapeutic care orchestration hook | SPE-2115 slice 3+ | Persistence must land before orchestration |
| Mirror UI | SPE-1889 follow-up | Out of persistence-only boundary |
| SPE-1889 integrated health bundle wire-up | SPE-1889 | Parent umbrella; out of persistence-only boundary |
| SPE-1046 affiliation wire-up | SPE-1046 | Detainee / patient status classes |

## See also

- `planning/contained-person-therapeutic-care-registry-slice-1.md`
- `planning/entity-welfare-reclassification-registry-slice-2.md`
