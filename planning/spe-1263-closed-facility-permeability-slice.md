# SPE-1263 — Closed-facility permeability and impossible-access scenes

| Field             | Value                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                              |
| **Issue**         | [SPE-1263](https://linear.app/spectranoir/issue/SPE-1263)                                    |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                          |
| **Branch**        | `jamesdyedbq/spe-1263-closed-facility-permeability-and-impossible-access-scenes`             |
| **Base main SHA** | `45f8575c5a3290003a06e9a63ae1bc493163cc23`                                                   |

## Delegated approval

**Decision:** `delegated_approve` SPE-1263  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `45f8575c5a3290003a06e9a63ae1bc493163cc23`)  
**Date:** 2026-10-18  
**Continuation:** Hermes full-task delegation; explicit autonomous ship-loop; SPE-3177 Linear Done (stale handoff In Progress cleared)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3177 cleared (Linear Done / PR #4324 @ `45f8575c`)
- Containment Protocol Linear In Progress: none at pick time
- Clean `main`, no open PRs; policy file restored byte-identical to `origin/main`
- Recommended next step names SPE-1052 umbrella (ineligible) plus shipped children; no other concrete next SPE named

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent umbrella |
| SPE-3177 | Linear Done / merged — stale handoff only |
| SPE-1481 / SPE-2103 | Already in `recentlyShipped` |
| SPE-3406 / SPE-3362 / SPE-3361 / SPE-3360 / SPE-3359 | SPE-1052 children; lower priority than SPE-1263 High; no existing slice docs |
| SPE-3189 / SPE-3188 / SPE-3181 / SPE-3150 | SPE-1052 children; lower priority / broader programs |
| SPE-3121 | Held for SPE-3107 reconciliation |
| **SPE-1263** | High-priority SPE-1052 child; no children; no open blockers; AC satisfiable as one pure permeability packet layer |

### Decision criteria

1. **Priority:** Highest Linear priority among eligible SPE-1052 Backlog children (High).
2. **Dependency:** No open `blockedBy`; SPE-3043 STOP / SPE-3121 hold do not apply to this boundary.
3. **Feasibility:** Pure domain profiles/packets; no GameState/UI required for AC.
4. **Scope:** Compact permeability profiles + impossible-access / custody / device / tool / room / alert / temporary-zone / contractor projectors — not a prison-ops simulator.
5. **Architectural readiness:** Fits beside facility lifecycle / secured-node / co-location owners without duplicating them.
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-3177 placement and SPE-2102 disposition.
7. **Contradiction review:** No conflict with shipped facility stack; SPE-3043 STOP unchanged; SPE-3121 hold untouched.
8. **Prohibitions:** No new issue/child/parent; parent not selected; PR review preserved.

### Eligibility checklist

- Exists in Linear: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no open children: true
- AC fit one slice: true (pure compact layer covers all twelve “at least one” ACs)
- No open blockedBy: true
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true

## Approved boundary

Pure caller-owned closed-facility permeability layer in `src/domain/closedFacilityPermeability.ts`.

- Formal vs actual permeability profiles with meaningful-gap detection (authored `facility:black-site-ward` fixture)
- Impossible-access reconstruction (known controls vs hidden permeability / staff complicity)
- Breach-path as-designed vs as-found contradictions
- Holding-cell custody pressure (riot / signal / escort / false calm distinct from lock failure)
- Emergency-device silence inference
- Controlled-tool accountability drift
- Informal room-use discovery
- No-staff-entry / hazardous-interior study modes
- Sealed-facility alert-state progression
- Temporary secure zones outside permanent topology
- Sensitive contractor secrecy vs audit failure
- No GameState field, week-close wire, facility UI, or full prison-operations simulator

## API

`src/domain/closedFacilityPermeability.ts`

| Symbol | Behavior |
| --- | --- |
| `projectClosedFacilityPermeabilityProfile` | Formal vs actual permeability + gap |
| `authoredBlackSiteWardPermeabilityProfile` | Acceptance fixture |
| `reconstructImpossibleAccessScene` | Impossible-access explanation |
| `resolveBreachPathContradiction` | As-designed / as-found map gap |
| `projectCustodyIncidentPressure` | Custody pressure distinct from lock failure |
| `inferEmergencyDeviceSilence` | Untriggered device inference |
| `projectControlledToolAccountability` | Missing/improvised tool surfaces |
| `discoverInformalRoomUse` | Informal function under official label |
| `classifyStaffEntryPolicy` | Remote/indirect study modes |
| `advanceSealedFacilityAlertState` | Alert readiness progression |
| `projectTemporarySecureZone` | Deployable reduced-permeability zone |
| `projectSensitiveContractorExposure` | Cash/no-record secrecy + audit failure |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live GameState / week-close wiring | future consumer / SPE-1052 children | Pure layer only |
| Full prison-operations simulator | out of issue constraints | Explicitly excluded |
| Lockdown evaluation / suspect filtering consumers | existing downstream owners | Consume later; do not redefine |
| Facility register UI | SPE-3359 | UI out of boundary |

## Validation

- `npm exec vitest run -- src/test/closedFacilityPermeability.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
