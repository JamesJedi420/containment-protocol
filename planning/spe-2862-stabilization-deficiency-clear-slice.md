# SPE-2862 — Stabilization / deficiency clear

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                            |
| **Linear**          | [SPE-2862](https://linear.app/spectranoir/issue/SPE-2862/stabilization-deficiency-clear)                                        |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog** |
| **Branch**          | `cursor/spe-2862-stabilization-deficiency-clear`                                                                                |
| **Base `main` SHA** | `4760cc12b90cc25cb4fd5880b872091397665ca9`                                                                                      |

## Boundary

One `blast_door` technician action can **relieve** SPE-2860 sticky hard-stop into compensating
continue, or **clear** compensating continue to `none`, while preserving later deterioration.
Repair ([SPE-2851](https://linear.app/spectranoir/issue/SPE-2851) /
[SPE-2861](https://linear.app/spectranoir/issue/SPE-2861)) still must not write deficiency.
Inspection `resolveStickyContainmentDeficiency` still rejects hard-stop → compensating continue.

Each success increments `cycleCount` by 1 so cadence intensifies. `condition`, inventory, lots,
`damagedEquipmentQueue`, and `lastInspectionWeek` stay unchanged. No SPE-1027 consume. No extra
classes. No week-close inspect advance. No barrier → zone breach.

Ordinary identities without `containmentIntegrity` fail closed. `deficiency.kind === 'none'` fails
closed with no mutation.

## Stabilization contract

Pure resolver in `src/domain/containmentClassInspection.ts`. Discriminated result; no throw, no
`null`, no default continue:

- `hard_stop` → `{ ok: true, deficiency: compensating_continue, cycleDelta: 1 }`
- `compensating_continue` → `{ ok: true, deficiency: { kind: 'none' }, cycleDelta: 1 }`
- `none` → `{ ok: false, code: 'no_deficiency' }`
- malformed → `{ ok: false, code: 'malformed_deficiency' }`

Command `stabilizeContainmentClassDeficiency` applies that result through instance transition with
an explicit hard-stop-relief allowance used only by this command. Generic transitions and
`applyContainmentClassDeficiency` keep sticky hard-stop.

## Determinism and compatibility

- command lives in `src/domain/equipmentInstance.ts` beside SPE-2860 deficiency recording;
- success still uses `applyEquipmentInstanceTransition`;
- emit `equipment.containment_class_stabilized` with reason `technician_stabilization`;
- valid events hydrate as history without replaying mutations;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version stay unchanged
  unless hydration evidence requires otherwise.

## Deferred

| Item or mechanic                              | Owner or prerequisite  | Reason                                             |
| --------------------------------------------- | ---------------------- | -------------------------------------------------- |
| Breach / `barrier_integrity` propagation      | shipped SPE-877 child  | `planning/spe-barrier-integrity-coupling-slice.md` |
| Additional classes (pressure seal, interlock) | later SPE-877 child    | One class in this slice                            |
| Week-close last-inspection auto-advance       | later SPE-877 child    | Schema kernel already shipped in SPE-2860          |
| SPE-1027 stock consume of the named part      | SPE-1027 / later child | Suitability already shipped; no inventory debit    |
| Live workshop integrity mapping               | SPE-877 / SPE-1028     | SPE-2782 stays caller-owned                        |
| Ready / stow                                  | SPE-1658               | Access-state layer                                 |
| Salvage / Auto-Scrap                          | SPE-1055 / SPE-2749    | Adjacent                                           |

## Acceptance

- hard_stop relief → compensating `secondary_interlock_watch` and `inService: true`
- compensating continue clear → `none`
- `cycleCount` +1 on success; identical history still yields identical cadence
- SPE-2851 / SPE-2861 repair still does not clear deficiency
- SPE-2860 inspection still cannot overwrite later hard-stop
- Missing / malformed / ordinary / `none` fail closed
- Parent SPE-877 remains Backlog

## Linear issue body

**Title:** Stabilization / deficiency clear

**Parent:** SPE-877

See Linear [SPE-2862](https://linear.app/spectranoir/issue/SPE-2862/stabilization-deficiency-clear).

## Validation

- Targeted Vitest: `src/test/containmentClassInspection.contract.test.ts`, `src/test/equipmentInstance.contract.test.ts`, event validation/feed coverage
- `npm run lint`
- `npm run verify:backlog-handoff`
