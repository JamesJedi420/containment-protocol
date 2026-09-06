# Spare-part suitability on SPE-2851 repair

| Field               | Value                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                      |
| **Linear**          | SPE-877 child — **no ID until Linear MCP assigns one**. Do not invent a SPE number. Create under [SPE-877](https://linear.app/spectranoir/issue/SPE-877). |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                           |
| **Branch**          | `cursor/spare-part-suitability-repair-68fb`                                                                                                               |
| **Base `main` SHA** | `dfe2ab52696c44ae6903e9ad46fc7c13ee7a1e5f`                                                                                                                |

## Boundary

Gate [SPE-2851](https://linear.app/spectranoir/issue/SPE-2851) `repairStoredEquipmentInstanceCondition` with one typed spare-part suitability check. The check **reads** [SPE-2860](https://linear.app/spectranoir/issue/SPE-2860) `containmentIntegrity.deficiency` and SPE-2851 `damaged` without changing the condition-flip mechanic, inventory, lots, `damagedEquipmentQueue`, or return/re-agg fail-closed-until-repaired behavior.

One named part requirement: `blast_door` requires `blast_door_hinge_seal`. Missing or unsuitable parts fail closed with no mutation. A suitable part allows the existing SPE-2851 `damaged` → `operational` flip only. Repair must not clear sticky hard-stop and must not treat a hard-stop identity as in-service because condition became operational. Compensating `secondary_interlock_watch` stays temporary and unchanged.

Ordinary stored damaged identities **without** `containmentIntegrity` stay ungated (existing SPE-2851 callers omit the part). No SPE-1027 stock consume. No new persisted field or event unless hydration evidence requires one (this slice does not). Keep `manual_condition_repair`.

## Suitability contract

Pure evaluator in `src/domain/sparePartSuitability.ts`. Discriminated result; no throw, no `null`, no default continue, no inventory mutation:

- ordinary (omitted class) → `{ ok: true, required: false }`
- `blast_door` + valid deficiency + spare part `blast_door_hinge_seal` → `{ ok: true, required: true, sparePartId: 'blast_door_hinge_seal' }`
- omitted/null part when required → `{ ok: false, code: 'missing_part' }`
- wrong or malformed part when required → `{ ok: false, code: 'unsuitable_part' }`
- unknown class → `{ ok: false, code: 'invalid_class' }`
- required class with missing/malformed deficiency → `{ ok: false, code: 'malformed_deficiency' }`

Deficiency kind does **not** select a different part. Hard-stop, compensating continue, and `none` share the one named requirement. Repair never writes deficiency.

## Determinism and compatibility

- repair still lives in `src/domain/equipmentInstance.ts` beside SPE-2851;
- success still calls `applyEquipmentInstanceTransition` with `condition: 'operational'` and the existing integrity snapshot;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version stay unchanged;
- store/UI may pass the frozen required part ID for `blast_door` (typed name, not stock).

## Deferred

| Item or mechanic                              | Owner or prerequisite  | Reason                                               |
| --------------------------------------------- | ---------------------- | ---------------------------------------------------- |
| Stabilization / deficiency clear              | later SPE-877 child    | Hard-stop stays sticky; repair must not clear it     |
| Breach / `barrier_integrity` propagation      | later SPE-877 child    | SPE-1387 pairing; after typed deficiency + this gate |
| Additional classes (pressure seal, interlock) | later SPE-877 child    | One named part / one class in this slice             |
| Week-close last-inspection auto-advance       | later SPE-877 child    | Schema kernel already shipped in SPE-2860            |
| SPE-1027 stock consume of the named part      | SPE-1027 / later child | This child is suitability only — no inventory debit  |
| Live workshop integrity mapping               | SPE-877 / SPE-1028     | SPE-2782 stays caller-owned                          |
| Ready / stow                                  | SPE-1658               | Access-state layer                                   |
| Salvage / Auto-Scrap                          | SPE-1055 / SPE-2749    | Adjacent                                             |

## Acceptance

- Frozen registry exposes exactly one named spare part: `blast_door_hinge_seal` for `blast_door`
- Unsuitable / missing part fail-closed with no mutation
- Suitable part allows SPE-2851 condition flip only
- Hard-stop remains sticky after repair; compensating continue unchanged
- SPE-2851 existing ordinary success/fail-closed cases still pass
- No new persisted field or event; parent SPE-877 remains Backlog
- No invented Linear child ID in docs

## Linear issue body

Paste as a **new Linear child of SPE-877** when MCP is `ready`. Do not invent an ID in the repo until Linear assigns one.

**Title:** Spare-part suitability on SPE-2851 repair

**Parent:** SPE-877

**Goal:** Gate stored condition repair with one typed spare-part suitability check that reads SPE-2860 deficiency and SPE-2851 damaged. Fail-close unsuitable/missing parts. Suitable part allows the existing condition flip only. Do not clear sticky hard-stop.

**Scope:** Frozen `blast_door` → `blast_door_hinge_seal` requirement. Pure evaluator plus gate on `repairStoredEquipmentInstanceCondition` / `resolveStoredEquipmentInstanceConditionRepair`. Ordinary identities without containment class remain ungated. No inventory/lots/`damagedEquipmentQueue` mutation. No SPE-1027 consume. No stabilization/clear. No barrier-integrity. No extra classes. No week-close inspect advance.

**Constraints:** Do not change SPE-877 parent Goal. Do not change SPE-2860 cadence/deficiency kernel semantics. Keep `equipment.instance_condition_repaired` / `manual_condition_repair`. Do not fold SPE-471, SPE-1387, SPE-1658, SPE-1027 stock, SPE-1055 salvage, or generic MMS. Player copy only if the existing repair confirm must name the part.

**Acceptance criteria:**

- One named part requirement for `blast_door`
- Missing/unsuitable part: fail-closed, no mutation
- Suitable part: SPE-2851 `damaged` → `operational` only; integrity snapshot unchanged
- Hard-stop still sticky; `inService` stays false after operational condition
- Compensating continue unchanged and still temporary
- SPE-2851 ordinary success/fail-closed cases still pass
- Parent SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/sparePartSuitability.contract.test.ts`, SPE-2851/SPE-2860-adjacent cases in `src/test/equipmentInstance.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
