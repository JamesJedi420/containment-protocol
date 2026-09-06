# Equipment Instance Architecture

## Authorities

Equipment definitions describe catalog semantics. Aggregate `inventory` counts uninstantiated
stock. Optional `equipmentInstances` owns the identity and location of instantiated ordinary
equipment objects. `Agent.equipmentSlots` is a definition-ID compatibility projection, not a
second ownership ledger.

An instance has immutable `instanceId` and `definitionId`. Its mutable state is deliberately
small: stored/equipped location, operational/damaged condition, and an optional resource payload
whose safe ID and integer bounds are validated. Grade, rarity, value, provenance, legacy effect
scale, and fabrication-lot receipts remain independent authorities.

## Mutation rules

Instantiation moves exactly one unit from aggregate inventory into the registry. Relocation never
changes aggregate inventory. Compare-and-swap transitions require an exact expected instance and
reject stale state or identity changes. Existing loadout commands recognize instance-backed slots:
unequip and replacement store the instance, while direct transfer moves the same instance.

There is still no unguarded delete or inventory-credit operation. Every identity-destroying path
has its own source authority, eligibility check, and event payload:

| Command family                     | Eligible identities                                                                                  | Stock and provenance effect                                                                                                                                                                                                          | Event                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Ordinary destroy                   | Stored or idle-equipped, non-Combat-Stim, payload-free, recovery-unclaimed identities                | Deletes only the instance; aggregate inventory and fabricated-lot receipts are unchanged                                                                                                                                             | `equipment.instance_destroyed` / `manual_disposal`                                    |
| Mission-fatality equipped loss     | Equipped ordinary or Combat Stim identities on an agent just marked `dead` by mission resolution     | Deletes those registry keys and clears instance-backed slots; inventory and lot receipts unchanged; recovery-claimed identities skipped                                                                                              | `equipment.instance_destroyed` or `equipment.combat_stim_disposed` / `mission_loss`   |
| Mission-injury equipped loss       | Equipped ordinary or Combat Stim identities on an agent just marked `injured` by mission resolution  | Deletes those registry keys and clears instance-backed slots; inventory and lot receipts unchanged; recovery-claimed identities skipped; retain Combat Stim with live overdrive/recovery provenance and retain noncanonical payloads | `equipment.instance_destroyed` or `equipment.combat_stim_disposed` / `mission_injury` |
| Resignation (no destroy)           | Equipped ordinary or Combat Stim identities on an agent just marked `resigned` by betrayal           | Registry keys and slot projections stay; inventory and lot receipts unchanged; SPE-2830 terminal-carrier recovery remains the identity-removal path; Combat Stim overdrive/debt stays recovery-blocked                               | none at resignation                                                                   |
| Non-mission death (no destroy)     | Equipped ordinary or Combat Stim identities on a `dead` carrier that did not run SPE-2856            | Registry keys and slot projections stay; inventory and lot receipts unchanged; SPE-2830 terminal-carrier recovery remains the identity-removal path; Combat Stim overdrive/debt stays recovery-blocked                               | none at non-mission death                                                             |
| Catalog re-aggregation             | Stored or idle-equipped, operational, non-fabricated, payload-free ordinary identities               | Deletes the instance and credits exactly one aggregate inventory unit                                                                                                                                                                | `equipment.instance_reaggregated` / `manual_untracking`                               |
| Fabricated-lot return              | Stored or idle-equipped, operational fabricated-origin ordinary identities                           | Deletes the instance, credits exactly one aggregate inventory unit, decrements source lot `trackedInstanceUnits`, and leaves immutable lot `quantity` unchanged                                                                      | `equipment.instance_reaggregated` / `fabricated_lot_return`                           |
| Combat Stim disposal               | Stored or idle-equipped `combat_stims` with canonical payload and no active overdrive/recovery claim | Deletes only the instance; aggregate inventory is unchanged                                                                                                                                                                          | `equipment.combat_stim_disposed`                                                      |
| Combat Stim catalog re-aggregation | Stored or idle-equipped, operational, full 2/2 catalog `combat_stims`                                | Deletes the instance and credits exactly one aggregate `combat_stims` unit                                                                                                                                                           | `equipment.combat_stim_reaggregated` / `manual_untracking`                            |
| Combat Stim fabricated-lot return  | Stored or idle-equipped, operational, full 2/2 fabricated-origin `combat_stims`                      | Deletes the instance, credits exactly one aggregate `combat_stims` unit, decrements source lot `trackedInstanceUnits`, and leaves immutable lot `quantity` unchanged                                                                 | `equipment.combat_stim_reaggregated` / `fabricated_lot_return`                        |

All stock-crediting paths fail closed for stale IDs, non-idle equipped copies, recovery-claimed identities,
safe-integer inventory overflow, damaged condition, and invalid or missing provenance for the path.
Generic catalog re-aggregation never absorbs fabricated provenance; fabricated returns require a
canonical source lot that can absorb one tracked unit.

## Combat Stim governed payload (SPE-2829)

`combat_stims` is the first governed instance payload consumer. Materialization always creates
`combat_stim_dose` at exactly 2/2. Generic compare-and-swap transitions cannot initialize an
alternate payload, consume a dose, or refill it; the explicit activation command is the only
decrement authority. Partially used and empty instances keep their immutable identity and may move
between storage and compatible loadout slots without returning to aggregate stock.

