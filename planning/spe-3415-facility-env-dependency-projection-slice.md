# SPE-3415 — Project environmental operational context into facility support dependencies

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-3415](https://linear.app/spectranoir/issue/SPE-3415)                                      |
| **Parent**        | [SPE-792](https://linear.app/spectranoir/issue/SPE-792) — Backlog                             |
| **Umbrella**      | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                           |
| **Branch**        | `jamesdyedbq/spe-3415-project-environmental-operational-context-into-facility`                 |
| **Base main SHA** | `3ab38cf8ef70d981d07223f7d07d49a602892ff2`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3415  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=2f4da2742bdfd3fe18cc1319`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3390 (Linear **Done**, PR #4419 @ `a5d0ce0a`)
- Clean `main` @ `3ab38cf8`, no open PRs
- Recommended next named no concrete eligible SPE-1052 leaf (parent only)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent |
| SPE-792 | High priority; open child SPE-3415 — parent umbrella |
| SPE-3390 | Done / merged — handoff stale only |
| SPE-3439 / SPE-3441 / SPE-3451 / SPE-3452 / SPE-3385 | Open `blockedBy` |
| SPE-3471 | Eligible SPE-1090 alternate (`blockedBy` SPE-2273 Done); deferred so facility SPE-3415 ships first after SPE-3390 unlock |
| **SPE-3415** | Childless; `blockedBy` SPE-3390 **Done**; coherent env→dependency projection ACs; ChatGPT Phase 4 SPE-792 child |

### Decision criteria

1. **Priority:** Unlocks facility soft environmental support after SPE-3390 composition substrate shipped.
2. **Dependency:** SPE-3390 Done clears the only Linear `blockedBy`; SPE-3383/SPE-3386 seams complete.
3. **Feasibility:** Pure adapter over existing env context + dependency inputs; no GameState.
4. **Scope:** One coherent coding slice; no cultivation (SPE-3406) or UI (SPE-3359).
5. **Architectural readiness:** SPE-3382 authority preserved; SPE-3386 live-service projection is the integration precedent.
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-3386 explicit service inputs and SPE-3390 composition.
7. **Contradiction:** SPE-3043 STOP / SPE-3121 hold unchanged; no permission/lifecycle ownership claimed.
8. **Prohibitions:** No new issue/child; parent umbrella not selected; PR review preserved.

### Eligibility checklist

- Exists / Backlog → In Progress: true
- Not recentlyShipped: true
- Not parent / no children: true
- AC fit one slice: true
- No open blockedBy: true (SPE-3390 Done)
- Slice doc before feature code: true
- Ownership: `delegate` absent; `assignee` absent — no conflicting verified owner; description prose not used as ownership

## Approved boundary

Pure deterministic adapter in `src/domain/facilityEnvDependencyProjection.ts`:

- Consume resolved SPE-3390 `EnvironmentalOperationalContext` (not climate/terrain/ecology owners directly)
- Bind facility-relevant env dimensions onto SPE-3383 graph nodes as typed SPE-3386-compatible dependency inputs
- Resolve `ready` / `degraded` / `unavailable` through existing graph kernel
- Preserve dimension + sourceRef + composition provenance on env-bound inputs
- Fail closed / degrade with stable reasons when context missing, invalid, or bound dimension absent — never silent `ready`
- Legal/permission presence stays caller-owned and unchanged by env degradation
- No GameState persistence, UI, lifecycle mutation, or generic viability engine

## API

`src/domain/facilityEnvDependencyProjection.ts`

| Function | Behavior |
| --- | --- |
| `readRepresentativeFacilityEnvBindings` | Hazard exposure → `service:routing` on the SPE-3383 representative graph |
| `projectEnvironmentalContextToFacilityDependencyPacket` | Map bindings + baseline non-env sources into a complete SPE-3386 packet with env provenance; echo `facilityPermissionPresent` unchanged |
| `resolveFacilityDependencyFromEnvironmentalContext` | Project, then `resolveExplicitFacilityDependencyAvailability` |

Caller-owned dimension values may carry `facilitySupport: ready|degraded|unavailable`. Absent `facilitySupport` fails closed to `unavailable`. Malformed support words reject. Missing bound dimensions write `unavailable` with `missingDimension: true` provenance — never silent `ready`. When a bound node also has a baseline source, availability is worst-of (env constrains, never elevates).

### Upstream / authority (no duplicate persistence)

- SPE-3390 — derived environmental operational context (consumed read-only)
- SPE-3383 — dependency-graph kernel (unchanged)
- SPE-3386 — explicit dependency inputs seam (consumed, not reopened)
- SPE-3382 — lifecycle vs effective-capability authority (preserved)
- Legal permission / lifecycle / staffing / supply / unlocks — existing owners; not mutated here
- Downstream consumers read SPE-3383 availability results through canonical seams

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Information-source access projection | SPE-3471 | Separate SPE-1090 child; deferred this cycle |
| Managed cultivation viability | SPE-3406 | Separate SPE-1052 child |
| Facility register UI | SPE-3359 | Presentation owner |
| SPE-792 remainder (core displacement, room unlocks, …) | SPE-792 | Parent umbrella stays Backlog |

## Validation

- Targeted: `npm exec vitest run -- src/test/facilityEnvDependencyProjection.test.ts` (6 passed)
- Related: SPE-3386 / SPE-3390 / SPE-3383 contract suites
- `npm run verify:backlog-handoff` (OK)
- ESLint on touched TS files
