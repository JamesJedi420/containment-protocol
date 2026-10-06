# SPE-3136 — Operational staffing capacity surfacing

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **Status**        | **In Progress**                                           |
| **Linear**        | [SPE-3136](https://linear.app/spectranoir/issue/SPE-3136) |
| **Parent**        | SPE-3134 — remains Backlog                                |
| **Branch**        | `cursor/spe-3136-operational-staffing-capacity`           |
| **Base main SHA** | `f2abee8ef8a3b4b3093bf5db2f979aed4e78182b`                |

## Approved boundary

The user approved display-only Agency Command capacity and warning surfacing. SPE-3135, SPE-3147 and SPE-3148 are Done. Assignment navigation is conditional on an existing approved destination; no production operational-post assignment destination exists. Do not add assignment controls, routes, recommendations or another personnel authority.

## Contract

- Derive capacity once per Agency projection snapshot through `deriveOperationalStaffCapacity(game)`. Expose its canonical counts and reason data without UI arithmetic or cached staffing state.
- Show operational staff headcount, assigned personnel and effective operational capacity with distinct labels. Preserve the separate Support Staff population and metrics.
- Explain unassigned personnel informationally and invalid/conflicting assignments separately, using canonical reason counts. Exclude instructors and unsupported records through the domain contract. Treat an invalid roster as unavailable rather than a usable zero.
- State that operational-post assignment navigation is currently unavailable when unassigned staff exist. Render no assignment link/control. Store assignment commands remain owned by SPE-3147.
- Keep presentation copy centralized, use a labeled article and definition list with polite atomic updates, and wrap metrics into one column on narrow screens. This read-only panel adds no input behavior or focus targets.
- No persistence, schema, simulation, dependency or store API changes.

## Validation

Focused projection/panel, Agency page, canonical capacity/post/store and boundary tests: 6 files / 49 tests passed, followed by a final 10-test panel run including separate Support Staff population coverage. Ten new tests cover canonical counts across empty, assigned, unassigned, mixed-specialty/alias, instructor/malformed and conflicting assignments; input immutability; live assign/reassign/unassign updates; unavailable data; centralized copy, semantic announcements and responsive classes.

- Lint, audit-index, backlog-handoff and theme-contract verifiers pass. Changed source/tests/slice/manifest formatting and whitespace checks pass; preserve unrelated backlog formatting drift.
- Final typechecking matches clean main exactly after line-offset normalization: 673 diagnostics, none introduced. Local Node 24; hosted CI validates Node 22. Baseline drift remains outside the deployment gate.
- Six iterative pre-ship passes (scope/integration, edge cases, determinism/state, regression, documentation and cleanup) found no unresolved in-boundary defects.
- Browser tooling reports no available browser. Semantic accessibility and responsive markup checks pass; visual narrow-screen browser QA remains unverified. The panel is read-only, adds no focus targets, and introduces no controller/keyboard/pointer/touch input behavior.
- Full regression passed: 861 files / 9,358 tests via bounded forks on local Node 24. The subsequently added separate Support Staff regression passed in the final 10-test focused run.
- PR [#4242](https://github.com/JamesJedi420/containment-protocol/pull/4242) carries this display-only delivery. Amazon Q review found no blocking defects; hosted CI and automatic Codex review must pass before merge. Keep Linear In Progress for the recorded acceptance qualification rather than claiming full issue or parent completion.

Advisor consultation is unavailable: its required escalated launcher is prohibited by session tool policy. Root owns verification and acceptance.

## Deferred

| Item                                                                       | Existing owner / disposition                                               | Boundary                                                                                                                                                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Operational-post assignment navigation                                     | SPE-3136 conditional navigation evidence; no existing approved destination | Display-only approval explicitly omits controls/links. A new screen/route is candidate scope requiring governance, not an instruction to create an issue.                                              |
| Direct action interpretation of actionable unassigned-personnel acceptance | SPE-3136 — open acceptance qualification                                   | Accurate reasons and unavailable-navigation copy ship now. Leave the issue open if direct navigation is required; do not claim full acceptance or parent completion merely from display-only delivery. |
| Raw null staff records in Agency overview                                  | Candidate evidence only; no issue created                                  | Existing `buildAcademyOverview` reads `entry[1].role` without a null guard. Defensive panel/projection tests are isolated; changing overview normalization is outside this slice.                      |
