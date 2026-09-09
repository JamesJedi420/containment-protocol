# Containment Environment Patterns (SPE-1387 pairing)

## Purpose

Containment cells are **membrane + restraint** state, not an extra equipment class and not a
parallel door-opening system. This file is the in-repo SPE-1387 `barrier_integrity` design restored
for the SPE-877 blast-door consumer. SPE-471 supplies the catastrophic wall-breach / zone-breach
states. Equipment `condition` (SPE-2851 `damaged` / `operational`) is a separate axis.

## Frozen pairing (blast_door)

One authored zone: `blast_door_membrane`. One SPE-2860 class: `blast_door`. Deficiency
(`containmentIntegrity.deficiency`) is the only input this pairing consumes.

| Deficiency                    | `barrier_integrity` status | Meaning                                                                                         |
| ----------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| `none` (or ordinary identity) | `intact` (omit persisted)  | Membrane holds. No coupling write.                                                              |
| `compensating_continue`       | `flow_restraint`           | `barrier_integrity_watch` — flow-restraint under `secondary_interlock_watch`. **Not** a breach. |
| `hard_stop`                   | `zone_breach`              | SPE-471 catastrophic wall-breach. The door is out of service; the zone has failed.              |

## Frozen pairing (pressure_seal)

One authored zone: `pressure_seal_membrane`. One SPE-2864 class: `pressure_seal`. Same deficiency
→ status table as blast-door. `persistContainmentBarrierCoupling` writes only
`pressure_seal_membrane` and must not clobber `blast_door_membrane`. Interlock has no zone until a
later SPE-877 child.

Optional `GameState.containmentBarrierIntegrity` is a keyed registry of those zones. Legacy
singular blast-door records hydrate into `{ blast_door_membrane: record }`. Mixed class/zone
pairings fail closed. Recorded `zone_breach` never downgrades.

## Sticky recorded breach

`zone_breach` never downgrades. Technician stabilization (SPE-2862) may restore door `inService`
without erasing a recorded breach. Compensating continue after a live `zone_breach` does not open a
second model and does not clear the breach. SPE-2851 `damaged` is not a breach.

## Anti-patterns

- A second integrity class, extra containment classes, or a door-opening minigame beside SPE-2860.
- Treating compensating continue as full wall-breach.
- Inventing a second `barrier_integrity` vocabulary beside this file.
- Writing `blast_door_membrane` from a non-`blast_door` class, or a parallel GameState sibling that
  clobbers the blast-door record.
- Week-close inspection advance, SPE-1027 stock consume, store/UI surfaces this pairing does not own.

## Runtime owner

`src/domain/containmentBarrierIntegrity.ts` plus `persistContainmentBarrierCoupling` in
`src/domain/equipmentInstance.ts` (shared by `applyContainmentClassDeficiency` and week-close
inspect advance). Optional `GameState.containmentBarrierIntegrity` hydrates fail-closed; operation
event `equipment.containment_barrier_integrity_changed` is history only.

## See also

- `planning/spe-barrier-integrity-coupling-slice.md`
- `planning/spe-877-pressure-seal-barrier-zone-slice.md`
- `planning/spe-2860-containment-class-inspection-cadence-deficiency-slice.md`
- `architecture/fortified-site-breach-assault.md` — assault-layer breach, not this membrane pairing
