# SPE-3120 — Action-output-derived recovery effect

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3120](https://linear.app/spectranoir/issue/SPE-3120/action-output-derived-recovery-effect) |
| **Parent** | [SPE-41](https://linear.app/spectranoir/issue/SPE-41/tags-conditions-and-graded-outcome-framework) |
| **Branch** | `jamesdyedbq/spe-3120-action-output-derived-recovery-effect` |
| **Base main SHA** | `62a23c98` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `62a23c98`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291…`)  
**Decision:** `delegated_approve` SPE-3120  

Linear comment on SPE-3120 records queue state (SPE-3108 Done @ `62a23c98` / PR #4451), selection among SPE-2805 / SPE-3186 / parked set, contradiction review, and eligibility checklist. No new issue/child/parent/relationship created. SPE-1405 remains distinct kill-trigger owner.

## Approved boundary

- Pure domain `src/domain/actionOutputDerivedRecovery.ts` — authorable recovery effect whose magnitude is derived deterministically from qualifying resolved action output
- Bounded proportional conversion (`numerator`/`denominator` + optional `hardCap`) without source-specific percentages or tournament/mode names
- Clamp to authoritative target resource maximum; reject invalid / nonrecoverable targets safely
- Explicit context allowlist/exclusion policy over generic context ids
- Stable provenance (actor, source effect, originating action, target, recovered resource/amount) + report attribution for SPE-1496 consumers
- Idempotency on originating `actionId`; recursive self-trigger blocked by default
- Kill-trigger payloads rejected with `kill_trigger_routed_to_spe_1405` / owner SPE-1405
- Targeted Vitest `src/domain/actionOutputDerivedRecovery.test.ts`
- SCHEMA_REGISTRY evidence-only; no GameState field, week-close wire, UI, or parallel health system

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| Qualifying resolved action produces deterministic secondary recovery from output | Test "applies deterministic secondary recovery…" |
| Identical action ineligible under context policy with stable suppression reason | Tests context exclusion + allowlist unmet |
| Recovery clamps at resource maximum; no overflow or negative recovery | Tests clamp + already-at-maximum |
| Provenance identifies actor, action/effect, target, applied amount | Test "records provenance…" + report attribution |
| Repeated processing of same originating action does not duplicate recovery | Test "does not duplicate recovery…" |
| Kill-trigger recovery routed to SPE-1405 | Test "routes kill-trigger recovery to SPE-1405…" |
| Debrief/report consumer can attribute from emitted result | Test "emits report attribution…" |
| Targeted tests cover conversion, clamping, context, invalid target, provenance, recursion, idempotency | Full suite in `actionOutputDerivedRecovery.test.ts` |

## Deferred

N/A — no in-boundary deferrals this slice. Live wiring into encounter resolution / SPE-1496 presentation remains with those owners. Kill-trigger loops remain SPE-1405.
