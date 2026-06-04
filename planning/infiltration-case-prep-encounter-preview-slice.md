# Infiltration case prep encounter preview (SPE-521 UI slice)

One-page implementation plan. Linear: [SPE-2308](https://linear.app/spectranoir/issue/SPE-2308) (child under [SPE-521](https://linear.app/spectranoir/issue/SPE-521)). Follows shipped report copy depth [SPE-2305](https://linear.app/spectranoir/issue/SPE-2305) / `planning/infiltration-encounter-content-slice-3.md`.

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | [SPE-2308 — Infiltration case prep encounter preview](https://linear.app/spectranoir/issue/SPE-2308) |
| **Parent** | [SPE-521](https://linear.app/spectranoir/issue/SPE-521)               |
| **Branch** | `jamesdyedbq/spe-521-infiltration-case-prep-encounter-preview`        |
| **Status** | In progress                                                           |

## Goal

Show **deterministic encounter preview bullets** on the infiltration case-prep panel so players see the same operational flavor as weekly reports before `advanceWeek` — without duplicating full report sentences.

## Prerequisite (on `main`)

| Shipped | Anchor |
| ------- | ------ |
| Report encounter copy | `src/domain/infiltrationEncounterReportNotes.ts` (SPE-2305) |
| Case prep panel | `src/features/cases/InfiltrationCasePrepPanel.tsx`, `infiltrationCasePrepView.ts` |

## Scope (this slice)

| In | Out |
| -- | --- |
| `buildInfiltrationPrepEncounterNotes` reusing report constants | New probe mechanics |
| `encounterPreviewNotes` on prep view + panel section | Template catalog migrations |
| Unit tests for note composition | Mission triage changes |

## Acceptance

- [x] Prep panel shows encounter preview for eligible cases with at least probe-action detail
- [x] Notes use effective weekly probe action (override when set)
- [x] Stage observer + cover friction + leave-behind lines match report constants
- [x] `npm run lint` + targeted `npm run test:run` green

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Additional template probe/cover stacks beyond batch-4 | SPE-2250 follow-up | Content-only; no narratively urgent templates queued |
| Full parent SPE-521 encounter-state / guides scope | SPE-521 parent | Out of optional-depth queue item |

## See also

- `planning/infiltration-case-prep-slice.md`
- `planning/infiltration-encounter-content-slice-3.md`
