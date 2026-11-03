# SPE-1757 — Extranormal temporal event registry

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** (local slice; Linear lifecycle separate) |
| **Issue** | [SPE-1757](https://linear.app/spectranoir/issue/SPE-1757) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Backlog |
| **Branch** | `jamesdyedbq/spe-1757-extranormal-temporal-event-registry` |
| **Base main SHA** | `11578531c032d32f853bf2ffc0beb0ed529d9126` |

## Approved boundary

- Pure domain `src/domain/extranormalTemporalEventRegistry.ts` — typed temporal events, authoritative-week predicted windows, schedule drift, instability pulses, research/public planning divergence, optional incident refs, chronology confidence bands
- Vitest `src/domain/extranormalTemporalEventRegistry.test.ts` — typing, registry storage, drift, instability windows, divergent planning, incident linkage
- SCHEMA_REGISTRY evidence-only note
- Consumes SPE-3180 / SPE-1071: integer `authoritativeWeek` fields only; no subjective-time keys or second clock
- No GameState persistence unless a later slice proves need; no full time-travel simulator

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| Multi-event zone | `DEMO_ZONE_CANAL_SPILLWAY` holds three typed events in `DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY` |
| Schedule drift | `applyScheduleDrift` + `projectEffectivePredictedWindow` on `TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE` |
| Research vs public divergence | `projectPlanningSignals` elevates research on arrival fixture and public response on timeline-edit fixture |
| Incident link without stable timeline | `linkedIncidentRef` + `stable_claim_forbidden` chronology on timeline-edit fixture |
| Deterministic tests | Vitest suite covers typing, parse/upsert, drift, instability, planning |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| GameState persistence / week-close consumption | Future SPE-1757+ or SPE-854 child | Pure registry + parse first per slice constraint |
| Player-facing temporal event board | SPE-854 umbrella | Out of bounded domain slice |
| SPE-1071 calendar window generation | SPE-1071 | Registry consumes integer weeks only |
