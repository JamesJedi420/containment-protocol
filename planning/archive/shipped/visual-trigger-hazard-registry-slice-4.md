# SPE-2111 — Visual-trigger hazard registry planning mirror UI (slice 4)

One-page implementation plan. Linear: [SPE-2338](https://linear.app/spectranoir/issue/SPE-2338) (child under [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111)). Follows shipped slice 3 (`planning/visual-trigger-hazard-registry-slice-3.md`, PR #2541).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2338 — Visual-trigger hazard registry planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2338) |
| **Status** | **Shipped** — PR #2543 @ `6acfa202`                                                                        |
| **Parent** | [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) — registry anchor (slice 1–3 shipped); umbrella [SPE-947](https://linear.app/spectranoir/issue/SPE-947) stays open |
| **Branch** | `spe-2111-visual-trigger-hazard-mirror-ui-slice-4`                                                         |
| **Base `main` SHA** | `36b18928`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `visualTriggerHazardRecords` with read-time projections from slice 1 helpers — disposal compliance, exposure-chain risk, and observer awareness escalation — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `36b18928`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/visualTriggerHazardRegistry.ts` (SPE-2111 / PR #2432) |
| Persistence          | `visualTriggerHazardRecords` on `GameState` (SPE-2336 / PR #2539) |
| Weekly orchestration hook | `applyWeeklyVisualTriggerHazardTick` (SPE-2337 / PR #2541) |
| Sibling mirror template | `massAnomalousPopulationEmergenceMirrorView` (SPE-2334), `publicDisclosureMirrorView` (SPE-2331) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getVisualTriggerHazardMirrorView` + `VisualTriggerHazardMirrorPage` | New persistence fields                     |
| Route `/visual-trigger-hazard` + Front Desk quick link           | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-947 parent Done                            |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |
| Disposal, exposure-chain, and awareness escalation display from hydrated records | Propagation graph wire-up (#965 family) |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation to drop entries.
- **Display guards** — `validateVisualTriggerHazardRecord` surfaces warning-severity issues only; warning-only records remain visible.
- **Read-time projections** — `resolveDisposalDeadlineCompliance`, `projectExposureChainRisk`, and `observerAwarenessEscalation` (baseline unaware → current observer band); not objective truth.
- **Empty state** — when `visualTriggerHazardRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `visualTriggerHazardRecords` map renders empty state without throw
- [x] Records table shows trigger medium, pursuit posture, disposal compliance, exposure chain, and awareness escalation projections
- [x] `artistic_exempt` derivative profile shows zero pursuit pressure at read time
- [x] Warning-only records still shown with validation warning labels
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/visualTriggerHazardMirrorView.ts` |
| UI     | `src/features/operations/VisualTriggerHazardMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/visualTriggerHazardMirrorView.test.ts`, `src/features/operations/VisualTriggerHazardMirrorPage.test.tsx` |
| Plan   | `planning/visual-trigger-hazard-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Propagation graph wire-up | SPE-956 / #965 family | Deferred per slice 1 doc |
| Pursuit vector simulator integration | SPE-947 | Parent umbrella; out of mirror UI boundary |
| Countermeasure ledger link | SPE-645 | Out of registry mirror boundary |
| SPE-947 parent Done | SPE-947 | Slice 4 is mirror UI only |

## See also

- `planning/visual-trigger-hazard-registry-slice-3.md`
- `planning/mass-anomalous-population-emergence-registry-slice-4.md` — mirror UI template (SPE-2334)
