# SPE-2109 — Public disclosure registry weekly progression hook (slice 3)

One-page implementation plan. Linear: [SPE-2326](https://linear.app/spectranoir/issue/SPE-2326) (child under [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109)). Follows shipped slice 2 (`planning/public-disclosure-state-registry-slice-2.md`, PR #2517).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2326 — Public disclosure registry weekly progression hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2326) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) — registry anchor (slice 1–2 shipped); umbrella [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) stays open |
| **Branch** | `spe-2109-public-disclosure-weekly-hook-slice-3`                                                           |
| **Base `main` SHA** | `f18ce9d6`                                                                                          |

## Goal

Wire persisted `publicDisclosureRecords` into `advanceWeek` so scheduled awareness/fallout transitions declared in `transitionHistory` apply deterministically when their due week is reached.

## Prerequisite (on `main` @ `f18ce9d6`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109 / PR #2430)    |
| Persistence          | `publicDisclosureRecords` on `GameState` (SPE-2325 / PR #2517)       |
| Sibling weekly hook  | `src/domain/selfCensoringInformationWeeklyRetention.ts` (SPE-2324)     |

## Progression contract (slice 3)

- **Due transition** — earliest `transitionHistory` entry where `week <= simulationWeek`, `fromAwarenessLevel === record.awarenessLevel`, and `toAwarenessLevel !== record.awarenessLevel` (pre-scheduled, append-only history from slice 1).
- **Apply** — set `awarenessLevel` to entry `toAwarenessLevel`; set `falloutPhase` to entry `falloutPhase` when declared, else preserve current.
- **One step per week** — at most one transition per record per tick; re-tick same week is idempotent.
- **Mistaken records** — skip when last history `toAwarenessLevel` does not match current `awarenessLevel`.
- **No-op** — terminal/synced records, empty map, or records without eligible scheduled entries.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyPublicDisclosureProgressionTick` in domain module          | New persistence fields, UI, trust engine      |
| Call from `advanceWeek` after week increment (`result.week`)       | SPE-1343 parent Done / SPE-861 wire-up        |
| Targeted domain + `advanceWeek` integration tests                    | Sibling registry weekly hooks                 |
| Slice doc (this file) + backlog handoff                              | Automatic campaign loss on transitions        |

## Acceptance

- [x] Empty `publicDisclosureRecords` map is a no-op without throw
- [x] Scheduled transition unchanged while `week < entry.week`
- [x] When `week >= entry.week`, awareness/fallout sync to scheduled entry
- [x] Re-applying tick for same post-advance week is idempotent
- [x] Invalid post-tick record must not mutate source record
- [x] `transitionHistory` / `trustByRegion` byte-stable when no transition applies
- [x] `npm run lint` + targeted tests + persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publicDisclosureWeeklyProgression.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/publicDisclosureWeeklyProgression.test.ts`, `src/test/advanceWeek.publicDisclosure.integration.test.ts` |
| Plan   | `planning/public-disclosure-state-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Default ladder auto-progression without pre-scheduled history | SPE-2109 follow-up | Requires cadence/authored driver contract beyond slice 3 |
| Public-trust engine wire-up | SPE-861 | Parent umbrella; out of weekly-hook boundary |
| Disclosure campaign UI | SPE-1343 | Out of weekly-hook boundary |

## See also

- `planning/public-disclosure-state-registry-slice-2.md`
- `planning/self-censoring-information-registry-slice-3.md`
