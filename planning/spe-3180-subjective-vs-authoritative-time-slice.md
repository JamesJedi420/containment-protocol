# SPE-3180 — Subjective vs authoritative simulation time contradiction check

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3180](https://linear.app/spectranoir/issue/SPE-3180) |
| **Parent** | [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071) — authoritative clock owner |
| **Branch** | `jamesdyedbq/spe-3180-contradiction-check-subjective-time-versus-authoritative` |
| **Base main SHA** | `57f4e043d32311ae113a706d2b369534dac6eef7` |

## Approved boundary

- Frozen decision contract in `src/domain/subjectiveVsAuthoritativeTimeContradiction.ts`
- Scenario validation helpers + Vitest in `src/domain/subjectiveVsAuthoritativeTimeContradiction.test.ts`
- Architecture record `architecture/subjective-vs-authoritative-time-decision.md`
- SCHEMA_REGISTRY note for evidence-only boundary
- No generic time-dilation gameplay, GameState schema changes, or Linear issue creation

## Decision stance (binding for this slice)

- SPE-1071 sole authoritative clock for ordering/schedules/deadlines/persistence
- Local time: per-entity accumulated markers + SPE-3384 rate projections over authoritative weeks
- SPE-815 / SPE-227: perception/confidence distortion without changing authoritative elapsed
- Scheduled events keyed to SPE-1071
- SPE-964 may consume local markers after this decision; no SPE-964 implementation here
- SPE-3161 pause/speed does not reinterpret local markers as a second authoritative timeline

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Asymmetric off-map labor implementation | SPE-964 | Blocked until this decision; candidate follow-up only |
| Extranormal temporal-event wiring | SPE-1757 | Consume decision in future slice |
| GameState persistence of local markers | Domain owners | Contract only this slice |

## Validation

- `npx vitest run src/domain/subjectiveVsAuthoritativeTimeContradiction.test.ts`
- `npm run verify:backlog-handoff`
