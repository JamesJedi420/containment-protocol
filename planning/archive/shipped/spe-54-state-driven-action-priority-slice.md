# SPE-54 — State-driven action priority in volatile encounters

| Field               | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-54](https://linear.app/spectranoir/issue/SPE-54/state-driven-action-priority-in-volatile-encounters) |
| **GitHub issue**    | [#55](https://github.com/JamesJedi420/containment-protocol/issues/55)                                     |
| **Status**          | **Recently shipped**                                                                                      |
| **Parent**          | none — prerequisite for SPE-2847                                                                          |
| **Branch**          | `jamesdyedbq/spe-54-state-driven-action-priority-in-volatile-encounters`                                  |
| **Base `main` SHA** | `8d1f8f75`                                                                                                |
| **Implementation**  | [PR #3670](https://github.com/JamesJedi420/containment-protocol/pull/3670) @ `b38f6356`                   |

## Goal

Add the pure deterministic sequencing prerequisite for volatile encounters. Current actor/action state determines priority, the output explains its main drivers, and callers may request either per-actor order or one bounded block per side.

## Authoritative inputs

- Readiness reuses `AgentReadinessBand` from `src/domain/agent/models.ts`.
- Injury reuses `InjurySeverity` from `src/domain/sim/recoveryPipeline.ts`.
- Tool condition reuses `EquipmentInstanceCondition` from `src/domain/equipmentInstance.ts`, with explicit `not_required` and `unavailable` action states.
- Posture, exposure, short-horizon precision, aim commitment, and targeting mode remain caller-owned action-window state because the repository has no canonical volatile-actor packet for them.

## Bounded contract

- `resolveVolatileActionPriority` is a pure calculation over one complete snapshot; it does not cache initiative or read `GameState`.
- Every eligible actor receives an integer priority score from readiness, posture, exposure, injury, tool state, precision, aim commitment, and targeting mode.
- The full signed factor ledger and stable dominant-driver codes are returned for player-facing explanation.
- `unavailable` readiness or tool state fails closed for that action without selecting a replacement action.
- Equal scores use optional caller-authored fallback order and then code-unit actor-ID order, never array insertion order or locale ordering.
- `rapid_nearest_valid` is faster than `explicit_designation`; target selection, hit quality, collateral, and effects remain downstream.
- `recalculateVolatileActionPriority` performs a fresh evaluation and reports score/rank/factor shifts without mutating the previous result or either snapshot.
- `per_actor` returns one globally ranked actor sequence.
- `side_phase` returns exactly one non-empty block per eligible participating side. The caller may declare exact side precedence (for scene/deck control); actor order inside every block remains state-driven. Without a declaration, the best current actor on each side establishes side order.

## Acceptance

- [x] Identical state resolves byte-stably regardless of input order.
- [x] Every named state factor contributes through one inspectable ledger.
- [x] Relevant state changes can shift actor priority on fresh recalculation.
- [x] Rapid nearest-valid execution outranks otherwise identical explicit designation.
- [x] Per-actor and bounded side-phase modes both preserve deterministic actor ordering.
- [x] Invalid IDs, duplicates, out-of-range precision, and invalid side declarations fail closed.
- [x] Targeted tests prove deterministic calculation and state-driven shifts.

## Boundary

- No SPE-62 action-phase pipeline, reactions, interruption windows, holds, delays, or cancellations.
- No SPE-73 legality, hit/effect/damage/injury production, action-quality ceiling, or confrontation outcome.
- No SPE-2847 action choice, fallback policy, round loop, state application, terminal checks, or replay orchestration.
- No `GameState`, persistence, hydration, schema, store, route, projection, or UI change.
- No precision recovery scheduler; callers supply the current precision snapshot and may recalculate after depletion or recovery.

## Validation

The implementation branch passed the following gates before PR #3670 merged:

- `npm run test:run -- src/test/volatileActionPriority.test.ts`
- `npm run lint -- --quiet`
- `npx prettier --check src/domain/volatileActionPriority.ts src/test/volatileActionPriority.test.ts planning/spe-54-state-driven-action-priority-slice.md docs/combat-resolver-audit.md planning/backlog.md planning/backlog-handoff-manifest.json`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`
- `npm run test:run`

## Deferred

| Item                                                | Suggested owner                             | Why deferred                                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State-based action-effect ceilings                  | SPE-73                                      | The current hand-off explicitly excludes confrontation outcomes. SPE-54 exposes priority effects only; effectiveness/hit/output caps belong with the outcome authority. |
| Location- and timing-bound event insertion/mobility | SPE-2847 or a dedicated event-binding child | Inserting and moving event packets across encounter state is orchestration, explicitly outside this sequencing prerequisite.                                            |
