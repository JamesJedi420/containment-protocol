# SPE-3135 — Canonical operational staff capacity

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **Status**        | **Recently shipped**                                      |
| **Linear**        | [SPE-3135](https://linear.app/spectranoir/issue/SPE-3135) |
| **Parent**        | SPE-3134 — remains Backlog                                |
| **Branch**        | `cursor/spe-3135-operational-staff-capacity`              |
| **Base main SHA** | `2adeff7afeae0ecb7e384d485302e07b39baf266`                |

## Approved boundary

The user confirmed the existing SPE-3135 boundary and approved implementation of the complete plan. SPE-3147 is Done with PR #4183 merged. Consume its eight canonical post references; each usable occupant contributes one capacity unit. No additional issues or durable scope are authorized.

## Contract

- `deriveOperationalStaffCapacity(game)` returns readonly overall and per-specialty headcount, available, assigned and effective-capacity counts, per-person contribution/reason data keyed by canonical roster ID, and fixed-size reason counts.
- Headcount includes recognized non-instructor staff, including unassigned records and records with invalid assignments. Available equals headcount because these records have no existing authoritative availability restrictions. Assigned means a valid, uniquely occupied canonical post; effective capacity equals assigned, one unit each.
- Exclude instructors and malformed/unsupported records from every count. Invalid or duplicate references exclude recognized staff from assignment/capacity only. Preserve the `intelligence` alias. Recruitment metadata, agent condition and specialist slots establish neither occupancy nor staff availability.
- `queryOperationalStaffPosts` shares canonical post validation with the single-person query. One roster snapshot counts all raw string claims before evaluating entries; incompatible/malformed claimants invalidate duplicate occupancy. Aggregate derivation performs bounded linear work and does not mutate input.
- Outputs are ephemeral domain queries. No persistence, migration, second roster, availability registry, cached capacity, throughput weighting, store action or runtime dependency is introduced.

## Validation

- Targeted capacity/post/persistence tests: 3 files / 25 tests passed, including a 2,000-person instrumented traversal bound.
- Full regression: 859 files / 9,336 tests passed, including boundary enforcement and specialist/instructor regressions. Lint, audit-index, theme-contract and backlog-handoff verifiers passed.
- Changed source/tests/slice/manifest formatting and diff whitespace checks pass. Backlog and persistence-reference formatting also fail on baseline main; preserve unrelated formatting.
- Typechecking reports documented baseline drift (673 diagnostics), with no diagnostics in changed capacity/post files. Build is not a deployment gate for this slice. Local Node 24; hosted CI validates Node 22.
- Six iterative pre-ship audit passes (scope/integration, edge cases, determinism/state, regression, documentation and cleanup) found no unresolved in-boundary findings.
- Recently shipped denotes the merge-ready repository handoff; Linear remains In Progress until merge. Verify hosted CI and full independent diff review before merge.

Advisor consultation remains unavailable: its required launcher escalation is prohibited by session policy. Root owns verification.

## Deferred

No approved in-boundary deferrals or new candidate scope. Existing downstream boundaries remain separate: SPE-3136 staffing UI; SPE-3148 specialist week-close adoption; SPE-3291 staff-time allocation; SPE-3292 maintenance conversion. Parent SPE-3134 remains Backlog until its full completion rule is met.
