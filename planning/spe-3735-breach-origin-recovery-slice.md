# SPE-3735 — Breach-origin recovery and verified recontainment handoff

| Field             | Value                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress** (coordinator seam shipping; full acceptance blocked on SPE-104 / SPE-1095 producers)                              |
| **Issue**         | [SPE-3735](https://linear.app/spectranoir/issue/SPE-3735/breach-origin-recovery-and-verified-recontainment-handoff)               |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — remains open                                                          |
| **Branch**        | `jamesdyedbq/spe-3735-breach-origin-recovery-and-verified`                                                                        |
| **Base main SHA** | `a595098f400f833c812036e43215f9896496f7be`                                                                                        |

## Delegated approval

**Date:** 2026-11-10  
**main SHA:** `a595098f400f833c812036e43215f9896496f7be`  
**Decision:** continue existing SPE-3735 session after SPE-3500 Done

**Queue state:** tip equals `origin/main` after #4958; no open PRs; SPE-3500 Done.

**Acceptance reconciliation:** hydrate-only owner booleans and synthetic capture/movement stubs do **not** satisfy SPE-3735 acceptance §§1/4/5 for Done. This slice ships the coordinating handoff plus real existing seams (live-registry escape, respond work-item assignment claim gate, SPE-3177/3189 admission, SPE-2995 verification readiness, once-only terminal report + registry restore gate). SPE-104 capture mechanics and SPE-1095 movement channels remain blockers; typed producer evidence packets are consumed without inventing those engines. Keep SPE-3735 **In Progress** until full gameplay evidence exists.

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
- [ ] Full acceptance §1 gameplay path with real SPE-104 capture + SPE-1095 movement producers — **blocked**
- [ ] End-to-end assignment consumer via SPE-3055 / SPE-1023 claim arbitration — **deferred/incomplete**

## Deferred

| Item                                              | Owner              | Why                                      |
| ------------------------------------------------- | ------------------ | ---------------------------------------- |
| Real capture/restraint outcome producer           | SPE-104            | Hard blocker for acceptance §1           |
| Real subject movement channel mutation            | SPE-1095           | Hard blocker for acceptance §1           |
| Operational personnel claim arbitration           | SPE-3055 / SPE-1023 | Assignment claim producer incomplete    |
| Mission-mode off-site recapture taxonomy          | SPE-1307           | Related classification surface           |
| Live week-close / UI wiring                       | SPE-3359 / surfaces | Projection only this slice              |
