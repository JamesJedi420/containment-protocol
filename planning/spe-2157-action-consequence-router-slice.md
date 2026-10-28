# SPE-2157 — Action consequence router (escalation, denial, collateral, hard choices)

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** (PR #4454 @ `da53a625`) |
| **Issue** | [SPE-2157](https://linear.app/spectranoir/issue/SPE-2157/action-consequence-router-escalation-denial-collateral-hard-choices) |
| **Parent** | [SPE-41](https://linear.app/spectranoir/issue/SPE-41/tags-conditions-and-graded-outcome-framework) |
| **Branch** | `jamesdyedbq/spe-2157-action-consequence-router-escalation-denial-collateral-hard` |
| **Base main SHA** | `fda23d72` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `fda23d72`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291…`)  
**Decision:** `delegated_approve` SPE-2157  

Linear comment on SPE-2157 records queue state (SPE-2805 Done @ `fda23d72` / PR #4453), selection among SPE-3186 / SPE-2898 / parked SPE-1052 children, contradiction review (no mission success/defeat/domain recovery inside router; no parallel consequence pipelines), and eligibility checklist. No new issue/child/parent/relationship created. Adjacent SPE-41 family owners (including SPE-3120) remain distinct consumers.

## Approved boundary

- Pure domain `src/domain/actionConsequenceRouter.ts` — canonical deterministic routing contract for resolved operational actions
- Consequence kind/family, causation reference, scale band, affected target/domain, propagation vector, mitigation state, bounded hard-choice options
- At least four materially different families through one interface
- Explicit collateral propagation across two domains via bounded vector (no separate collateral engine)
- Local scale preserved without explicit escalation rule; reject missing/invalid causation
- Hard-choice sets from canonical state; reject empty/invalid option sets
- Consumer-visible dispositions: direct / propagated / mitigated / denied / unresolved
- Targeted Vitest `src/domain/actionConsequenceRouter.test.ts`
- SCHEMA_REGISTRY evidence-only; no GameState field, week-close wire, UI, mission success/defeat, or domain recovery inside the router

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| At least four materially different consequence families route through one canonical interface | Test "routes at least four materially different consequence families…" |
| Every emitted consequence carries causation, target/domain, scale band, stable reason code | Test "requires every emitted consequence to carry causation…" |
| At least one collateral consequence propagates across two domains via explicit vector | Test "propagates collateral across two domains…" |
| At least one invalid or missing causation reference is rejected | Tests "rejects missing causation…" + "rejects invalid causation…" |
| At least one local consequence remains local unless explicit escalation/propagation applies | Test "keeps a local consequence local unless an explicit escalation rule applies" |
| At least one bounded hard-choice set from canonical state; reject invalid/empty | Tests "emits a bounded hard-choice set…" + "rejects empty or invalid hard-choice…" |
| Consumers distinguish direct, propagated, mitigated, denied, unresolved | Test "lets consumers distinguish direct, propagated, mitigated, denied, and unresolved" |
| Targeted tests: deterministic routing, collateral, scale limits, mitigation, invalid causation, hard-choice validation, stable ordering | Full suite in `actionConsequenceRouter.test.ts` (incl. deterministic ordering + mitigation/denied paths) |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live GameState / week-close wire into encounter resolution | Future consumer under SPE-41 | Pure routing contract first; callers own mutations after routing |
| Action-intent resolution integration (SPE-2156 adjacent) | SPE-2156 / SPE-41 consumers | Router accepts already-resolved intents; does not own intent resolution |
| Domain-specific recovery / mission success / campaign defeat | Existing owners (e.g. SPE-3120 recovery, SPE-1051 scars) | Explicitly out of router boundary |
| Player-facing after-action / telemetry UI | Feature consumers | Stable reason/disposition codes exposed; presentation not in slice |
| Pressure-budget / reveal categories (SPE-2177 fold-in) | SPE-2177 | Child/adjacent; not required for slice-1 router contract |

## Out of scope (preserved)

- Do not create a parallel feature-specific consequence pipeline
- Do not emit consequences without an audit causation reference
- Do not build a broad narrative-event generator
- Do not resolve mission success, campaign defeat, or domain-specific recovery inside this router
