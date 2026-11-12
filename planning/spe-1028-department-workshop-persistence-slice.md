# SPE-2747 — Durable department workshop state and hydration

| Field               | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2747](https://linear.app/spectranoir/issue/SPE-2747/durable-department-workshop-state-and-hydration) |
| **Status**          | **Shipped**                                                                                               |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)  |
| **Branch**          | `agent/spe-2747-department-workshop-persistence`                                                          |
| **Base `main` SHA** | `8540dc15b9399e380bc553ede3b60c586565e017`                                                                |

## Goal

Persist the SPE-2745 workshop kernel's work orders and per-department snapshots
as canonical, legacy-safe campaign state without adding processing orchestration
or broadening workshop mechanics.

## Ownership audit

| Concern                         | Existing owner reused by this slice                     |
| ------------------------------- | ------------------------------------------------------- |
| Work-order/snapshot contracts   | `src/domain/departmentWorkshopQueue.ts` / SPE-2745      |
| Department identity/task policy | `src/domain/departmentCapabilities.ts` / SPE-2083       |
| Coordination projection         | `projectDepartmentWorkshopWorkload` / SPE-2084 boundary |
| Canonical hydration             | `hydrateGame` in `src/app/store/runTransfer.ts`         |
| Manual saves                    | `src/app/store/saveSystem.ts`; save version remains `1` |
| Store reset                     | `createStartingState` through `gameStore.reset()`       |

## Boundary

- Add optional `GameState.departmentWorkshopWorkOrders` and
  `GameState.departmentWorkshopSnapshots` registries.
- Supply fresh empty registries in starting state and for missing legacy fields.
- Sanitize embedded IDs, registry keys, department/task ownership, capacity,
  progress, lane membership, and cross-department references.
- Drop malformed siblings independently and store valid entries in code-unit key
  order; reject integer-index keys whose JavaScript enumeration order would
  override canonical insertion order.
- Return frozen copies without mutating or aliasing import/fallback inputs.
- Expose `readDepartmentWorkshopState` as the GameState-shaped read seam.
- Preserve save/store envelope versions and avoid persisting static SPE-2083
  department definitions.

No queue advancement, enqueue API, processing tick, week-close hook, UI,
facility effect, global case queue, adjacency, quality, safety, authorization,
or prerequisite planning is in this slice.

## Acceptance

- [x] New and hydrated legacy state contains empty workshop registries.
- [x] Valid workshop state round-trips through manual save serialization.
- [x] Malformed entries, key/ID mismatches, invalid progress/capacity, missing
      departments, and foreign-department membership fail closed per sibling.
- [x] Registry ordering and replay are deterministic across input object order.
- [x] Hydration/read access does not mutate inputs or inherit workshop fallback
      records when legacy fields are absent.
- [x] Hydrated snapshots remain consumable by the SPE-2084 projection.
- [x] Store reset returns fresh empty workshop registries.
- [x] Static department definitions are not added to `GameState` or save data.
- [x] Global case queues and week-close orchestration remain unchanged.

## Validation

- `npm run test:run -- src/test/departmentWorkshopPersistence.test.ts src/test/departmentWorkshopQueue.test.ts src/app/store/saveSystem.test.ts src/app/store/gameStore.test.ts`
- `npm run lint`
- `npm run format:check`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`
- `npm run test:run`

## Deferred

| Item                                       | Suggested owner       | Why deferred                                                                                      |
| ------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------- |
| Enqueue/write API                          | Future SPE-1028 child | SPE-2747 adds a read/persistence seam only; creation and priority policy need a bounded contract. |
| Week-close workshop advancement            | Future SPE-1028 child | Must specify ordering and idempotency separately from durable ownership.                          |
| Duration-aware coordination throughput     | Future SPE-1028 child | SPE-2084 retains its current occupancy/capacity approximation.                                    |
| Adjacency, quality, safety, facility rules | Future SPE-1028 child | These require independent gameplay inputs and acceptance slices.                                  |
| SPE-2703 prerequisite planning             | SPE-2703              | Automatic prerequisite order creation is explicitly outside this persistence slice.               |

Parent SPE-1028 remains Backlog because its processing, adjacency, quality,
safety, centralization, dependency, upgrade, and visible-planning acceptance
criteria remain open.
