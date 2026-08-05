# SPE-1028 child — Canonical live-facility workshop room-condition quality integration

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2792](https://linear.app/spectranoir/issue/SPE-2792/canonical-live-facility-workshop-room-condition-quality-integration) |
| **GitHub issue** | [#3464](https://github.com/JamesJedi420/containment-protocol/issues/3464) |
| **Pull request** | [#3468](https://github.com/JamesJedi420/containment-protocol/pull/3468) |
| **Status** | **In review** |
| **Parent** | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) |
| **Branch** | `agent/spe-2792-live-facility-room-quality` |
| **Base `main` SHA** | `91f2036f` |

## Goal

Project one authored live facility room condition into exact completed workshop work orders at canonical week-close while retaining the existing completion registrar as the sole quality grader and receipt-persistence boundary.

## Selected authoritative path

- Department: `department:biohazard-response`
- Facility: `facility:biohazard-response-lab`
- Source: current authoritative `facilityState`
- Existing quality axis: `roomContamination`
- Existing degraded reason: `poor_room_contamination`

## Bounded integration

- Adds one pure authored department-to-facility room-quality mapping.
- Resolves only `active` as `roomContamination: good`; absent or non-active mapped facilities resolve `poor`.
- Leaves unmapped departments on their existing caller-owned or neutral registrar baseline.
- Projects only exact completed work-order IDs, deduplicates them, sorts them by code unit, and ignores unknown IDs.
- Composes the live room axis with caller-owned input, specialist, dependency, equipment, and reagent conditions without changing those axes.
- Uses neutral-good required axes when a mapped work order has no caller-owned quality conditions.
- Extends the existing live-facility completion-registration wrapper; `advanceWeek` keeps the same single hook and call shape.
- Preserves existing-receipt precedence so replay and save/load cannot regrade historical output.

## Validation plan

Targeted tests cover authored mapping, active, inactive, upgrading, absent, and unmapped facility states; exact-ID ordering and deduplication; unknown-ID handling; caller-axis preservation; reason precedence; canonical week-close registration; sibling isolation; and save/load replay.

The first pull-request run passed lint and the design-audit index, then correctly rejected stale canonical handoff text. The manifest, `planning/backlog.md`, planning slice index, and workshop audit now identify SPE-2792 as the active bounded slice. Full test validation remains pending on the corrected branch head.

## Boundaries preserved

- No live staff, specialist, equipment, reagent, dependency, or input-quality source projection.
- No clutter or disorder consequence, secondary incident, mislabeling, wrong-kit, contamination event, or broken-seal rule.
- No safety-grading change and no change to SPE-2772 ownership.
- No schema, hydration, facility-effect, persisted quality-input, staging, operating-mode, upgrade, capacity, or additional week-close-hook change.

## Parent disposition

SPE-1028 remains open after this slice. Broader live operational inputs, clutter/disorder consequences, remaining operating and upgrade projections, capacity resizing, and lifecycle requirements remain separately owned.
