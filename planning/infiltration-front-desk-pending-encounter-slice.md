# SPE-521 — Infiltration Front Desk pending-encounter attention

One-page implementation plan. Linear: [SPE-2460](https://linear.app/spectranoir/issue/SPE-2460) (child under [SPE-521](https://linear.app/spectranoir/issue/SPE-521)). Follows shipped [infiltration case prep encounter preview](planning/infiltration-case-prep-encounter-preview-slice.md) (SPE-2308 / PR #2479).

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | [SPE-2460 — Infiltration Front Desk pending-encounter attention](https://linear.app/spectranoir/issue/SPE-2460) |
| **Parent** | [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (Backlog)   |
| **Branch** | `spe-521-infiltration-front-desk-pending-encounter`                 |
| **Status** | **Shipped** — PR #2824 @ `80f4eca9`                                   |
| **Base `main` SHA** | `5cb73b4b`                                                   |

## Goal

Surface **deterministic pending infiltration encounter preview** on the Front Desk attention rail when in-progress eligible cases will run probe encounters on the next weekly tick — reusing `buildInfiltrationPrepEncounterNotes` without opening each case detail.

## Prerequisite (on `main` @ `5cb73b4b`)

| Shipped | Anchor |
| ------- | ------ |
| Prep encounter preview | `buildInfiltrationPrepEncounterNotes` in `infiltrationEncounterReportNotes.ts` (SPE-2308) |
| Case prep eligibility | `canShowInfiltrationCasePrepOnCase` in `infiltrationCasePrepView.ts` |
| Front Desk attention pattern | `concealmentPendingActivationAttention.ts`, `frontDeskView.ts` (SPE-70 / PR #2822) |

## Scope (this slice)

| In | Out |
| -- | --- |
| `projectInfiltrationPendingEncounterAttention` domain projection | New probe mechanics |
| Front Desk attention item wired from projection | Mission triage refresh |
| Unit tests for projection + hub view | Template catalog migrations |
| Slice doc + backlog handoff | SPE-521 parent encounter-state / guides scope |

## Acceptance

- [x] No eligible pending cases → no Front Desk attention item
- [x] Cases without authored probe plans → no attention item
- [x] Single pending case → attention item links to case detail with preview summary
- [x] Multiple pending cases → aggregated summary links to `/cases`
- [x] Exposed/violent stage or awareness at complication threshold uses `warning` tone; routine probing uses `info`
- [x] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/infiltrationPendingEncounterAttention.ts` |
| View | `src/features/operations/frontDeskView.ts` |
| Tests | `src/test/infiltrationPendingEncounterAttention.test.ts` |
| Plan | `planning/infiltration-front-desk-pending-encounter-slice.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Per-case attention rows on Front Desk | SPE-521 follow-up | Aggregated item sufficient for slice boundary |
| SPE-2250 batch-4+ template stacks | SPE-2250 follow-up | Content-only deferral |
| Full parent SPE-521 encounter-state / guides | SPE-521 parent | Out of optional-depth queue item |

## See also

- `planning/infiltration-case-prep-encounter-preview-slice.md`
- `planning/concealment-front-desk-pending-activation-slice.md`
