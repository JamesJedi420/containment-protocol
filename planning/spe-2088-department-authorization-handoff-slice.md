# SPE-2088 — Department authorization to deployable unit handoff

| Field               | Value                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2088 — Department authorization to deployable unit handoff](https://linear.app/spectranoir/issue/SPE-2088/department-authorization-to-deployable-unit-handoff) |
| **Status**          | **Shipped**                                                                                                                                                         |
| **Parent**          | [SPE-1320](https://linear.app/spectranoir/issue/SPE-1320)                                                                                                           |
| **Branch**          | `agent/spe-2088-department-authorization-handoff`                                                                                                                   |
| **Base `main` SHA** | `9cc460302625bf3f6c3c94a300219b41073463e3`                                                                                                                          |

## Goal

Consume one sanitized authority-graph `permission` edge as an explicit department
authorization gate for one bounded mission-to-specialist-unit handoff.

## Ownership audit

| Concern                                   | Existing owner reused by this slice                                      |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Department identity and aliases           | `authorityGraph.ts` department nodes, aliases, and linked department IDs |
| Permission evidence                       | `resolveAuthorityGraphConsequences` over a sanitized graph               |
| Legacy graph hydration                    | `sanitizeAuthorityGraphState`                                            |
| Deployable unit identity and availability | `specialistUnits.ts` registry, lifecycle, and mission-fit resolver       |
| Mission composition seam                  | `missionIntakeRouting.ts`                                                |
| Week boundary                             | `advanceWeek.ts`; no mid-week persistence or mutation                    |

## Scope

- Resolve the authorizing department and target unit through sanitized authority
  graph references.
- Select at most one eligible `permission` edge in deterministic code-unit ID
  order.
- Require an explicit grant, approver provenance, active authorization window,
  and an available mission-fit specialist unit.
- Return an immutable audit record containing mission, department, unit,
  approver, clearance, scope, window, and permission edge.
- Preserve existing mission candidate readiness and SPE-2725
  `mission_access` routing behavior.
- Cover save hydration and week-boundary evaluation without adding a persisted
  handoff collection.

## Out of scope

- UI
- Council-direct routing or bypass
- Department queue capacity (SPE-2084)
- Secrecy/media, resource forcing, negotiation, faction standing, or commerce
- Team-readiness math or candidate ranking
- Changes to SPE-2725 mission-access behavior

## Acceptance

- [x] An explicit sanitized permission grant approves one handoff.
- [x] Missing or denying authorization blocks deployment.
- [x] The approved record contains department, unit, approver, mission scope,
      clearance, active window, and edge audit data.
- [x] Department/unit aliases and linked registry identifiers resolve
      deterministically.
- [x] Missing references, invalid unit registries, malformed legacy graphs,
      hidden/contradicted edges, missing approvers, expired windows, and
      unavailable units fail closed.
- [x] Save hydration and deterministic replay preserve the result.
- [x] Authorization evaluation changes only when the campaign week crosses the
      declared window; it does not mutate routing mid-week.
- [x] Canonical team candidate ranking and SPE-2725 results are unchanged.

## Expected files

- `src/domain/authorityGraph.ts`
- `src/domain/authorityGraphPersistence.ts`
- `src/domain/missionIntakeRouting.ts`
- `src/test/authorityGraphPersistence.test.ts`
- `src/test/missionIntakeDepartmentAuthorization.integration.test.ts`
- `planning/spe-2088-department-authorization-handoff-slice.md`
- Bounded authority/mission-routing documentation

## Validation

- Targeted authority persistence, specialist-unit, department handoff, mission
  routing, and week-close tests
- `npm run lint`
- `npm run test:run`
- `npm run format:check`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                    | Owner                  | Boundary                                                                             |
| --------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| Department institutional queue overload | SPE-2084               | This slice only gates explicit permission and target-unit availability.              |
| Council or executive bypass             | SPE-2089               | This slice requires the department grant and does not add bypass modes.              |
| Persisted handoff history               | Create child if needed | This slice returns an immutable audit record but adds no new save-schema collection. |
