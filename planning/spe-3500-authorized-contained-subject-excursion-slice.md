# SPE-3500 — Authorized contained-subject excursion and verified recontainment

| Field             | Value                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **Shipped**                                                                                                                 |
| **Issue**         | [SPE-3500](https://linear.app/spectranoir/issue/SPE-3500/authorized-contained-subject-excursion-and-verified-recontainment) |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — remains open                                                    |
| **Branch**        | `jamesdyedbq/spe-3500-authorized-contained-subject-excursion`                                                               |
| **Base main SHA** | `adc1b1aeb0ac936684ea8b735e4fc6d4bcdaf7a1`                                                                                  |

## Delegated approval

**Date:** 2026-11-10  
**main SHA:** `adc1b1aeb0ac936684ea8b735e4fc6d4bcdaf7a1`  
**Decision:** `delegated_approve` SPE-3500

**Queue state:** tip equals `origin/main` after #4957 merge; no open PRs; SPE-3439 Done (#4956); SPE-2995 Done.

**Candidates compared:** SPE-3735 (breach recovery; after excursion foundation), SPE-3338 (blocked tooling), SPE-1064 (umbrella), SPE-1564/SPE-1058 (large bodies).

**Priority / dependency / feasibility / scope / readiness:** SPE-3439 transfer foundation shipped; SPE-2995 procedure adapter Done; coherent temporary leave/return/recontainment coordinator distinct from transfer and asset checkout.

**Duplication check:** not in `recentlyShipped`; distinct from SPE-3439 same-site transfer, SPE-3188 asset checkout, SPE-3735 breach recovery, SPE-791 resident privileges.

**Contradiction review:** authorization ≠ release; physical return ≠ verified recontainment; overdue ≠ escape; non-persons do not inherit person custody.

**Eligibility:** Backlog→In Progress; not umbrella; acceptance fits one coding slice; no open blockers; slice doc created here.

## Goal

Coordinate one deterministic authorized temporary excursion so release, active leave, return obligation, overdue/missing routing, and verified recontainment remain explicit owner-evidenced stages.

## Boundary

### In scope

- Pure coordinator in `src/domain/authorizedContainedSubjectExcursion.ts`
- Consume SPE-3189 outbound screening, SPE-2995 procedure readiness, SPE-1892 person-custody identity refs when applicable, canonical campaign time for deadlines
- Optional durable `GameState.facilityAuthorizedContainedSubjectExcursions` + hydrate via `runTransfer`
- Explainability projection for existing surfaces
- Contract tests + SCHEMA_REGISTRY / slice / handoff docs

### Out of scope

- Closing SPE-1052
- Duplicating SPE-3439 transfer, SPE-3188 asset checkout, or SPE-3735 breach recovery
- New procedure engine, pathfinder, custody ledger, scheduler, incident engine, or standalone excursion UI
- Inventing physical movement/release/recontainment producers beyond owner-reported commits
- Retrieval tactics or automatic escape/death assertions

## Pre-coding summary

| Item           | Finding                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files | new excursion module; `models.ts`; `runTransfer.ts`; SPE-3439 / SPE-3188 / SPE-3189 / SPE-2995 seams                             |
| Current        | No temporary authorized leave/return/recontainment coordinator; transfer and asset checkout are distinct                         |
| Expected       | Stage machine with fail-closed preflight, owner-evidenced release/return/recontainment, deterministic overdue from campaign time |
| Risks          | Collapsing into transfer/escape; treating arrival as recontainment; smuggling person custody onto non-persons                    |
| Validation     | `src/test/authorizedContainedSubjectExcursion.contract.test.ts`; lint; backlog handoff                                           |

## Acceptance

- [x] Valid excursion: authorize → release → active → return → recontainment verification → completed with owner commits
- [x] Unauthorized / failed preflight fails closed without location/custody mutation
- [x] Return deadline produces deterministic `return_due` / `overdue` from campaign time
- [x] Disappearance / failed return routes via owner hints without asserting escape/death
- [x] Physical arrival does not complete until recontainment verification succeeds
- [x] Subject identity / applicable custody refs survive release, interruption, save/load, retry
- [x] Idempotent operation keys; durable hydrate round-trip
- [x] Explainability packet exposes stage / return obligation / reasons / outcome
- [x] In-boundary docs (slice, SCHEMA_REGISTRY, backlog handoff)
- [x] SPE-2995 readiness consumed on release/return procedure path (not a pure evaluator-only close)

## Deferred

| Item                                                                 | Owner                        | Why                                                                 |
| -------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| Live week-close / UI wiring of explainability into facility register | SPE-3359 / existing surfaces | No new excursion UI; projection only                                |
| Real movement channel mutation beyond commit acknowledgements        | SPE-1095                     | Coordinator consumes accessibility gate; does not invent pathfinder |
| Retrieval / incident tactics after missing/overdue                   | SPE-1023 / incident owners   | Route hints only                                                    |
| Breach-recovery lifecycle                                            | SPE-3735                     | Explicitly distinct                                                 |
