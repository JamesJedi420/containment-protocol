# SPE-2830 — Depleted Combat Stim Instance Recovery

| Field      | Value                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                        |
| **Linear** | [SPE-2830](https://linear.app/spectranoir/issue/SPE-2830/depleted-combat-stim-instance-recovery)            |
| **Parent** | [SPE-1055](https://linear.app/spectranoir/issue/SPE-1055/salvage-recycling-and-anomalous-material-recovery) |
| **Branch** | `jamesdyedbq/spe-2830-depleted-combat-stim-instance-recovery`                                               |

## Boundary

This slice makes `combat_stims` the first instance-only recovery profile. Catalog and fabricated-lot
sources remain unavailable. Manual recovery requires an explicitly selected, stored Combat Stim
instance with the canonical `combat_stim_dose` payload at exactly 0 of 2 doses. Equipped instances,
live doses, malformed payloads, and instances retaining active overdrive or recovery-debt provenance
fail closed without mutation.

Combat Stims reuse the established medical component-reclamation rule. Their catalog Grade I
outcome returns one `medical_supplies`, produces 1 waste, and takes one week. The existing Grade II
threshold remains authored but does not change the current catalog outcome. Recovery coverage is
now exactly sixteen eligible and seven deferred definitions.

## Queue, persistence, and events

Queueing revalidates the selected instance atomically, removes that identity from
`equipmentInstances`, leaves aggregate inventory unchanged, and snapshots the instance ID, known
catalog grade, condition, resource ID, capacity, and remaining quantity. Completion uses the
existing material-credit and immutable-receipt path. Start and completion events carry identical
instance provenance, and an exactly matching receipt keeps replay idempotent.

Optional instance provenance hydrates only when all fields form a canonical depleted Combat Stim
snapshot. Completed claims win before active claims; duplicate, unsafe, partial, foreign, or mixed
fabrication/instance claims are dropped deterministically. An accepted recovery claim overrides a
duplicate live registry record. Legacy catalog and fabricated-lot history remains valid. No event,
game-save, or store version changes are required.

## UI and automation

The Equipment source selector shows stable instance identity, dose count, grade, condition, and
source-specific blockers. Recovery requires explicit destructive confirmation and active queue rows
retain instance provenance. Auto-Scrap remains aggregate-only: Combat Stim aggregate stock is
excluded with a manual-instance-selection reason and automation never chooses or destroys an
instance.

## Deferred

| Item or mechanic                     | Owner or prerequisite  | Reason                                                            |
| ------------------------------------ | ---------------------- | ----------------------------------------------------------------- |
| Recovery or disposal of live doses   | SPE-1055 child         | Requires explicit medical/disposal value and authorization rules  |
| Refill and facility stock            | SPE-1027               | Requires authoritative replenishment inventory and provider ports |
| Re-aggregation                       | SPE-2827 child         | No safe inverse materialization or inventory-credit authority     |
| Auto-Scrap instance selection        | SPE-2749 child         | Automation must not infer destructive per-instance intent         |
| Custody, evidence, and contamination | SPE-1055 prerequisites | Require equipment-linked state owned outside this slice           |
| Remaining seven unauthored profiles  | SPE-1055 children      | Material and protection authorities remain unresolved             |

## Validation

- exact sixteen-eligible/seven-deferred registry coverage and medical recovery rule;
- stored empty instance selection, atomic removal, unchanged aggregate stock, and condition handling;
- full, partial, equipped, malformed, unknown, and recovery-debt failure paths;
- immutable queue/outcome/event provenance and idempotent completion;
- deterministic hydration, duplicate-claim priority, legacy compatibility, and save round trip;
- Auto-Scrap manual-selection exclusion and accessible Equipment UI behavior;
- focused tests, lint, repository verifiers, formatting, diff check, and full CI-mode tests.
