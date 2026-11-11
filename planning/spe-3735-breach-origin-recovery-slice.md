# SPE-3735 — Breach-origin recovery and verified recontainment handoff

| Field             | Value                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress** (store live consumer shipped; normal gameplay reachability still open)                              |
| **Issue**         | [SPE-3735](https://linear.app/spectranoir/issue/SPE-3735/breach-origin-recovery-and-verified-recontainment-handoff) |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — remains open                                            |
| **Branch**        | `jamesdyedbq/spe-3735-live-wiring`                                                                                  |
| **Base main SHA** | `92341aede28b3d153a6e10782d180a6a1cc9ab9e`                                                                          |

## Delegated approval

**Date:** 2026-11-11  
**main SHA:** `92341aede28b3d153a6e10782d180a6a1cc9ab9e`  
**Decision:** continue SPE-3735 gameplay-evidence with store live wiring after SPE-3055 claim seam (#4962)

**Queue state:** tip equals `origin/main` after #4962; no open PRs; SPE-3735 remains In Progress.

**Acceptance reconciliation:** coordinator + SPE-104/1095/3055 producer seams exist on main. Hydrate-only and domain-only fixtures do **not** satisfy acceptance §1. This slice wires the smallest store-facing live consumer so real producers can advance durable `facilityBreachOriginRecoveries`. Keep SPE-3735 **In Progress** until full §1 gameplay evidence exists; do not mark Done on assign-only.

## Goal

Coordinate one deterministic breach-origin recovery so assignment, locate, capture, movement, destination admission, and verified recontainment remain explicit owner-evidenced stages for an already-escaped subject — now reachable through a live store step path.

## Boundary

### In scope

- Pure coordinator in `src/domain/breachOriginRecovery.ts` (already shipped)
- Live step applicator `src/domain/breachOriginRecoveryLivePath.ts`
- Thin `gameStore.applyBreachOriginRecoveryStep` mutating `facilityBreachOriginRecoveries`
- Consume SPE-3055 claim / SPE-104 capture / SPE-1095 movement producers from caller-owned attempt facts
- Live-registry escape evidence + alert-center respond work-item gates (caller-supplied entries; no new registry GameState map)
- Consume SPE-3177 co-location, SPE-3189 screening, SPE-2995 procedure readiness on admit/verify
- Contract/store integration tests covering producer → assign → locate (prefer full §1 completed path)
- Slice / backlog handoff docs

### Out of scope

- Closing SPE-1052 or marking SPE-3735 Done without acceptance §1 evidence
- Full SPE-104 weapon AC / SPE-1095 thoroughfare suite / full SPE-3055 arbitration
- Extending SPE-3439 transfer or SPE-3500 excursion
- New incident engine, alert worklist UI, pathfinder, custody ledger, or standalone recovery UI
- Persisted live-registry GameState map
- Week-close auto-success that skips respond/claim gates

## Acceptance (truthful)

- [x] Coordinator stages + durable hydrate + explainability
- [x] Escape start requires live-registry contained→loose evidence
- [x] Assignment requires claim + respond work item (alert alone insufficient)
- [x] Capture/arrival/status-patch alone cannot complete
- [x] Admission consumes SPE-3177/3189; verification consumes SPE-2995 when supplied
- [x] Terminal report once; registry restore only after verified completion
- [x] Real SPE-104 capture + SPE-1095 movement + SPE-3055 claim producer seams emit typed evidence for coordinator stages
- [x] Live store consumer path (producer → assign → locate → capture → move → admit → verify) via `applyBreachOriginRecoveryStep`
- [ ] Full acceptance §1 normal gameplay reachability / surface — **incomplete** (store consumer only; no UI)
- [ ] Full SPE-3055 / SPE-1023 claim arbitration beyond assignment seam — **deferred/incomplete**

## Deferred

| Item                                         | Owner               | Why                                                                                                             |
| -------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Full SPE-104 weapon AC remainder             | SPE-104             | Capture-secure outcome seam shipped; tether/limb/weapon-catch AC still deferred                                 |
| Full SPE-1095 thoroughfare channel suite     | SPE-1095            | Recovery-movement outcome seam shipped; route-class AC deferred                                                 |
| Full operational personnel claim arbitration | SPE-3055 / SPE-1023 | Assignment claim seam shipped; full arbitration AC deferred                                                     |
| Mission-mode off-site recapture taxonomy     | SPE-1307            | Related classification surface                                                                                  |
| Recovery explainability UI surface           | existing surfaces   | SPE-3359 facility-register UI is Done; optional later fold of `projectExplainableBreachRecovery` into a surface |
| Persisted live-registry GameState map        | live-registry owner | Escape evidence remains caller-owned input; this slice does not invent a parallel registry SoT                  |
