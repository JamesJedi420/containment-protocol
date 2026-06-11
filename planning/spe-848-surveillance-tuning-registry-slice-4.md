# SPE-2438 — Surveillance tuning registry planning mirror UI (slice 4)

One-page implementation plan. Linear: [SPE-2438](https://linear.app/spectranoir/issue/SPE-2438) (child under [SPE-848](https://linear.app/spectranoir/issue/SPE-848)). Follows shipped slice 3 (`planning/spe-848-surveillance-tuning-registry-slice-3.md`, PR #2735 / [SPE-2432](https://linear.app/spectranoir/issue/SPE-2432)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2438 — Surveillance tuning registry planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2438) |
| **Parent** | [SPE-848](https://linear.app/spectranoir/issue/SPE-848) — Surveillance and capacity intervention tuning     |
| **Branch** | `jamesdyedbq/spe-848-surveillance-tuning-registry-slice-4`                                                 |
| **Status** | **Ready for PR**                                                                                           |
| **Base `main` SHA** | `2188f941`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `surveillanceInterventionTuningRecords` with read-time `projectSurveillanceInterventionTuningReview` display (intervention level, monitoring/contact separation, collateral strain, horizon outcomes) for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `2188f941`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/surveillanceCapacityInterventionTuningRegistry.ts` (SPE-848 slice 1) |
| Persistence          | `surveillanceInterventionTuningRecords` on `GameState` (SPE-2431)    |
| Weekly orchestration | `applyWeeklySurveillanceInterventionTuningTick` (SPE-2432)           |
| Sibling mirror template | `psychologicalResilienceMirrorView` (SPE-2437), `containedPersonTherapeuticCareMirrorView` (SPE-2115 slice 4) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getSurveillanceInterventionTuningMirrorView` + `SurveillanceInterventionTuningMirrorPage` | Weekly orchestration changes (slice 3) |
| Route `/surveillance-intervention-tuning` + Front Desk quick link    | Compose cross-join changes                    |
| View + component tests                                             | `advanceWeek` orchestration changes           |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |
| Read-time `projectSurveillanceInterventionTuningReview` display from hydrated records | Full SPE-848 parent re-open beyond mirror |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation to drop entries.
- **Display guards** — `validateSurveillanceInterventionTuningRecord` surfaces warning-severity issues only; warning-only records remain visible.
- **Read-time projections** — `projectSurveillanceInterventionTuningReview` at mirror build; not objective truth.
- **Redaction** — redacted unit scores render as `—`; no hidden truth beyond registry projections.
- **Empty state** — when `surveillanceInterventionTuningRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id; horizon outcome labels sorted by band.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `surveillanceInterventionTuningRecords` map renders empty state without throw
- [x] Records table shows intervention level, monitoring exceeds contact, and sustained-under-collateral-strain projection labels
- [x] Redacted surveillance signal scores do not leak hidden values
- [x] Warning-only records still shown with validation warning labels
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/surveillanceInterventionTuningMirrorView.ts` |
| UI     | `src/features/operations/SurveillanceInterventionTuningMirrorPage.tsx`  |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/surveillanceInterventionTuningMirrorView.test.ts`, `src/features/operations/SurveillanceInterventionTuningMirrorPage.test.tsx` |
| Plan   | `planning/spe-848-surveillance-tuning-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| Surveillance-tuning surfacing in weekly report notes | SPE-2430 follow-up | Out of mirror-only boundary |
| SPE-1615 psychological resilience cross-join | SPE-1615 | No runtime registry anchor yet |
| Full SPE-848 parent acceptance review | SPE-848 | Mirror slice does not re-open parent Done status |

## See also

- `planning/spe-848-surveillance-tuning-registry-slice-3.md`
- `planning/spe-1615-psychological-resilience-registry-slice-5.md` — mirror UI template (SPE-2437)
