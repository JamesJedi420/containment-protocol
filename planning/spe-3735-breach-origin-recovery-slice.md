# SPE-3735 — Breach-origin recovery and verified recontainment handoff

| Field             | Value                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress** (coordinator + SPE-104 capture producer + SPE-1095 movement seam; full path not Done)               |
| **Issue**         | [SPE-3735](https://linear.app/spectranoir/issue/SPE-3735/breach-origin-recovery-and-verified-recontainment-handoff) |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — remains open                                            |
| **Branch**        | `jamesdyedbq/spe-3735-breach-origin-recovery-and-verified`                                                          |
| **Base main SHA** | `a595098f400f833c812036e43215f9896496f7be`                                                                          |

## Delegated approval

**Date:** 2026-11-10  
**main SHA:** `a595098f400f833c812036e43215f9896496f7be`  
**Decision:** continue existing SPE-3735 session after SPE-3500 Done

**Queue state:** tip equals `origin/main` after #4958; no open PRs; SPE-3500 Done.

**Acceptance reconciliation:** hydrate-only owner booleans and synthetic capture/movement stubs do **not** satisfy SPE-3735 acceptance §§1/4/5 for Done. Coordinator + SPE-104 capture-secure producer + SPE-1095 recovery-movement producer seams exist on main (or this PR). Full thoroughfare AC, assignment-claim arbitration, and end-to-end gameplay path remain incomplete. Keep SPE-3735 **In Progress** until full gameplay evidence exists; do not mark Done on producer seams alone.

## Goal

Coordinate one deterministic breach-origin recovery so assignment, locate, capture, movement, destination admission, and verified recontainment remain explicit owner-evidenced stages for an already-escaped subject.

## Boundary

### In scope

- Pure coordinator in `src/domain/breachOriginRecovery.ts`
- Live-registry escape evidence gate; alert-center respond work-item + assignment claim
- Consume SPE-3177 co-location, SPE-3189 screening, SPE-2995 procedure readiness
- Typed SPE-104 / SPE-1095 evidence packet contracts (no parallel producers)
- Optional durable `GameState.facilityBreachOriginRecoveries` + hydrate via `runTransfer`
- Exactly-once terminal report + forbidden direct `recaptured` completion path
- Contract tests + SCHEMA_REGISTRY / slice / backlog handoff docs
- SPE-3500 queue/manifest reconciliation

### Out of scope

- Closing SPE-1052 or marking SPE-3735 Done on coordinator-only evidence
- Implementing SPE-104 capture mechanics or SPE-1095 movement channels
- Extending SPE-3439 transfer or SPE-3500 excursion
- New incident engine, alert worklist, pathfinder, custody ledger, or standalone recovery UI

## Acceptance (truthful)

- [x] Coordinator stages + durable hydrate + explainability
- [x] Escape start requires live-registry contained→loose evidence
- [x] Assignment requires claim + respond work item (alert alone insufficient)
- [x] Capture/arrival/status-patch alone cannot complete
- [x] Admission consumes SPE-3177/3189; verification consumes SPE-2995 when supplied
- [x] Terminal report once; registry restore only after verified completion
- [x] Real SPE-104 capture + SPE-1095 movement producer seams emit typed evidence for coordinator stages
- [ ] Full acceptance §1 end-to-end gameplay path (assignment claim + live wiring) — **incomplete**
- [ ] End-to-end assignment consumer via SPE-3055 / SPE-1023 claim arbitration — **deferred/incomplete**

## Deferred

| Item                                     | Owner               | Why                                                                                                                       |
| ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Full SPE-104 weapon AC remainder         | SPE-104             | Capture-secure outcome seam shipped; tether/limb/weapon-catch AC still deferred                                           |
| Full SPE-1095 thoroughfare channel suite | SPE-1095            | Recovery-movement outcome seam shipping (`planning/spe-1095-recovery-movement-outcome-slice.md`); route-class AC deferred |
| Operational personnel claim arbitration  | SPE-3055 / SPE-1023 | Assignment claim producer incomplete                                                                                      |
| Mission-mode off-site recapture taxonomy | SPE-1307            | Related classification surface                                                                                            |
| Live week-close / UI wiring              | SPE-3359 / surfaces | Projection only this slice                                                                                                |
