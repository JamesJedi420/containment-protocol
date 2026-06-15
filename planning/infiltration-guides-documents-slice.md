# SPE-521 — Infiltration guides and documents (case prep)

One-page implementation plan. Linear: child under [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (create on session start). Follows shipped [cover stance weekly tick](planning/infiltration-cover-stance-weekly-tick-slice.md) (PR #2826 @ `6279930b`).

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | Child under SPE-521 — infiltration guides/documents case prep       |
| **Parent** | [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (Backlog)   |
| **Branch** | `spe-521-infiltration-guides-documents`                               |
| **Status** | In Progress                                                           |
| **Base `main` SHA** | `fe7c8975`                                                   |

## Goal

Expose a **minimal deterministic guides/documents read model** on the infiltration case-prep panel — document tier labels, doctrine guide status, and scrutiny context — without duplicating weekly report sentence copy.

## Prerequisite (on `main` @ `fe7c8975`)

| Shipped | Anchor |
| ------- | ------ |
| Cover profile + scrutiny tags | `infiltrationCover.ts` (`documentTier`, `INFILTRATION_AUTHORITY_SCRUTINY_TAGS`) |
| Encounter-state cover projection | `infiltrationEncounterStateCover.ts` |
| Case prep panel | `InfiltrationCasePrepPanel.tsx`, `infiltrationCasePrepView.ts` |
| Report encounter copy | `infiltrationEncounterReportNotes.ts` (reuse constants only where distinct) |

## Scope (this slice)

| In | Out |
| -- | --- |
| `projectInfiltrationEncounterGuidesDocuments` domain projection | Mission triage refresh |
| Case prep section wired from projection | Front Desk attention (SPE-2460) |
| Domain + prep view integration tests | New probe mechanics |
| Slice doc + backlog handoff | SPE-2250 batch-4+ content migration |
| | Disguise validation changes (SPE-2242) |
| | Weekly posture evaluation changes |

## Acceptance

- [ ] Eligible in-progress cases with cover profile show document tier label, doctrine guide label, and scrutiny context labels
- [ ] Labels derive from profile tier + scrutiny tag sets only
- [ ] Projection empty for resolved/open or ineligible cases
- [ ] Does not duplicate report sentence copy from `infiltrationEncounterReportNotes.ts`
- [ ] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/infiltrationEncounterGuidesDocuments.ts` |
| View | `src/features/cases/infiltrationCasePrepView.ts`, `InfiltrationCasePrepPanel.tsx` |
| Tests | `src/test/infiltrationEncounterGuidesDocuments.test.ts`, `src/test/infiltrationCasePrepView.test.ts` |
| Plan | `planning/infiltration-guides-documents-slice.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Role branches per zone | SPE-521 parent | Out of slice boundary |
| SPE-2250 batch-4+ template stacks | SPE-2250 follow-up | Content-only deferral |

## See also

- `planning/infiltration-encounter-state-cover-slice.md`
- `planning/infiltration-cover-stance-weekly-tick-slice.md`
