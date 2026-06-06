# SPE-2115 — Contained-person therapeutic care registry planning mirror UI (slice 4)

One-page implementation plan. Linear: [SPE-2344](https://linear.app/spectranoir/issue/SPE-2344) (child under [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115)). Follows shipped slice 3 (`planning/contained-person-therapeutic-care-registry-slice-3.md`, PR #2553).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2344 — Contained-person therapeutic care registry planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2344) |
| **Status** | **In Progress** — branch `spe-2115-contained-person-therapeutic-care-mirror-ui-slice-4` |
| **Parent** | [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) — registry anchor (slice 1–3 shipped); umbrella [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) stays open |
| **Branch** | `spe-2115-contained-person-therapeutic-care-mirror-ui-slice-4`                                           |
| **Base `main` SHA** | `21d162b0`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `containedPersonTherapeuticCareRecords` with read-time `projectCareComplianceRisk` display for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `21d162b0`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/containedPersonTherapeuticCareRegistry.ts` (SPE-2115 / PR #2434) |
| Persistence          | `containedPersonTherapeuticCareRecords` on `GameState` (SPE-2342 / PR #2551) |
| Weekly orchestration hook | `applyWeeklyTherapeuticCareTick` (SPE-2343 / PR #2553) |
| Sibling mirror template | `entityWelfareReclassificationMirrorView` (SPE-2341), `visualTriggerHazardMirrorView` (SPE-2338) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getContainedPersonTherapeuticCareMirrorView` + `ContainedPersonTherapeuticCareMirrorPage` | New persistence fields                     |
| Route `/contained-person-therapeutic-care` + Front Desk quick link | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-1889 health-bundle wire-up                |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |
| Read-time `projectCareComplianceRisk` display from hydrated records | SPE-1889 parent Done                            |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation to drop entries.
- **Display guards** — `validateTherapeuticCareScheduleRecord` surfaces warning-severity issues only; warning-only records remain visible.
- **Read-time projections** — `projectCareComplianceRisk` at mirror build; not objective truth.
- **Empty state** — when `containedPersonTherapeuticCareRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id; staff assignee refs sorted for display.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `containedPersonTherapeuticCareRecords` map renders empty state without throw
- [x] Records table shows care mode, cadence, channel state, and compliance risk projections
- [x] Degraded/suspended channels and lockdown escalation likely display distinctly
- [x] Warning-only records still shown with validation warning labels
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests + slice 1–3 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/containedPersonTherapeuticCareMirrorView.ts` |
| UI     | `src/features/operations/ContainedPersonTherapeuticCareMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/containedPersonTherapeuticCareMirrorView.test.ts`, `src/features/operations/ContainedPersonTherapeuticCareMirrorPage.test.tsx` |
| Plan   | `planning/contained-person-therapeutic-care-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1889 integrated health bundle wire-up | SPE-1889 | Parent umbrella; out of mirror UI boundary |
| SPE-1046 affiliation wire-up | SPE-1046 | Detainee / patient status classes |
| SPE-1889 parent Done | SPE-1889 | Slice 4 is mirror UI only |

## See also

- `planning/contained-person-therapeutic-care-registry-slice-3.md`
- `planning/entity-welfare-reclassification-registry-slice-4.md` — mirror UI template (SPE-2341)
