# SPE-70 — Concealment Front Desk pending-activation attention

One-page implementation plan. Linear: SPE-70 follow-up — **Concealment Front Desk pending-activation attention** (create/claim on start). Follows shipped [concealment case prep activation preview](planning/concealment-case-prep-activation-preview-slice.md) (PR #2821).

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | SPE-70 follow-up — Concealment Front Desk pending-activation attention |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70) (Done)        |
| **Branch** | `spe-70-concealment-front-desk-pending-activation`                    |
| **Status** | **Shipped** — PR #2822 @ `c09addaf`                                   |
| **Base `main` SHA** | `17db4ab2`                                                   |

## Goal

Surface **deterministic pending concealment activation** on the Front Desk attention rail when in-progress open-posture cases will enter hidden or displaced presence on the next weekly tick — reusing `resolveConcealmentActivation` and prep preview copy without opening each case detail.

## Prerequisite (on `main` @ `17db4ab2`)

| Shipped | Anchor |
| ------- | ------ |
| Activation resolver | `hiddenStateActivation.ts` |
| Prep preview notes | `concealmentPrepActivationPreviewNotes.ts` (PR #2821) |
| Front Desk attention pattern | `publicDisclosureTrustOutcomeProjection.ts`, `frontDeskView.ts` |

## Scope (this slice)

| In | Out |
| -- | --- |
| `projectConcealmentPendingActivationAttention` domain projection | New modality families |
| Front Desk attention item wired from projection | Case prep panel changes |
| Unit tests for projection + hub view | Mission triage full refresh |
| Slice doc + backlog handoff | SPE-70 parent reopen |

## Acceptance

- [x] No pending activations → no Front Desk attention item
- [x] Single pending case → attention item links to case detail with preview summary
- [x] Multiple pending cases → aggregated summary links to `/cases`
- [x] Displaced activation uses `warning` tone; hidden-only uses `info`
- [x] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/concealmentPendingActivationAttention.ts` |
| View | `src/features/operations/frontDeskView.ts` |
| Tests | `src/test/concealmentPendingActivationAttention.test.ts` |
| Plan | `planning/concealment-front-desk-pending-activation-slice.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Per-case attention rows on Front Desk | SPE-70 follow-up | Aggregated item sufficient for slice boundary |
| Mission triage compare-top-2 / bulk actions | SPE-16 | Blocked per backlog |

## See also

- `planning/concealment-case-prep-activation-preview-slice.md`
- `planning/disclosure-campaign-player-ui-slice-2.md`
