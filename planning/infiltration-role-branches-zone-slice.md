# SPE-521 — Infiltration role branches per zone (case prep)

One-page implementation plan. Linear: child under [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (create on session start). Follows shipped [guides and documents](planning/infiltration-guides-documents-slice.md) (PR #2827 @ `b2df4866`).

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | Child under SPE-521 — infiltration role branches per zone case prep |
| **Parent** | [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (Done)      |
| **Branch** | `spe-521-infiltration-role-branches-zone`                             |
| **Status** | Shipped (PR #2828 @ `192986f8`)                                      |
| **Base `main` SHA** | `b2df4866`                                                   |

## Goal

Expose a **minimal deterministic role-branch read model** on the infiltration case-prep panel — zone/site tag compatibility keyed to `claimedRole` via `ROLE_INCOMPATIBLE_CASE_TAGS` — without duplicating weekly report copy, guides/documents labels, or cover strain notes.

## Prerequisite (on `main` @ `b2df4866`)

| Shipped | Anchor |
| ------- | ------ |
| Cover role mismatch table | `infiltrationCover.ts` (`ROLE_INCOMPATIBLE_CASE_TAGS`, `evaluateCoverRoleMismatchPressure`) |
| Guides/documents prep pattern | `infiltrationEncounterGuidesDocuments.ts` |
| Case prep panel | `InfiltrationCasePrepPanel.tsx`, `infiltrationCasePrepView.ts` |

## Scope (this slice)

| In | Out |
| -- | --- |
| `projectInfiltrationEncounterRoleBranches` domain projection | Mission triage refresh |
| Case prep section wired from projection | Front Desk attention (SPE-2460) |
| Domain + prep view integration tests | New probe mechanics |
| Slice doc + backlog handoff | SPE-2250 batch-4+ content migration |
| | Disguise validation changes (SPE-2242) |
| | Weekly posture evaluation changes |
| | Civilian long-horizon roles (broader parent scope) |

## Acceptance

- [ ] Eligible in-progress cases with cover profile show zone branch labels keyed to claimed role and active site tags
- [ ] Labels derive from `ROLE_INCOMPATIBLE_CASE_TAGS` + compatible-role branches only
- [ ] Projection empty for resolved/open or ineligible cases
- [ ] Does not duplicate report copy, guides/documents labels, or cover strain notes
- [ ] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/infiltrationCover.ts`, `src/domain/infiltrationEncounterRoleBranches.ts` |
| View | `src/features/cases/infiltrationCasePrepView.ts`, `InfiltrationCasePrepPanel.tsx` |
| Tests | `src/test/infiltrationEncounterRoleBranches.test.ts`, `src/test/infiltrationCasePrepView.test.ts` |
| Plan | `planning/infiltration-role-branches-zone-slice.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| SPE-2250 batch-4+ template stacks | SPE-2250 follow-up | Content-only deferral |
| Civilian long-horizon roles | **In Progress** — `planning/infiltration-civilian-long-horizon-roles-slice.md` (SPE-2461) | Follow-up slice under SPE-521 |

## See also

- `planning/infiltration-guides-documents-slice.md`
- `planning/infiltration-encounter-state-cover-slice.md`
