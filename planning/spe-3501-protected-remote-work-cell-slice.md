# SPE-3501 — Protected remote-work cell interaction

| Field             | Value                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress**                                                                                           |
| **Issue**         | [SPE-3501](https://linear.app/spectranoir/issue/SPE-3501/protected-remote-work-cell-interaction)           |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — remains open                                  |
| **Branch**        | `jamesdyedbq/spe-3501-protected-remote-work-cell-interaction`                                             |
| **Base main SHA** | `fa1d86e3bd7c3a191fecacf2b7802a16d8786389`                                                                |

## Start rationale

**Date:** 2026-11-11  
**main SHA:** `fa1d86e3bd7c3a191fecacf2b7802a16d8786389`  
**Decision:** implement SPE-3501 after clean-main restored (Agent P #4965–#4967 merged; #4968 closed for prettier 3.10 format churn).

**Queue state:** tip equals `origin/main`; no open PRs; SPE-2995 / SPE-1434 Done; stale SPE-2995 blocker cleared.

**Eligibility:** Backlog→In Progress; not umbrella; acceptance fits one coding slice; adapter prerequisite shipped.

## Goal

Coordinate one deterministic protected remote-work cell interaction so a qualified operator can run an authorized containment-lab sample observe/manipulate task against a sealed target zone from a different protected station location via SPE-2995, without treating the operator as present in the hazard zone.

## Boundary

### In scope

- Pure coordinator in `src/domain/protectedRemoteWorkCell.ts`
- Consume SPE-2995 procedure readiness/execution and caller-owned facility/room/integrity/competency gate decisions
- Optional durable `GameState.facilityProtectedRemoteWorkCells` + hydrate via `runTransfer`
- Explainability projection for existing facility/action surfaces
- Contract tests + SCHEMA_REGISTRY / slice / handoff docs

### Out of scope

- Closing SPE-1052
- SPE-328 tag-linked remote tools; SPE-3439 transfer; SPE-3500 excursion
- New procedure engine, teleoperation minigame, robot actor, subject registry, or map/zone authority
- New control-surface framework or Academy parallel runtime

## Pre-coding summary

| Item           | Finding                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Relevant files | new remote-work module; `models.ts`; `runTransfer.ts`; SPE-2995 / facility hydrate seams         |
| Current        | No protected remote-work station coordinator; adapter + facility substrates exist                |
| Expected       | Stage machine with fail-closed preflight, SPE-2995 start, interrupt/hold, durable hydrate        |
| Risks          | Colocating operator into target zone; clearing exposure on spatial separation; second resolver |
| Validation     | `src/test/protectedRemoteWorkCell.contract.test.ts`; lint; backlog handoff                       |

## Acceptance

- [x] Valid remote lab task: request → authorize → begin (SPE-2995) → complete without operator entry into target zone
- [x] Capability / operator / station / room / integrity / procedure blockers fail closed with reason codes
- [x] Station disablement / connection loss holds; barrier degradation can route exposure without clearing it
- [x] Idempotent operation keys; durable hydrate round-trip; repeat does not duplicate effects
- [x] Explainability packet exposes stage / blockers / exposure flags
- [x] In-boundary docs (slice, SCHEMA_REGISTRY, backlog handoff)

## Deferred

| Item                                                         | Owner      | Why                                                                 |
| ------------------------------------------------------------ | ---------- | ------------------------------------------------------------------- |
| Live SPE-100 sampling/container compatibility rules          | SPE-100    | Owner still Backlog; no parallel sampling registry here             |
| Live week-close / UI wiring into facility register           | SPE-3359 / existing surfaces | Projection only; no new remote-work UI framework          |
| Tag-linked remote manipulation tools                         | SPE-328    | Explicitly excluded                                                 |
