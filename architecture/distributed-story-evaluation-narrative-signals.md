# Distributed Story Evaluation and Narrative Quality Signals (SPE-162)

## Purpose

Story quality is measured through explicit **distributed signals** — engagement, tension, coherence, thematic fit, player-story alignment, and story/play dissonance — not branch adherence alone or author intuition.

## Signal families

- **Engagement** — whether players stay with the scenario, skip, or abandon.
- **Tension** — perceived stakes, uncertainty, and risk (not just difficulty).
- **Coherence** — whether events feel causally and thematically connected.
- **Thematic fit** — alignment with campaign premise and issue tags.
- **Player-story alignment** — match between player choices and surfaced framing.
- **Story/play dissonance** — when mechanics and text pull in opposite directions.

Signals come from **multiple sources**: telemetry, QA assessments, author-tagged expectations, and playtest notes.

## Evaluation guidelines

- Keep metrics **inspectable**, versioned, and scoped to episodes or arcs.
- Use them to **support** authored content decisions, not to auto-generate story.
- Avoid training the system to chase only engagement at the expense of premise or ethics.

## Integration

- **Scene control (SPE-153)** — deck weights can be tuned based on low-tension or overlong results.
- **Anti-stall (SPE-159)** — high dissonance or low engagement can justify new anti-stall cards in future issues.

## See also

- `architecture/scene-control-deck-state-subplot-pressure.md` — SPE-153
- `architecture/diegetic-anti-stall-routing-live-clue-surfacing.md` — SPE-159

