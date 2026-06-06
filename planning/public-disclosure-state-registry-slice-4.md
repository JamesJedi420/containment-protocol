# SPE-2109 — Public disclosure state registry planning mirror UI (slice 4)

One-page implementation plan. Linear: [SPE-2331](https://linear.app/spectranoir/issue/SPE-2331) (child under [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109)). Follows shipped slice 3 (`planning/public-disclosure-state-registry-slice-3.md`, PR #2519).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2331 — Public disclosure state registry planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2331) |
| **Status** | **Ready for PR**                                                                                           |
| **Parent** | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) — registry anchor (slice 1–3 shipped); umbrella [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) stays open |
| **Branch** | `spe-2109-public-disclosure-state-mirror-ui-slice-4`                                                       |
| **Base `main` SHA** | `e4ca76a3`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `publicDisclosureRecords` and `projectDisclosureRegionalView` projection — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `e4ca76a3`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109 / PR #2430)    |
| Persistence          | `publicDisclosureRecords` on `GameState` (SPE-2325 / PR #2517)       |
| Weekly progression hook | `applyWeeklyPublicDisclosureProgressionTick` (SPE-2326 / PR #2519)  |
| Sibling mirror template | `selfCensoringInformationMirrorView` (SPE-2330), `patternSourceSeriesMirrorView` (SPE-2329) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getPublicDisclosureMirrorView` + `PublicDisclosureMirrorPage`   | New persistence fields                     |
| Route `/public-disclosure-state` + Front Desk quick link           | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-1343 parent Done                            |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |
| Awareness/fallout + regional trust display from hydrated records   | Mass-anomaly / governance wire-up (SPE-861)   |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Regional trust** — from `projectDisclosureRegionalView` default policy; read-only projection, not objective truth.
- **Empty state** — when `publicDisclosureRecords` map is empty after hydrate.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `publicDisclosureRecords` map renders empty state without throw
- [x] Records table shows awareness, fallout, regional trust, and transition history from persisted fields
- [x] Regional trust projected without re-validating dropped records
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/publicDisclosureMirrorView.ts`               |
| UI     | `src/features/operations/PublicDisclosureMirrorPage.tsx`              |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/publicDisclosureMirrorView.test.ts`, `src/features/operations/PublicDisclosureMirrorPage.test.tsx` |
| Plan   | `planning/public-disclosure-state-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Public-trust engine wire-up | SPE-861 | Parent umbrella; out of mirror UI boundary |
| Disclosure campaign player UI | SPE-1343 | Out of registry mirror boundary |
| Mass-anomalous population emergence wire-up | SPE-2122 | Deferred governance integration |

## See also

- `planning/public-disclosure-state-registry-slice-3.md`
- `planning/self-censoring-information-registry-slice-4.md` — mirror UI template (SPE-2330)
- `planning/pattern-source-series-registry-slice-4.md` — mirror UI template (SPE-2329)
