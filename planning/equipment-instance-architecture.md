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

| Command family                     | Eligible identities                                                                                              | Stock and provenance effect                                                                                                                                                                                                          | Event                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Ordinary destroy                   | Stored or idle-equipped, non-Combat-Stim, payload-free, recovery-unclaimed identities                            | Deletes only the instance; aggregate inventory and fabricated-lot receipts are unchanged                                                                                                                                             | `equipment.instance_destroyed` / `manual_disposal`                                    |
| Mission-fatality equipped loss     | Equipped ordinary or Combat Stim identities on an agent just marked `dead` by mission resolution                 | Deletes those registry keys and clears instance-backed slots; inventory and lot receipts unchanged; recovery-claimed identities skipped                                                                                              | `equipment.instance_destroyed` or `equipment.combat_stim_disposed` / `mission_loss`   |
| Mission-injury equipped loss       | Equipped ordinary or Combat Stim identities on an agent just marked `injured` by mission resolution              | Deletes those registry keys and clears instance-backed slots; inventory and lot receipts unchanged; recovery-claimed identities skipped; retain Combat Stim with live overdrive/recovery provenance and retain noncanonical payloads | `equipment.instance_destroyed` or `equipment.combat_stim_disposed` / `mission_injury` |
| Resignation (no destroy)           | Equipped ordinary or Combat Stim identities on an agent just marked `resigned` by betrayal                       | Registry keys and slot projections stay; inventory and lot receipts unchanged; SPE-2830 terminal-carrier recovery remains the identity-removal path; Combat Stim overdrive/debt stays recovery-blocked                               | none at resignation                                                                   |
| Non-mission death (no destroy)     | Equipped ordinary or Combat Stim identities on a `dead` carrier that did not run SPE-2856                        | Registry keys and slot projections stay; inventory and lot receipts unchanged; SPE-2830 terminal-carrier recovery remains the identity-removal path; Combat Stim overdrive/debt stays recovery-blocked                               | none at non-mission death                                                             |
| Catalog re-aggregation             | Stored or idle-equipped, operational, non-fabricated, payload-free ordinary identities without `stationMutation` | Deletes the instance and credits exactly one aggregate inventory unit                                                                                                                                                                | `equipment.instance_reaggregated` / `manual_untracking`                               |
| Fabricated-lot return              | Stored or idle-equipped, operational fabricated-origin ordinary identities without `stationMutation`             | Deletes the instance, credits exactly one aggregate inventory unit, decrements source lot `trackedInstanceUnits`, and leaves immutable lot `quantity` unchanged                                                                      | `equipment.instance_reaggregated` / `fabricated_lot_return`                           |
| Combat Stim disposal               | Stored or idle-equipped `combat_stims` with canonical payload and no active overdrive/recovery claim             | Deletes only the instance; aggregate inventory is unchanged                                                                                                                                                                          | `equipment.combat_stim_disposed`                                                      |
| Combat Stim catalog re-aggregation | Stored or idle-equipped, operational, full 2/2 catalog `combat_stims`                                            | Deletes the instance and credits exactly one aggregate `combat_stims` unit                                                                                                                                                           | `equipment.combat_stim_reaggregated` / `manual_untracking`                            |
| Combat Stim fabricated-lot return  | Stored or idle-equipped, operational, full 2/2 fabricated-origin `combat_stims`                                  | Deletes the instance, credits exactly one aggregate `combat_stims` unit, decrements source lot `trackedInstanceUnits`, and leaves immutable lot `quantity` unchanged                                                                 | `equipment.combat_stim_reaggregated` / `fabricated_lot_return`                        |

All stock-crediting paths fail closed for stale IDs, non-idle equipped copies, recovery-claimed identities,
safe-integer inventory overflow, damaged condition, stamped integrity-labor identities
(`station_mutation_reaggregation_unsupported`), and invalid or missing provenance for the path.
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

