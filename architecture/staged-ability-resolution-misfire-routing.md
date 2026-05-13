# Staged Ability Resolution and Misfire Routing (SPE-164)

## Purpose

Risky power use resolves in **explicit stages** — immediate success, delayed success, failure, and optional misfire — with **actor-state-dependent baselines**, **context-sensitive mishaps**, **interruption windows**, and **readable casting-state channels**.

## Resolution stages

1. **Cast / commit** — focus, cost, and legality checks; may fail fast.
2. **Immediate or delayed success** — effect lands now or after a deterministic delay or channel travel.
3. **Failure** — no intended effect; however, this may still route into misfire.
4. **Misfire (optional)** — context-sensitive mishap drawn from bounded families.

## Actor and context dependencies

Baselines for success / misfire depend on:

- actor readiness, fatigue, integrity bands,
- world-law compatibility (SPE-151),
- environmental tags (e.g., submerged, fortified),
- artifact or anchor state (SPE-125, SPE-138).

## Interruption windows

Before misfire, allow clear windows for:

- countermeasures,
- world-law contradictions,
- stun / suppression (SPE-155),
- or focus disruption.

## Misfire families (examples)

- redirected allegiance or target,
- suppression of later use,
- self-harm, ally harm,
- cognitive or coordination degradation,
- ambient hazard creation.

Families are anatomy-aware where relevant (SPE-165) and tuned per ability group.

## Channels and surfacing

Casting / ability state should expose:

- operator state,
- focus state,
- effect-path state,

as readable channels for UI and debugging.

## See also

- `architecture/world-law-compatibility-contradiction.md` — SPE-151
- `architecture/command-word-artifacts-recharge.md` — SPE-138
- `architecture/anatomy-aware-crit-fumble-resolution.md` — SPE-165
