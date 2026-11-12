# SPE-1046 - Durable person-status records (slice 1)

One-page implementation plan. Linear: [SPE-2518](https://linear.app/spectranoir/issue/SPE-2518/durable-person-status-records) (child under [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)). Follows [SPE-2517](https://linear.app/spectranoir/issue/SPE-2517/revocationdowngrade-enforcement-for-mission-routing); [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) parent stays **Backlog**.

| Field               | Value                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2518 - Durable person-status records](https://linear.app/spectranoir/issue/SPE-2518/durable-person-status-records)             |
| **Status**          | **In Progress**                                                                                                                     |
| **Parent**          | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) - affiliation, clearance, and membership status system; stays **Backlog** |
| **Branch**          | `spe-1046-durable-person-status-records-slice-1`                                                                                    |
| **Base `main` SHA** | `03fd0867`                                                                                                                          |

## Goal

Add the first durable person-status substrate for SPE-1046: persisted, sanitized evidence records plus a pure snapshot projection that composes the existing status permission, onboarding, site clearance, dual-loyalty, protected-status, and revocation evaluators.

## Scope

| In                                                       | Out                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `affiliationPersonStatusRecords` GameState persistence   | UI surfacing or navigation                                       |
| Sanitized durable evidence records keyed by record id    | Weekly mutation/progression                                      |
| Pure projection helper over existing SPE-1046 evaluators | New mission-routing enforcement or changes to explicit tag gates |
| Focused sanitizer/projection and hydrate/save tests      | Procurement, facility, or non-mission gates                      |
| Backlog handoff update                                   | SPE-1046 parent closure                                          |

## Record Contract

- Required fields: `id`, `subjectId`, `subjectLabel`.
- Optional links: `candidateRef`, `entityWelfareReclassificationRef`.
- Optional evidence: onboarding booleans, site/facility grants and restrictions, loyalty anchors/tags, protected status flags, revocation kind/cause/surfaces/trust/review refs.
- Hydration drops non-object records, missing required ids/labels, duplicate ids, and mismatched map keys.
- Invalid optional enums are omitted during sanitize; projection fallbacks stay inside the existing evaluators.
- Missing linked candidate or welfare records surface explicit missing-ref reason codes and do not fabricate access.

## Acceptance

- [x] Durable record type, fixtures, sanitizer, and snapshot projection helper added.
- [x] `GameState`, starting state, and hydrate/save import path preserve `affiliationPersonStatusRecords`.
- [x] Projection calls existing SPE-1046 evaluators only.
- [x] Snapshot maps are byte-stable and sorted by record id.
- [x] Existing mission routing continues to use explicit team/member tags only.
- [x] Targeted tests, lint, touched-file Prettier check, and full test suite pass before PR.

## Validation

- `npm.cmd run test:run -- src/test/affiliationPersonStatusRecords.test.ts src/test/affiliationPersonStatusRecordsPersistence.test.ts src/test/affiliationOnboardingReadiness.test.ts src/test/affiliationSiteClearance.test.ts src/test/affiliationDualLoyaltyRisk.test.ts src/test/affiliationProtectedStatusActions.test.ts src/test/affiliationRevocationOutcomes.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.
- Full `npm.cmd run test:run` before PR.

## Deferred

| Item                                               | Owner                    | Why                                           |
| -------------------------------------------------- | ------------------------ | --------------------------------------------- |
| UI surfacing for durable person-status records     | SPE-1046 follow-up child | This slice is persistence/projection only.    |
| Weekly person-status progression                   | SPE-1046 follow-up child | Requires policy for mutation cadence.         |
| Mission routing from durable person-status records | SPE-1046 follow-up child | Existing explicit tag gates remain unchanged. |
| Procurement/facility/non-mission enforcement       | SPE-1046 follow-up child | Separate gate surfaces.                       |
| SPE-947 propagation follow-ons                     | SPE-947 follow-up child  | Separate registry parent thread.              |

## See also

- `planning/spe-1046-revocation-enforcement-slice-1.md`
- `planning/spe-1046-revocation-downgrade-outcomes-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
