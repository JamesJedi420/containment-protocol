# Infiltration encounter/content slice 1 (SPE-2250)

## Goal

Content-only follow-through on the shipped SPE-521 substrate: add authored `infiltrationProbePlan`, `infiltrationCoverProfile`, and `stealthLeaveBehindId` to batch-4 templates that already have `concealmentTriggers` but lacked a full infiltration stack.

No new probe mechanics, domain kernel changes, or UI work in this slice.

## Migrated templates (`INFILTRATION_CONTENT_SLICE_1_TEMPLATE_IDS`)

| Template | Cover role | Default probe | Leave-behind |
| --- | --- | --- | --- |
| `ops-005` | maintenance | `probe_access` (+ route fallback, cleanup at 0.55 awareness) | `leave-behind:risk-discovery` |
| `psi-001` | civilian_staff | `probe_route` (+ access fallback) | `leave-behind:risk-discovery` |
| `info-001` | courier | `probe_route` (+ access fallback) | `leave-behind:burn-tool` |

## Follow-up

Remaining nine batch-4 templates shipped in slice 2 (`planning/infiltration-encounter-content-slice-2.md`).

## Acceptance

- [x] `INFILTRATION_CONTENT_SLICE_1_TEMPLATE_IDS` catalog test
- [x] Probe-plan count ≥ 24 (was 21)
- [x] `advanceWeek` integration: `ops-005` hidden + probe tick
- [x] `npm run test:run` green

## See also

- `planning/concealment-triggers-migration-batch-4-slice.md` (SPE-2249)
- `src/test/infiltrationEncounterContentSlice.test.ts`
- Linear SPE-2250
