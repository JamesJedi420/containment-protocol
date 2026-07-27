# SPE-2084 — Cross-department coordination and workload disputes

| Field               | Value                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2084 — Cross-department coordination and workload disputes](https://linear.app/spectranoir/issue/SPE-2084/cross-department-coordination-and-workload-disputes) |
| **Status**          | **Shipped**                                                                                                                                                         |
| **Parent**          | [SPE-1320](https://linear.app/spectranoir/issue/SPE-1320)                                                                                                           |
| **Branch**          | `agent/spe-2084-cross-department-coordination`                                                                                                                      |
| **Base `main` SHA** | `66e7d1541fbcf76a28e0b79143203678ae0754bc`                                                                                                                          |

## Goal

Add a pure evaluator that consumes SPE-2083 department assignments and
caller-owned workload snapshots, then returns an immutable `aligned`,
`delayed`, `disputed`, or `blocked` coordination result with deterministic
delay and structured reason codes.

## Ownership audit

| Concern                                      | Existing owner reused by this slice                                       |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Department identity and ordered assignments  | `departmentCapabilities.ts` / SPE-2083                                    |
| Doctrine, reputation, and fallback routes    | Authored SPE-2083 department definitions                                  |
| Queue ordering convention                    | Ordered case IDs used by `sim/queue.ts`; snapshots remain caller-owned    |
| Canonical mission composition                | Read-only adapter in `missionIntakeRouting.ts`                            |
| Durable department workshop queues           | Deferred to SPE-1028                                                      |
| Interdisciplinary scientific conflict policy | Deferred to SPE-1200                                                      |
| Global command-coordination friction         | SPE-95 in `advanceWeek.ts`; observed as a separate, unchanged global lane |

## Scope

- Define validated read-only department workload snapshots with ordered case
  IDs and non-negative integer weekly capacity.
- Consume one SPE-2083 matched, fallback, or blocked assignment without
  re-resolving department eligibility.
- Revalidate custom registry fallback identities with the same optional
  authority graph consumed by SPE-2083.
- Fail closed for malformed assignments, duplicate departments, invalid
  registries, missing/duplicate/malformed workload snapshots, missing
  department definitions, and zero capacity.
- Derive queue wait from each department's ordered snapshot. If the evaluated
  case is already queued, use its existing position; otherwise evaluate it as
  the next item.
- Treat departments as parallel work lanes: the slowest department's wait is
  the queue delay, and equal bottlenecks remain visible in code-unit ID order.
- Add one deterministic delay for an SPE-2083 fallback route, one for any
  authored doctrine dispute, and one when shared work includes a department
  below the bounded reputation threshold.
- Publish the bounded calibration and explicit doctrine-conflict pair table
  beside the evaluator so authoring and tests observe the same policy.
- Expose a read-only mission-intake seam that composes canonical case
  assignment with caller-provided workload snapshots.
- Return immutable structured reason codes without adding player-facing copy.

## State and delay contract

Precedence is `blocked` → `disputed` → `delayed` → `aligned`.

- `blocked`: the SPE-2083 route is blocked or required evaluator inputs fail
  validation. Delay is zero because no schedulable coordination result exists.
- `disputed`: at least one authored doctrine pair conflicts. Queue,
  reputation, and fallback delay remain measurable in `delayWeeks`.
- `delayed`: the route is valid and undisputed, but queue capacity, fallback,
  or low-reputation cooperation adds delay.
- `aligned`: all required snapshots are valid, capacity is available, and no
  doctrine/reputation/fallback delay applies.

Queue delays are not summed because department work proceeds in parallel.
Doctrine conflicts add one coordination week regardless of the number of
conflicting pairs; every pair remains present as an ordered reason.

## Out of scope

- UI or player-facing text
- Durable department queue or workshop state (future SPE-1028 child). SPE-2745
  supplies a caller-owned pure queue/slot kernel and workload projection only.
- Scientific model selection, synthesis, or interdisciplinary case persistence
  (SPE-1200)
- Global case-queue mutation, priority semantics, or insertion order
- Week-close hooks or ordering
- SPE-95 global coordination-friction activation or outcome downgrade
- SPE-2088 authorization, council routing, unit readiness, or team ranking
- Factions, commerce, persistence, save migration, or schema changes

## Acceptance

- [x] Compatible and conflicting department pairs return aligned/disputed
      states with ordered reason codes.
- [x] A full or overloaded department queue adds deterministic delay.
- [x] Equal queue loads expose all bottlenecks in code-unit order and replay
      identically across input order.
- [x] Duplicate departments, missing workload, zero capacity, malformed
      snapshots, and duplicate relevant snapshots fail closed.
- [x] Fallback routes remain deterministic and delayed rather than becoming
      eligible primary assignments.
- [x] The evaluator does not mutate assignments, registries, snapshots,
      mission state, or global queue state.
- [x] The mission read seam leaves team ranking unchanged.
- [x] Authority aliases used by custom fallback routes remain valid through
      coordination revalidation.
- [x] Existing SPE-2088 authorization, global queue, and SPE-95 friction tests
      remain green.

## Expected files

- `src/domain/departmentCoordination.ts`
- `src/domain/departmentCapabilities.ts`
- `src/domain/missionIntakeRouting.ts`
- `src/test/departmentCoordination.test.ts`
- `src/test/missionIntakeDepartmentCapabilities.integration.test.ts`
- `src/test/missionIntakeDepartmentAuthorization.integration.test.ts`
- `src/test/queue.test.ts`
- `src/test/sim.coordinationFriction.test.ts`
- `planning/spe-2084-cross-department-coordination-slice.md`
- `planning/spe-2083-department-capability-registry-slice.md`
- `docs/mission-intake-triage-routing-audit.md`

## Validation

- Targeted SPE-2084 evaluator and mission-intake integration tests
- Existing SPE-2083, SPE-2088, global queue, team-ranking, and SPE-95 tests
- `npm run lint`
- `npm run test:run`
- `npm run format:check`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                     | Owner          | Boundary                                                                                                               |
| ---------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Caller-owned workshop queue/slot kernel  | SPE-2745       | Projects active occupancy plus queued cases into this evaluator without giving SPE-2084 queue mutation ownership.      |
| Durable department workshop queues       | SPE-1028 child | SPE-2084 accepts ordered queue/capacity snapshots but does not store, hydrate, enqueue, prioritize, or advance them.   |
| Interdisciplinary scientific case policy | SPE-1200       | SPE-2084 reports authored doctrine conflict only; it does not choose models, synthesize evidence, or persist disputes. |
| Persisted coordination history           | New child      | Results are immutable read models; add a scoped child before introducing save state or week-close mutation.            |
