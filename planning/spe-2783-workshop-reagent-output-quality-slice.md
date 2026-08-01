# SPE-2783 — Deterministic workshop reagent-grade output quality

| Field               | Value                                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2783](https://linear.app/spectranoir/issue/SPE-2783/deterministic-workshop-reagent-grade-output-quality)                                                                                                                 |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                                                                                                                      |
| **Related owners**  | [SPE-2768](https://linear.app/spectranoir/issue/SPE-2768/deterministic-workshop-completion-output-quality), [SPE-1056](https://linear.app/spectranoir/issue/SPE-1056/processing-labs-material-transformation-and-containment) |
| **Status**          | **Shipped**                                                                                                                                                                                                                   |
| **Branch**          | `agent/spe-2783-workshop-reagent-output-quality`                                                                                                                                                                              |
| **Base `main` SHA** | `bf479dfd20b1ff6f1b00de824662cd9d718067b2`                                                                                                                                                                                    |

## Goal

Allow explicit caller-owned poor reagent grade to degrade workshop completion
quality without projecting processed materials, consuming inventory, inferring
batch risk, or carrying transient context through the processing tick.

## Boundary

### In scope

- A frozen fail-closed reagent-grade quality resolver
- An optional reagent axis on existing per-work-order quality conditions
- Durable `poor_reagent_grade` receipt reasoning
- Stable input → specialist → room → dependency → equipment → reagent precedence
- Receipt sanitization, authoritative reason labeling, and focused regressions

### Out of scope

- SPE-1056 processed-unit or batch projection
- Reagent inventory consumption, provenance, or contamination inference
- Hidden future failure risk or reagent-driven task failure
- Automatic processing-tick-to-receipt context transport
- New persisted fields, schema versions, hydration rules, or store actions
- Throughput, safety, incidents, UI components, or hook changes

## Acceptance

- [x] Only explicit `poor` reagent grade maps to degraded reagent quality
- [x] Good, omitted, null, and malformed inputs remain neutral
- [x] All earlier quality reasons retain deterministic precedence
- [x] Exact-work-order inputs cannot affect sibling completion receipts
- [x] Receipts persist the new reason without persisting reagent context
- [x] Existing receipts win on replay and nested results remain frozen
- [x] Queue behavior, SPE-2084 projections, safety, and `advanceWeek` remain unchanged

## Deferred

| Item                                   | Owner                    | Why deferred                                              |
| -------------------------------------- | ------------------------ | --------------------------------------------------------- |
| Live processed-unit or batch mapping   | SPE-1056 / adapter child | This slice accepts explicit caller-owned grade only       |
| Reagent inventory consumption          | SPE-1056 follow-up       | Receipt grading does not mutate inventory                 |
| Provenance and contamination inference | Create SPE-1028 child    | No hidden condition is derived from batches               |
| Hidden future failure risk             | Create SPE-1028 child    | Degraded quality is explicit, durable receipt metadata    |
| Automatic week-close mapping           | Create SPE-1028 child    | Requires an explicit batch/work-order projection seam     |
| Reagent-driven task failure            | Create SPE-1028 child    | Degraded completion quality is not terminal failure proof |
| Live facility/staff safety mapping     | SPE-2772                 | Explicit safety mapping seam remains blocked              |

Parent SPE-1028 remains open after this bounded child ships.
