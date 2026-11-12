# SPE-731 — Layered facility control: ownership, command, power, and access

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped** (PR #4333 @ `cb24e87f`)                                                    |
| **Issue**         | [SPE-731](https://linear.app/spectranoir/issue/SPE-731)                                        |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                            |
| **Branch**        | `jamesdyedbq/spe-731-layered-facility-control-ownership-command-power-and-access`               |
| **Base main SHA** | `52c33441`                                                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-731  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `52c33441`)  
**Date:** 2026-10-19  
**Continuation:** Hermes full-task delegation after SPE-3362 merge (PR #4332)

### Queue state

- primary: SPE-1052; inProgress cleared after SPE-3362 Done; recentlyShipped head SPE-3362 / SPE-3361 / …
- clean `main` @ `52c33441`; open PRs: none
- Linear In Progress SPE slices: none before this pick

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Parent umbrella — ineligible |
| SPE-292 | Open child SPE-2079 — umbrella |
| SPE-792 | Open child SPE-3415 + oversized |
| SPE-3359 | UI — skip |
| SPE-3181 | Not one-slice (GameState / SPE-3041 / SPE-1135 span) |
| SPE-3421 | Eligible Low-priority Sonar refactor; lower priority than High SPE-731 |
| SPE-907 / SPE-1012 / SPE-1020 | High; larger multi-escalation narratives; deferred |
| **SPE-731** | High; no open children; ownership/command/power/access ACs fit one pure domain packet |

### Decision criteria

1. **Priority:** High (2); lowest SPE id among High children with no open children.
2. **Dependencies:** no open blockers; consumes credential/role fields from callers.
3. **Feasibility:** pure deterministic control surfaces; no GameState / week-close required.
4. **Scope:** compact authority fields; action-scoped authorization inside existing Goal/Scope.
5. **Architectural readiness:** aligns with prior facility domain packets (thresholds, delegated management).
6. **Duplication:** not in recentlyShipped; SPE-1565 covers managers, not ownership/command/power split.
7. **Contradiction:** no STOP hold; SPE-3043 ownership stop not implicated (no interaction-kind rewrite).
8. **Prohibitions:** no new issue; parent stays Backlog; PR review preserved.

### Eligibility checklist

- Exists, Backlog: true
- Not recentlyShipped: true
- Not parent / no open children: true
- One-slice AC: true
- No open blockers: true
- Slice doc: this file
- Not harvest-only: true

## Approved boundary

Pure caller-owned layered facility control in `src/domain/layeredFacilityControl.ts`.

- Distinct ownership, command authority, power state, and access permission surfaces
- Crew/subsystem obedience from hierarchy or credential (not title alone)
- Stolen/transferred control artifact materially changes steer/seal/admit decisions
- Action-scoped authorization (enter vs operate/seal/override) without parallel identity model
- No GameState, full governance sim, or facility UI

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live facility UI / register wiring | SPE-3359 / UI owners | Pure packets only |
| Hostile operating intelligence | SPE-907 | Separate High child |
| Facility zoning lockdown response | SPE-292 (+ SPE-2079) | Open child umbrella |

## Validation

- `npm exec vitest run -- src/test/layeredFacilityControl.contract.test.ts`
- `npm run verify:backlog-handoff`
