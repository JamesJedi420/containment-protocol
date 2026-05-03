# Containment Protocol — Rules And Objectives

## Purpose

This is the canonical statement of what the player is trying to do, on what time horizons, and how a campaign can fail. It exists to close the biggest onboarding gap: "what does good look like?"

For the loop itself, see [game-loop.md](game-loop.md). For terminology, see [glossary.md](glossary.md). For long-term sequencing of the project, see [../planning/roadmap.md](../planning/roadmap.md).

## Status

Containment Protocol is in active development. Objectives below describe the intended shape of play. The current build implements the weekly loop and a growing set of institutional consequences. Some long-horizon objectives and a fixed terminal win condition are still being defined; where that is the case, this document says so explicitly.

## Short-term objective — Survive the week well

On a per-week basis, the player is trying to:

- meet incident deadlines that matter
- keep teams in deployable shape
- avoid uncontrolled escalation and spawned follow-ups
- absorb fallout without permanent loss
- keep institutional pressure from compounding

A "good" week is not "every incident resolved with full success." It is:

- the urgent threats are contained or stabilized
- soft risks taken were known and accepted
- the institution is no worse off in readiness, support, or standing than it can recover from
- the report makes the week's outcomes legible

A "bad" week is not "a mission failed." It is:

- a deferred incident escalated into a major incident
- a team is in `recovery_required` with no replacement path
- pressure crossed a threshold the player did not see coming
- the report cannot explain why an outcome happened

## Long-term objective — Hold the institution together

Across many weeks, the player is trying to:

- grow capability without outpacing oversight
- contain dangerous knowledge while operationalizing useful capability
- maintain legitimacy, funding, and faction standing
- keep enough trained operatives, kits, and specialists to absorb attrition
- prevent the slow drift toward overload, collapse, or exposure

Strategic depth lives here:

- when to research vs. when to defer
- when to disseminate knowledge vs. when to suppress
- when to expand vs. when to consolidate
- when to spend standing vs. when to bank it
- which bottlenecks to invest out of, and which to live with

## Failure model

A campaign can degrade or end through several distinct routes. The simulation does not roll a single "you lose" check; failure is the accumulation of bounded institutional damage.

Recognized failure pressures:

- **Operational collapse** — too many teams in `recovery_required`, role coverage broken across the agency, no path to recover within the deadline horizon.
- **Escalation cascade** — repeated deferrals or partials drive incidents to terminal stages, spawning major incidents the agency cannot answer.
- **Budget collapse** — funding falls below required upkeep; procurement and recruitment stall; readiness erodes structurally.
- **Legitimacy collapse** — standing or faction relationships fall to hostile across enough fronts to cut off recruitment, intel, and contracts.
- **Knowledge breach** — dissemination and secrecy failures cause public exposure, narrative collapse, or knowledge-hazard propagation outside agency control.
- **Doctrinal failure** — doctrine and protocol misuse produce repeated catastrophic outcomes the agency cannot correct.

A campaign-ending state is reached when one or more of these compound past the agency's recovery capacity. The exact thresholds, terminal-loss screens, and recovery rules are still being defined and will be documented here as they land.

## Win condition (current framing)

There is no fixed terminal win condition in the current build. Containment Protocol is structured as a long-horizon survival-and-stewardship sim, not a victory-screen game.

Working framing:

- **Near-term (in build today):** survive multiple weeks while keeping the institution legible and recoverable.
- **Mid-term (planned):** reach defined institutional milestones — research thresholds, containment-rating tiers, regional stabilization, doctrinal maturity.
- **Long-term (open):** whether the game ships with a discrete win condition, a campaign-length stewardship score, or an open-ended mode is an active design question. See [../planning/roadmap.md](../planning/roadmap.md) and [../planning/milestones.md](../planning/milestones.md) for current phase work.

This section will be updated as the win-condition design lands.

## What "playing well" looks like

A skilled player should consistently:

- triage with explicit reasons, not by reflex
- accept partials when the cost of forcing a full success is higher than the cost of the partial
- invest in slow systems (training, recruitment, research, procurement) before they become bottlenecks
- spend standing and capacity intentionally, not under emergency pressure
- use the report to update next week's plan rather than to relitigate the last one
- leave the institution recoverable at the end of every week

The simulation is built to reward that posture and to make its absence visible.

## What this document is not

This is not:

- a tutorial — see in-game tutorial content (when present) and [game-loop.md](game-loop.md)
- a rule reference for system internals — see the audit notes under [./](./)
- a marketing pitch — see [../README.md](../README.md)
- a planning roadmap — see [../planning/roadmap.md](../planning/roadmap.md)
