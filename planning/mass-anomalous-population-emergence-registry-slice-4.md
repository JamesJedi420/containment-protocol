# SPE-2122 — Mass anomalous population emergence registry planning mirror UI (slice 4)

One-page implementation plan. Linear: [SPE-2334](https://linear.app/spectranoir/issue/SPE-2334) (child under [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122)). Follows shipped slice 3 (`planning/mass-anomalous-population-emergence-registry-slice-3.md`, PR #2533).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2334 — Mass anomalous population emergence registry planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2334) |
| **Status** | **Shipped** — PR #2535 @ `56570d35` |
| **Parent** | [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) — registry anchor (slice 1–3 shipped); umbrella [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) stays open |
| **Branch** | `spe-2122-mass-anomalous-population-emergence-mirror-ui-slice-4`                                           |
| **Base `main` SHA** | `358f9fde`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `massAnomalousPopulationEmergenceRecords` and `resolvePopulationEmergenceGovernanceSurgeForWeek` projection — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `358f9fde`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/massAnomalousPopulationEmergenceRegistry.ts` (SPE-2122 / PR #2441) |
| Persistence          | `massAnomalousPopulationEmergenceRecords` on `GameState` (SPE-2332 / PR #2531) |
| Weekly governance hook | `applyWeeklyPopulationEmergenceGovernanceTick` (SPE-2333 / PR #2533) |
| Sibling mirror template | `publicDisclosureMirrorView` (SPE-2331), `selfCensoringInformationMirrorView` (SPE-2330), `patternSourceSeriesMirrorView` (SPE-2329) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getMassAnomalousPopulationEmergenceMirrorView` + `MassAnomalousPopulationEmergenceMirrorPage` | New persistence fields                     |
| Route `/mass-anomalous-population-emergence` + Front Desk quick link | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-2109 parent Done                            |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |
| Backlog, magnitude, triage, and governance-surge display from hydrated records | SPE-861 / SPE-1343 wire-up            |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Governance surge** — from `resolvePopulationEmergenceGovernanceSurgeForWeek(record, game.week)` default policy; read-only projection, not objective truth.
- **Empty state** — when `massAnomalousPopulationEmergenceRecords` map is empty after hydrate.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `massAnomalousPopulationEmergenceRecords` map renders empty state without throw
- [x] Records table shows magnitude band, registration backlog, governance mode, triage lanes, and education burden from persisted fields
- [x] Governance surge band and triage lane symptoms projected without re-validating dropped records
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/massAnomalousPopulationEmergenceMirrorView.ts` |
| UI     | `src/features/operations/MassAnomalousPopulationEmergenceMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/massAnomalousPopulationEmergenceMirrorView.test.ts`, `src/features/operations/MassAnomalousPopulationEmergenceMirrorPage.test.tsx` |
| Plan   | `planning/mass-anomalous-population-emergence-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mass-anomalous population emergence wire-up to normalization inputs | SPE-2122 / SPE-2109 | Deferred per public-disclosure slice 4 doc |
| Default ladder auto-progression without pre-scheduled history | SPE-2109 follow-up | Deferred per public-disclosure slice 3 doc |
| Public-trust engine wire-up | SPE-861 | Parent umbrella; out of mirror UI boundary |
| Disclosure campaign player UI | SPE-1343 | Out of registry mirror boundary |

## See also

- `planning/mass-anomalous-population-emergence-registry-slice-3.md`
- `planning/public-disclosure-state-registry-slice-4.md` — mirror UI template (SPE-2331)
- `planning/self-censoring-information-registry-slice-4.md` — mirror UI template (SPE-2330)
