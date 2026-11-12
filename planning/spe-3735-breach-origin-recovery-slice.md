# SPE-3735 — Breach-origin recovery and verified recontainment handoff

| Field             | Value                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress** (Agency Facility Register gameplay consumer shipping; Done after merge when §1 evidenced)           |
| **Issue**         | [SPE-3735](https://linear.app/spectranoir/issue/SPE-3735/breach-origin-recovery-and-verified-recontainment-handoff) |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — remains open                                            |
| **Branch**        | `jamesdyedbq/spe-3735-gameplay-reachability`                                                                        |
| **Base main SHA** | `901c80a1f98bd8863bc5321218168757c04360c8`                                                                          |

## Delegated approval

**Date:** 2026-11-11  
**main SHA:** `901c80a1f98bd8863bc5321218168757c04360c8`  
**Decision:** continue SPE-3735 gameplay-evidence with Agency Facility Register mid-week consumer after live store wiring (#4963)

**Queue state:** tip equals `origin/main` after #4963; no open PRs; SPE-3735 remains In Progress.

**Acceptance reconciliation:** coordinator + SPE-104/1095/3055 producer seams + store live step API exist on main. Store-only fixtures do **not** satisfy acceptance §1 normal gameplay reachability. This slice wires the smallest existing-surface consumer on Agency Facility Register so mid-week play can invoke `applyBreachOriginRecoveryStep` through create → assign → locate and onward §1 stages. Keep SPE-3735 **In Progress** until merge + §1 gameplay evidence; do not mark Done on assign-only.

## Goal

Coordinate one deterministic breach-origin recovery so assignment, locate, capture, movement, destination admission, and verified recontainment remain explicit owner-evidenced stages for an already-escaped subject — now reachable through Agency mid-week play on the Facility Register surface.

## Boundary

### In scope

- Pure coordinator in `src/domain/breachOriginRecovery.ts` (already shipped)
- Live step applicator `src/domain/breachOriginRecoveryLivePath.ts` (already shipped)
- Thin `gameStore.applyBreachOriginRecoveryStep` mutating `facilityBreachOriginRecoveries` (already shipped)
- Agency Facility Register sibling strip: `breachOriginRecoveryGameplayView` + `BreachOriginRecoveryPanel`
- Caller-owned live-registry escape evidence + respond work-item rebuild at the feature boundary (no persisted live-registry GameState map)
- Explicit SPE-3055 claim attempt facts for assignment (no full arbitration UI)
- Feature/store/UI integration proving create → assign → locate and full §1 path
- Slice / backlog handoff docs

### Out of scope

- Closing SPE-1052 or marking SPE-3735 Done without acceptance §1 evidence
- Full SPE-104 weapon AC / SPE-1095 thoroughfare suite / full SPE-3055 arbitration
- Extending SPE-3439 transfer or SPE-3500 excursion
- New incident engine, alert worklist UI, pathfinder, custody ledger, or standalone recovery UI/framework
- Persisted live-registry GameState map
- Week-close auto-success that skips respond/claim gates
- SPE-3191 facility maintenance recovery changes
- SPE-3359 facility-register projection semantics beyond consuming its Agency surface

## Acceptance (truthful)

- [x] Coordinator stages + durable hydrate + explainability
- [x] Escape start requires live-registry contained→loose evidence
- [x] Assignment requires claim + respond work item (alert alone insufficient)
- [x] Capture/arrival/status-patch alone cannot complete
- [x] Admission consumes SPE-3177/3189; verification consumes SPE-2995 when supplied
- [x] Terminal report once; registry restore only after verified completion
- [x] Real SPE-104 capture + SPE-1095 movement + SPE-3055 claim producer seams emit typed evidence for coordinator stages
- [x] Live store consumer path (producer → assign → locate → capture → move → admit → verify) via `applyBreachOriginRecoveryStep`
- [x] Full acceptance §1 normal gameplay reachability / surface — Agency Facility Register mid-week consumer invokes create → assign → locate → capture → move → admit → verify
- [ ] Full SPE-3055 / SPE-1023 claim arbitration beyond assignment seam — **deferred/incomplete**

## Deferred

| Item                                         | Owner               | Why                                                                                                         |
| -------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Full SPE-104 weapon AC remainder             | SPE-104             | Capture-secure outcome seam shipped; tether/limb/weapon-catch AC still deferred                             |
| Full SPE-1095 thoroughfare channel suite     | SPE-1095            | Recovery-movement outcome seam shipped; route-class AC deferred                                             |
| Full operational personnel claim arbitration | SPE-3055 / SPE-1023 | Assignment claim seam shipped; full arbitration AC deferred                                                 |
| Mission-mode off-site recapture taxonomy     | SPE-1307            | Related classification surface                                                                              |
| Recovery explainability UI fold-in           | existing surfaces   | Mutating Agency strip shipped; optional later fold of `projectExplainableBreachRecovery` into register rows |
| Persisted live-registry GameState map        | live-registry owner | Escape evidence remains caller-owned input; this slice does not invent a parallel registry SoT              |
