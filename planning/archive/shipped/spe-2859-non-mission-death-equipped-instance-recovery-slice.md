# SPE-2859 — Non-Mission Death Equipped-Instance Policy: Recovery Remains

| Field      | Value                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| **Status** | **Closed / docs-satisfied**                                                                                           |
| **Linear** | [SPE-2859](https://linear.app/spectranoir/issue/SPE-2859/non-mission-death-equipped-instance-policy-recovery-remains) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)               |
| **Branch** | `cursor/spe-2859-non-mission-death-recovery-remains-6775`                                                             |
| **Base**   | `main` @ `860a26db`                                                                                                   |

This file is the docs-satisfied policy. Parent SPE-2827 stays **Backlog**. No `src/` in this slice.

## Decision

**Recovery remains.** When an agent is `dead` outside `applyMissionResolutionAgentMutations`, do
not destroy or dispose equipped instance-backed slots. Identities stay on the terminal carrier.
SPE-2830 terminal-carrier recovery remains the identity-removal path. No inventory credit. No new
event reason.

SPE-2856 already destroys equipped copies on the only production `status → dead` writer
(`src/domain/sim/missionResolutionAgents.ts`). A second destroy hook, or a sweep over every
`status === 'dead'` carrier, would delete the last designed equipped-terminal-carrier recovery
source after SPE-2858. That mutation is out of this child.

## Linear issue body

Paste into the SPE-2827 child (create SPE-2859 if unused; otherwise the next free SPE and retarget
this file). Parent stays **Backlog**. Status **Done** after this docs PR merges.

### Goal

Record that death outside `applyMissionResolutionAgentMutations` is not an equipped-instance
destroy trigger. Residual SPE-2830 recovery for those dead carriers remains.

### Scope

Docs only: this slice, architecture mutation row + recovery paragraph, backlog primary + manifest,
SPE-2827 remaining line, SPE-2856 / SPE-2857 / SPE-2858 deferred owners.

### Constraints

- Do not change SPE-2856 fatality, SPE-2857 injury, or SPE-2858 resignation policy.
- Do not call `takeEquippedInstancesLostOnMissionResolution` or `pushMissionInstanceLossDrafts`
  from non-mission death. Do not invent a `dead`-status sweep.
- Do not reuse `mission_loss`, `mission_injury`, or a resignation reason. A new reason is only
  warranted if a later child chooses destroy.
- No inventory or lot credit. No `src/`. No `SCHEMA_REGISTRY.md`. No Equipment UI. No save/schema
  version bump.
- Combat Stim overdrive/debt on a dead carrier stays SPE-2830 fail-closed
  (`equipment_instance_active_overdrive`). Do not copy SPE-2857 living-carrier retain onto a
  destroy path that does not exist.
- Do not double-destroy identities SPE-2856 already took.

### Acceptance criteria

- Slice + architecture state **recovery remains** for non-mission death.
- Backlog primary + manifest point at this child; slice status **Closed / docs-satisfied**.
- `npm run verify:backlog-handoff` passes.
- No `src/` diff. Parent SPE-2827 remains **Backlog**.

## Pre-coding summary

**Status:** docs-satisfied. Conflict written down; no runtime.

**Relevant files (inspect only; no `src/` edits):**

| Path                                               | Role                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/domain/sim/equipmentDeconstruction.ts`        | `isTerminalCarrierInstance`: equipped on `dead` or `resigned`                              |
| `planning/equipment-instance-architecture.md`      | Terminal-carrier recovery; mutation table                                                  |
| `src/domain/sim/missionResolutionAgents.ts`        | Sole production `status → dead` + SPE-2856 `mission_loss`                                  |
| `src/domain/equipmentInstance.ts`                  | `takeEquippedInstancesLostOnMissionResolution` — mission casualty only                     |
| `src/test/equipmentGradeRecovery.contract.test.ts` | Recovers depleted Combat Stim from `dead` and `resigned` carriers; overdrive stays blocked |
| `src/domain/sim/betrayal.ts`                       | `status → resigned` only; not a death producer                                             |
| `src/domain/agent/normalize.ts` / `factory.ts`     | Hydrate/accept existing `dead`; do not originate death                                     |
| `SCHEMA_REGISTRY.md`                               | Out of this slice (no reason-union change)                                                 |

**Current behavior:** `applyMissionResolutionAgentMutations` is the only domain writer of
`status: casualty.fatal ? 'dead'`. That path already runs SPE-2856. Equipped copies on a `dead`
carrier that never ran that hook (hydrated saves, fixtures, pre-SPE-2856 deaths) stay in the
registry. SPE-2830 treats those copies as recoverable unless Combat Stim overdrive/debt owns the
instance. Factory/normalize accept `dead` without instance mutation. Betrayal writes `resigned`
only.

**Expected behavior:** same. This child records that non-mission death is not an
identity-destroying trigger.

**Implementation boundary:** docs only — this slice, architecture recovery-remains row, backlog
handoff + manifest, SPE-2827 remaining, SPE-2856 / SPE-2857 / SPE-2858 deferred owners.

**Known risks:**

- A later destroy child would need a **new** reason (not `mission_loss` / `mission_injury`) and
  would delete the remaining SPE-2830 dead-carrier recovery source after SPE-2858.
- Do not double-destroy copies SPE-2856 already took. A `status === 'dead'` sweep would no-op on
  post-SPE-2856 mission fatalities and would still erase residual recoverable copies.
- Do not copy SPE-2857 living-carrier Combat Stim retain onto a dead-carrier destroy path. Fatality
  already deletes overdrive copies; residual dead carriers keep overdrive recovery-blocked.
- Future non-mission death producers (none in current `src/domain`) inherit this policy unless a
  new child chooses destroy.

**Validation plan:** `npm run verify:backlog-handoff` only. No targeted Vitest. No SCHEMA_REGISTRY.

**Docs in this PR:** this slice, architecture, backlog + manifest, SPE-2827 remaining,
SPE-2856 / SPE-2857 / SPE-2858 deferred owners.

## Boundary

Non-mission death is residual `status === 'dead'` that did not run
`applyMissionResolutionAgentMutations`. It is not mission resolution and is not betrayal
resignation.

Inspected producers of `status → dead` besides `missionResolutionAgents.ts`: **none in production
domain sim.** Tests and fixtures stamp `dead` without the mission hook
(`equipmentGradeRecovery.contract.test.ts`, `selectorParityFixtures.ts`, and similar).
`normalize.ts` / `factory.ts` hydrate or accept `dead`. Betrayal writes `resigned` only.

| Identity                         | Mutation at non-mission death                                              | Event |
| -------------------------------- | -------------------------------------------------------------------------- | ----- |
| Ordinary instance-backed slot    | Registry key and projection stay                                           | none  |
| Combat Stim instance-backed slot | Registry key and projection stay; overdrive/debt stay SPE-2830 fail-closed | none  |
| Catalog-only slot                | Unchanged                                                                  | none  |

SPE-2830 `isTerminalCarrierInstance` continues to treat equipped copies on `dead` (non-mission)
and `resigned` carriers as recoverable. Queueing that claim deletes the live identity and clears
the carrier projection. Recovery-claimed identities stay owned by the queue/outcome.

Do not call `takeEquippedInstancesLostOnMissionResolution` from normalize, factory, or a new
death producer. Do not parameterize `pushMissionInstanceLossDrafts` for non-mission death. Do not
relocate-then-stored (idle-agent gate fails on a dead carrier).

## Why not destroy

1. SPE-2830 shipped and tests recover equipped depleted Combat Stim from `dead` carriers.
2. After SPE-2856, architecture kept that path for any death that does not run the mission-loss
   hook. SPE-2858 kept it for resignation. Destroying here removes the last designed
   equipped-terminal-carrier recovery source for `dead`.
3. Fatality destroy is battlefield loss with `mission_loss`. Residual dead carriers still have
   kit the org can recover until an explicit SPE-2830 claim.
4. Reusing `mission_loss` / `mission_injury` would lie. A new reason is only warranted if a later
   child chooses destroy.
5. A sweep over all `dead` carriers would double-touch SPE-2856 fatalities (empty slots / already
   taken) and erase the residual copies this child preserves.

## Determinism and compatibility

- Mission resolution still emits `agent.killed` then SPE-2856 `mission_loss` drafts; no extra
  instance drafts for residual `dead`.
- SPE-2856 / SPE-2857 / SPE-2858 unchanged.
- Idle equipped destroy/dispose/re-agg/lot-return keep `manual_disposal` / stored-path behavior.
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and operation-event schema versions are unchanged.

## Deferred

| Item or mechanic                          | Owner or prerequisite | Reason                                                |
| ----------------------------------------- | --------------------- | ----------------------------------------------------- |
| Destroy-on-non-mission-death (new reason) | new SPE-2827 child    | Would mutate SPE-2830; not this policy                |
| Destroy-on-resignation (new reason)       | new SPE-2827 child    | SPE-2858 recovery remains; not this child             |
| Future non-mission death producers        | inherit this policy   | No current domain writer; do not silent-copy SPE-2856 |
| Injury capacity (body-use)                | SPE-1484              | Slot occupancy / verbs / restore — not identity       |
| Repair, damage production                 | SPE-877               | Integrity program                                     |
| Ready versus stowed                       | SPE-1658              | Access-state layer                                    |
| SPE-2847                                  | do not pick           | Out of SPE-2827 remaining sequence                    |
| SCHEMA_REGISTRY / reason unions           | out of scope          | No destroy event                                      |
| Runtime `src/`                            | out of scope          | Docs-satisfied                                        |

## Validation

- Architecture mutation table includes a non-mission death **no-destroy** row; recovery section
  states SPE-2830 remains the residual dead-carrier identity-removal path.
- Backlog primary + manifest point at SPE-2859; slice status **Closed / docs-satisfied**.
- `npm run verify:backlog-handoff`
- No `src/` diff; no new tests
