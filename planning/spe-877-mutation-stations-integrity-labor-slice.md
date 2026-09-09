# SPE-877 — Mutation stations / integrity labor

| Field               | Value                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                                                           |
| **Linear**          | Child of [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — ID pending Linear create (MCP `needsAuth` this session) |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                                |
| **Branch**          | Follow-up `cursor/spe-877-integrity-labor-followup-6667` on `main` after `cursor/spe-877-mutation-stations-6667`                                                               |
| **Base `main` SHA** | `90617f086a7d45a5d18f272cb27f131b894d076b`                                                                                                                                     |

## Goal

Ship the smallest SPE-113 runtime: one authored integrity-labor station mutates one frozen `blast_door` identity in place through `applyEquipmentInstanceTransition`. Preserve instance ID and provenance. Fail closed. Distinct from [SPE-2851](https://linear.app/spectranoir/issue/SPE-2851) `damaged`→`operational` and [SPE-2862](https://linear.app/spectranoir/issue/SPE-2862) stabilization / deficiency clear.

## Selected authoritative path

- Station: `blast_door_integrity_bench`
- Eligible class: `blast_door`
- Location: stored
- Mutation field: optional `stationMutation: { stationId, appliedWeek }`
- Tradeoff: `containmentIntegrity.cycleCount` +1
- Unchanged: `condition`, deficiency, `lastInspectionWeek`, inventory, lots, `damagedEquipmentQueue`, `fabricationOrigin`

## Station contract

Pure resolver in `src/domain/equipmentStationMutation.ts`. Discriminated result; no throw; no default apply.

| Input                                         | Result                                             |
| --------------------------------------------- | -------------------------------------------------- |
| `blast_door`, no existing stamp, week ≥ 1     | `{ ok: true, stationId, cycleDelta: 1, mutation }` |
| `pressure_seal` / `interlock` / unknown class | `{ ok: false, code: 'invalid_class' }`             |
| existing valid stamp                          | `{ ok: false, code: 'already_applied' }`           |
| existing malformed stamp                      | `{ ok: false, code: 'malformed_mutation' }`        |
| invalid week                                  | `{ ok: false, code: 'invalid_week' }`              |

Command `applyBlastDoorIntegrityLabor` applies that result through instance transition with `allowStationMutation`. Generic transitions cannot invent or rewrite the stamp. Relocate / SPE-2851 repair / SPE-2862 stabilization keep a valid blast-door stamp. Catalog re-aggregation and fabricated ordinary return-to-lot fail closed with `station_mutation_reaggregation_unsupported` while the stamp is present. Existing ordinary lifecycle projections disable those buttons (`station_mutation_unsupported`). Unstamped identities keep SPE-2827 / SPE-2848 re-aggregation.

## Events and hydration

Successful labor hydrates as `equipment.instance_station_mutated` with reason `integrity_labor`. Valid events are history and do not replay the mutation. `hard_stop` events require `inService: false`; `none` and compensating continue require `inService: true`. Stamps that are not on a parsed `blast_door` identity drop independently (`malformed_station_mutation`). `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` / operation-event schema version stay unchanged.

## Boundaries preserved

- No SPE-113 tags / operators / black-market / curse catalog
- No extra-class barrier zones
- No store/UI inspect or deficiency commands
- No SPE-1027 consume
- No SPE-2866 workshop quality remapping
- No seed of `equipment-instance-blast-door-workshop`
- Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847.
- Stamped identities fail-close catalog re-aggregation and fabricated ordinary return; unstamped identities keep those paths.

## Deferred

| Item or mechanic                                                | Owner or prerequisite         | Reason                                                                 |
| --------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| Extra-class barrier zones (pressure-seal / interlock membranes) | later SPE-877 child           | Named next after this child. Membrane coupling stays `blast_door` only |
| Store/UI inspect or deficiency commands                         | later SPE-877 child           | Week-close remains the production inspect path                         |
| SPE-1027 stock consume of a named part                          | SPE-1027 / later child        | Suitability stays blast-door-only; this child does not consume         |
| Seed or materialize `equipment-instance-blast-door-workshop`    | later SPE-877 child           | SPE-2866 mapping still fail-closes missing instance                    |
| Additional SPE-113 stations, tags, operators, legality, curses  | later SPE-877 / SPE-113 child | This child freezes one bench                                           |
| Mapping additional containment classes into workshop quality    | later SPE-877 child           | SPE-2866 is blast-door only                                            |
| Additional live quality axes                                    | SPE-1028 / SPE-2771           | Adjacent workshop owner                                                |

## Parent disposition

SPE-877 remains **Backlog**. Remaining parent AC after this child: extra-class barrier zones.

## Acceptance

- Authored stored `blast_door` identity receives `stationMutation` for `blast_door_integrity_bench` and `cycleCount` +1
- `condition` and deficiency are unchanged, including sticky hard-stop and damaged copies
- Repeat apply fail-closes with `station_mutation_already_applied`
- Ordinary / wrong class / equipped / missing / malformed fail closed with no mutation
- Generic transitions cannot invent or rewrite the stamp; relocate preserves it
- SPE-2851 repair and SPE-2862 stabilization still do not write `stationMutation` and do not clear the stamp
- Inventory, lots, and `damagedEquipmentQueue` stay unchanged
- Valid `equipment.instance_station_mutated` hydrates as history without replaying mutation
- Stamped identities fail-close catalog re-aggregation and fabricated ordinary return-to-lot (`station_mutation_reaggregation_unsupported`); rematerialize cannot orphan the mutated ID
- Unstamped blast-door identities still catalog-reaggregate
- Hydration and transitions reject stamps that are not on a parsed `blast_door` identity
- Station-mutation events reject contradictory `inService` vs deficiency kind
- Parent SPE-877 remains Backlog

## Linear issue body

**Title:** Mutation stations / integrity labor

**Parent:** SPE-877

**Goal:** One authored integrity-labor station mutates one frozen `blast_door` identity in place via `applyEquipmentInstanceTransition`. Preserve identity. Fail closed. Distinct from SPE-2851 condition repair and SPE-2862 deficiency clear.

**Scope:** Frozen station `blast_door_integrity_bench`. Pure resolver plus `applyBlastDoorIntegrityLabor`. Optional persisted `stationMutation`. `cycleCount` +1 tradeoff. Stored only. No inventory consume. No UI inspect. No extra-class barrier. No workshop remapping.

**Constraints:** Do not implement the full SPE-113 catalog. Do not spawn a new instance UUID (including via catalog rematerialize of a stamped identity). Do not treat mutation as a temporary buff. Do not bump `GAME_STORE_VERSION` unless hydration evidence requires it. Do not reopen SPE-2827 / SPE-2848 for unstamped identities. Do not pick SPE-2847.

**Acceptance criteria:**

- One authored station, one class, one mutation field set
- Eligible stored blast-door apply writes stamp + cycleCount +1
- Condition and deficiency unchanged
- Missing / wrong-class / already-applied / equipped fail closed
- Identity and provenance preserved across save/load
- Stamped identities fail-close catalog re-aggregation and fabricated ordinary return-to-lot
- Hydration rejects stamps that are not on a parsed blast-door identity
- Station-mutation events reject contradictory `inService`
- Parent stays Backlog
