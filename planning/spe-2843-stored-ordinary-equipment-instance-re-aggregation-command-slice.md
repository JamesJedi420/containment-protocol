# SPE-2843 — Stored Ordinary-Equipment Instance Re-aggregation Command

| Field      | Value                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                                |
| **Linear** | [SPE-2843](https://linear.app/spectranoir/issue/SPE-2843/stored-ordinary-equipment-instance-re-aggregation-command) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)             |
| **Branch** | `jamesdyedbq/spe-2843-stored-ordinary-equipment-instance-re-aggregation-command`                                    |

## Boundary

This slice adds the guarded inverse of ordinary-equipment materialization. The player may select one
exact safe, stored, operational, payload-free, non-Combat-Stim identity that is not claimed by active
or completed recovery. The command deletes that registry identity and increments its definition's
aggregate inventory exactly once, failing closed when the increment would exceed safe integer bounds.

Damaged aggregate state, fabricated lots, recovery queues and outcomes, loadouts, and material stock
remain unchanged. Missing, stale, equipped, damaged, payload-bearing, Combat Stim, recovery-claimed,
and unsafe identities are no-ops without inventory credit or duplicate events.

## Determinism and compatibility

- stored identities retain stable code-unit ordering and independent destruction/re-aggregation
  eligibility projections;
- an accessible confirmation names the exact identity and explains the one-unit aggregate return;
- successful commands emit one strict `equipment.instance_reaggregated` event with week, identity,
  canonical definition snapshot, operational condition, and fixed `manual_untracking` reason;
- event hydration preserves valid history without recreating the identity or replaying inventory credit;
- Auto-Scrap continues to select aggregate catalog stock only and never selects stored identities;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version remain unchanged.

## Deferred

| Item or mechanic                        | Owner or prerequisite | Reason                                                       |
| --------------------------------------- | --------------------- | ------------------------------------------------------------ |
| Damaged-instance re-aggregation         | SPE-877 / child       | Repair and condition conversion remain separately owned      |
| Combat Stim or generic payload return   | SPE-2827 child        | Resource payload disposition requires specialized policy     |
| Fabricated-lot instance materialization | SPE-2846              | Grade provenance cannot be discarded by generic tracking     |
| Automatic instance selection            | SPE-2749 / child      | Auto-Scrap remains aggregate-only                            |
| Damage production and repair economics  | SPE-877               | Broader condition lifecycle is outside this identity command |
| Custody and readiness restrictions      | SPE-1055 / SPE-1658   | Protected/live access states remain deferred                 |
| Mission loss and lifecycle consequences | SPE-2827 child        | Requires separately authored triggers and outcomes           |

## Validation

- exact operational re-aggregation, sibling preservation, one-unit aggregate credit, immutable
  snapshot, unchanged adjacent authorities, and stale replay idempotence;
- fail-closed unsafe, missing, equipped, damaged, Combat Stim, payload-bearing, active/completed
  recovery claim, and aggregate-capacity paths;
- strict producer, payload-schema, source-system, event-feed, hydration, and save round-trip tests;
- stable projection, independent action blockers, and accessible non-destructive confirmation;
- focused equipment/event/hydration/UI tests, lint, repository verifiers, formatting, diff audit,
  and the full Vitest suite.
