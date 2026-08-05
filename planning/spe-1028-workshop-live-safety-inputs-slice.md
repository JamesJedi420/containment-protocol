# SPE-1028 child — Canonical live-facility workshop safety integration

| Field | Value |
| --- | --- |
| Linear | [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772/canonical-live-facility-workshop-safety-integration) |
| GitHub issue | [#3419](https://github.com/JamesJedi420/containment-protocol/issues/3419) |
| Pull request | [#3462](https://github.com/JamesJedi420/containment-protocol/pull/3462) |
| Status | **In review** |
| Parent | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) |
| Branch | `jamesdyedbq/spe-2772-canonical-live-facility-workshop-safety-integration` |
| Base `main` SHA | `80bbb917` |

## Goal

Project authored live facility state into exact completed workshop work orders at canonical week-close while retaining the existing completion registrar as the sole grading and persistence boundary.

## Delivered integration

- Authors one explicit production mapping for `department:biohazard-response`.
- Defines the stable production ID `facility:biohazard-response-lab` in the mapping module rather than borrowing a test fixture or inferring a facility from names at runtime.
- Maps that facility to the existing `isolation`, `ventilation`, and `ppe` condition axes. `dualAuth` remains on the current fallback until an authorization source exists.
- Only an `active` mapped facility produces `good`; absent or non-active mapped facilities produce `poor` for their bound axes.
- Adds a pure exact-work-order projector over current `facilityState`.
- Adds a bounded registration wrapper that passes the projected map to the existing registrar's optional safety argument.
- Changes only the canonical `advanceWeek` import; the existing call shape and single hook remain unchanged.
- Departments without an authored mapping retain the deterministic all-good fallback.
- Existing stored receipts win, so later facility changes do not alter prior completion results after replay or save/load.

## Validation

Targeted tests cover authored mapping, active and non-active behavior, absent facilities, unmapped siblings, exact-ID ordering, canonical week-close registration, and save/load replay.

## Boundaries preserved

- No new facility-effect keys, hydration keys, or persisted input state.
- No schema change, second grader, second queue, or second week-close hook.
- No inferred mapping from names, levels, topology, or test-only identifiers.
- No staff, equipment, clearance, authorization, or quality live wiring.

## Deferred

- Broader live staff, equipment, clearance, and authorization projection remains with SPE-2771.
- Additional authored department mappings require explicit production ownership evidence.
- Live completion-quality projection remains a separate SPE-1028 follow-up.

Parent SPE-1028 remains open for broader operational inputs, clutter/disorder consequences, and remaining lifecycle work.