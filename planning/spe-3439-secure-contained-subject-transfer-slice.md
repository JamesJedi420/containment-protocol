# SPE-3439 — Secure contained-subject transfer transaction

| Field             | Value                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress**                                                                                                                   |
| **Issue**         | [SPE-3439](https://linear.app/spectranoir/issue/SPE-3439/secure-contained-subject-transfer-transaction)                            |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — remains open                                                           |
| **Branch**        | `jamesdyedbq/spe-3439-secure-contained-subject-transfer`                                                                          |
| **Base main SHA** | `ddbbfe81bf2f49906fbc4342ae823e5b80979f00`                                                                                         |

## Delegated approval

**Date:** 2026-11-10  
**main SHA:** `ddbbfe81bf2f49906fbc4342ae823e5b80979f00`  
**Decision:** `delegated_approve` SPE-3439

**Queue state:** tip equals `origin/main`; no open PRs; SPE-3338 blocked tooling (not coding); SPE-792 restored to Backlog (umbrella).

**Candidates compared:** SPE-792 (umbrella; children Done), SPE-3338 (blocked), SPE-3452 (blocked by SPE-1084), SPE-3181 (parked), SPE-3500/SPE-3735 (after transfer foundation), SPE-1564/SPE-1058 (large bodies).

**Priority / dependency / feasibility / scope / readiness:** SPE-1434 and SPE-2995 are Done, clearing the prior execution-prerequisite skip; coherent same-site transfer coordinator; existing co-location/screening/procedure/custody seams.

**Duplication check:** not in `recentlyShipped`; distinct from SPE-1020 inter-site, SPE-3385 facility relocation, SPE-3500 excursion, SPE-3735 breach recovery.

**Contradiction review:** barrier vs transfer permission retained via SPE-3189/SPE-1896 consumption; no STOP conflict with SPE-3043.

**Eligibility:** Backlog→In Progress; not umbrella; acceptance fits one coding slice; no open blockers; slice doc created here.

## Goal

Coordinate one deterministic same-site secure contained-subject transfer so release, movement, and destination securing remain separate owner-evidenced transitions.

## Boundary

### In scope

- Pure coordinator in `src/domain/secureContainedSubjectTransfer.ts`
- Consume SPE-3177 co-location, SPE-3189 outbound screening, SPE-2995 procedure readiness, SPE-1892 person-custody identity refs
- Optional durable `GameState.facilitySecureContainedSubjectTransfers` + hydrate via `runTransfer`
- Explainability projection for existing surfaces
- Contract tests + SCHEMA_REGISTRY / slice / handoff docs

### Out of scope

- Closing SPE-1052 / SPE-792
- Cross-site transfer, facility relocation, excursion, breach recovery
- New procedure engine, pathfinder, custody ledger, or standalone transfer UI
- Inventing physical movement/release producers beyond owner-reported commits

## Pre-coding summary

| Item | Finding |
| --- | --- |
| Relevant files | new transfer module; `models.ts`; `runTransfer.ts`; SPE-3177/3189/2995 seams |
| Current | No same-site secure transfer coordinator; SPE-3189 explicitly excludes custody transfer |
| Expected | Stage machine with fail-closed preflight and owner-evidenced commits; save/load mid-transfer |
| Risks | Teleporting subjects; smuggling person custody onto non-persons; treating screening clear as release |
| Validation | `src/test/secureContainedSubjectTransfer.contract.test.ts`; lint; backlog handoff |

## Acceptance

- [x] Valid transfer proceeds through request → (sync preflight evaluation) → authorized → release → transit → destination securing → completed with owner commits
- [x] Incompatible destination / gate failures block before release without physical effects
- [x] Outbound screening hold is not transfer permission
- [x] Post-release interrupt preserves physical effects and fails without rollback success
- [x] Person custody identity refs preserved; unresolved/non-person misuse fail closed
- [x] Idempotent operation keys; durable hydrate round-trip
- [x] Explainability packet exposes stage/reasons/corrective action
- [x] In-boundary docs (slice, SCHEMA_REGISTRY, backlog handoff)

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Live week-close / UI wiring of explainability into facility register | SPE-3359 / existing surfaces | No new transfer UI; projection only |
| Real movement channel mutation beyond commit acknowledgements | SPE-1095 | Coordinator consumes accessibility gate; does not invent pathfinder |
| Excursion / breach-recovery lifecycles | SPE-3500 / SPE-3735 | Explicitly distinct |
