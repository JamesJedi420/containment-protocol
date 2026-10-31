# SPE-2172 — Triggered anomaly-rule reveal registry (slice 1)

| Field      | Value                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped** (effective on merge)                                                                |
| **Linear** | [SPE-2172](https://linear.app/spectranoir/issue/SPE-2172/triggered-anomaly-rule-reveal-registry-slice-1) |
| **Parent** | [SPE-1317](https://linear.app/spectranoir/issue/SPE-1317), independently evaluated                       |
| **Branch** | `jamesdyedbq/spe-2172-triggered-anomaly-rule-reveal-registry-slice-1`                                    |
| **Base**   | `c8bdc9a114fbe6da3ee997b9162cc7d3f1d7fc09`                                                               |

## Boundary and plan

Add a pure deterministic registry for anomaly rules that remain hidden until a matching high-impact action has completed its required setup and reaches an authored magnitude threshold. A triggered reveal exposes procedure references, changes the caller-visible response scale, and blocks the action when player acknowledgement is required but absent.

## Resolution contract

- An unrelated anomaly or action remains hidden and does not leak rule or procedure details.
- A matching action with incomplete setup remains hidden and cannot proceed.
- A matching action below its magnitude threshold remains hidden at the pre-reveal response scale.
- A matching action at or above the threshold reveals its rule and procedure references.
- A required acknowledgement blocks proceeding until the caller supplies the rule id in acknowledged state.
- Inputs, registry records, setup state, and acknowledgement state remain caller-owned and immutable.

## Ownership and deferrals

| Item                                           | Owner    | Boundary                                                                                |
| ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Interaction-package magnitude fields and tiers | SPE-1033 | SPE-2183 was canceled and folded here; this slice consumes the reference vocabulary.    |
| Anomaly effect execution and consequences      | SPE-1033 | No effect runner, consequence mutation, cadence, stacking, or resistance behavior here. |
| Persistence / hydration                        | Future   | Slice 1 accepts acknowledgement and setup state as caller-owned inputs.                 |
| Player-facing reveal presentation              | Future   | This slice returns a typed projection only; it adds no UI.                              |

## Validation

- `npm run test:run -- src/test/triggeredAnomalyRuleRevealRegistry.test.ts` — 1 file / 10 tests passed
- `npm run test:run` — 984 files / 10,666 tests passed
- `npm run lint`
- `npx prettier --check src/domain/triggeredAnomalyRuleRevealRegistry.ts src/test/triggeredAnomalyRuleRevealRegistry.test.ts planning/spe-2172-triggered-anomaly-rule-reveal-registry-slice.md`
- `npm run verify:backlog-handoff`
- `git diff --check`
