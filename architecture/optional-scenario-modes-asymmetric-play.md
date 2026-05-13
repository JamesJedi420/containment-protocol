# Optional Scenario Modes and Asymmetric Play (SPE-77)

## Purpose

**Optional modes** extend the core weekly mission grammar with **bounded templates** — not parallel rulesets that fork the simulation engine.

## Mode families (non-exhaustive)

- **Asymmetric goals** — teams pursue different win/consolation conditions from the same state snapshot.
- **Persistent event formats** — multi-week rosters where prior outcomes alter legal card pools or pressure budgets deterministically.
- **Bounded solo adversary scripting** — authored adversary policy tables with explicit caps on hidden information and reaction latency.
- **Communication-limited team play** — channel budgets, delayed orders, or compartmentalized intel between sub-teams.
- **Hidden deployment** — pre-placement or fogged roster reveal rules tied to `architecture/hidden-state-displacement-counter-detection.md` where relevant.
- **Mirrored benchmark rosters** — fixed seeds and rosters for regression, speedrun, or competitive comparison without special-case code paths beyond data.
- **Timed-run variants** — wall-clock or in-game clock ceilings with deterministic scoring translation.
- **Episodic / bridge packaging** — short arcs that stitch into the main campaign via explicit handoff packets (`docs/cross-scale-integration.md`).

## Design rules

- **Reuse core mission grammar** — routing, readiness, weakest-link, pressure, and resolution bands stay authoritative; modes only **parameterize** or **mask** inputs/outputs within declared bounds.
- **Determinism** — every mode declares seed policy, what is hidden from whom, and what resets between chapters.

## Anti-patterns

- “Solo variant” implemented as a second `advanceWeek` fork.
- PvP or async modes that bypass canonical outcome registration.

## See also

- `docs/cross-scale-integration.md` — SPE-64
- `qa/determinism-tests.md` — SPE-26
- `systems/mission-resolution.md`
