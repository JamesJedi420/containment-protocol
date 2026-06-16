# SPE-2416 — Whitlock Carolers Game-World Integration

## Goal

Adapt The Midnight Carolers / Whitlock Carolers material into Containment Protocol as a bounded game-world incident and artifact node.

## Scope

- Add a design node documenting the Whitlock Carolers as a future incident / artifact family.
- Add content-facing incident copy for the Whitlock Advent Incident.
- Keep implementation docs compatible with the incident-template and content-style guidance.
- Avoid runtime TypeScript changes in this slice.

## Files

- `docs/whitlock-carolers-game-world.md`
- `content/incidents/whitlock-advent-incident.md`

## Design decisions

- The family remains new canon: Arthur Whitlock, Clara Whitlock, and Mabel Whitlock.
- The artifact enters the game world through church inventory records, after-hours audio, restoration handling, and custody anomalies.
- Player-facing text does not confirm whether Mabel is present, copied, partially returned, or simulated.
- The operational model is a recognition-gated resonance artifact, not a generic haunted-doll case.

## Out of scope

- No new `CaseTemplate` runtime entry.
- No `CASE_LORE_STUBS` update.
- No registry fixture implementation.
- No UI or route changes.
- No test expectations changed.

## Future implementation seam

A later runtime slice can add:

1. `occult-009` in `src/domain/templates/caseTemplates.occult.ts`
2. matching `CASE_LORE_STUBS['occult-009']` in `src/data/copy.ts`
3. minor anomaly item record for `The Whitlock Carolers`
4. optional unexplained location record for `St. Bartholomew's parish store`

## Validation note

Docs/content-only change. No local runtime validation was executed in this connector-only session.
