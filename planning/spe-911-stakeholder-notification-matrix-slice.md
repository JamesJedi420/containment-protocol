# SPE-911 — Stakeholder notification matrix and escalation thresholds (slice 1)

| Field | Value |
| ----- | ----- |
| **Status** | Draft implementation |
| **Linear** | [SPE-911](https://linear.app/spectranoir/issue/SPE-911/stakeholder-notification-matrix-and-escalation-thresholds) |
| **Branch** | `grok/spe-911-stakeholder-notification-matrix` |

## Boundary

Pure deterministic resolver that selects stakeholder classes, channels, and escalation flags from an incident impact/sensitivity/partner/acknowledgement profile. No message composition, communication mutation, or legitimacy policy.

## Acceptance covered

- Different stakeholder sets by impact/sensitivity
- Escalation on acknowledgement timeout
- Formal partner routing distinct from general audience
- Sensitivity-specific channel changes
- Targeted unit tests

## Validation plan

- `npm run test:run -- src/test/stakeholderNotificationMatrix.test.ts`
- lint/format on changed files
