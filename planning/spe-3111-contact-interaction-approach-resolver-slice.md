# SPE-3111 — Contact interaction approach resolver (slice 1)

| Field | Value |
| ----- | ----- |
| **Status** | Draft implementation |
| **Linear** | [SPE-3111](https://linear.app/spectranoir/issue/SPE-3111/contact-interaction-approach-resolver-slice-1) |
| **Branch** | `grok/spe-3111-contact-interaction-approach-resolver` |

## Boundary

Pure deterministic resolver for approach eligibility from player-known state, staff suitability, exploratory fallback, and typed outcomes with handoff identifiers. No hidden-state leakage, no duplicate persistence of relationship/favor/coercion state.

## Validation plan

- `npm run test:run -- src/test/contactInteractionApproachResolver.test.ts`
- lint/format on changed files
