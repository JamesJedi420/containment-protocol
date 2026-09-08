# SPE-877 child — Additional containment-class inspection kernel (interlock)

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                            |
| **Linear**          | [SPE-2865](https://linear.app/spectranoir/issue/SPE-2865/additional-containment-class-inspection-kernel-interlock)              |
| **GitHub issue**    | [#3603](https://github.com/JamesJedi420/containment-protocol/issues/3603)                                                       |
| **Pull request**    | [#3602](https://github.com/JamesJedi420/containment-protocol/pull/3602)                                                         |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog** |
| **Branch**          | `cursor/spe-877-interlock-inspection-kernel-2924`                                                                               |
| **Base `main` SHA** | `5bd36129a906c252d513505ffb679d3c988f1427`                                                                                      |

## Boundary

One extra frozen containment class (`interlock`) copies the SPE-2864 / SPE-2860 / week-close kernel:
cadence spec, deficiency continuations, week-close last-inspection stamp, inspect/deficiency
`classId` union, and fail-closed unknown class. Do not add store/UI commands, SPE-1027 consume,
workshop live mapping, mutation stations, or an interlock barrier zone. Do not couple interlock
into `blast_door_membrane`.

## Authored class

`CONTAINMENT_CLASS_IDS`: `blast_door`, `pressure_seal`, `interlock`.

| Field                           | `blast_door` (unchanged)    | `pressure_seal` (unchanged) | `interlock`             |
| ------------------------------- | --------------------------- | --------------------------- | ----------------------- |
| Authored interval               | 4 weeks                     | 3 weeks                     | 2 weeks                 |
| Intensification bucket          | 2                           | 2                           | 2                       |
| Compensating control            | `secondary_interlock_watch` | `backup_gasket_watch`       | `dual_circuit_watch`    |
| Week-close due continuation     | `compensating_continue`     | `compensating_continue`     | `compensating_continue` |
| Week-close overdue continuation | `hard_stop`                 | `hard_stop`                 | `hard_stop`             |

Compensating control is a new authored id (`dual_circuit_watch`), not `secondary_interlock_watch`.
Mixed class/control pairings fail closed (`malformed_integrity` / event validation). Unknown class
sentinel retargets from `interlock` to `airlock` (`invalid_class`). SPE-2861 spare-part gate and
SPE-2862 technician stabilization remain blast-door-only.

## Week-close and barrier

Week-close stamps use `parsed.integrity.classId`. Evaluate against the closing week
(`sourceState.week`). `persistContainmentBarrierCoupling` no-ops unless the instance class is
`blast_door`. Barrier resolver still parses against `blast_door_membrane` only.

## Events and hydration

Inspect and deficiency payloads accept `classId: 'blast_door' | 'pressure_seal' | 'interlock'` and
the matching authored control. Stabilization and barrier-change events stay `blast_door`. Valid
inspect events hydrate as history without replaying mutations. Generic transitions still reject
class relabel (`immutable_identity`). `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` unchanged.

## Deferred

| Item or mechanic                                           | Owner or prerequisite                                                                     | Reason                                                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Interlock barrier zone                                     | later SPE-877 child                                                                       | Membrane coupling stays `blast_door` only                                                  |
| Pressure-seal barrier zone                                 | later SPE-877 child                                                                       | Membrane coupling stays `blast_door` only                                                  |
| SPE-1027 stock consume of a named part                     | SPE-1027 / later child                                                                    | Suitability stays blast-door-only; no inventory debit                                      |
| Live workshop integrity mapping                            | [SPE-2866](https://linear.app/spectranoir/issue/SPE-2866/live-workshop-integrity-mapping) | Shipped as the next SPE-877 child; this interlock kernel does not compose workshop quality |
| Mutation stations / integrity labor                        | later SPE-877 child                                                                       | SPE-113 remains design-only                                                                |
| Store/UI inspect or deficiency commands                    | later SPE-877 child                                                                       | Week-close remains the production inspect path                                             |
| Ready / stow                                               | SPE-1658                                                                                  | Access-state layer                                                                         |
| Salvage / Auto-Scrap                                       | SPE-1055 / SPE-2749                                                                       | Adjacent                                                                                   |
| Inspect/deficiency `intervalWeeks` vs authored cadence max | later SPE-877 child                                                                       | Hydrate keeps event provenance; authored-max tightening deferred from SPE-2864 Codex P1    |

## Acceptance

- Frozen registry exposes `blast_door`, `pressure_seal`, and `interlock`; unknown class (`airlock`) stays `invalid_class`
- Interlock cadence intensifies from `cycleCount`; identical history yields identical interval
- Due / overdue / sticky deficiency and week-close stamp work for `interlock`
- Fail-closed unknown class stays; blast-door and pressure-seal regression stays green
- Event validation rejects mixed class/control pairings
- Barrier writer does not couple `interlock` into `blast_door_membrane`
- Inspect/deficiency events hydrate as history without replaying mutation
- Generic transitions still reject class relabel (`immutable_identity`)
- Parent SPE-877 remains Backlog

## Linear issue body

**Title:** Additional containment-class inspection kernel (interlock)

**Parent:** SPE-877

**Goal:** Add one extra frozen containment class (`interlock`) to the SPE-2860 / week-close inspection kernel. Copy cadence spec, deficiency continuations, week-close stamp, inspect/deficiency `classId` union, and fail-closed unknown class. Do not add store/UI commands, SPE-1027 consume, workshop live mapping, mutation stations, or an interlock barrier zone. Do not couple into `blast_door_membrane`.

**Acceptance:** Authored 2-week cadence and `dual_circuit_watch`; due / overdue / sticky / week-close / hydrate for `interlock`; unknown class remains `invalid_class` with sentinel `airlock`; blast-door and pressure-seal regression; mixed class/control rejection; barrier writer does not couple interlock into `blast_door_membrane`; class relabel still `immutable_identity`; parent SPE-877 stays Backlog.

## Validation

- Targeted Vitest: `src/test/containmentClassInspection.contract.test.ts`, `src/test/containmentClassWeekClose.contract.test.ts`, event validation/feed coverage, hydrate cases in `src/test/equipmentInstance.contract.test.ts`, barrier kernel, spare-part regression
- `npm run lint`
- `npm run verify:backlog-handoff`
