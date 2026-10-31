# SPE-2166 — Operational status expansion registry (slice 1)

| Field      | Value                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped** (effective on merge)                                                                              |
| **Linear** | [SPE-2166](https://linear.app/spectranoir/issue/SPE-2166/operational-status-expansion-registry-domains-tiers-stacking) |
| **Parent** | [SPE-1365](https://linear.app/spectranoir/issue/SPE-1365), independently evaluated                                     |
| **Branch** | `jamesdyedbq/spe-2166-operational-status-expansion-registry-domains-tiers-stacking`                                    |
| **Base**   | `b63da2c811a129cb9a57bf5569089ca47c86a464`                                                                             |

## Boundary and plan

Add a pure deterministic registry for physical, cognitive, emotional, legal, financial, social, and memory operational statuses. Records carry severity, stacking-policy references, duration-mode references, visibility, removal-path references, reviewed care-aware labels, reporting categories, and explicit owner references. The slice validates and projects authored records without resolving status behavior.

## Registry contract

- Every required operational domain has a representative fixture with severity, stacking, duration, removal, and reporting metadata.
- Stack-policy records reference SPE-780 and reject bounds that contradict the selected policy family.
- Duration-mode ids are validated through the shipped SPE-2191 vocabulary.
- Labels require reviewed, person-first metadata with neutral, supportive, or procedural tone.
- Legal, social, and memory rows retain their own domains and reporting categories instead of collapsing into physical injury or combat conditions.
- Projection preserves a stable field order, freezes its output, and does not mutate source records.

## Ownership and deferrals

| Item                                  | Owner    | Boundary                                                                     |
| ------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| Parent status-effect registry         | SPE-1365 | References ownership; does not extend the existing condition runtime.        |
| Effect stacking policy schema/runtime | SPE-780  | References and coherence checks only; no stacking application or mutation.   |
| Effect duration-mode vocabulary       | SPE-2191 | Reuses canonical ids and validation; no duration execution.                  |
| Trigger-counted duration runtime      | SPE-1369 | Ownership reference only; no counters, expiry hooks, or week-close behavior. |
| Persistence, hydration, and UI        | Future   | No GameState, store, feature projection, or presentation wiring in slice 1.  |

## Validation

- `npm run test:run -- src/test/operationalStatusExpansionRegistry.test.ts` — 1 file / 12 tests passed
- `npm run test:run` — 985 files / 10,680 tests passed
- `npm run test:e2e` — 11 Chromium tests passed
- `npm run lint`
- `npx prettier --check src/domain/operationalStatusExpansionRegistry.ts src/test/operationalStatusExpansionRegistry.test.ts planning/spe-2166-operational-status-expansion-registry-slice.md planning/backlog-handoff-manifest.json`
- `npm run verify:backlog-handoff`
- `git diff --check`
