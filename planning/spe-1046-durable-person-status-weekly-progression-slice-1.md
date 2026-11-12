# SPE-1046 - Durable person-status weekly progression (slice 1)

One-page implementation plan. Linear: [SPE-2520](https://linear.app/spectranoir/issue/SPE-2520/durable-person-status-weekly-progression) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2519](https://linear.app/spectranoir/issue/SPE-2519/durable-person-status-surfacing-for-operations-mirror); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2520 - Durable person-status weekly progression](https://linear.app/spectranoir/issue/SPE-2520/durable-person-status-weekly-progression) |
| **Status**          | **In Progress**                                                                                                                               |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog**           |
| **Branch**          | `spe-1046-durable-person-status-weekly-progression-slice-1`                                                                                   |
| **Base `main` SHA** | `543f837a`                                                                                                                                    |

## Goal

Add conservative weekly progression for durable `affiliationPersonStatusRecords` so authored onboarding, access, and review evidence can advance during `advanceWeek` while durable records remain read-only for mission routing.

## Scope

| In                                                                 | Out                                               |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| Optional `weeklyProgression` entries on durable person-status data | Mission assignment blockers from durable records  |
| Hydrate/import sanitizer for progression entries                   | New UI beyond existing persisted record mirrors   |
| Pure weekly tick helpers with idempotent evidence merge            | Procurement, facility, or non-mission enforcement |
| `advanceWeek` orchestration after entity-welfare records tick      | SPE-947 propagation follow-ons                    |
| Weekly report notes for bounded field changes                      | SPE-1046 parent closure                           |
| Report-note allowlists, metadata allowlist, grouping, and audit    |                                                   |

## Acceptance

- [x] Valid `weeklyProgression` entries survive hydrate/import and invalid entries are dropped.
- [x] Progression evidence arrays are trimmed, deduped, and sorted.
- [x] Weekly tick applies due entries, skips future entries, and is idempotent.
- [x] Existing evidence is never removed; array fields are unioned and persisted progression entries remain for audit.
- [x] Weekly report notes emit only when bounded person-status fields change.
- [x] `advanceWeek` progresses seeded durable records and leaves mission routing behavior unchanged.
- [x] Targeted tests, lint, touched-file Prettier check, and full test suite pass before PR.

## Validation

- `npm.cmd run test:run -- src/test/affiliationPersonStatusRecords.test.ts src/test/affiliationPersonStatusRecordsPersistence.test.ts src/test/affiliationPersonStatusWeeklyProgression.test.ts src/test/advanceWeek.affiliationPersonStatus.integration.test.ts src/test/reportNoteTypeAudit.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

Passed so far:

- `npm.cmd run test:run -- src/test/affiliationPersonStatusRecords.test.ts src/test/affiliationPersonStatusRecordsPersistence.test.ts src/test/affiliationPersonStatusWeeklyProgression.test.ts src/test/advanceWeek.affiliationPersonStatus.integration.test.ts src/test/reportNoteTypeAudit.test.ts` (5 files / 23 tests)
- `npm.cmd run lint`
- `npm.cmd exec prettier -- --check ...` for touched files
- `npm.cmd run test:run` (681 files / 6587 tests)

## Deferred

| Item                                               | Owner                    | Why                                                        |
| -------------------------------------------------- | ------------------------ | ---------------------------------------------------------- |
| Mission routing from durable person-status records | SPE-1046 follow-up child | This slice preserves explicit team/member tag enforcement. |
| Procurement/facility/non-mission enforcement       | SPE-1046 follow-up child | Separate gate surfaces and policy.                         |
| SPE-947 propagation follow-ons                     | SPE-947 follow-up child  | Separate registry parent thread.                           |

## See also

- `planning/spe-1046-durable-person-status-records-slice-1.md`
- `planning/spe-1046-durable-person-status-surfacing-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
