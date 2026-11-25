# SPE-2130 — Efficacious instruction-text registry (slice 1)

## Status

In Progress (Grok draft)

## Scope

Pure domain registry for instruction-bearing media requiring benefit-risk review.

- `src/domain/efficaciousInstructionTextRegistry.ts`
- Fields: efficacyBand, benefitRiskReviewState, subjectOutcomeRefs
- Validation and targeted tests

No media execution engine, no GameState persistence, no UI.

## Acceptance

- Separate representation of efficacy, review state, and outcome refs
- Supports benefit-risk consideration
- Validation and tests cover the contract

## Validation

Targeted tests not executed in this environment (Node 20 vs required >=22).
