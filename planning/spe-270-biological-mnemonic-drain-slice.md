# SPE-270 — Biological and mnemonic drain

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **In Progress**                                         |
| **Linear** | [SPE-270](https://linear.app/spectranoir/issue/SPE-270) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-270-biological-mnemonic-drain`                |
| **Base**   | `bfdea122`                                              |

## Boundary and plan

Pure `src/domain/biologicalMnemonicDrain.ts`: dual biological + mnemonic drain with persistent stolen-cognition payload and typed aftermath families. No neurology sandbox or GameState.

## Deferred

| Item                        | Owner    | Boundary                                    |
| --------------------------- | -------- | ------------------------------------------- |
| Live attrition / week-close | SPE-1052 | Parent facility sim owns week-close wiring. |
| Knowledge-state integration | SPE-1051 | Clarity/knowledge owners stay separate.     |
