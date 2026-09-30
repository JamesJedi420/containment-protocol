# SPE-3119 — Facility expansion maintenance at week close

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **Status**        | **Recently shipped**                                      |
| **Linear**        | [SPE-3119](https://linear.app/spectranoir/issue/SPE-3119) |
| **Parent**        | SPE-1052 — remains Backlog                                |
| **Branch**        | `cursor/spe-3119-expansion-collapse-week-close`           |
| **Base main SHA** | `f2c35429`                                                |

## Goal and boundary

Consume the existing SPE-2262 expansion projector and SPE-2261 collapse registry at canonical campaign week close. Parsed `facilityLayoutSnapshot.rooms` supplies room count. Persist only `facilityMaintenanceState` debt and closed-week replay protection. Existing workshop dependency gates own the one-unit degraded cap and unavailable pause; compose dependency quality with specialist and live facility quality. Do not add production timing penalties or a second collapse authority.

## Pre-coding summary

The projectors were caller-owned and had no live debt state. The workshop already owns degraded/unavailable dependency processing and dependency-quality effects. Canonical save hydration is in `runTransfer`; new games/reset omit optional state. The integration must preserve workshop progress, staging, specialist gates, completion receipts, report ordering, and sibling state.

## Contract

- Accrue existing 0/8/18 debt for 0–3/4–7/8+ parsed rooms, once per closing week, before the workshop tick.
- No catch-up for skipped weeks; same/older week does not accrue. Debt saturates at the maximum safe integer.
- Missing/unusable layout adds no debt. Existing debt remains. Legacy saves do not invent debt.
- Persist nonnegative safe-integer debt and processed week; reject malformed records and future processed-week markers atomically against the hydrated campaign week. No save-envelope version bump.
- Project debt through SPE-2261: active maintenance caps workshops at one unit; critical maintenance's chained logistics stall pauses work. Neither operation erases progress.
- Recompute burden/pathway/dependency projections. Add a deterministic report note with room count, accrued/total debt, pathways, and workshop effect. Upkeep/staffing are explanatory metadata only.
- Four expanded closes reach debt 32; two sprawling closes reach 36. No recovery path ships here.

## Acceptance and validation

Targeted coverage checks room/threshold boundaries, chain ordering, replay/skip behavior, immutability, malformed state, legacy defaults, safe-integer saturation, save/load continuation, one-unit caps, critical stalls, and completion quality composition. Run related projector/workshop/facility/specialist tests, full Vitest, lint, formatting, backlog verification, and build comparison against the base. Six pre-ship audit passes must be clean before commit/PR.

## Deferred

| Mechanic                                                  | Owner                                        | Reason                                                                                                                       |
| --------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Facility repair and debt reduction                        | SPE-1052 follow-up                           | Explicitly deferred by the approved plan; critical stalls persist. Do not consume equipment-maintenance capacity implicitly. |
| Upkeep/staffing conversion and production delivery timing | SPE-1052 / existing subsystem owners         | No owned conversion or production-delay policy is introduced by this integration.                                            |
| Campaign scars and terminal defeat                        | SPE-3121 / SPE-1051; terminal owner SPE-1103 | Outside this facility seam; the scar implementation hold remains in force.                                                   |

Parent SPE-1052 remains Backlog. No supporting child is created. SPE-3119 alone closes after its integration acceptance ships.

## Validation results

- Focused projector, layout, workshop, specialist and persistence tests: 7 files / 89 tests passed.
- Full CI forks pool: 850 files / 9,171 tests passed. The default vmThreads attempt exited unexpectedly; the forks retry completed successfully.
- Full ESLint and final changed-file ESLint passed. Backlog handoff, audit index and theme contracts passed.
- Changed files pass Prettier except the existing backlog table formatting retained to avoid unrelated churn. Repository-wide format check reports 2,621 files with existing drift.
- Build comparison: 672 TypeScript diagnostics before and after, with unchanged diagnostic counts by file/code and no diagnostics in the new module/tests. Baseline type-contract drift remains outside this slice.
- Local runtime: Node 24.18.0 / installed Vitest 4.1.11; hosted CI provides the repository-required Node 22 and lockfile installation.
- Six pre-ship audit passes completed: scope/integration, edge cases, determinism/state, regression, documentation/authoring, and cleanup. No unresolved in-boundary findings.

## PR review corrections

PR #4013 review identified report-note metadata hydration, canonical timestamp, generated-event note-count alignment, future replay-marker validation, and stale handoff wording gaps. These are corrected in-scope. Save/load regressions use the production no-override clock and verify both notes and event counts. The correction run passed 446 tests including the full run-transfer suite. Amazon Q comments named predictive-maintenance item APIs absent from this implementation and are not applicable.

PR: https://github.com/JamesJedi420/containment-protocol/pull/4013. Landing documentation records the shipped boundary; Linear remains In Progress until merge is confirmed. Final focused rerun: 7 files / 91 tests passed.

Baseline (0–3 room) report notes omit empty pathways metadata so canonical hydration preserves the complete note; regression coverage includes both empty and three-room layouts.
