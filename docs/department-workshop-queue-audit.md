# Department workshop queue audit

This checklist records the bounded SPE-2745/SPE-1028 queue-and-slot foundation and
the boundaries that later workshop slices must preserve.

## Canonical owners

| Concern                                       | Owner                                                          |
| --------------------------------------------- | -------------------------------------------------------------- |
| Department capabilities and task eligibility  | `src/domain/departmentCapabilities.ts` (SPE-2083)              |
| Coordination delay over workload snapshots    | `src/domain/departmentCoordination.ts` (SPE-2084)              |
| Workshop queue/slot contracts and transitions | `src/domain/departmentWorkshopQueue.ts` (SPE-2745)             |
| Durable work-order/snapshot registries        | `GameState` + `hydrateGame` (SPE-2747)                         |
| Canonical enqueue and queued-lane priority    | `departmentWorkshopQueue.ts` + `gameStore` (SPE-2752)          |
| Registry-level processing tick                | `processDepartmentWorkshopTick` (SPE-2753)                     |
| Caller-owned staging throughput effect        | `resolveDepartmentWorkshopThroughput` (SPE-2775)               |
| Caller-owned workshop operating model         | `resolveDepartmentWorkshopOperatingModel` (SPE-2776)           |
| Caller-owned workshop load pressure           | `resolveDepartmentWorkshopLoadPressure` (SPE-2777)             |
| Caller-owned dependency availability          | `resolveDepartmentWorkshopDependencyAvailability` (SPE-2779)   |
| Dependency-to-quality adapter                 | `resolveDepartmentWorkshopDependencyQuality` (SPE-2781)        |
| Caller-owned certification eligibility        | `resolveDepartmentWorkshopCertificationEligibility` (SPE-2780) |
| Completion outcome receipt                    | `registerDepartmentWorkshopCompletionOutcomes` (SPE-2754)      |
| Completion output quality grade               | `resolveDepartmentWorkshopCompletionQuality` (SPE-2768)        |
| Completion unsafe-processing safety           | `resolveDepartmentWorkshopCompletionSafety` (#3411)            |
| Player-facing workshop surface                | `departmentWorkshopSurfacing.ts` + mirror view/page (SPE-2773) |
| Completion receipt case consumer              | case-local receipt ledger at `advanceWeek` (SPE-2755)          |
| Prerequisite processing plan                  | `prerequisiteProcessing.ts` (SPE-2703 kernel)                  |
| Case-scoped processing-order envelopes        | `prerequisiteProcessingOrders.ts` + `GameState` (SPE-2757)     |
| Global case queue                             | `src/domain/sim/queue.ts`                                      |
| Facility upgrade/effect aggregation           | `src/domain/facility.ts`                                       |
| Campaign week-close ordering                  | `src/domain/sim/advanceWeek.ts`                                |

## Workshop snapshot invariants

- `departmentId` resolves to one validated SPE-2083 definition.
- `slotCapacity` is a non-negative integer.
- `queued`, `active`, and `paused` arrays are dense and preserve caller order.
- A work-order ID occurs in at most one lane.
- Active membership never exceeds slot capacity.
- Every referenced work order exists, targets the same department, and uses one
  of that department's authored task types.
- Progress is a non-negative integer below `requiredWork`.
- Completed work does not remain in any snapshot lane.

Malformed inputs fail closed with a deterministic reason and no synthesized
snapshot. Zero capacity is a valid snapshot but blocks advancement while
returning an immutable copy of the caller state.

## Processing tick

One call to `advanceDepartmentWorkshopQueue` is one abstract processing tick:

1. Fill open slots from the front of `queued`.
2. Resolve caller-owned staging conditions. Explicit adjacent input and output
   staging advances each active item by two units; every omitted, partial,
   remote, or malformed condition preserves the one-unit baseline.
3. Remove completed items in active order.
4. Backfill freed slots from `queued`; replacements begin advancing next tick.

Paused work neither consumes capacity nor advances. Pause/resume operations
preserve progress. Resume requires an open slot and does not silently reorder the
waiting queue.

SPE-2753 owns the registry-level traversal: it sanitizes through the durable
read seam, advances each snapshot once in code-unit department-ID order, and
returns a new frozen registry only when an item actually starts, advances, or
completes. `advanceWeek` calls that pure tick once after final campaign state
preserves the canonical registries and before downstream persisted-record hooks.
Completed definitions remain in the work-order registry but are removed from
all snapshot lanes, so a repeat tick cannot advance them again.

SPE-2775 accepts an optional department-keyed staging map at that same pure
registry tick. A condition applies only to its exact department key. The map is
not persisted, hydrated, or inferred from `FacilityEffect`, room IDs, department
IDs, or map-awareness graphs. `advanceWeek` intentionally omits it and therefore
retains baseline throughput until a later topology owner supplies an explicit
mapping seam. The resolver changes work units only: queue/slot order, paused
work, completion receipts, same-tick backfill timing, and SPE-2084 projections
are unchanged.

SPE-2776 adds a second optional exact-department input for transient workshop
operating mode. `centralized` contributes one staffing work unit;
`distributed` contributes no throughput and exposes
`distributed_isolation` metadata for a future explicit consumer. Centralized
staffing and full SPE-2775 adjacency compose under a hard two-work-unit cap.
Omitted or malformed modes resolve to neutral baseline. Operating mode is not
persisted, does not mutate `slotCapacity`, and is not inferred from rooms,
facilities, staff, equipment, or topology. The isolation classification does
not grade completion safety, modify incident risk, or spawn an unsafe incident.
`advanceWeek` continues to omit both transient maps and runs the same single
baseline workshop tick.

SPE-2777 adds an optional exact-department load-pressure input. Explicit
`overloaded` pressure caps the resolved tick at one work unit, suppressing
SPE-2775 adjacency, SPE-2776 centralized staffing, or their capped combination
without stalling ordinary baseline work. `normal`, omitted, and malformed
pressure preserve the existing throughput result. Callers own overload
classification: the queue does not infer it from staff counts, slot capacity,
facilities, equipment, rooms, or topology. Pressure is not persisted, does not
change queue membership, `slotCapacity`, SPE-2084 workload projections, paused
progress, or completion/backfill timing, and does not create failure or incident
consequences. Distributed breach isolation remains independent metadata.
`advanceWeek` omits all three transient maps and retains one context-free
baseline workshop tick.

SPE-2779 adds optional aggregate dependency availability as a fourth transient
exact-department input. `ready` preserves the resolved throughput;
`degraded` caps it at one work unit and composes explicitly with SPE-2777
overload; `unavailable` returns an intentional
`unavailable-workshop-dependency` block before open slots fill or any active
work advances. Omitted and malformed availability remain neutral. The caller
owns this aggregate classification: the workshop kernel does not traverse
SPE-792, infer facility utilities, storage, staffing, training, logistics, or
topology, or persist dependency metadata. Dependency availability does not
alter slot capacity, SPE-2084 workload projections, completion grades,
cancellation proof, or incident rules. `advanceWeek` omits the dependency map
and retains its existing single baseline tick.

SPE-2780 adds optional exact-department certification context after dependency
availability. Each context contains a caller-owned `basic` or `certified`
profile and per-work-order `standard` or `certified` start requirements.
Standard work starts under either profile; certified-required work starts only
under `certified`. A blocked queue head remains in place and later work is not
bypassed. Certification is checked only while filling or backfilling slots, so
already-active work continues and paused work remains unchanged. When no work
can advance the tick returns `workshop-certification-required`; when other work
advances, the same frozen reason accompanies the advanced snapshot without
duplication. Missing or malformed requirements remain standard, while missing
or malformed profiles cannot satisfy an explicit certified requirement.
Certification context is not persisted or inferred from facilities, upgrades,
staff, skills, clearance, or topology. It does not change throughput, slot
capacity, SPE-2084 workload projections, completion grades, or incident rules.
`advanceWeek` omits the context and retains its existing single baseline tick.

SPE-2781 adds a pure caller-composed adapter from the shipped SPE-2779
dependency availability vocabulary into the existing completion-quality
conditions. Only `degraded` contributes `dependencyCondition: 'poor'`; ready,
unavailable, omitted, and malformed availability remain neutral. Dependency is
the final quality-reason axis after input, specialist, and room, yielding the
durable `poor_dependency_condition` reason only when no earlier axis is poor.
Callers compose the adapter result into the existing exact-work-order quality
map. The processing tick does not carry dependency context into receipt
registration, `advanceWeek` continues to omit quality maps, and no dependency
metadata is persisted. Unavailable dependencies cannot complete in the gated
tick and therefore make no quality claim. This adapter does not change safety,
incident spawning, task terminal state, throughput, or SPE-2084 projections.

The completion bridge runs immediately after that one tick at the same
week-close seam. It maps each newly completed work-order ID to exactly one
persisted `completed` receipt keyed by that ID, carrying the authored
department, case, task type, closing week, SPE-2768 `quality` grade
(`nominal` by default; `degraded` plus a stable reason when caller-owned
condition axes mark poor input, specialist, room, or explicitly adapted
dependency state), and unsafe-processing
`safety` disposition (`safe` by default; `unsafe` plus a stable reason when
caller-owned isolation, ventilation, PPE, or dual-auth axes are poor). Quality
`roomContamination` is not safety contamination: the two grades are orthogonal.
Existing receipts win, so a replay or save/load cannot create a duplicate or
rewrite quality or safety. The receipt is deliberately not a case resolution,
global queue write, or facility modifier. Immediately after register,
the unsafe secondary-incident reconciler consumes sanitized `safety: 'unsafe'`
receipts into one parent-linked follow-up case each via `instantiateFromTemplate`,
gated by durable `departmentWorkshopUnsafeSecondaryIncidents` markers keyed by
work-order ID. Quality `degraded` alone does not spawn. SPE-2755 then consumes
the sanitized durable receipt registry into only the matching non-resolved
case's `departmentWorkshopCompletionWorkOrderIds` ledger. The ledger is sorted
and deduplicated, so it is the case-side receipt-ledger idempotency boundary
across close replays and save/load. Missing/resolved cases, the global queue,
inventory, live topology mapping, and live facility wiring remain outside the
receipt seam.
Live facility/staff projection into quality or safety conditions remains a
later SPE-1028 child (`planning/spe-1028-workshop-live-safety-inputs-slice.md`
for safety) and is **blocked on an explicit mapping seam**. SPE-2781 provides
only an explicit dependency adapter, not live projection. Until those seams
exist: do not invent `FacilityEffect` safety keys, `departmentId → facilityId`
lookups, status/level heuristics, or staff-to-workshop assignment; week-close
must continue to omit `safetyConditionsByWorkOrderId` (and quality maps) so
register stays all-good; `resolveDepartmentWorkshopCompletionSafety` remains
the sole grading authority for caller-owned stubs.

## SPE-2084 compatibility

`projectDepartmentWorkshopWorkload` maps:

| Workshop field            | SPE-2084 workload field |
| ------------------------- | ----------------------- |
| `departmentId`            | `departmentId`          |
| active cases, then queued | `queuedCaseIds`         |
| `slotCapacity`            | `weeklyCapacity`        |
| paused work               | excluded                |

Active case IDs lead the projection because they occupy the current capacity
batch. Duplicate projected case IDs fail closed so coordination delay is never
silently undercounted. Zero slot capacity projects as zero; SPE-2084 remains the
owner of the resulting `zero-department-capacity` coordination block.

The projection is a structural/current-occupancy compatibility view. It does not
fold remaining multi-tick work duration into SPE-2084's coarse weekly-capacity
formula. A later SPE-1028 integration child must define that throughput policy
before treating workshop duration as authoritative coordination delay.

SPE-2747 adds `readDepartmentWorkshopState`, which sanitizes the two optional
GameState registries before this projection is called. The read seam returns
frozen work-order and snapshot maps, preserves lane order, and never advances
work. SPE-2084 still owns coordination delay and receives the same validated
snapshot/work-order contract it consumed before persistence existed.

## Canonical writes

SPE-2752 adds `enqueueDepartmentWorkshopWorkOrder` and
`prioritizeDepartmentWorkshopWorkOrder`. Enqueue appends a valid, eligible
order to an existing department snapshot's queued lane; priority moves an
existing queued order to the front while preserving the remaining lane order.
Both write paths return frozen results, reject duplicate work-order IDs and case
workloads, and replace only the two workshop registries through `gameStore`.
They never fill slots, advance work, change global case-queue priorities, or
depend on a positive slot capacity.

## Persistence and hydration

- `departmentWorkshopWorkOrders` is keyed by embedded work-order ID.
- `departmentWorkshopSnapshots` is keyed by embedded department ID.
- New and legacy games receive fresh empty maps; missing fields do not inherit
  workshop records from a hydration fallback.
- Valid keys are inserted in code-unit order. Integer-index IDs are rejected
  because JavaScript would enumerate them ahead of canonical insertion order.
- Key/ID mismatches, missing departments, unsupported tasks, malformed
  capacity/progress, lane duplicates, and foreign-department membership drop
  only the affected registry sibling.
- Static SPE-2083 department definitions remain authored data and are never
  copied into GameState or manual saves.
- `GAME_STORE_VERSION` and `GAME_SAVE_VERSION` remain unchanged.

## Isolation checks

- SPE-2747 may persist these contracts, but must not add a processing hook.
- SPE-2752 may enqueue or reorder only an existing workshop queued lane; it must
  not start, advance, pause, resume, or complete work.
- `advanceWeek` calls only `processDepartmentWorkshopTick` once; do not add a
  second processing hook or call per-department advancement from another
  week-close path. Its completion bridge consumes that one tick's completion
  IDs only.
- Do not reuse or mutate `GameState.caseQueue`.
- Only the authored open case may consume a completion receipt; do not use this
  case-local ledger to resolve, reprioritize, or otherwise advance case flow.
- `planPrerequisiteProcessing` is a pure draft planner: do not treat its stock
  allocations as inventory reservations or its dependency IDs as persisted work
  order lifecycle state.
- SPE-2757 envelopes are durable, case-owned planner outputs only. They do not
  reserve inventory, create workshop work orders, enqueue work, emit completion
  output, or change the global case queue.
- Do not derive workshop slots from facility effects until a later slice defines
  that integration.
- Do not treat SPE-2776 distributed-isolation metadata as an existing incident
  rule or infer operating mode from persisted facility topology.
- Do not infer SPE-2777 load pressure from staffing, facilities, slot capacity,
  or occupancy, persist it, or turn overload into a zero-work stall.
- Do not infer SPE-2779 dependency availability or duplicate SPE-792 graph
  traversal inside the workshop kernel. Only explicit `unavailable` context may
  produce the intentional dependency block.
- Do not infer SPE-2780 certification from facility levels, upgrades, staff,
  skills, or clearance. Certification gates queued starts only; it does not
  stall already-active work or permit bypassing an ineligible queue head.
- Do not add SPE-2084 delay to SPE-95's global coordination penalty.
- Do not add UI, adjacency, research, or crafting behavior under this kernel.
  SPE-2768 may grade quality and #3411 may grade safety on completion receipts
  from caller-owned conditions only; neither invents live facility/staff wiring
  or inventory mutation. Live safety projection is tracked as Backlog under
  `planning/spe-1028-workshop-live-safety-inputs-slice.md` and must not ship
  without an explicit mapping seam. Secondary-incident spawn from durable
  `unsafe` receipts is owned by the week-close consumer (#3414 /
  `planning/spe-1028-workshop-unsafe-secondary-incident-slice.md`).

## Tests

- `src/test/departmentWorkshopQueue.test.ts`
- `src/test/departmentWorkshopPersistence.test.ts`
- `src/test/departmentWorkshopUnsafeIncident.test.ts`
- `src/test/departmentWorkshopWrites.test.ts`
- `src/test/prerequisiteProcessing.test.ts`
- `src/test/prerequisiteProcessingOrders.test.ts`
- `src/test/departmentCoordination.test.ts`
- `src/test/missionIntakeDepartmentCapabilities.integration.test.ts`
- `src/test/queue.test.ts`
- `src/test/facility.test.ts`
- `src/test/sim.coordinationFriction.test.ts`
- `test/boundary-enforcement.test.ts`
