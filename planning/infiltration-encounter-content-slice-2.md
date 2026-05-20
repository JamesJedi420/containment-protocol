# Infiltration encounter/content slice 2 (SPE-2250)

## Goal

Complete batch-4 infiltration follow-through: add authored `infiltrationProbePlan`, `infiltrationCoverProfile`, and `stealthLeaveBehindId` to the nine remaining batch-4 templates that had `concealmentTriggers` only after SPE-2249.

Content-only on the shipped SPE-521 substrate — no new probe mechanics.

## Migrated templates (`INFILTRATION_CONTENT_SLICE_2_TEMPLATE_IDS`)

| Template | Cover role | Default probe | Leave-behind |
| --- | --- | --- | --- |
| `bio-forensics-001` | maintenance | `probe_access` (+ route fallback) | `leave-behind:leave-trace` |
| `occult-001` | maintenance | `probe_access` (+ route fallback) | `leave-behind:risk-discovery` |
| `occult-002` | civilian_staff | `probe_route` (+ access fallback) | `leave-behind:leave-trace` |
| `occult-004` | maintenance | `probe_access` (+ route fallback) | `leave-behind:leave-trace` |
| `occult-005` | civilian_staff | `probe_access` (cleanup ≥0.55 awareness) | `leave-behind:leave-trace` |
| `occult-007` | maintenance | `probe_access` (+ route fallback) | `leave-behind:risk-discovery` |
| `psi-004` | civilian_staff | `probe_route` (+ access fallback) | `leave-behind:risk-discovery` |
| `psi-006` | maintenance | `probe_access` (+ route fallback) | `leave-behind:risk-discovery` |
| `followup_psi_aftermath` | maintenance | `probe_route` (+ access fallback) | `leave-behind:leave-trace` |

Slice 1 (`ops-005`, `psi-001`, `info-001`) documented in `planning/infiltration-encounter-content-slice-1.md`.

## Batch-4 completion

All twelve `BATCH_FOUR_TEMPLATE_IDS` from SPE-2249 now carry the full infiltration stack (`INFILTRATION_CONTENT_BATCH_FOUR_TEMPLATE_IDS` in tests).

## Acceptance

- [x] `INFILTRATION_CONTENT_SLICE_2_TEMPLATE_IDS` catalog test
- [x] All twelve batch-4 templates have probe + cover + leave-behind
- [x] Probe-plan count ≥ 33 (was 24 after slice 1)
- [x] `advanceWeek` integration: `psi-004` hidden + probe tick
- [x] `npm run test:run` green

## See also

- `planning/infiltration-encounter-content-slice-1.md`
- `planning/concealment-triggers-migration-batch-4-slice.md`
- Linear SPE-2250
