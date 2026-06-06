# SPE-2108 — Self-censoring information registry weekly retention/rediscovery hook (slice 3)

One-page implementation plan. Linear: [SPE-2324](https://linear.app/spectranoir/issue/SPE-2324) (child under [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108)). Follows shipped slice 2 (`planning/self-censoring-information-registry-slice-2.md`, PR #2500).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2324 — Self-censoring registry weekly retention/rediscovery hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2324) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) — registry anchor (slice 1–2 shipped); umbrella [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays open |
| **Branch** | `spe-2108-self-censoring-weekly-hook-slice-3`                                                              |
| **Base `main` SHA** | `61a23c04`                                                                                          |

## Goal

Wire persisted `selfCensoringInformationRecords` into `advanceWeek` so `retentionDecayTimer` countdown expires deterministically and `rediscoveryLoop` advances when `lastAlarmWeek` due week is reached.

## Prerequisite (on `main` @ `61a23c04`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108 / PR #2429) |
| Persistence          | `selfCensoringInformationRecords` on `GameState` (SPE-2318 / PR #2500) |
| Sibling weekly hook  | `src/domain/extranormalEventWeeklyMonitoring.ts` (SPE-2315 pattern)  |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklySelfCensoringInformationTick` in domain module           | New persistence fields, UI, dossier surfacing |
| Call from `advanceWeek` after week increment (`result.week`)       | SPE-1309 cognitive hazard engine wire-up      |
| Targeted domain + `advanceWeek` integration tests                    | Extranormal / minor-anomaly / unexplained-location hooks |
| Slice doc (this file) + backlog handoff                              | SPE-2108 parent Done / SPE-1309 parent closure |

## Acceptance

- [ ] Empty `selfCensoringInformationRecords` map is a no-op without throw
- [ ] `retentionDecayTimer` decrements each week; cleared when countdown reaches expiry
- [ ] `rediscoveryLoop` unchanged while `week < lastAlarmWeek`
- [ ] When `week >= lastAlarmWeek`, `loopCount` decrements and `lastAlarmWeek` clears; alarm refs clear when loop completes
- [ ] Re-applying tick for same post-advance week is idempotent
- [ ] Invalid post-tick record must not mutate source record
- [ ] `npm run lint` + targeted tests + persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/selfCensoringInformationWeeklyRetention.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/selfCensoringInformationWeeklyRetention.test.ts`, `src/test/advanceWeek.selfCensoringInformation.integration.test.ts` |
| Plan   | `planning/self-censoring-information-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Investigation exposure dossier surfacing | SPE-2159 / E54 | Out of weekly-hook boundary |
| Unified cognitive hazard engine wire-up | SPE-1309 | Parent umbrella; out of slice |
| SPE-854 unusable-archive routing | SPE-854 follow-up | Intake cross-link deferred |

## See also

- `planning/self-censoring-information-registry-slice-2.md`
- `planning/extranormal-event-registry-slice-3.md`
