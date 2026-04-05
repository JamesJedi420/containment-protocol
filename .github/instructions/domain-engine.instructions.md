---
description: 'Use when working in src/domain or src/app/store — sim engine rules, RNG seeding, state mutation patterns, scoring, spawning, advanceWeek.'
applyTo: 'src/domain/**, src/app/store/**, src/data/**, src/test/**'
---

# Engine Layer Rules

- IDs must be deterministic: derive from seeded RNG + `usedIds` set. Never use `Math.random()` or module-level counters in sim paths.
- `advanceWeek.ts` is the source of truth for parent escalation mutations (`stage`, `deadlineRemaining`, raid conversion).
- `spawn.ts` must only add child cases for failure/unresolved flows — no parent mutations (prevents double-escalation).
- Sim functions must be pure; side effects belong in the store, not in `src/domain/sim/**`.
- All new sim behavior requires a corresponding test in `src/test/sim.*.test.ts`.
- Do not import from `src/features/**` or any UI layer.

## Type Change Freeze

Modifying `src/domain/models.ts` is a **blocking change**. Stop all other work, notify the user, and wait for the change to be merged and tests to pass before resuming.