Optional `containmentIntegrity` on an instance is a separate axis from `condition`. Frozen
classes are `blast_door`, `pressure_seal`, and `interlock`: inspection freshness is derived from last-inspection
week plus history-intensified cadence; deficiency is `hard_stop` (not in-service) or compensating
continue with the class-authored control (`secondary_interlock_watch`, `backup_gasket_watch`, or
`dual_circuit_watch`). Compensating continue cannot clear a later hard-stop. Mixed class/control
pairings and unknown class records (`airlock`) fail closed. SPE-2851 repair preserves this field
and does not treat hard-stop as `damaged`. SPE-2861 spare-part suitability gates that repair for
`blast_door` identities without consuming stock or clearing deficiency. SPE-2864 added
`pressure_seal`; [SPE-2865](https://linear.app/spectranoir/issue/SPE-2865/additional-containment-class-inspection-kernel-interlock)
added `interlock`.

## Technician stabilization (SPE-2862)

`stabilizeContainmentClassDeficiency` is the technician exception to sticky hard-stop. It relieves
`hard_stop` into compensating `secondary_interlock_watch` (temporary in-service) or clears
compensating continue to `none`. Each success increments `cycleCount` by 1 so cadence intensifies.
`condition`, inventory, lots, and last-inspection week stay unchanged. Inspection
`applyContainmentClassDeficiency` and generic transitions still reject hard-stop overwrite.
Successful stabilization hydrates as `equipment.containment_class_stabilized` history without
replaying the mutation.

## Week-close last-inspection (SPE-877 child)

`advanceContainmentClassInspectionsAtWeekClose` stamps `lastInspectionWeek` to the closing week
when freshness is `due` or `overdue`. Due records the class-authored compensating continue;
overdue records `hard_stop`. Sticky hard-stop is preserved and still stamped. Ordinary identities
and malformed records skip independently. Successful stamps emit
`equipment.containment_class_inspected` with reason `week_close_auto_advance`. SPE-2864 widened
the inspect/deficiency `classId` union to include `pressure_seal`; [SPE-2865](https://linear.app/spectranoir/issue/SPE-2865/additional-containment-class-inspection-kernel-interlock)
added `interlock`. See
`planning/spe-877-week-close-last-inspection-advance-slice.md`,
`planning/spe-877-pressure-seal-containment-class-inspection-slice.md`, and
`planning/spe-877-interlock-containment-class-inspection-slice.md`.

## Barrier-integrity coupling (SPE-877 child)

Optional `GameState.containmentBarrierIntegrity` is a keyed SPE-1387 / SPE-471 membrane registry.
`applyContainmentClassDeficiency` writes `zone_breach` from hard-stop and `flow_restraint`
(`barrier_integrity_watch`) from compensating continue onto the class zone:
`blast_door` → `blast_door_membrane`, `pressure_seal` → `pressure_seal_membrane`,
`interlock` → `interlock_membrane`. Week-close inspect advance reuses the same
`persistContainmentBarrierCoupling` helper without technician-relief clear. Extra-class deficiency
never writes `blast_door_membrane`. Successful `stabilizeContainmentClassDeficiency` recouples from
the new deficiency with `technicianRelief`: `none` omits that zone's `flow_restraint` only when
`existing.sourceInstanceId` matches the stabilizing instance; a sibling-sourced restraint stays;
recorded
`zone_breach` does not downgrade on technician relief, SPE-2851 repair, or SPE-2867 integrity labor.
See `architecture/containment-environment-patterns.md`,
`planning/spe-877-extra-class-barrier-zones-slice.md`,
`planning/spe-877-barrier-recouple-technician-relief-slice.md`, and
`planning/spe-877-sibling-sourced-restraint-slice.md`.

## Live workshop integrity mapping (SPE-2866 + extra-class child)

Authored departments map frozen containment-class identities into SPE-2782 `equipmentCondition`
at the existing week-close completion-registration wrapper:

- `department:field-containment` → `equipment-instance-blast-door-workshop` (`blast_door`)
- `department:emergency-response` → `equipment-instance-pressure-seal-workshop` (`pressure_seal`)
- `department:procurement-logistics` → `equipment-instance-interlock-workshop` (`interlock`)

Starting-state seeds those identities as stored `ward_seals` with matching-class `none` integrity
so a fresh game is not permanently `poor` from a missing instance, without debiting aggregate
inventory. Ordinary destroy and catalog re-aggregation fail closed for those authored IDs so
re-agg cannot credit never-debited `ward_seals` (`planning/spe-877-protect-workshop-identity-slice.md`).
Mission-fatality and mission-injury equipped loss skip those IDs in place
(`planning/spe-877-mission-casualty-workshop-identity-slice.md`); relocate of the seeds stays legal.
Hard-stop, missing instance, malformed integrity, and wrong class resolve `poor`; `none`
and compensating continue resolve `good`. Unmapped departments keep caller-owned equipment
condition. SPE-2851 `condition` is not the mapped signal. Extra-class identities do not satisfy the
blast-door mapping. See `planning/spe-877-live-workshop-integrity-mapping-slice.md`,
`planning/spe-877-seed-blast-door-workshop-slice.md`, and
`planning/spe-877-extra-class-workshop-quality-slice.md`.

## Mutation stations / integrity labor (SPE-877 child)

`applyBlastDoorIntegrityLabor`, `applyPressureSealIntegrityLabor`, and `applyInterlockIntegrityLabor`
are the SPE-113 runtime. Authored stations `blast_door_integrity_bench`,
`pressure_seal_integrity_bench`, and `interlock_integrity_bench` stamp optional `stationMutation` on
one stored matching-class identity and increment `cycleCount` by 1. `condition` and deficiency stay
unchanged. Generic transitions cannot invent or rewrite the stamp. Hydration and transitions reject
stamps whose authored class does not match the instance (`blast_door` ↔ blast-door bench,
`pressure_seal` ↔ pressure-seal bench, `interlock` ↔ interlock bench). Catalog re-aggregation and
fabricated ordinary return-to-lot fail closed while the stamp is present so rematerialize cannot
spawn a new UUID. Successful labor hydrates as `equipment.instance_station_mutated` with reason
`integrity_labor`. This is not a universal instance mutation API. See
`planning/spe-877-mutation-stations-integrity-labor-slice.md`,
`planning/spe-877-pressure-seal-integrity-bench-slice.md`,
`planning/spe-877-interlock-integrity-bench-slice.md`, and
`architecture/permanent-gear-mutation-stations.md`.

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
(`planning/spe-2860-containment-class-inspection-cadence-deficiency-slice.md`), SPE-2861 spare-part
suitability (`planning/spe-spare-part-suitability-repair-slice.md`), SPE-2862 technician
stabilization (`planning/spe-2862-stabilization-deficiency-clear-slice.md`), barrier-integrity
coupling (`planning/spe-barrier-integrity-coupling-slice.md`), and week-close last-inspection
auto-advance (`planning/spe-877-week-close-last-inspection-advance-slice.md`), SPE-2864
pressure-seal (`planning/spe-877-pressure-seal-containment-class-inspection-slice.md`), and the
interlock extra-class child ([SPE-2865](https://linear.app/spectranoir/issue/SPE-2865/additional-containment-class-inspection-kernel-interlock),
`planning/spe-877-interlock-containment-class-inspection-slice.md`), and live workshop integrity
mapping ([SPE-2866](https://linear.app/spectranoir/issue/SPE-2866/live-workshop-integrity-mapping),
`planning/spe-877-live-workshop-integrity-mapping-slice.md`), and mutation stations / integrity
labor (`planning/spe-877-mutation-stations-integrity-labor-slice.md`,
[SPE-2867](https://linear.app/spectranoir/issue/SPE-2867/mutation-stations-integrity-labor)), and
extra-class barrier zones
([SPE-2868](https://linear.app/spectranoir/issue/SPE-2868/extra-class-barrier-zones-pressure-seal-interlock-membranes),
`planning/spe-877-extra-class-barrier-zones-slice.md`), and store/UI deficiency disposition
([SPE-2869](https://linear.app/spectranoir/issue/SPE-2869/storeui-inspect-or-deficiency-commands),
`planning/spe-877-store-ui-inspect-deficiency-slice.md`), and extra-class technician stabilization
(`planning/spe-877-extra-class-technician-stabilization-slice.md`), and seed
`equipment-instance-blast-door-workshop`
(`planning/spe-877-seed-blast-door-workshop-slice.md`), and extra-class workshop quality
(`planning/spe-877-extra-class-workshop-quality-slice.md`): SPE-1027 consume remains
blocked on [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part)
until a debit port exists. Protect authored workshop identity from destroy/re-agg shipped as
[SPE-2877](https://linear.app/spectranoir/issue/SPE-2877/protect-authored-workshop-identity-from-destroyre-agg)
(`planning/spe-877-protect-workshop-identity-slice.md`). Barrier recouple on technician relief shipped as [SPE-2876](https://linear.app/spectranoir/issue/SPE-2876/barrier-recouple-on-technician-relief)
(`planning/spe-877-barrier-recouple-technician-relief-slice.md`). Preserve sibling-sourced
`flow_restraint` on technician relief shipped as
[SPE-2878](https://linear.app/spectranoir/issue/SPE-2878/preserve-sibling-sourced-flow-restraint-on-technician-relief)
(`planning/spe-877-sibling-sourced-restraint-slice.md`). Skip authored workshop identity on
mission-casualty equipped loss shipped as
[SPE-2879](https://linear.app/spectranoir/issue/SPE-2879/skip-authored-workshop-identity-on-mission-casualty-equipped-loss)
(`planning/spe-877-mission-casualty-workshop-identity-slice.md`). Week-close remains the production
inspect path.
Healing,
overdose, and broader salvage semantics remain SPE-1055 / SPE-2749. Quest/unique
artifact locks remain SPE-1766. Do not author destroy-on-resignation or
destroy-on-non-mission-death (SPE-2858 / SPE-2859 recovery remains). The shipped
lifecycle commands above do not imply a generic repair economy, automatic
fabricated-lot selection, Auto-Scrap instance routing, or a universal instance
mutation API.
