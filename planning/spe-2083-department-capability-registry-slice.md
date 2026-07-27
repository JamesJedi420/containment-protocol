# SPE-2083 — Department capability registry and case-to-department resolver

| Field               | Value                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2083 — Department capability registry and case-to-department resolver](https://linear.app/spectranoir/issue/SPE-2083/department-capability-registry-and-case-to-department-resolver) |
| **Status**          | **Shipped**                                                                                                                                                                               |
| **Parent**          | [SPE-1320](https://linear.app/spectranoir/issue/SPE-1320)                                                                                                                                 |
| **Branch**          | `agent/spe-2083-department-capability-registry`                                                                                                                                           |
| **Base `main` SHA** | `e3eee16a032b2fb9a6fecd6b2fd592245cf0d3e8`                                                                                                                                                |

## Goal

Add a pure authored department registry and deterministic case resolver that
returns one capability-eligible primary department, ordered supporting
departments, or an explicit low-priority misfit route.

## Ownership audit

| Concern                                  | Existing owner reused by this slice                                |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Department identity, aliases, linked IDs | `authorityGraph.ts` department nodes and normalization conventions |
| Canonical case tags and categories       | `models.ts` and `missionIntakeRouting.ts`                          |
| Registry validation                      | `specialistUnits.ts` and authored registry validators              |
| Deterministic ordering                   | Code-unit ordering used by mission intake and authorization        |
| Mission composition seam                 | Pure read adapter in `missionIntakeRouting.ts`                     |
| Team candidate ranking                   | Existing mission-routing shortlist remains the sole owner          |

## Scope

- Define authored department capabilities, task types, review authorities,
  limits, doctrine tags/bias, reputation, funding tier, headquarters, and
  failure modes.
- Validate missing or duplicate IDs, malformed enumerations and numeric fields,
  invalid capability limits, fallback references, and conflicting authority
  aliases/linked department IDs.
- Resolve canonical case category and tags to a capability-gated primary,
  deterministic supporting order, or explicit low-priority/stigmatized fallback.
- Resolve department identity through authority node IDs, aliases, and linked
  department registry IDs without mutating the authority graph.
- Expose one read-only mission-intake composition seam.
- Prove the seam does not change SPE-2088 authorization or canonical team
  candidate ranking.

## Out of scope

- UI
- Department queues, capacity, workload, or disputes (SPE-2084)
- Persistence, save migration, or schema changes
- Council routing or authorization bypass
- Unit readiness, fatigue, lifecycle, or candidate ranking
- Faction standing, commerce, or broader department entity fields
- Changes to SPE-2088 authorization semantics

## Acceptance

- [x] Hazard-tagged cases prefer a matching specialist department over a
      generic capability peer.
- [x] A department without the required capability cannot become primary.
- [x] Primary ties and supporting departments use deterministic code-unit order.
- [x] Capability gaps produce an explicit deterministic fallback route with
      low-priority and stigma metadata.
- [x] Duplicate IDs, malformed capabilities/limits, missing fallback, and
      authority alias conflicts fail closed.
- [x] Authority node IDs, aliases, and linked department IDs resolve to the
      same authored department.
- [x] Legacy/empty tag packets and repeated replay produce stable results.
- [x] Department resolution does not alter team candidate ranking or SPE-2088.

## Validation

- Targeted department registry/resolver and mission-intake integration tests
- Existing department authorization and mission-routing tests
- `npm run lint`
- `npm run test:run`
- `npm run format:check`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                      | Owner                 | Boundary                                                                                                                         |
| ----------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Queue capacity and cross-department load  | SPE-2084 / SPE-1028   | SPE-2084 consumes this slice's assignments plus caller-owned snapshots; durable workshop queues remain owned by SPE-1028.        |
| Persisted department entity/runtime state | SPE-1320 or new child | Registry and resolver remain authored, pure, and read-only.                                                                      |
| Department-to-unit authorization changes  | SPE-2088              | Existing permission-edge handoff semantics remain unchanged.                                                                     |
| Distributed multi-cell unit content pack  | SPE-2086              | The existing `distributed` unit taxonomy remains available; this department-routing slice does not author deployable unit packs. |
