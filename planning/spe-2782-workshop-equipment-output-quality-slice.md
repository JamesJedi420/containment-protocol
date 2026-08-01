# SPE-2782 — Deterministic workshop equipment-condition output quality

| Field               | Value                                                                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2782](https://linear.app/spectranoir/issue/SPE-2782/deterministic-workshop-equipment-condition-output-quality)                                                                                                     |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                                                                                                                |
| **Related owners**  | [SPE-2768](https://linear.app/spectranoir/issue/SPE-2768/deterministic-workshop-completion-output-quality), [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) |
| **Status**          | **Shipped**                                                                                                                                                                                                             |
| **Branch**          | `agent/spe-2782-workshop-equipment-output-quality`                                                                                                                                                                      |
| **Base `main` SHA** | `017e1f92cbc2b64c52f2a91b765fa9325b19497d`                                                                                                                                                                              |

## Goal

Allow explicit caller-owned poor equipment condition to degrade workshop
completion quality without projecting live integrity, redefining canonical
equipment grade, or carrying transient context through the processing tick.

## Boundary

### In scope

- A frozen fail-closed equipment-condition quality resolver
- An optional equipment axis on existing per-work-order quality conditions
- Durable `poor_equipment_condition` receipt reasoning
- Stable input → specialist → room → dependency → equipment precedence
- Receipt sanitization, authoritative reason labeling, and focused regressions

### Out of scope

- Live SPE-877 integrity, deficiency, repair, or durability projection
- SPE-2746/SPE-2750 canonical equipment-grade taxonomy or fabrication outcomes
- Automatic processing-tick-to-receipt context transport
- New persisted fields, schema versions, hydration rules, or store actions
- Throughput, task failure, safety, incidents, UI components, or hook changes

## Acceptance

- [x] Only explicit `poor` equipment condition maps to degraded equipment quality
- [x] Good, omitted, null, and malformed inputs remain neutral
- [x] Existing quality reasons retain deterministic precedence
- [x] Exact-work-order inputs cannot affect sibling completion receipts
- [x] Receipts persist the new reason without persisting equipment context
- [x] Existing receipts win on replay and nested results remain frozen
- [x] Queue behavior, SPE-2084 projections, safety, and `advanceWeek` remain unchanged

## Deferred

| Item                               | Owner                   | Why deferred                                              |
| ---------------------------------- | ----------------------- | --------------------------------------------------------- |
| Live equipment integrity mapping   | SPE-877 / adapter child | This slice accepts explicit caller-owned condition only   |
| Canonical equipment grade          | SPE-2746 / SPE-2750     | Grade is distinct from current equipment condition        |
| Durability and repair consumption  | SPE-877 follow-up       | Quality grading does not mutate equipment lifecycle state |
| Automatic week-close mapping       | Create SPE-1028 child   | Requires an explicit department/equipment/work-order seam |
| Equipment-driven task failure      | Create SPE-1028 child   | Degraded completion quality is not terminal failure proof |
| Live facility/staff safety mapping | SPE-2772                | Explicit safety mapping seam remains blocked              |

Parent SPE-1028 remains open after this bounded child ships.
