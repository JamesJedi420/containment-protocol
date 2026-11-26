# SPE-3731 — Reviewer independence, recusal, and substitute-review routing (slice 1)

| Field | Value |
| --- | --- |
| **Status** | **In Progress** (draft PR pending) |
| **Linear** | [SPE-3731](https://linear.app/spectranoir/issue/SPE-3731/reviewer-independence-recusal-and-substitute-review-routing) |
| **Parent** | [SPE-1124](https://linear.app/spectranoir/issue/SPE-1124/responsibility-audit-trail) |
| **Branch** | `grok/spe-3731-reviewer-independence-contract` |

## Boundary (slice 1)

Pure deterministic contract (`src/domain/reviewerIndependenceContract.ts`) that:

- Detects material-interest conflicts (requester, beneficiary, subject, causal contributor, investigator, original approver, configured interested party).
- Distinguishes ordinary eligibility from independence requirements.
- Returns stable outcomes: eligible, substitute_review_required, escalated, independent_review_unavailable, independently_reviewed.
- Selects substitutes via deterministic ordering on existing authority candidates (level then actor id).
- Records unresolved independence debt when no independent reviewer is available (even if emergency action is permitted by an external owner).
- Preserves provenance for downstream audit consumers.

Does **not** implement command hierarchy, emergency authorization, belief screening, automation exception lifecycle, investigation, post-incident review, persistence, or UI. Those remain with their canonical owners.

## Acceptance covered in this slice

- Conflict detection and recusal + substitute.
- Escalation to higher authority level.
- Unresolved debt when no substitute.
- Non-independence path remains eligible.
- Deterministic identical-input results.
- Prior debt resolution marker.

Full integration, save/load of durable debt, and multi-consumer wiring are deferred to later slices or the parent completion rule.

## Validation

Targeted tests in `src/test/reviewerIndependenceContract.test.ts`.
