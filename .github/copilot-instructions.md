# Containment Protocol — Agent Division of Labor

This project uses two agents with exclusive file boundaries.

## Ownership

| Agent       | Files                               | Responsibilities                                          |
| ----------- | ----------------------------------- | --------------------------------------------------------- |
| **Codex**   | `src/domain/**`, `src/app/store/**` | Rules, math, state transitions, persistence, engine tests |
| **Copilot** | `src/features/**`, `src/styles/**`  | Components, layout, Tailwind, copy, static content        |

## Hard Rule — Type Change Freeze

If any task modifies shared types in `src/domain/models.ts`, ALL parallel agent work must
stop immediately. Do not make further edits in either agent's files until the type-change
task is merged and all tests pass.
