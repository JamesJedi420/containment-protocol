# SPE-1046 - Durable person-status surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2519](https://linear.app/spectranoir/issue/SPE-2519/durable-person-status-surfacing-for-operations-mirror) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2518](https://linear.app/spectranoir/issue/SPE-2518/durable-person-status-records); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2519 - Durable person-status surfacing for operations mirror](https://linear.app/spectranoir/issue/SPE-2519/durable-person-status-surfacing-for-operations-mirror) |
| **Status**          | **In Progress**                                                                                                                                                         |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**                                     |
| **Branch**          | `spe-1046-durable-person-status-surfacing-slice-1`                                                                                                                      |
| **Base `main` SHA** | `fcbaba0b`                                                                                                                                                              |

## Goal

Surface the durable `affiliationPersonStatusRecords` substrate in a read-only operations mirror so operators can inspect persisted person-status evidence and composed SPE-1046 projection outcomes before weekly mutation or enforcement is wired to those records.

## Scope

| In                                                                  | Out                                                       |
| ------------------------------------------------------------------- | --------------------------------------------------------- |
| Read-only view helper over `affiliationPersonStatusRecords`         | New GameState fields or hydrate/save persistence changes  |
| Route/page/nav entry for a durable person-status operations mirror  | Weekly mutation/progression                               |
| Compact summary stats and deterministic record table                | Mission routing or other enforcement from durable records |
| Labels for links, onboarding, permissions, clearance, risk outcomes | Procurement, facility, or non-mission gates               |
| Missing-reference reason labels from the projection snapshot        | SPE-1046 parent closure                                   |
| Focused view/page and route/nav tests                               | SPE-947 propagation follow-ons                            |
| Backlog handoff update                                              |                                                           |

## Record Surfacing Contract

- Read only from `game.affiliationPersonStatusRecords`, candidate records, and entity-welfare reclassification records.
- Call the shipped person-status projection helper; do not duplicate evaluator logic in the view.
- Sort records by durable record id and keep summary counts deterministic.
- Show subject id/label, optional candidate and welfare refs, permission/onboarding/site/dual-loyalty/protected-status/revocation labels, and projection reason codes.
- Missing linked candidate or welfare records should display explicit missing-ref labels, not silently disappear.
- Empty state should mirror existing operations registry pages: hydrated records only, no re-validation of dropped entries.

## Acceptance

- [x] Durable person-status mirror route/page renders an empty state and populated state.
- [x] View helper returns byte-stable sorted rows and summary counts.
- [x] Projection labels are derived from existing SPE-1046 snapshot decisions only.
- [x] Front Desk or operations navigation exposes the mirror without changing unrelated routes.
- [x] Existing SPE-1046 mission-routing gates continue to use explicit team/member tags only.
- [x] Targeted tests, lint, touched-file Prettier check, and full test suite pass before PR.

## Validation

- `npm.cmd run test:run -- src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx src/app/App.test.tsx`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

Passed in implementation:

- `npm.cmd run test:run -- src/features/operations/affiliationPersonStatusMirrorView.test.ts src/features/operations/AffiliationPersonStatusMirrorPage.test.tsx src/app/App.affiliationPersonStatus.route.test.tsx src/app/appRouteNavParity.test.ts`
- `npm.cmd run lint`
- `npm.cmd exec prettier -- --check ...` for touched files
- `npm.cmd run test:run` (679 files / 6573 tests)

## Deferred

| Item                                               | Owner                    | Why                                                         |
| -------------------------------------------------- | ------------------------ | ----------------------------------------------------------- |
| Weekly person-status progression                   | SPE-1046 follow-up child | Requires mutation cadence and policy beyond read-only view. |
| Mission routing from durable person-status records | SPE-1046 follow-up child | Existing explicit tag gates remain unchanged in this slice. |
| Procurement/facility/non-mission enforcement       | SPE-1046 follow-up child | Separate gate surfaces.                                     |
| SPE-947 propagation follow-ons                     | SPE-947 follow-up child  | Separate registry parent thread.                            |

## See also

- `planning/spe-1046-durable-person-status-records-slice-1.md`
- `planning/spe-1046-revocation-enforcement-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
