# SPE-3728 — Cumulative authorized-access synthesis risk (slice 1)

| Field | Value |
| ----- | ----- |
| **Status** | **Recently shipped** |
| **Linear** | [SPE-3728](https://linear.app/spectranoir/issue/SPE-3728/cumulative-authorized-access-synthesis-risk) |
| **Parent** | SPE-551 |
| **Branch** | `grok/spe-3728-cumulative-synthesis-risk` |
| **Base main SHA** | `6dc31ff951f049688f7aa098745fadb6cdbc508b` |

## Goal and boundary

Pure deterministic evaluator for explicitly authored composition conditions over caller-owned access events. Emits derived assessments only. No persistence, GameState, side effects, or new ledgers. Covers positive match, non-match, duplicate/replay safety, and fail-closed on missing metadata.

## Contract

- `evaluateCumulativeSynthesisRisk(events, conditions)` returns frozen assessments.
- Positive result state `review` only when min matching valid events satisfy required source class/relationship.
- Missing required metadata fails closed (no match).
- Duplicate event ids are ignored after first use.
- Does not mutate inputs or any external state.

## Validation

- Targeted vitest for the module.
- Six-part pre-ship audit completed in-boundary.

## Deferred

Persistence, authorized-view redaction, reevaluation on history change, and downstream enforcement remain with existing owners or later slices. This slice establishes the pure evaluation core.
