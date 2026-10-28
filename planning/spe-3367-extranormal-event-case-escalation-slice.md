# SPE-3367 — Brief extranormal event → CaseInstance escalation handoff

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3367](https://linear.app/spectranoir/issue/SPE-3367/brief-extranormal-event-caseinstance-escalation-handoff) |
| **Parent** | none (leaf; T3 under SPE-3365 design) |
| **Branch** | `jamesdyedbq/spe-3367-brief-extranormal-event-caseinstance-escalation-handoff` |
| **Base main SHA** | `d1cf60f3` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `d1cf60f3`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291…`)  
**Decision:** `delegated_approve` SPE-3367  

Linear comment on SPE-3367 records queue state (SPE-3366 Done @ `d1cf60f3` / PR #4448), selection among SPE-3108 / SPE-3451 / SPE-3056 / SPE-3181 / SPE-3439 / SPE-3452, contradiction review, and eligibility checklist. No new issue/child/parent/relationship created.

## Approved boundary

- Pure domain `src/domain/extranormalEventCaseEscalation.ts` — exact-once escalate eligible brief extranormal event → canonical `CaseInstance`
- Reuse valid `escalatedCaseRef`; create via existing `createStarterCase` factory; never reuse event id as case id
- Explicit + similar-event-cluster many-events → one-case convergence; conflicting targets fail closed
- Persist/update `escalatedCaseRef` + `closureState: escalated_to_case` only after target validates; failure returns input maps unchanged
- Preserve source event as distinct historical record; SPE-1310 owns lifecycle after handoff
- Targeted Vitest `src/domain/extranormalEventCaseEscalation.test.ts`
- SCHEMA_REGISTRY evidence-only note; no GameState field, week-close wire, or second case schema

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| Eligible brief event with no prior target creates one CaseInstance and stores ref | Test "creates one CaseInstance for an eligible event…" |
| Rerunning same escalation returns/reuses same case, no duplicate | Test "rerunning the same escalation reuses…" |
| Event already linked to valid target does not create another case | Test "does not create another case when already linked…" |
| Two explicitly related events may converge on one existing case | Tests cluster convergence + explicit `convergeCaseRef` |
| Conflicting second case target fails deterministically | Test "fails deterministically on a conflicting second case target" |
| Failure before commit leaves event and case state unchanged | Test "leaves event and case state unchanged on failure…" |
| Source event remains queryable as distinct historical/intake record | Test "keeps the source event queryable…" |
| Save/load preserves lineage and does not replay creation | Test "preserves event → case lineage through sanitize…" |
| Lifecycle after handoff owned by SPE-1310, not event registry | Test "does not advance SPE-1310 lifecycle stages during handoff" |

## Deferred

N/A — no in-boundary deferrals this slice. Week-close auto-escalation orchestration and UI remain outside this exact-once command seam (candidate if later required).
