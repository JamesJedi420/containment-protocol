# SPE-854 — Extranormal event registry GameState persistence (slice 2)

One-page implementation plan. Linear: child under [SPE-854](https://linear.app/spectranoir/issue/SPE-854) / [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105). Follows shipped slice 1 (`planning/extranormal-event-registry-slice-1.md`, PR #2426).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2312 — Extranormal event registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2312) |
| **Status** | **Shipped** — PR #2488 @ `017ec758`                                                                        |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine (Done); registry anchor [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105) |
| **Branch** | `spe-2105-extranormal-event-registry-persistence-slice-2`                                                  |
| **Base `main` SHA** | `80f7ffdb`                                                                                          |

## Goal

Persist validated `ExtranormalEventRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly monitoring/closure hooks are slice 3+.

## Prerequisite (on `main` @ `80f7ffdb`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/extranormalEventRegistry.ts` (SPE-2105 / PR #2426)         |
| Fixtures             | `BRIEF_COVER_UP_EVENT_FIXTURE`, `CLUSTER_SIBLING_EVENT_FIXTURE`, `BRIEF_COVER_UP_EVENT_WITH_CLUSTER` |
| Intake persistence pattern | `src/domain/informationIntakeReport.ts` + `planning/information-intake-report-persistence-slice-2.md` |
| MVP loop harness     | [SPE-2251](https://linear.app/spectranoir/issue/SPE-2251) Done — Claims 1–6 |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `extranormalEventRecords` (or equivalent map key) on `GameState`   | Weekly `advanceWeek` monitoring/closure hook  |
| `sanitizeExtranormalEventRecords` + `runTransfer` hydrate wire     | UI / report copy / map board                  |
| `validateExtranormalEventRecord` on hydrate; drop invalid, no throw | Intake report cross-link compose              |
| Default `{}` in `createStartingState`                              | SPE-854 parent reopen                         |
| Sanitize unit tests + save/import round-trip (byte-stable)         | Sibling registries (SPE-2106, SPE-2104)       |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Similarity cluster refs and monitoring fields byte-stable after round-trip
- [x] `npm run lint` + targeted tests + relevant save/hydration tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/extranormalEventRegistry.ts`, `src/domain/models.ts`      |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/extranormalEventRegistryPersistence.test.ts`                |
| Plan   | `planning/extranormal-event-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly monitoring-until / closureState advance hook | SPE-2105 slice 3 | Persistence must land before orchestration |
| Intake report ↔ extranormal event linkage | SPE-854 follow-up | Out of persistence-only boundary |
| Unexplained location + minor anomaly persistence | SPE-2106 / SPE-2104 slice 2 | One registry per PR — follow this pattern |

## See also

- `planning/extranormal-event-registry-slice-1.md`
- `planning/information-intake-report-persistence-slice-2.md`
- `planning/scope-discipline-grooming-pass.md` § Phase 4–5 (registry wave unblocked post SPE-2251)
