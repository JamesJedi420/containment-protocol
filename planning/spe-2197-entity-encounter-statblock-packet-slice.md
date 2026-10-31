# SPE-2197 — Entity encounter statblock packet extension (slice 1)

| Field      | Value                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped** (effective on merge)                                                                     |
| **Linear** | [SPE-2197](https://linear.app/spectranoir/issue/SPE-2197/entity-encounter-statblock-packet-extension-slice-1) |
| **Parent** | [SPE-1112](https://linear.app/spectranoir/issue/SPE-1112), independently evaluated                            |
| **Branch** | `jamesdyedbq/spe-2197-entity-encounter-statblock-packet-extension-slice-1`                                    |
| **Base**   | `2eee7fc845a4950c6575921a444abd8f582f7aec`                                                                    |

## Boundary and plan

Add a pure deterministic entity encounter packet for mobility, morale, senses, protection, immunities, weaknesses, actions, recharge behavior, passive traits, and provenance. The packet validates and projects authored encounter summaries without resolving combat, AI, damage, morale, recharge, statuses, or persistence.

## Packet contract

- Encounter mobility and sense vocabularies are packet-facing summaries rather than replacements for the SPE-1064 actor taxonomy.
- Morale is an authored integer threshold from 0 through 100; this slice does not execute morale transitions.
- Protection, immunity, and weakness channels are validated, and immunity cannot contradict weakness for the same channel.
- Actions carry CP-neutral delivery and outcome references. Recharge entries must reference an authored action and use one coherent interval or caller-owned state-reset rule.
- Passive traits carry metadata and effect references only; this slice does not execute effects.
- Projection preserves stable field order, deep-freezes nested summary fields, and does not mutate source records.

## Ownership and deferrals

| Item                             | Owner    | Boundary                                                                           |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| Shared actor/capability taxonomy | SPE-1064 | Actor reference and owner metadata only; no actor vocabulary or runtime expansion. |
| Living-process substrate schema  | SPE-1112 | Optional substrate-profile reference only; no substrate lifecycle implementation.  |
| Operational status registry      | SPE-2166 | Status references and owner metadata only; no status application or mutation.      |
| Tactical encounter runner and AI | SPE-2847 | No action selection, damage, recharge ticking, targeting, or encounter execution.  |
| Persistence, hydration, and UI   | Future   | No GameState, store, feature projection, or presentation wiring in slice 1.        |

## Validation

- Focused packet, adjacent-owner, and boundary tests: 35 passed.
- `npm run verify:requirements -- --base origin/main`: required backlog handoff, lint, and
  10,695 unit tests passed; advisory Playwright passed 11 tests.
- `npm run verify:backlog-handoff`: passed.
- Changed source, test, and slice files pass ESLint and Prettier.
- `git diff --check`: passed.
- Whole-tree Prettier remains an advisory baseline failure. The same check fails for the
  `origin/main` versions of both touched handoff files, alongside existing repository-wide drift.
