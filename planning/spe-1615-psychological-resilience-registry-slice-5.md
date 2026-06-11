# SPE-2437 — Psychological resilience registry planning mirror UI (slice 5)

One-page implementation plan. Linear: [SPE-2437](https://linear.app/spectranoir/issue/SPE-2437) (child under [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615)). Follows shipped slice 4 (`planning/spe-1615-psychological-resilience-registry-slice-4.md`, PR #2743 / [SPE-2436](https://linear.app/spectranoir/issue/SPE-2436)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2437 — Psychological resilience registry planning mirror UI (slice 5)](https://linear.app/spectranoir/issue/SPE-2437) |
| **Parent** | [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615) — Psychological resilience depletion             |
| **Branch** | `jamesdyedbq/spe-1615-psychological-resilience-registry-slice-5`                                           |
| **Status** | **Shipped** — PR #2745 @ `ca2e081c`                                                                        |
| **Base `main` SHA** | `cc5b9998`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `psychologicalResilienceRecords` with read-time `projectPsychologicalResilienceReview` display (depletion band, exposure elevated, treatment gated) for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `cc5b9998`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/psychologicalResilienceRegistry.ts` (SPE-1615 slice 1)     |
| Persistence          | `psychologicalResilienceRecords` on `GameState` (SPE-2434)           |
| Weekly orchestration | `applyWeeklyPsychologicalResilienceDepletionTick` (SPE-2435)         |
| Compose cross-join   | `composeCoerciveProtocolIntegratedHealthReconciliation` resilience arg (SPE-2436) |
| Sibling mirror template | `containedPersonTherapeuticCareMirrorView` (SPE-2115 slice 4), `coerciveContainedPersonProtocolMirrorView` (SPE-1882 slice 4) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getPsychologicalResilienceMirrorView` + `PsychologicalResilienceMirrorPage` | Compose cross-join changes (slice 4) |
| Route `/psychological-resilience` + Front Desk quick link          | `advanceWeek` orchestration changes           |
| View + component tests                                             | SPE-130 fatigue-channel conflation            |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |
| Read-time `projectPsychologicalResilienceReview` display from hydrated records | Full SPE-1615 parent Done |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation to drop entries.
- **Display guards** — `validatePsychologicalResilienceRecord` surfaces warning-severity issues only; warning-only records remain visible.
- **Read-time projections** — `projectPsychologicalResilienceReview` at mirror build; not objective truth.
- **Redaction** — redacted unit scores render as `—`; no hidden truth beyond registry projections.
- **Empty state** — when `psychologicalResilienceRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id; exposure sources and complications sorted for display.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `psychologicalResilienceRecords` map renders empty state without throw
- [x] Records table shows depletion band, exposure elevated, and treatment gated projection labels
- [x] Redacted exposure scores do not leak hidden values
- [x] Warning-only records still shown with validation warning labels
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/psychologicalResilienceMirrorView.ts`      |
| UI     | `src/features/operations/PsychologicalResilienceMirrorPage.tsx`       |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/psychologicalResilienceMirrorView.test.ts`, `src/features/operations/PsychologicalResilienceMirrorPage.test.tsx` |
| Plan   | `planning/spe-1615-psychological-resilience-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| Surfacing / weekly notes for resilience tension flags | SPE-1908 follow-up | Out of mirror-only boundary |
| Full SPE-1615 parent Done | SPE-1615 | Parent AC may require additional wire-up beyond mirror UI |
| SPE-848 slice 4 planning mirror UI | SPE-848 | Parallel registry mirror queue item |

## See also

- `planning/spe-1615-psychological-resilience-registry-slice-4.md`
- `planning/contained-person-therapeutic-care-registry-slice-4.md` — mirror UI template (SPE-2115)
