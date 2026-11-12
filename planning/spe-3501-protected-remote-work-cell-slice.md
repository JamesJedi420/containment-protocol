# SPE-3501 — Protected remote-work cell interaction

| Field             | Value                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress** (acceptance reconciliation after premature Done on #4969)                                 |
| **Issue**         | [SPE-3501](https://linear.app/spectranoir/issue/SPE-3501/protected-remote-work-cell-interaction)           |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — remains open                                  |
| **Branch**        | `jamesdyedbq/spe-3501-protected-remote-work-cell-interaction-ac-reconcile`                                |
| **Base main SHA** | `400d6ac29d5aef7f11c34875cf0744622fc149ac`                                                                |

## Start rationale

**Date:** 2026-11-11  
**Reconciliation:** 2026-11-11 — Done on #4969 deferred AC5 live UI and lacked serialize save/load + bounded telemetry/perf evidence. Reopened In Progress; continue in-boundary until full acceptance.

## Goal

Coordinate one deterministic protected remote-work cell interaction so a qualified operator can run an authorized containment-lab sample observe/manipulate task against a sealed target zone from a different protected station location via SPE-2995, without treating the operator as present in the hazard zone — including an Agency facility/action UI consumer.

## Boundary

### In scope

- Pure coordinator in `src/domain/protectedRemoteWorkCell.ts`
- Live step path `src/domain/protectedRemoteWorkCellLivePath.ts`
- Agency gameplay view + panel (`protectedRemoteWorkGameplayView.ts`, `ProtectedRemoteWorkPanel.tsx`) + store apply
- Consume SPE-2995 procedure readiness/execution and caller-owned facility/room/integrity/competency gate decisions
- Optional durable `GameState.facilityProtectedRemoteWorkCells` + hydrate via `runTransfer` + serialize save/load
- Explainability + internal validation telemetry projection
- Contract / Agency consumer tests + SCHEMA_REGISTRY / slice / handoff docs

### Out of scope

- Closing SPE-1052
- SPE-328 tag-linked remote tools; SPE-3439 transfer; SPE-3500 excursion
- Inventing SPE-100 sampling/container rules while that owner remains Backlog
- New procedure engine, teleoperation minigame, robot actor, subject registry, or map/zone authority
- New control-surface framework or Academy parallel runtime

## Pre-coding summary

| Item           | Finding                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Relevant files | remote-work module; live path; Agency panel/view; `models.ts`; `runTransfer.ts`; gameStore       |
| Current        | Domain coordinator shipped on #4969; AC5 UI + serialize/telemetry gaps open                      |
| Expected       | Full AC1–6 evidenced including Agency consumer and save/load + telemetry/perf                    |
| Risks          | Colocating operator into target zone; clearing exposure on spatial separation; second resolver |
| Validation     | contract + Agency gameplay tests; lint; backlog handoff                                          |

## Acceptance

- [x] Valid remote lab task: request → authorize → begin (SPE-2995) → complete without operator entry into target zone
- [x] Capability / operator / station / room / integrity / procedure blockers fail closed with reason codes
- [x] Station disablement / connection loss holds; barrier degradation can route exposure without clearing it
- [x] Idempotent operation keys; durable hydrate + serialize save/load round-trip; repeat does not duplicate effects
- [x] Agency facility/action UI consumer exposes allowed actions, hazards, blockers, state changes with a11y (`aria-live`, `role="status"` / `role="alert"`)
- [x] Targeted tests + bounded internal telemetry/perf check + in-boundary docs

## Deferred

| Item                                                         | Owner      | Why                                                                 |
| ------------------------------------------------------------ | ---------- | ------------------------------------------------------------------- |
| Live SPE-100 sampling/container compatibility rules          | SPE-100    | Owner still Backlog; no parallel sampling registry here             |
| Tag-linked remote manipulation tools                         | SPE-328    | Explicitly excluded                                                 |
