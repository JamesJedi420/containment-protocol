# SPE-2114 — Entity welfare reclassification registry planning mirror UI (slice 4)

One-page implementation plan. Linear: [SPE-2341](https://linear.app/spectranoir/issue/SPE-2341) (child under [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114)). Follows shipped slice 3 (`planning/entity-welfare-reclassification-registry-slice-3.md`, PR #2547).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2341 — Entity welfare reclassification registry planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2341) |
| **Status** | **In Progress** — PR pending                                                                               |
| **Parent** | [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) — registry anchor (slice 1–3 shipped); umbrella [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) stays open |
| **Branch** | `spe-2114-entity-welfare-reclassification-mirror-ui-slice-4`                                             |
| **Base `main` SHA** | `50d932c7`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `entityWelfareReclassificationRecords` with read-time `projectReclassificationPressure` display for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `50d932c7`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/entityWelfareReclassificationRegistry.ts` (SPE-2114 / PR #2433) |
| Persistence          | `entityWelfareReclassificationRecords` on `GameState` (SPE-2339 / PR #2545) |
| Weekly orchestration hook | `applyWeeklyEntityWelfareReclassificationTick` (SPE-2340 / PR #2547) |
| Sibling mirror template | `visualTriggerHazardMirrorView` (SPE-2338), `publicDisclosureMirrorView` (SPE-2331) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getEntityWelfareReclassificationMirrorView` + `EntityWelfareReclassificationMirrorPage` | New persistence fields                     |
| Route `/entity-welfare-reclassification` + Front Desk quick link   | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-1046 affiliation wire-up                  |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |
| Read-time `projectReclassificationPressure` display from hydrated records | SPE-1046 parent Done                            |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation to drop entries.
- **Display guards** — `validateEntityWelfareReclassificationRecord` surfaces warning-severity issues only; warning-only records remain visible.
- **Read-time projections** — `projectReclassificationPressure` at mirror build; not objective truth.
- **Empty state** — when `entityWelfareReclassificationRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `entityWelfareReclassificationRecords` map renders empty state without throw
- [x] Records table shows disposition, reclassification state, review gate, and pressure projections
- [x] Pending vs terminal states display distinctly
- [x] Warning-only records still shown with validation warning labels
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests + slice 1–3 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/entityWelfareReclassificationMirrorView.ts` |
| UI     | `src/features/operations/EntityWelfareReclassificationMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/entityWelfareReclassificationMirrorView.test.ts`, `src/features/operations/EntityWelfareReclassificationMirrorPage.test.tsx` |
| Plan   | `planning/entity-welfare-reclassification-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1046 affiliation wire-up | SPE-1046 | Parent umbrella; out of mirror UI boundary |
| SPE-1888 welfare-debt engine | SPE-1888 | Field hook only in slice 1 |
| SPE-1310 case lifecycle integration | SPE-1310 | Out of registry mirror boundary |
| SPE-1046 parent Done | SPE-1046 | Slice 4 is mirror UI only |

## See also

- `planning/entity-welfare-reclassification-registry-slice-3.md`
- `planning/visual-trigger-hazard-registry-slice-4.md` — mirror UI template (SPE-2338)
