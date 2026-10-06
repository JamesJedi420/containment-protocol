# SPE-3147 — Canonical operational staff posts

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **Status**        | **Recently shipped**                                      |
| **Linear**        | [SPE-3147](https://linear.app/spectranoir/issue/SPE-3147) |
| **Parent**        | SPE-3134 — remains Backlog                                |
| **Branch**        | `cursor/spe-3147-operational-staff-posts`                 |
| **Base main SHA** | `57d079241e0cb1f8488d742d38b5a344d6252ee9`                |

## Approved boundary

The user confirmed the existing SPE-3147 boundary as approved and authorized the complete plan, including eight specialty posts (two each for analysis, intel, logistics and fabrication). No additional issues or durable scope are authorized.

## Contract

- Live non-instructor staff own optional `operationalPostId`; absence means unassigned. Canonical roster keys identify staff. Recruitment `assignmentType` remains background metadata. Hiring never copies operational occupancy from candidate input.
- The immutable catalog contains `staff-post:<specialty>:<1|2>` identities. Exact normalized specialty matching qualifies staff; `intelligence` normalizes to `intel`. Each post admits one occupant. Posts confer no capacity, bonuses, resources or throughput here.
- Pure assign/reassign/unassign commands return `{ game, status, reason }`. Requests include expected prior post (`null` means unassigned). Same-destination repetition is a no-op; other prior-state mismatches block as stale. Invalid state, identity, specialty, destination or occupancy blocks without mutation. Reassignment validates the destination before replacing the prior reference.
- `queryOperationalStaffPost` derives assignment truth from the roster. Store actions revalidate against current GameState. No second occupancy registry exists.
- Staff hydration drops invalid references before legacy specialty normalization. Every claimant to a duplicate post loses that reference, including malformed/incompatible claimants. Legacy staff remain unassigned. Save-envelope version 7 and event schemas are unchanged.
- Existing duty, readiness, competency and operation-claim systems provide no restrictions for these live non-instructor records. Do not invent those states or apply agent-only checks. Instructor assignment and specialist-slot mappings retain their owners.

## Validation

- Initial assignment/persistence/hiring/instructor run: 4 files / 42 tests passed. Final targeted assignment/persistence/specialist/instructor run: 5 files / 47 tests passed, including the additional eight-post and stale-unassignment assertion.
- Full regression: 858 files / 9,330 tests passed. Lint, audit-index, theme-contract and backlog-handoff verifiers passed. Six iterative pre-ship audit passes have no unresolved in-boundary findings.
- Typechecking reports documented baseline drift; two new storage-test type errors were fixed. New domain/test contracts introduce no additional type errors. Build is not used as a deployment gate for this slice.
- Full formatting reports pre-existing drift in 2,640 files; the baseline backlog also fails formatting. Changed source/new tests/slice/schema/manifest formatting passes. Preserve unrelated persistence-document code-block formatting.
- Local Node 24; hosted CI validates Node 22. Repository Recently shipped denotes the merge-ready handoff; Linear remains In Progress until merge. Independent full-diff review and hosted CI are pending.

Advisor consultation is unavailable because its required launcher escalation is prohibited by the session tool policy. Root owns verification.

## Deferred

No approved in-boundary deferrals. Capacity derivation belongs to SPE-3135; staffing UI to SPE-3136; specialist week-close adoption to SPE-3148; staff-time allocation to SPE-3291; maintenance conversion to SPE-3292. These existing downstream boundaries are not implemented here. No new candidate scope is identified.
