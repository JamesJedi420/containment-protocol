# SPE-2108 — Self-censoring information registry planning mirror UI (slice 4)

One-page implementation plan. Linear: [SPE-2330](https://linear.app/spectranoir/issue/SPE-2330) (child under [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108)). Follows shipped slice 3 (`planning/self-censoring-information-registry-slice-3.md`, PR #2515).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2330 — Self-censoring information registry planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2330) |
| **Status** | **Shipped** — PR #2527 @ `b74226ae`                                                                        |
| **Parent** | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) — registry anchor (slice 1–3 shipped); umbrella [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays open |
| **Branch** | `spe-2108-self-censoring-information-mirror-ui-slice-4`                                                    |
| **Base `main` SHA** | `40b1e38f`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `selfCensoringInformationRecords` and `projectAntimemeticCaseView` contradiction projection — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `40b1e38f`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108 / PR #2429) |
| Persistence          | `selfCensoringInformationRecords` on `GameState` (SPE-2318 / PR #2500) |
| Weekly retention hook | `applyWeeklySelfCensoringInformationTick` (SPE-2324 / PR #2515)     |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getSelfCensoringInformationMirrorView` + `SelfCensoringInformationMirrorPage` | New persistence fields                     |
| Route `/self-censoring-information` + Front Desk quick link        | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-1309 parent closure                       |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |
| Negative-facts and rediscovery-loop display from hydrated records  | Investigation exposure dossier (SPE-2159)     |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Contradiction signals** — from `projectAntimemeticCaseView` default policy; symptom-first copy, no franchise tokens.
- **Empty state** — when `selfCensoringInformationRecords` map is empty after hydrate.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `selfCensoringInformationRecords` map renders empty state without throw
- [x] Records table shows negative facts, retention timer, and rediscovery loop from persisted fields
- [x] Contradiction signals projected without re-validating dropped records
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/selfCensoringInformationMirrorView.ts`       |
| UI     | `src/features/operations/SelfCensoringInformationMirrorPage.tsx`      |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/selfCensoringInformationMirrorView.test.ts`, `src/features/operations/SelfCensoringInformationMirrorPage.test.tsx` |
| Plan   | `planning/self-censoring-information-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Investigation exposure dossier surfacing | SPE-2159 / E54 | Out of mirror UI boundary |
| Unified cognitive hazard engine wire-up | SPE-1309 | Parent umbrella; out of slice |
| Public disclosure / sibling registry mirror UIs | respective owners | Out of SPE-2108 slice 4 boundary |

## See also

- `planning/self-censoring-information-registry-slice-3.md`
- `planning/pattern-source-series-registry-slice-4.md` — mirror UI template (SPE-2329)
