# SPE-2186 — Defensive-control staff action model (slice 1)

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-2186](https://linear.app/spectranoir/issue/SPE-2186/defensive-control-staff-action-model-slice-1) |
| **Parent** | [SPE-41](https://linear.app/spectranoir/issue/SPE-41/tags-conditions-and-graded-outcome-framework) |
| **Branch** | `jamesdyedbq/spe-2186-defensive-control-staff-action-model-slice-1` |
| **Base main SHA** | `da53a625` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `da53a625`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-2186  

Linear comment on SPE-2186 records queue state (SPE-2157 Done @ `da53a625` / PR #4454), selection among SPE-792 / SPE-3181 / SPE-3452 / SPE-3385 / SPE-2186, contradiction review (SPE-73 owns confrontation odds; no damage-only collapse), and eligibility checklist. No new issue/child/parent/relationship created.

## Approved boundary

- Pure domain `src/domain/defensiveControlStaffAction.ts` — `controlKind`, `targetGeometry`, `collateralRisk`, intended outcomes, visible states, invalidation conditions
- Validation helpers + targeted Vitest `src/domain/defensiveControlStaffAction.test.ts`
- Fixtures for redirect, block, delay, reposition with legal geometry
- Reject unknown kind, missing geometry for geometry-required kinds, collateral risk outside bands
- Reject damage-only mislabel; cover invalidation via line of sight / flank / footing / equipment
- Deterministic validation only — no combat execution, GameState, week-close, or UI

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| Fixtures for redirect, block, delay, reposition with legal `targetGeometry` | Test "accepts redirect, block, delay, and reposition…" |
| Reject unknown `controlKind`, missing geometry, collateral out of bounds | Test "rejects unknown controlKind…" |
| Damage-only mislabeled as defensive control fails | Test "rejects damage-only actions mislabeled…" |
| Invalidation through LoS / flank / footing / equipment | Test "covers invalidation through…" |
| Deterministic validation without runtime combat | Test "is deterministic and does not execute combat resolution" |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live combat / confrontation resolution wiring | SPE-73 | Odds-band confrontation stays with SPE-73 |
| Action-economy / budget consumption | SPE-41 (umbrella; no dedicated child yet) | Schema slice only; durable consumption boundary remains candidate under SPE-41 until Phase 4 |
| GameState persistence of active postures | SPE-41 (candidate evidence — no child created) | Explicitly out of slice 1; preserve as candidate until Phase 4 |
| UI surfacing of guarded/pressured states | SPE-1080 conventions + feature consumers | Domain contract first; no new UI child |

## Out of scope (preserved)

- Do not collapse defensive control into generic attack actions
- Do not invent a standalone dynamic-defense subsystem
- Do not use imported tabletop maneuver names as player-facing canon
- Do not resolve hit points, damage rolls, or confrontation odds here