An equipped operational instance can self-activate only for its active responder during an
unresolved raid or Stage IV+ assignment, at depleted/overdrawn underlying energy, outside active
overdrive/recovery lockout, and without `stimulant-prohibited`. The instance ID remains the durable
provenance anchor for activation, overdrive, events, UI, and save/load.

Full-dose Combat Stim stock now has two separate return paths. Catalog-origin instances can return
to aggregate stock only through `reaggregateStoredCombatStimInstance`; fabricated-origin instances
must use `returnFabricatedCombatStimInstanceToLot`. Both accept stored or idle-equipped operational
canonical 2/2 payloads (SPE-2855 relocates idle-equipped copies before the stored helper). Partial
1/2 and depleted 0/2 copies stay instance-owned and must use disposal or recovery as their explicit
next action.

## Depleted Combat Stim recovery (SPE-2830)

Recovery is the first authorized instance-destruction consumer. It accepts only an explicitly
selected stored `combat_stims` instance whose governed payload is exactly 0/2. Live-dose,
equipped, malformed, and active-overdrive/debt instances remain durable and unavailable. Queueing
removes the instance atomically without changing aggregate inventory, then moves immutable
identity, condition, grade, and payload provenance into the recovery queue and outcome receipt.

Hydration accepts completed provenance claims before active claims and removes a duplicate live
registry identity only after accepting a canonical claim. Auto-Scrap remains aggregate-only and
cannot choose an instance source.

Recovery can also claim an explicitly selected instance from a terminal carrier: an equipped copy
on a `dead` or `resigned` agent counts as recoverable even though active agents must store the copy
first. SPE-2856 mission fatality and SPE-2857 mission injury destroy equipped instance-backed copies
during resolution (injury retains live overdrive/recovery Combat Stim and noncanonical payloads).
SPE-2858 confirms resignation is not an identity-destroying trigger. SPE-2859 confirms non-mission
death is not either: `isTerminalCarrierInstance` still treats equipped copies on `resigned`
carriers and on `dead` carriers that did not run SPE-2856 `mission_loss` as recoverable. Do not add
a destroy hook in `betrayal.ts`. Do not add a sweep that destroys equipped copies whenever
`status === 'dead'`.

Queueing that claim deletes the live identity and clears the carrier's compatibility projection
(`equipmentSlots` plus now-unslotted `equipmentEffectScales`). Combat Stim recovery still fails
closed when active overdrive or recovery debt references the instance.

## Condition repair

Stored damaged ordinary and Combat Stim identities can be repaired through
`repairStoredEquipmentInstanceCondition`. The command changes only `condition: 'damaged'` to
`'operational'` by reusing `applyEquipmentInstanceTransition`; it does not credit inventory, refill
Combat Stim doses, mutate fabricated-lot receipts, touch `damagedEquipmentQueue`, or alter recovery
queues and outcomes. Successful repairs emit `equipment.instance_condition_repaired` with the exact
instance ID, definition snapshot, previous/resulting condition, and `manual_condition_repair`.

Repair is intentionally storage-only. Equipped identities must be moved back to storage first, and
recovery-claimed identities remain locked to their recovery provenance. Once repaired, an identity
may satisfy the existing operational-condition gates for its normal catalog re-aggregation or
fabricated-lot return path; repair itself does not choose that path.

## Containment-class inspection (SPE-2860)

Optional `containmentIntegrity` on an instance is a separate axis from `condition`. This slice
authors one frozen class (`blast_door`): inspection freshness is derived from last-inspection week
plus history-intensified cadence; deficiency is `hard_stop` (not in-service) or compensating
continue with `secondary_interlock_watch`. Compensating continue cannot clear a later hard-stop.
Unknown or malformed class records fail closed. SPE-2851 repair preserves this field and does not
treat hard-stop as `damaged`.

## Compatibility and hydration

Definition-only loadouts remain supported. When a valid instance claims an agent slot, its location
wins and writes the definition projection. Hydration processes safe instance IDs deterministically;
the first valid slot claim wins and later valid claimants become stored. Invalid records are dropped
independently. Combat Stim identities may combine canonical `combat_stim_dose` payloads with
matching fabrication origin, while ordinary payload-plus-provenance records fail closed. Missing
registry state becomes `{}` without a save-version change.

## Deferred consumers

SPE-2827 instance identity and lifecycle authority is **Done** as docs disposition
(parent reconciliation `planning/spe-2827-parent-reconciliation-slice.md`; Linear apply
pending). Facility replenishment, refills, and custody/evidence/legal holds remain
SPE-1027 / SPE-867. Readiness/access remains SPE-1658. SPE-877 still owns the integrity
program after SPE-2851's stored condition flip, SPE-2860's blast-door inspection kernel
(`planning/spe-2860-containment-class-inspection-cadence-deficiency-slice.md`), and spare-part
suitability on SPE-2851 repair (`planning/spe-spare-part-suitability-repair-slice.md`):
stabilization/clear and barrier-integrity coupling remain later children.
Healing,
overdose, and broader salvage semantics remain SPE-1055 / SPE-2749. Quest/unique
artifact locks remain SPE-1766. Do not author destroy-on-resignation or
destroy-on-non-mission-death (SPE-2858 / SPE-2859 recovery remains). The shipped
lifecycle commands above do not imply a generic repair economy, automatic
fabricated-lot selection, Auto-Scrap instance routing, or a universal instance
mutation API.
