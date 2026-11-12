# SPE-3148 — Canonical staff capacity in specialist week-close

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **Status**        | **Recently shipped**                                      |
| **Linear**        | [SPE-3148](https://linear.app/spectranoir/issue/SPE-3148) |
| **Parent**        | SPE-3134 — remains Backlog                                |
| **Branch**        | `cursor/spe-3148-specialist-operational-capacity`         |
| **Base main SHA** | `5cffe2fb11cc860ac04da5f6aebacc6ebac3b9c3`                |

## Approved boundary

The user explicitly confirmed the existing boundary and authorized the complete plan. SPE-3135 and SPE-3147 are Done, merged through PRs #4190 and #4183. SPE-3116 and SPE-3118 remain Done. SPE-2266 is related, not blocking. SPE-1058 currently remains Backlog despite historical text calling its gate completed; preserve the shipped gate and truthful issue state.

## Contract

- Resolve specialist slots on the workshop input-week snapshot. Derive canonical capacity once; positive per-person availability and effective capacity qualify mapped analysis staff. Recruitment metadata never establishes occupancy.
- Preserve investigator precedence and one authored competent/fit archive slot regardless of eligible headcount. Assignment is eligibility, not competency authority.
- Production-shaped caches survive only while an investigator or usable mapped staff remains. Clear stale caches to absence and materialize only when absent. Intentional empty lists and non-production saved shapes remain persisted unchanged.
- When analysis staff exist but none are usable and no investigator exists, transiently remove archive analysts from resolved saved or campaign slots. Preserve containment slots. Never persist the filtered list. No mapped personnel retains legacy campaign recovery.
- Low-level authored mapping/parsing helpers retain compatibility. No persistence, schema, availability field, competency band formula, workshop gate or second capacity authority is added.

## Validation

- Final focused run: 27 tests passed, including 13 new resolver/week-close regressions. Earlier mapping/feed/persistence/capacity runs also passed.
- Full regression: 860 files / 9,349 tests passed via `npm run test:run:ci -- --maxWorkers=4 --reporter=dot`. Default and bounded local VM-thread runs failed at the worker/runtime level under Node 24; no settings were weakened. Hosted CI validates Node 22.
- Lint, audit index, backlog handoff and theme contract verifiers pass. Changed source/tests/slice/manifest formatting and diff whitespace checks pass. Large touched docs have verified baseline formatting drift; preserve unrelated formatting.
- Final typecheck matches clean main: 673 diagnostics, with none added or removed after normalizing line offsets. No new resolver/test diagnostics. Build remains outside the deployment gate because of baseline drift.
- Six iterative pre-ship passes (scope/integration, edge cases, determinism/state, regression, documentation and cleanup) found no unresolved in-boundary findings.
- Repository Recently shipped denotes the merge-ready handoff; Linear remains In Progress until merge. Independent full-diff review and hosted CI are required before merge.

Advisor consultation is unavailable because its required escalated launcher is prohibited by session tool policy. Root owns verification.

## Deferred

No in-boundary deferrals or new candidate scope. Allocation remains SPE-3291; maintenance conversion SPE-3292; staffing UI SPE-3136; competency convergence SPE-2266/SPE-1059. Parent SPE-3134 remains Backlog until its complete boundary ships.
