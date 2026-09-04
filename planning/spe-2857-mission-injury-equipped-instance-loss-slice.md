# SPE-2857 — Mission-Injury Equipped-Instance Loss

| Field      | Value                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                    |
| **Linear** | [SPE-2857](https://linear.app/spectranoir/issue/SPE-2857/mission-injury-equipped-instance-loss)         |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority) |
| **Branch** | `jamesdyedbq/spe-2857-mission-injury-equipped-instance-loss`                                            |
| **Base**   | `main` @ `293d61eb`                                                                                     |

This file is the shipped implementation plan. Parent SPE-2827 stays **Backlog**.

## Pre-coding summary

**Status:** shipped. After `injured` (not `dead`), equipped instance-backed slots are destroyed or
disposed with reason `mission_injury`. Fatality still uses `mission_loss`. Living-carrier Combat Stim
copies with live overdrive/recovery provenance or noncanonical payloads are retained.

**Relevant files (inspect, then edit in the implementation session only):**

| Path                                           | Role                                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/equipmentInstance.ts`              | `takeEquippedInstancesLostOnMissionFatalities` — registry delete + `withProjectedSlot` clear; no reason; no inventory                 |
| `src/domain/sim/missionResolutionAgents.ts`    | `applyMissionResolutionAgentMutations`; `pushMissionLossInstanceDrafts` hard-codes `mission_loss`; injury vs fatal after status write |
| `src/domain/sim/recoveryPipeline.ts`           | `InjurySeverity` = `'minor' \| 'moderate'`; both set `status: 'injured'`                                                              |
| `src/domain/events/types.ts`                   | destroy/dispose `reason: 'manual_disposal' \| 'mission_loss'`                                                                         |
| `src/domain/events/eventValidation.ts`         | matching `z.enum`                                                                                                                     |
| `src/features/dashboard/eventFeedView.ts`      | `instanceLossReasonLabel` exhaustive switch                                                                                           |
| `src/test/sim.missionResolutionAgents.test.ts` | fatality + negative injury + recovery-claimed take-helper tests                                                                       |
| `src/test/events.validation.test.ts`           | accepts `mission_loss`; rejects unknown reasons                                                                                       |
| `src/test/eventFeedView.test.ts`               | Mission loss vs Manual disposal copy                                                                                                  |
| `SCHEMA_REGISTRY.md`                           | SPE-2856 sentence; add SPE-2857 in the implementation session, not this planning PR                                                   |

**Current behavior:** `rollMissionCasualty` returns `injurySeverity: null` on `fatal: true`. On
injury, `nextAgent.status` becomes `'injured'` and assignment `'recovery'`. Equipped instance
registry keys and slot projections stay. Fatality-only hook runs inside `if (casualty.fatal)`
after `agent.killed`.

**Expected behavior:** when `injurySeverity && !casualty.fatal` after status → `injured`, destroy
every equipped instance-backed slot on that carrier (ordinary + Combat Stim) with reason
`mission_injury`, clear those projections, emit destroy/dispose drafts, credit no inventory.

**Implementation boundary:** injury-only lifecycle trigger in `applyMissionResolutionAgentMutations`.
Reuse the SPE-2856 take/clear helper (rename; reason stays on drafts). Do not implement
resignation, SPE-1484 capacity, SPE-877, SPE-1658, SPE-2847, Equipment UI, or re-agg/lot-return.

**Known risks:**

- Double-path if both fatal and injury hooks run on one casualty. Keep the explicit
  `injurySeverity && !casualty.fatal` gate even though fatal already nulls `injurySeverity`.
- Invert the SPE-2856 injury regression; keep a fatality-vs-injury reason split.
- Shared helper still named `…Fatalities` — rename before the injury call site.
- Event-reason exhaustiveness: types, zod, feed switch, validation tests.
- Relocate-then-stored fails: `isIdleAgent` requires `status === 'active'` and
  `assignment.state === 'idle'`; injured carriers are `'injured'` + `'recovery'`.

**Validation plan (implementation session):** targeted Vitest listed under Validation; eslint on
touched TS; `npm run verify:backlog-handoff`; prettier on touched TS. No `GAME_STORE_VERSION` /
`GAME_SAVE_VERSION` / operation-event schema bump.

**Docs in this planning PR:** this slice, backlog handoff + manifest, SPE-2827 remaining line,
SPE-2856 deferred owner → SPE-2857, architecture next-trigger note. Implementation session also
updates `SCHEMA_REGISTRY.md` (additive SPE-2857 sentence; no version bump) and this slice Status
→ **Recently shipped**.

## Boundary

When mission resolution marks an assigned agent `injured` (not `dead`), destroy/dispose every
equipped instance-backed loadout slot on that carrier (ordinary + Combat Stim) with reason
`mission_injury`, clear that injured carrier's instance-backed compatibility projection, and do
not credit aggregate inventory.

The hook runs inside `applyMissionResolutionAgentMutations` immediately after status → `injured`
and `agent.injured`. Gate: `injurySeverity && !casualty.fatal`. It enumerates equipped registry
identities for that agent in instance-ID order. It does not relocate-then-stored: the idle-agent
gate would fail on an injured carrier.

| Identity    | Mutation                                                                     | Event                                                                   |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Ordinary    | Delete registry key; no inventory or lot mutation                            | `equipment.instance_destroyed` / `mission_injury`                       |
| Combat Stim | Delete registry key; no inventory or lot mutation; skip player dispose gates | `equipment.combat_stim_disposed` / `mission_injury` (canonical payload) |

Catalog-only slots stay projected. Minor and moderate both destroy (both set `injured`). Fatality
keeps SPE-2856 `mission_loss`. Do not emit `mission_injury` for a dead carrier. Resignation does
not run this path. Recovery-claimed identities are skipped so an existing queue/outcome claim
remains the destruction authority.

Reuse `takeEquippedInstancesLostOnMissionFatalities` (reason-agnostic registry delete + slot
clear). Rename if sharing with fatality; parameterize `pushMissionLossInstanceDrafts` (or successor)
so fatality passes `mission_loss` and injury passes `mission_injury`. Do not invent a second
destroy helper.

## Implementation sequence (later session)

1. Rename `takeEquippedInstancesLostOnMissionFatalities` to a casualty-neutral name (for example
   `takeEquippedInstancesLostOnMissionResolution`). Keep the signature: agents, registry,
   recovery queues/outcomes, agent IDs → `{ agents, equipmentInstances, lost }`. Do not add
   `reason`. Update the SPE-2856 call site and the recovery-claimed unit test import.
2. Parameterize `pushMissionLossInstanceDrafts(eventDrafts, week, instance, reason)` with
   `reason: 'mission_loss' | 'mission_injury'`. Rename to `pushMissionInstanceLossDrafts` so the
   injury path does not call a fatality-named pusher. Combat Stim still skips the **event** when
   `!isCanonicalCombatStimPayload`.
3. After the existing `if (injurySeverity) { createAgentInjuredDraft }` block, add
   `if (injurySeverity && !casualty.fatal) { take…; for lost push drafts with mission_injury }`.
   Do not place this inside `if (casualty.fatal)`. Do not call a fatality-named helper from the
   injury path.
   **Injury-only retain (living carrier; do not copy fatality here):**
   - Skip take/clear for an equipped `combat_stims` identity that
     `instanceHasActiveOverdriveProvenance` still owns (`overdrive.active` or `recoveryDebt > 0`).
     `rollMissionCasualty` keeps Combat Stim overdrive on injury (`expireResolvedOverdrive` no-ops
     when `source.kind === 'combat_stim'`). Deleting that identity would leave dangling expiry/debt.
   - Skip take/clear for an equipped `combat_stims` identity whose payload is not canonical. The
     dispose event cannot be emitted, and a living carrier must not be silent-erased. Fatality
     SPE-2856 may still delete those copies without an event (dead carrier).
4. Extend reason unions in `src/domain/events/types.ts` and `eventValidation.ts` on both
   `equipment.instance_destroyed` and `equipment.combat_stim_disposed` to
   `'manual_disposal' | 'mission_loss' | 'mission_injury'`. No location fields. No schema version
   bump. Add SPE-2857 to the `SCHEMA_REGISTRY.md` `equipmentInstances` bullet (injury path;
   `mission_injury`; fatality remains `mission_loss`).
5. Extend `instanceLossReasonLabel` with `case 'mission_injury': return 'Mission injury'` and keep
   the `never` default. Feed copy must distinguish Mission injury / Mission loss / Manual disposal.
6. Tests: invert the injury regression into a positive injury-loss assertion; keep fatality
   `mission_loss`; add Combat Stim injury dispose; skip recovery-claimed on an injured carrier;
   retain Combat Stim with live overdrive/recovery provenance on injury; retain noncanonical
   Combat Stim payload on injury (no silent delete, no dispose event); accept `mission_injury` in
   event validation; add event-feed Mission injury cases.
7. Slice Status → **Recently shipped**; backlog primary moves off SPE-2857 only when the next
   SPE-2827 child is the handoff. Do not mark parent Done. After the implementation PR merges, emit
   the local-agent Linear handoff in **phase B closeout only** (do not edit this slice on `main`).

## Determinism and compatibility

- instance-ID order per injured carrier; assigned-agent loop order across carriers;
- `rollMissionCasualty` fatal returns stay `injurySeverity: null`; do not change casualty math;
- existing idle equipped destroy/dispose/re-agg/lot-return commands keep `manual_disposal` and
  stored-path behavior, including SPE-2844 / SPE-2855 overdrive/recovery gates;
- event payloads reuse existing types; `mission_injury` is added to the destroy/dispose reason
  unions beside `manual_disposal` and `mission_loss`;
- no location fields on payloads; `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event
  schema version remain unchanged;
- Equipment UI is out of this slice (event-feed copy must distinguish Mission injury from Mission
  loss and Manual disposal).

## Deferred

| Item or mechanic                   | Owner or prerequisite | Reason                                                                               |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| Resignation equipped-instance loss | SPE-2827 child        | Not authored by mission resolution                                                   |
| Injury _capacity_ (body-use)       | SPE-1484              | Slot occupancy, climb/drive/restrain/fine-tool, recovery restore — not identity loss |
| Re-agg / lot-return on injury      | out of scope          | Loss must not credit stock                                                           |
| Repair, damage production          | SPE-877               | Integrity program beyond identity loss                                               |
| Ready versus stowed                | SPE-1658              | Access-state layer remains separately owned                                          |
| SPE-2847                           | do not pick           | Out of SPE-2827 remaining sequence                                                   |
| Equipment UI                       | out of scope          | Event-feed reason label only; no loadout chrome                                      |
| Runtime `src/` in this planning PR | shipped               | Injury take/clear + `mission_injury` drafts                                          |

## Local-agent Linear handoff

Not required for planning. After the SPE-2857 **implementation** PR merges, write the handoff in
**phase B closeout only** (`docs/cloud-agent-linear-handoff.md`). Do not edit this slice on `main`
to store it. Local agent: SPE-2857 **Done**, PR URL + what shipped, SPE-2827 **Backlog**.

## Validation

Implementation session must cover:

- injury ordinary instance-backed slots (existing fail + fatigue-90 fixture): identities gone,
  those slots empty, catalog-only slot preserved, sibling/stored identities preserved, inventory
  unchanged, `mission_injury` destroy events in instance-ID order, `agent.injured` still emitted,
  status `'injured'` (not `'dead'`);
- injury Combat Stim: identity gone, slot empty, inventory unchanged, `mission_injury` dispose,
  except retain copies with live overdrive/recovery provenance and retain noncanonical payloads
  (no silent delete on a living carrier);
- skip SPE-2844 / SPE-2855 **player idle/dose** gates for canonical, provenance-free Combat Stim
  on injury (still no inventory credit); do **not** skip the overdrive/recovery provenance retain;
- minor and moderate both destroy because both set `injured`; do not branch destroy on severity
  enum. The existing injury fixture is sufficient if it yields `injured` and empty fatalities;
- fatality path still emits `mission_loss` only; injury path emits `mission_injury` only; one
  casualty never emits both reasons;
- invert `does not destroy equipped instances when the assigned agent is only injured` into the
  positive injury-loss assertion;
- recovery-claimed equipped identity skipped on the injured carrier;
- event-schema `mission_injury` accepted; unknown reasons still rejected; event-feed copy
  distinguishes Mission injury / Mission loss / Manual disposal;
- focused mission/event tests, lint, `verify:backlog-handoff`, formatting, and targeted Vitest.

Planning PR validation: `npm run verify:backlog-handoff` only. No `src/` diff.
