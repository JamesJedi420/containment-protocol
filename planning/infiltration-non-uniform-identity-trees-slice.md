# SPE-521 — Infiltration non-uniform identity trees (case prep)

One-page implementation plan. Linear: [SPE-2463](https://linear.app/spectranoir/issue/SPE-2463) (child under [SPE-521](https://linear.app/spectranoir/issue/SPE-521)). Follows shipped [civilian long-horizon roles](planning/infiltration-civilian-long-horizon-roles-slice.md) (PR #2830 @ `2cf23287`).

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | [SPE-2463](https://linear.app/spectranoir/issue/SPE-2463) — non-uniform identity trees case prep |
| **Parent** | [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (Backlog)   |
| **Branch** | `spe-521-infiltration-non-uniform-identity-trees`                     |
| **Status** | Shipped (PR #2833 @ `ce8aa09b`)                                      |
| **Base `main` SHA** | `5a40a92f`                                                   |

## Goal

Expose a **minimal deterministic non-uniform / non-institutional identity tree read model** on the infiltration case-prep panel — vendor-style archetype, posture, and branch labels for `courier` and `maintenance` cases with role-specific context tags — without duplicating role-branch zone copy, civilian long-horizon labels, guides/documents labels, or cover strain notes.

## Prerequisite (on `main` @ `5a40a92f`)

| Shipped | Anchor |
| ------- | ------ |
| Cover role sets | `infiltrationCover.ts` (`INFILTRATION_NON_UNIFORM_IDENTITY_COVER_ROLES`, `isNonUniformIdentityCoverRole`) |
| Civilian long-horizon pattern | `infiltrationEncounterCivilianLongHorizonRoles.ts` |
| Role branches prep pattern | `infiltrationEncounterRoleBranches.ts` |
| Case prep panel | `InfiltrationCasePrepPanel.tsx`, `infiltrationCasePrepView.ts` |
| Report encounter copy | `infiltrationEncounterReportNotes.ts` |

## Scope (this slice)

| In | Out |
| -- | --- |
| `projectInfiltrationEncounterNonUniformIdentityTrees` domain projection | Mission triage refresh |
| Eligibility: `courier` or `maintenance` + role-specific context tags | Front Desk attention (SPE-2460) |
| Case prep section + prep encounter note surfacing | New probe mechanics |
| Domain + prep view integration tests | SPE-2250 batch-4+ content migration |
| Slice doc + backlog handoff | Disguise validation changes (SPE-2242) |
| Parent SPE-521 deferred row updated | Weekly posture evaluation changes |

## Eligibility

- In-progress, infiltration-probe-eligible case with cover profile
- `claimedRole` is `courier` or `maintenance` (`INFILTRATION_NON_UNIFORM_IDENTITY_COVER_ROLES`)
- At least one tag from role-specific context sets:
  - Courier: `logistics`, `relay`, `supply-chain`, `cyber`, `parade`
  - Maintenance: `archive`, `records`, `forensics`, `infrastructure`, `vault`, `seal`
- Excludes institutional roles (`uniform_guard`, `civilian_staff`, `official_inspector`) and civilian long-horizon eligibility (`civilian_staff` + `civilian` tag)

## Acceptance

- [x] Eligible cases show archetype, posture, and branch labels on case prep
- [x] Projection empty for resolved/open, ineligible, institutional roles, or missing context tags
- [x] Prep encounter preview includes identity summary when projection visible
- [x] Does not duplicate role-branch, civilian long-horizon, guides/documents, cover-strain, or report friction copy
- [x] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/infiltrationCover.ts`, `src/domain/infiltrationEncounterNonUniformIdentityTrees.ts` |
| Report | `src/domain/infiltrationEncounterReportNotes.ts` |
| View | `src/features/cases/infiltrationCasePrepView.ts`, `InfiltrationCasePrepPanel.tsx` |
| Tests | `src/test/infiltrationEncounterNonUniformIdentityTrees.test.ts`, `src/test/infiltrationCasePrepView.test.ts`, `src/test/infiltrationEncounterReportNotes.test.ts` |
| Plan | `planning/infiltration-non-uniform-identity-trees-slice.md`, `planning/backlog.md`, `planning/infiltration-civilian-long-horizon-roles-slice.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| SPE-2250 batch-4+ template stacks | SPE-2250 follow-up | Content-only deferral |
| Authored per-template non-uniform identity overrides | SPE-521 follow-up | Tag-heuristic slice sufficient for prep surfacing |
| Parent SPE-521 closure | SPE-521 parent | Remaining parent acceptance after this slice |

## See also

- `planning/infiltration-civilian-long-horizon-roles-slice.md`
- `planning/infiltration-role-branches-zone-slice.md`
