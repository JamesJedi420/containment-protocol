# SPE-2421 — Coercive contained-person protocol GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2421](https://linear.app/spectranoir/issue/SPE-2421) (child under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)). Follows shipped slice 1 (`planning/coercive-contained-person-protocol-model-slice-1.md`, PR #2709 / [SPE-2420](https://linear.app/spectranoir/issue/SPE-2420)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2421 — Coercive contained-person protocol GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2421) |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — Coercive contained-person protocol model     |
| **Branch** | `jamesdyedbq/spe-1882-coercive-protocol-model-slice-2`                                                     |
| **Status** | Ready for PR                                                                                               |
| **Base `main` SHA** | `52b1f406`                                                                                          |

## Goal

Persist validated `CoerciveProtocolRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Mirror SPE-1892 / SPE-1886 slice 2 persistence pattern. Weekly orchestration hook deferred to slice 3.

## Prerequisite (on `main` @ `52b1f406`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Fixtures             | `EMERGENCY_SEDATION_PROTOCOL_FIXTURE`, `ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE`, `ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE` |
| Custody persistence pattern | `sanitizeCustodyStatusRecords` in `containedPersonCustodyStatusRegistry.ts` |
| Welfare-debt hook    | `coerciveProcedureWelfareDebtCreation.ts` (SPE-1888 slice 5)           |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `coerciveContainedPersonProtocolRecords` on `GameState`            | Weekly `advanceWeek` orchestration hook       |
| `sanitizeCoerciveProtocolRecords` + `runTransfer` hydrate wire     | Contradiction-check siblings (SPE-1897+)      |
| `validateCoerciveProtocolRecord` on hydrate; drop invalid, no throw | Faction ethics links (SPE-1047 / SPE-1131) |
| Default `{}` in `createStartingState`                              | Welfare-debt accounting math (SPE-1888)       |
| Persistence + advanceWeek preservation regression tests            | Full SPE-1882 parent Done                     |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Owner refs (`medicationRegimenRef`, `custodyStatusRef`, `procedureRef`) byte-stable after round-trip
- [x] `advanceWeek` preserves protocol records; welfare-debt hook regression green
- [x] Slice 1 registry tests unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/coerciveContainedPersonProtocolRegistryPersistence.test.ts`, `src/test/advanceWeek.coerciveProtocolRecords.integration.test.ts` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| Weekly orchestration hook in `advanceWeek` | SPE-1882 slice 3 | Persistence must land before orchestration |
| Contradiction-check sibling implementations | SPE-1897 / SPE-1907 / SPE-1908 / SPE-1898 / SPE-1900 | Registry exposes flags only |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Per SPE-1888 grooming |
| Full SPE-1882 parent Done | SPE-1882 | Multiple slices remain |

## See also

- `planning/coercive-contained-person-protocol-model-slice-1.md`
- `planning/extranormal-event-registry-slice-2.md` — persistence-only slice pattern
