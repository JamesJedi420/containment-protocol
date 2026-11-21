# SPE-3067 Incident triage priority resolver (slice 1)

## Boundary
Pure deterministic ranking function for active incidents using only agency-known inputs.

## Implemented
- `src/domain/incidentTriagePriorityResolver.ts` — score from urgency/threat/escalation/strategic/deferral, confidence scaling, capacity-pressure penalty, hard blockers → recommendation, stable ID tie-break.
- Unit tests covering ranking differences, blockers, deferral outranking, capacity pressure (no mutation), incomplete intelligence, tie-break, explanation fields.

## Not in this slice
- Wiring to live mission intake (SPE-16), capacity owners (SPE-3045/SPE-1189), or UI surfaces.
- Persistence of resolved assessments (reconstruct from inputs for now).
- Team suitability (SPE-2734) or outcome resolution.

## Next
Codex/Cursor: independent review, CI, possible integration with existing triage consumers, then merge. Status remains In Progress until full acceptance.
