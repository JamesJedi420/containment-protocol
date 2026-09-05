# SPE-2858 — Resignation Equipped-Instance Policy: Recovery Remains

| Field      | Value                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| **Status** | **Closed / docs-satisfied**                                                                                        |
| **Linear** | [SPE-2858](https://linear.app/spectranoir/issue/SPE-2858/resignation-equipped-instance-policy-recovery-remains)     |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)             |
| **Branch** | `jamesdyedbq/spe-2858-resignation-equipped-instance-policy-recovery-remains`                                       |
| **Base**   | `main` @ `7e1fd06b`                                                                                                |

This file is the docs-satisfied policy. Parent SPE-2827 stays **Backlog**. No `src/` in this slice.

## Decision

**Recovery remains.** When week-close betrayal marks an agent `resigned`, do not destroy or
dispose equipped instance-backed slots. Identities stay on the terminal carrier. SPE-2830
terminal-carrier recovery remains the identity-removal path. No inventory credit. No new event
reason.

Destroy-on-resignation would remove the remaining designed SPE-2830 recovery source that
architecture preserved after SPE-2856 mission-fatality destroy. That mutation is out of this
child.

## Pre-coding summary

**Status:** docs-satisfied. Conflict written down; no runtime.

**Relevant files (inspect only; no `src/` edits):**

| Path                                        | Role                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/domain/sim/betrayal.ts`                | Sole `status → resigned` + `agent.resigned` producer (`trust_failure_cumulative`)             |
| `src/domain/agent/lifecycle.ts`             | History copy for `agent.resigned`; no instance mutation                                       |
| `planning/equipment-instance-architecture.md` | Terminal-carrier recovery; mutation table                                                     |
| `src/domain/sim/equipmentDeconstruction.ts` | `isTerminalCarrierInstance`: equipped on `dead` or `resigned`                                 |
| `src/domain/equipmentInstance.ts`           | `takeEquippedInstancesLostOnMissionResolution` — mission casualty only                        |
| `src/domain/sim/missionResolutionAgents.ts` | SPE-2856 `mission_loss` / SPE-2857 `mission_injury` + injury Combat Stim retain               |
| `src/test/equipmentGradeRecovery.contract.test.ts` | Recover depleted Combat Stim from `dead` and `resigned` carriers                    |
| `SCHEMA_REGISTRY.md`                        | Out of this slice (no reason-union change)                                                    |

**Current behavior:** betrayal sets the betrayer `resigned` and emits `agent.resigned`. Equipped
registry keys and slot projections stay. SPE-2830 can claim an equipped copy on that carrier
(Combat Stim overdrive/debt still fail-closed). Mission fatality/injury already destroyed copies
that those hooks ran on.

**Expected behavior:** same. This child records that resignation is not an identity-destroying
trigger.

**Implementation boundary:** docs only — this slice, architecture recovery-remains row, backlog
handoff + manifest, SPE-2827 remaining, SPE-2856 / SPE-2857 deferred owners.

**Known risks:**

- A later destroy child would need a **new** reason (not `mission_loss` / `mission_injury`) and
  would delete the SPE-2830 resigned-carrier recovery source.
- Do not copy SPE-2857 living-carrier Combat Stim retain onto a destroy path that does not exist.
- Betrayal already skips `dead` / `resigned` betrayers; do not invent double-destroy.
- Injured agents who later resign may already have lost most equipped copies via SPE-2857;
  leftover overdrive/noncanonical Combat Stim stay durable until SPE-2830 or another existing
  command.

**Validation plan:** `npm run verify:backlog-handoff` only. No targeted Vitest. No SCHEMA_REGISTRY.

**Docs in this PR:** this slice, architecture, backlog + manifest, SPE-2827 remaining,
SPE-2856 / SPE-2857 deferred owners.

## Boundary

Resignation is personnel attrition authored in `applyBetrayalConsequences` after cumulative trust
damage hits `TRUST_DAMAGE_CRITICAL`. It is not mission resolution.

| Identity                         | Mutation at resignation                                                         | Event              |
| -------------------------------- | ------------------------------------------------------------------------------- | ------------------ |
| Ordinary instance-backed slot    | Registry key and projection stay                                                | none               |
| Combat Stim instance-backed slot | Registry key and projection stay; overdrive/debt stay SPE-2830 fail-closed      | none               |
| Catalog-only slot                | Unchanged                                                                       | none               |

SPE-2830 `isTerminalCarrierInstance` continues to treat equipped copies on `resigned` (and
non-mission `dead`) carriers as recoverable. Queueing that claim deletes the live identity and
clears the carrier projection. Recovery-claimed identities stay owned by the queue/outcome.

Do not call `takeEquippedInstancesLostOnMissionResolution` from betrayal. Do not parameterize
`pushMissionInstanceLossDrafts` for resignation. Do not relocate-then-stored (idle-agent gate
fails on a resigned carrier).

## Why not destroy

1. SPE-2830 shipped and tests recover equipped depleted Combat Stim from `resigned` carriers.
2. After SPE-2856, architecture kept that path for resignation and any death that does not run
   the mission-loss hook.
3. Fatality/injury destroy is battlefield loss with mission-authored reasons. Resignation is
   week-close trust failure; the org still has the departed agent's kit until explicit recovery.
4. Reusing `mission_loss` / `mission_injury` would lie. A new reason is only warranted if a later
   child chooses destroy.

## Determinism and compatibility

- Betrayal still emits `agent.betrayed` / `agent.resigned` in the existing order; no instance
  drafts.
- SPE-2856 / SPE-2857 mission hooks unchanged.
- Idle equipped destroy/dispose/re-agg/lot-return keep `manual_disposal` / stored-path behavior.
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and operation-event schema versions are unchanged.

## Deferred

| Item or mechanic                         | Owner or prerequisite | Reason                                                                 |
| ---------------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| Destroy-on-resignation (new reason)      | new SPE-2827 child    | Would mutate SPE-2830; not this policy                                 |
| Non-mission death equipped loss          | SPE-2827 child        | Residual terminal-carrier recovery after SPE-2856                      |
| Injury capacity (body-use)               | SPE-1484              | Slot occupancy / verbs / restore — not identity                        |
| Repair, damage production                | SPE-877               | Integrity program                                                      |
| Ready versus stowed                      | SPE-1658              | Access-state layer                                                     |
| SPE-2847                                 | do not pick           | Out of SPE-2827 remaining sequence                                     |
| SCHEMA_REGISTRY / reason unions          | out of scope          | No destroy event                                                       |
| Runtime `src/`                           | out of scope          | Docs-satisfied                                                         |

## Validation

- Architecture mutation table includes a resignation **no-destroy** row; recovery section states
  SPE-2830 remains the resigned-carrier identity-removal path.
- Backlog primary + manifest point at SPE-2858; slice status **Closed / docs-satisfied**.
- `npm run verify:backlog-handoff`
- No `src/` diff; no new tests
