# SPE-3088 — Paid equipment repair settlement

| Field      | Value                                                                             |
| ---------- | --------------------------------------------------------------------------------- |
| **Status** | **Recently shipped** (effective on merge)                                         |
| **Linear** | [SPE-3088](https://linear.app/spectranoir/issue/SPE-3088)                         |
| **Parent** | [SPE-877](https://linear.app/spectranoir/issue/SPE-877) remains Backlog           |
| **Branch** | `jamesdyedbq/spe-3088-paid-equipment-repair-settlement-and-condition-restoration` |
| **Base**   | `2a9144e816a91d9904d274583f593e43ab0ab36f`                                        |

## Boundary and plan

Compose the SPE-2851 stored-instance transition and SPE-2861/SPE-2870/SPE-3140 part gates with the canonical funding authority. A fixed $100 integer quote is configuration for this slice. Confirmations retain the displayed quote and execution rechecks eligibility, funding and price. One success atomically consumes any required named part, restores condition, debits funding mirrors and records a funding expense. Any failed check returns the original state with no debit, part consumption or success event. A repaired identity cannot settle a second time until separately damaged again.

The existing repair event carries an optional paid cost; old events remain valid and hydration never replays settlement. Both Equipment surfaces show the quote and return the authoritative result to the player. Sticky deficiency and other repair gates remain owned by existing systems.

Funding-history normalization retains distinct same-week payments for the same identity after a new damage transition. The store computes and commits against one updater snapshot; legacy missing agency state is normalized from its canonical mirrors.

## Validation

- Focused equipment, store, event and hydration tests: 626 passed; final settlement/UI rerun: 42 passed.
- Full suite after review fixes: 970 files / 10,574 tests passed; targeted store, UI, and hydration regression rerun: 557 passed.
- Lint, 11 Playwright tests, backlog handoff and changed-file formatting passed. The combined requirements runner could not launch its subprocesses on Windows; its required checks were run directly.
- Scope/integration, edge cases, deterministic state, regression, documentation and cleanup passes found no remaining in-boundary defects. TypeScript build retains documented baseline errors in unchanged lines.

## Deferred

| Item                                       | Existing owner | Boundary                                                  |
| ------------------------------------------ | -------------- | --------------------------------------------------------- |
| Stock provisioning and facility logistics  | SPE-1027       | Existing named-part consumer only.                        |
| Broader integrity and technician lifecycle | SPE-877        | Condition repair does not clear sticky deficiencies.      |
| Payment infrastructure                     | SPE-1165       | Canonical agency funding suffices for this bounded debit. |
