# Scene Control Through Deck State and Subplot Pressure (SPE-153)

## Purpose

Scenes are governed by explicit **agenda**, **cuts**, and **pressure overlays** that preserve interactivity. Pacing is not only narrative flow or turn order; it is a deterministic control layer for action, investigation, and interpersonal beats.

## Scene agenda

Each scene declares:

- core question(s) to resolve,
- what cannot be skipped,
- what can be elided (dead-time),
- exit conditions.

## Deck/state-driven pressure

Use a deck-like overlay of symbolic or state cards:

- “auditors inbound,” “crowd turning,” “air running out,”
- “patron watching,” “authority fracture,”

that inject bounded prompts and constraints without replacing player choice.

## Cuts and dead-time elision

Dead-time (walking, waiting, inventory fiddling) may be **cut** when it adds no decisions. Cuts must:

- spend the appropriate clocks (pressure still advances),
- preserve the ability to interrupt if a new event fires,
- surface what changed during the elided window.

## Prompt-event injection

Inject bounded prompts as **events**, not GM prose dumps:

- complication offers,
- social demands,
- integrity or vow checks (SPE-146),
- authority interruptions (SPE-87 / SPE-147).

Prompt injections must preserve player choice; they constrain and pressure, they do not autopilot outcomes.

## Multi-mode pacing

Support distinct pacing profiles:

- **Action**: fast phases, high interruption frequency.
- **Investigation**: more cuts, higher information bandwidth, search retry costs (SPE-136).
- **Interpersonal**: fewer hazards, more obligation and permission gates.

Switching mode is an explicit transition that rewrites what cards are legal.

## Integration

- **Visibility (SPE-24)**: surface why a cut occurred and what it consumed.
- **Peril (SPE-115)**: pressure overlays can advance survival gates.

## See also

- `docs/visibility-layer-audit.md` — SPE-24
- `architecture/peril-survival-gates-escalating-failure.md` — SPE-115
- `architecture/conduct-gated-advancement-vow-bound-progression.md` — SPE-146
- `architecture/hidden-search-diminishing-retries.md` — SPE-136

