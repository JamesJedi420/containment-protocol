# SPE-521 — Infiltration civilian long-horizon roles (case prep)

One-page implementation plan. Linear: [SPE-2461](https://linear.app/spectranoir/issue/SPE-2461) (child under [SPE-521](https://linear.app/spectranoir/issue/SPE-521)). Follows shipped [role branches per zone](planning/infiltration-role-branches-zone-slice.md) (PR #2828 @ `192986f8`).

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | [SPE-2461](https://linear.app/spectranoir/issue/SPE-2461) — civilian long-horizon roles case prep |
| **Parent** | [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (Backlog)   |
| **Branch** | `spe-521-infiltration-civilian-long-horizon-roles`                    |
| **Status** | Shipped (PR #2830 @ `2cf23287`)                                      |
| **Base `main` SHA** | `813b1daf`                                                   |

## Goal

Expose a **minimal deterministic civilian long-horizon role read model** on the infiltration case-prep panel — embed archetype, sustain posture, and context labels for `civilian_staff` cases with `civilian` + long-horizon context tags — without duplicating role-branch zone copy, guides/documents labels, or cover strain notes.

## Prerequisite (on `main` @ `813b1daf`)

| Shipped | Anchor |
| ------- | ------ |
| Cover role + civilian tag sets | `infiltrationCover.ts` (`civilian_staff`, `INFILTRATION_PROCEDURAL_SCRUTINY_TAGS`) |
| Role branches prep pattern | `infiltrationEncounterRoleBranches.ts` |
| Guides/documents prep pattern | `infiltrationEncounterGuidesDocuments.ts` |
| Case prep panel | `InfiltrationCasePrepPanel.tsx`, `infiltrationCasePrepView.ts` |
| Report encounter copy | `infiltrationEncounterReportNotes.ts` |

## Scope (this slice)

| In | Out |
| -- | --- |
| `projectInfiltrationEncounterCivilianLongHorizonRoles` domain projection | Mission triage refresh |
| Eligibility: `civilian_staff` + `civilian` tag + long-horizon context tags | Front Desk attention (SPE-2460) |
| Case prep section + prep encounter note surfacing | New probe mechanics |
| Domain + prep view integration tests | SPE-2250 batch-4+ content migration |
| Slice doc + backlog handoff | Disguise validation changes (SPE-2242) |
| Parent SPE-521 reopened to Backlog | Non-uniform identity trees |
| | Weekly posture evaluation changes |

## Eligibility

- In-progress, infiltration-probe-eligible case with cover profile
- `claimedRole === civilian_staff`
- Case tags include `civilian`
- At least one tag from `INFILTRATION_CIVILIAN_LONG_HORIZON_CONTEXT_TAGS` (`witness`, `interview`, `memory`, `public`, `market`, `crowd`, `ritual`)

## Acceptance

- [x] Eligible cases show archetype, sustain, and context labels on case prep
- [x] Projection empty for resolved/open, ineligible, non-civilian, or non-long-horizon cases
- [x] Prep encounter preview includes embed summary when projection visible
- [x] Does not duplicate role-branch, guides/documents, cover-strain, or report friction copy
- [x] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/infiltrationEncounterCivilianLongHorizonRoles.ts` |
| Report | `src/domain/infiltrationEncounterReportNotes.ts` |
| View | `src/features/cases/infiltrationCasePrepView.ts`, `InfiltrationCasePrepPanel.tsx` |
| Tests | `src/test/infiltrationEncounterCivilianLongHorizonRoles.test.ts`, `src/test/infiltrationCasePrepView.test.ts`, `src/test/infiltrationEncounterReportNotes.test.ts` |
| Plan | `planning/infiltration-civilian-long-horizon-roles-slice.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Non-uniform identity trees | SPE-521 parent | Separate parent scope row — **In Progress** `planning/infiltration-non-uniform-identity-trees-slice.md` (SPE-2463) |
| SPE-2250 batch-4+ template stacks | SPE-2250 follow-up | Content-only deferral |
| Authored per-template long-horizon archetype overrides | SPE-521 follow-up | Tag-heuristic slice sufficient for prep surfacing |

## See also

- `planning/infiltration-role-branches-zone-slice.md`
- `planning/infiltration-guides-documents-slice.md`
