# SPE-2851 — Stored Equipment-Instance Condition Repair (Damaged → Operational)

| Field      | Value                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Status** | **Recently shipped**                                                                                                     |
| **Linear** | [SPE-2851](https://linear.app/spectranoir/issue/SPE-2851/stored-equipment-instance-condition-repair-damaged-operational) |
| **Parent** | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control)              |
| **Branch** | `jamesdyedbq/spe-2851-instance-condition-repair`                                                                         |

## Boundary

This slice adds an explicit player command that converts one stored equipment identity from
`damaged` to `operational`. It is the implementable substitute for unsafe damaged-aggregate credit
deferred from SPE-2848 / SPE-2850. After repair, existing catalog re-aggregation and fabricated
lot-return commands succeed when their other gates pass. Damaged copies remain fail-closed on those
paths until repaired.

Success flips only that identity's condition via `applyEquipmentInstanceTransition`. Location,
payload/dose, `fabricationOrigin`, inventory, fabricated lots, recovery, loadouts, and
`damagedEquipmentQueue` stay unchanged.

Missing, equipped, already-operational, unsafe, malformed, and recovery-claimed identities fail
closed with no mutation. Repeat calls on an already-operational identity are idempotent (no second
event). Auto-Scrap stays aggregate-only.

## Determinism and compatibility

- repair lives in `src/domain/equipmentInstance.ts` beside existing instance transitions;
- successful repairs emit `equipment.instance_condition_repaired` with reason
  `manual_condition_repair`, previous condition `damaged`, and resulting condition `operational`;
- Equipment UI surfaces `canRepairCondition` for damaged stored identities with accessible
  confirmation distinct from return, re-aggregation, and destruction;
- Combat Stim dose/overdrive are not repair eligibility gates beyond identity validity; remaining
  doses are never invented or changed;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version remain unchanged
  unless hydration evidence requires otherwise.

## Deferred

| Item or mechanic                          | Owner or prerequisite | Reason                                                                                           |
| ----------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| Repair economics / spare-part suitability | later SPE-877 child   | After inspection/deficiency kernel; not SPE-2851                                                 |
| Inspection cadence / deficiency control   | SPE-2860              | Blast-door kernel — `planning/spe-2860-containment-class-inspection-cadence-deficiency-slice.md` |
| Stabilization / deficiency clear          | later SPE-877 child   | Hard-stop is sticky in SPE-2860                                                                  |
| Barrier-integrity / breach propagation    | later SPE-877 child   | After typed deficiency                                                                           |
| Direct damaged return into aggregate      | rejected              | Inventory is a single count; queue is a flag                                                     |
| Partial/depleted dose lot return          | SPE-2852 **Done**     | Policy confirmed fail-closed; disposal/recovery remain                                           |
| Cross-lot grade migration                 | SPE-2827 child        | Return still targets exact source lot                                                            |
| Automated lot or instance selection       | SPE-2749 child        | Auto-Scrap remains aggregate-only                                                                |
| Readiness / custody                       | SPE-1658              | Broader lifecycle authority                                                                      |
| Recovery balancing                        | SPE-1055              | Outputs and thresholds stay separately owned                                                     |

## Validation

- success repair ordinary + Combat Stim (condition operational; inventory/lots/queue unchanged);
- Combat Stim remaining dose unchanged after repair;
- fail-closed: missing, equipped, already-operational, recovery-claimed, malformed;
- before repair, return/re-agg still reject damaged with existing reason codes;
- after repair, return/re-agg succeed when other gates pass;
- idempotent second call; event + hydration; UI eligibility/confirmation;
- focused tests, lint, repository verifiers, formatting, and targeted Vitest.
