# SPE-877 — Seed `equipment-instance-blast-door-workshop`

| Field               | Value                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                         |
| **Linear**          | Parent [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**. Slice child ID pending local create. |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                              |
| **Branch**          | `cursor/spe-877-seed-blast-door-workshop-3400`                                                                                                                               |
| **Base `main` SHA** | `bed1cb53a0b2422c4b06725fbf87d62f68b46e7b`                                                                                                                                   |

## Boundary

Seed one authored stored blast-door identity at the ID SPE-2866 already maps
(`equipment-instance-blast-door-workshop`) so live workshop `equipmentCondition` is not permanently
`poor` from a missing instance. Starting-state writes the identity via
`createFieldContainmentBlastDoorWorkshopInstance`. Hydration preserves the authored ID when present.
Do not call `instantiateEquipmentInstance` for the seed (allocator is
`equipment-instance-${week}-${ordinal}`). Do not debit aggregate inventory or SPE-1027 stock.

Do not remap extra-class workshop quality. Do not add SPE-113 stations. Do not consume SPE-1027
stock. Do not bump `GAME_STORE_VERSION` unless hydration evidence requires it (it does not).

## Seed contract

| Field                  | Value                                      |
| ---------------------- | ------------------------------------------ |
| `instanceId`           | `equipment-instance-blast-door-workshop`   |
| `definitionId`         | `ward_seals`                               |
| `location`             | `{ state: 'stored' }`                      |
| `condition`            | `operational`                              |
| `containmentIntegrity` | `blast_door` / week 1 / cycle 0 / `none`   |
| Inventory debit        | none (`ward_seals` starting stock stays 0) |

SPE-2866 missing-instance `poor` remains when the identity is omitted. Fresh starting state maps
`department:field-containment` to `good`. Ordinary instantiate still allocates
`equipment-instance-1-1` without replacing the seed. Legacy saves that omit `equipmentInstances`
still hydrate `{}`.

## Determinism and compatibility

- authored ID is not in the sequential allocator namespace;
- `sanitizeEquipmentInstanceRegistry` keeps the safe ID;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version stay unchanged.

## Deferred

| Item or mechanic                                       | Owner or prerequisite                                                                                       | Reason                                                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Protect authored workshop identity from destroy/re-agg | [SPE-2877](https://linear.app/spectranoir/issue/SPE-2877/protect-authored-workshop-identity-from-destroyre-agg) (`planning/spe-877-protect-workshop-identity-slice.md`) | Shipped: authored SPE-2866 IDs fail-close ordinary destroy/re-agg without stock credit |
| SPE-1027 stock consume of a named part                 | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port; this seed does not invent inventory debit                                                      |
| Additional SPE-113 stations                            | this SPE-877 child (`planning/spe-877-interlock-integrity-bench-slice.md`)                                  | Shipped pressure-seal and interlock benches; SPE-113 tags/operators/curses remain                                               |
| Extra-class workshop quality                           | this SPE-877 child (`planning/spe-877-extra-class-workshop-quality-slice.md`)                               | Shipped extra-class workshop mappings + no-debit seeds; blast-door seed unchanged                                               |
| Barrier recouple on technician relief                  | [SPE-2876](https://linear.app/spectranoir/issue/SPE-2876/barrier-recouple-on-technician-relief) (`planning/spe-877-barrier-recouple-technician-relief-slice.md`) | Shipped: technician-relief persist omits `flow_restraint` on `none`; `zone_breach` stays sticky                                  |
| Mid-week inspect command                               | later SPE-877 child                                                                                         | Week-close remains the production inspect path                                                                                  |

## Acceptance

- starting-state contains `equipment-instance-blast-door-workshop` with `classId: 'blast_door'`
- SPE-2866 mapping no longer fail-closes missing instance for `department:field-containment` on a fresh game
- omitted identity still fail-closes `poor`
- hydrate/save round-trip keeps the authored ID
- ordinary instantiate still allocates sequential IDs without clobbering the seed
- seeded identity participates in week-close inspect when cadence is due
- no extra-class workshop instances; no SPE-113 stations; no SPE-1027 consume
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Seed `equipment-instance-blast-door-workshop`

**Parent:** SPE-877

Mechanic: seed one authored stored blast-door identity at the ID SPE-2866 already maps so live
workshop `equipmentCondition` is not permanently `poor` from a missing instance. Starting-state (or
equivalent deterministic seed) plus hydration that preserves the authored ID. Do not remap
extra-class workshop quality. Do not add SPE-113 stations. Do not consume SPE-1027 stock.

Linear child ID pending local create (Cloud Agent Linear MCP `needsAuth`).

## Validation

- Targeted Vitest: `src/test/fieldContainmentBlastDoorWorkshopSeed.contract.test.ts`, `src/test/departmentWorkshopLiveIntegrityQuality.integration.test.ts`, `src/test/equipmentInstance.contract.test.ts`, `src/test/combatStim.contract.test.ts`, `src/features/equipment/equipmentView.test.ts`, `src/features/equipment/EquipmentPage.test.tsx`
- `npm run lint`
- `npm run verify:backlog-handoff`
