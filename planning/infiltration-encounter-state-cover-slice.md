# SPE-521 — Infiltration encounter-state cover (case prep)

One-page implementation plan. Linear: child under [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (create on session start). Follows shipped [Front Desk pending-encounter attention](planning/infiltration-front-desk-pending-encounter-slice.md) (SPE-2460 / PR #2824).

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | Child under SPE-521 — infiltration encounter-state cover              |
| **Parent** | [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (Backlog)   |
| **Branch** | `spe-521-infiltration-encounter-state-cover`                          |
| **Status** | In Progress                                                           |
| **Base `main` SHA** | `dbb4523d`                                                   |

## Goal

Expose **deterministic encounter-state cover posture** on the infiltration case-prep panel — structured bands, status, and factor labels beyond encounter preview bullets — with a player **cover stance** write path before weekly resolution.

## Prerequisite (on `main` @ `dbb4523d`)

| Shipped | Anchor |
| ------- | ------ |
| Probe/cover tracks | `infiltrationProbe.ts`, `infiltrationCover.ts` |
| Prep encounter preview | `buildInfiltrationPrepEncounterNotes` (SPE-2308) |
| Case prep panel | `InfiltrationCasePrepPanel.tsx`, `infiltrationCasePrepView.ts` |
| Front Desk pending encounter | `infiltrationPendingEncounterAttention.ts` (SPE-2460) |

## Scope (this slice)

| In | Out |
| -- | --- |
| `projectInfiltrationEncounterStateCover` domain projection | New probe mechanics |
| Player cover stance read/write on eligible cases | Mission triage refresh |
| Case prep section wired from projection | Template catalog migrations |
| Unit + prep view integration tests | Front Desk attention (SPE-2460) |
| Slice doc + backlog handoff | Guides/documents, role branches, SPE-2250 batch-4+ |

## Acceptance

- [ ] Eligible in-progress cases with cover profile show encounter-state band, status label, and factor labels
- [ ] Bands derive from stage/awareness thresholds and cover strain evaluation only
- [ ] Player can select or clear cover stance on eligible cases; persisted on case
- [ ] Projection empty for resolved/open or ineligible cases
- [ ] Does not duplicate Front Desk pending-encounter summaries
- [ ] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/infiltrationEncounterStateCover.ts`, `src/domain/infiltrationEncounterCoverStance.ts` |
| Model | `src/domain/models.ts`, `src/domain/case/normalizeCase.ts` |
| View | `src/features/cases/infiltrationCasePrepView.ts`, `InfiltrationCasePrepPanel.tsx` |
| Store | `src/app/store/gameStore.ts` |
| Tests | `src/test/infiltrationEncounterStateCover.test.ts`, `src/test/infiltrationCasePrepView.test.ts` |
| Plan | `planning/infiltration-encounter-state-cover-slice.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Stance affects weekly tick deltas | SPE-521 parent | Read/write visibility slice only |
| Guides and documents | SPE-521 parent | Out of slice boundary |
| Role branches per zone | SPE-521 parent | Out of slice boundary |
| SPE-2250 batch-4+ template stacks | SPE-2250 follow-up | Content-only deferral |

## See also

- `planning/infiltration-case-prep-encounter-preview-slice.md`
- `planning/infiltration-front-desk-pending-encounter-slice.md`
