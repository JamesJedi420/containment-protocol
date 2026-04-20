# Save/Load Manual Test Checklist

## Goal

Validate that save/load preserves canonical simulation state and authored runtime context without behavior drift.

## Pre-checks

- Start from a clean run (Week 1) and a mid-progress run (Week 6+).
- Confirm at least one active case, one active team assignment, and some events in feed.
- Confirm at least one training queue entry and one production queue entry.

## Core Round-Trip

- Save current game.
- Reload from saved payload.
- Verify:
  - `week`, `rngSeed`, `rngState`
  - active cases and assigned teams
  - events count and latest event ordering
  - training + production queue remaining weeks
  - market pressure + multiplier

## Runtime/Authored Context

- Trigger at least one front-desk authored notice choice.
- Save and reload.
- Verify preserved under runtime state:
  - `runtimeState.currentLocation`
  - `runtimeState.sceneHistory` latest entry
  - `runtimeState.ui.authoring.activeContextId`
  - `runtimeState.ui.authoring.lastChoiceId`
  - `runtimeState.ui.authoring.lastNextTargetId`
  - `runtimeState.ui.authoring.lastFollowUpIds`

## Flag + One-Shot Behavior

- Trigger a one-shot notice/tutorial consumption.
- Save and reload.
- Verify:
  - consumed one-shot remains consumed
  - same one-shot cannot be consumed again
  - persistent flags used by routing/notice gating remain unchanged

## Encounter + Progress Clocks

- Set up encounter state (active phase + flags) via normal gameplay path.
- Advance or set a progress clock.
- Save and reload.
- Verify:
  - encounter `status`, `phase`, and flags preserved
  - clock `value`, `max`, `completedAtWeek` semantics preserved

## Economy/Inventory Dependencies

- Perform market buy/sell, then save/reload.
- Verify:
  - inventory quantities are retained and non-negative
  - market listing behavior remains coherent with current market week

## Agency + Mirrors

- Alter agency progression via gameplay (containment/funding/reputation effects).
- Save and reload.
- Verify canonical and mirror values remain aligned:
  - `agency.containmentRating` vs `containmentRating`
  - `agency.clearanceLevel` vs `clearanceLevel`
  - `agency.funding` vs `funding`

## Compatibility + Validation

- Load a legacy run export payload (`containment-protocol-run`).
- Verify successful load and no crash.
- Try malformed payloads:
  - invalid JSON
  - unsupported version
  - bad runtime sub-shape
- Verify expected rejection paths or safe normalization behavior.

## Regression Smoke

- After load, perform one `Advance Week`.
- Verify no hard errors and expected updates to:
  - report generation
  - event feed
  - queue timers
  - top bar metrics
