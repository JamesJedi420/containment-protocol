# SPE-70 — Concealment case prep activation preview notes

One-page implementation plan. Linear: SPE-70 child — **Concealment case prep activation preview notes** (create/claim on start). Follows shipped [SPE-2306](https://linear.app/spectranoir/issue/SPE-2306) triage chips and mirrors [SPE-2308](https://linear.app/spectranoir/issue/SPE-2308) infiltration encounter preview.

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | SPE-70 child — Concealment case prep activation preview notes         |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70)               |
| **Branch** | `spe-70-concealment-case-prep-activation-preview`                     |
| **Status** | **Shipped** — PR #2821 @ `17db4ab2`                                   |
| **Base `main` SHA** | `4eb49c26`                                                   |

## Goal

Show **deterministic activation + modality preview bullets** on the concealment case-prep panel so players see operational flavor (activation path, tell readouts, illusion posture) before `advanceWeek` — without duplicating full weekly report sentences or adding modality mechanics.

## Prerequisite (on `main` @ `4eb49c26`)

| Shipped | Anchor |
| ------- | ------ |
| Concealment case prep | `concealmentCasePrepView.ts`, `ConcealmentCasePrepPanel.tsx` (PR #2326) |
| Activation summaries | `concealmentActivationFeed.ts` |
| Modality tells / illusion | `hiddenStateModalityTells.ts`, `hiddenStateIllusionLifecycle.ts` |
| Infiltration preview pattern | `buildInfiltrationPrepEncounterNotes` (SPE-2308 / PR #2479) |

## Scope (this slice)

| In | Out |
| -- | --- |
| `formatConcealmentActivationPreviewNote` (future-tense) in `concealmentActivationFeed.ts` | Mission triage full refresh |
| `buildConcealmentPrepActivationPreviewNotes` domain helper | New modality families |
| `activationPreviewNotes` on prep view + panel section | Front Desk choice mechanics |
| Unit tests for note composition | SPE-70 parent Done closure |

## Acceptance

- [x] Eligible in-progress case shows activation preview note when `resolveConcealmentActivation` applies
- [x] Authored tell tags show preview readout without assigned teams; assigned teams use live tell evaluation
- [x] Authored illusion tags show bounded illusion preview on open posture cases
- [x] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/concealmentActivationFeed.ts`, `src/domain/concealmentPrepActivationPreviewNotes.ts` |
| View / UI | `src/features/cases/concealmentCasePrepView.ts`, `ConcealmentCasePrepPanel.tsx` |
| Tests | `src/test/concealmentPrepActivationPreviewNotes.test.ts`, `src/test/concealmentCasePrepView.test.ts` |
| Plan | `planning/concealment-case-prep-activation-preview-slice.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Front Desk pending-activation attention | SPE-70 follow-up | Separate surfacing slice; out of case-prep boundary |
| Full SPE-70 parent Done | SPE-70 | Grooming after stack complete |
| Mission triage compare-top-2 / bulk actions | SPE-16 | Blocked per backlog |

## See also

- `planning/concealment-case-prep-slice.md`
- `planning/infiltration-case-prep-encounter-preview-slice.md`
- `planning/mission-triage-modality-signal-slice.md`
