# SPE-521 — Infiltration cover stance weekly tick

One-page implementation plan. Linear: child under [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (create on session start). Follows shipped [encounter-state cover case prep](planning/infiltration-encounter-state-cover-slice.md) (PR #2825).

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | Child under SPE-521 — infiltration cover stance weekly tick         |
| **Parent** | [SPE-521](https://linear.app/spectranoir/issue/SPE-521) (Backlog)   |
| **Branch** | `spe-521-infiltration-cover-stance-weekly-tick`                       |
| **Status** | **Shipped** — PR #2826 @ `6279930b`                                   |
| **Base `main` SHA** | `9f5bd4a4`                                                   |

## Goal

When `infiltrationEncounterCoverStance` is set on an eligible in-progress case, apply a **minimal deterministic nudge** during weekly infiltration probe/cover posture evaluation — no new UI or prep surfaces.

## Prerequisite (on `main` @ `9f5bd4a4`)

| Shipped | Anchor |
| ------- | ------ |
| Encounter cover projection + stance write | `infiltrationEncounterStateCover.ts`, `infiltrationEncounterCoverStance.ts` |
| Weekly probe + cover posture | `applyWeeklyInfiltrationProbeTick`, `evaluateWeeklyInfiltrationCoverPosture` |
| Probe action override pattern | `infiltrationProbeOverride.ts` |

## Scope (this slice)

| In | Out |
| -- | --- |
| `low_profile` trims positive probe deltas on weekly tick (not cleanup) | New UI, guides, documents |
| `reinforce` trims cover-posture awareness delta on weekly tick | Mission triage refresh |
| Stance cleared on case resolve + normalize | Front Desk attention (SPE-2460) |
| Domain unit tests + regression on probe/cover weekly tests | SPE-2250 batch-4+ content |
| Slice doc + prior deferred row closure | Concealment domain changes |

## Acceptance

- [x] `low_profile` reduces weekly probe awareness/progress gains on `probe_access` / `probe_route` only
- [x] `reinforce` reduces weekly cover-posture `awarenessDelta` by fixed nudge
- [x] `maintain` / unset stance leaves weekly tick unchanged
- [x] Stance does not affect single probe actions outside weekly tick path
- [x] Probe override and stance stack without conflicting double-mitigation on cleanup
- [x] Resolved cases strip persisted stance field
- [x] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/infiltrationEncounterCoverStanceTick.ts`, `infiltrationProbe.ts`, `infiltrationCover.ts`, `sim/advanceWeek.ts`, `case/normalizeCase.ts` |
| Tests | `src/test/infiltrationEncounterCoverStanceTick.test.ts` |
| Plan | `planning/infiltration-cover-stance-weekly-tick-slice.md`, `planning/infiltration-encounter-state-cover-slice.md` (deferred closure) |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Guides and documents | **Shipped** — `planning/infiltration-guides-documents-slice.md` | Follow-up slice under SPE-521 |
| Role branches per zone | SPE-521 parent | Out of slice boundary |
| SPE-2250 batch-4+ template stacks | SPE-2250 follow-up | Content-only deferral |

## See also

- `planning/infiltration-encounter-state-cover-slice.md`
- `planning/infiltration-case-prep-slice.md`
