# Containment Protocol — Game Loop

## Purpose

This is the canonical player-facing explanation of the weekly turn in Containment Protocol.

Other documents describe individual systems in depth. This one explains how a single week is played, end to end, with a worked example. If something here disagrees with an audit note, the audit note wins for that specific system; this doc should then be updated.

For the cross-system map, see [index.md](index.md). For terminology, see [glossary.md](glossary.md). For objectives and failure conditions, see [rules-and-objectives.md](rules-and-objectives.md).

## The Loop, At A Glance

```text
Week starts
  -> incoming work appears
  -> player reviews institutional condition
  -> player triages and routes work
  -> player assigns and deploys teams
  -> missions resolve deterministically
  -> fallout, pressure, and recovery are applied
  -> reports explain what happened
  -> next week begins under changed conditions
```

The week is not free-form. It is a sequence of bounded phases. Most phases are player-driven; a few are simulation-driven and happen on the week-advance tick.

## Phase 1 — Read The Board

The week opens with the current snapshot of the agency.

What the player reviews:

- open incidents and their stage, deadline, and category
- pressure surfaces (case load, support strain, faction pressure, time pressure, budget pressure)
- team readiness, including hard blockers and soft risks
- recovery state for operatives and teams
- support capacity and specialist availability
- last week's report notes

Goal: form an honest picture of what is possible this week.

See [mission-intake-triage-routing-audit.md](mission-intake-triage-routing-audit.md), [escalation-threat-drift-time-pressure-audit.md](escalation-threat-drift-time-pressure-audit.md), [deployment-readiness-time-cost-audit.md](deployment-readiness-time-cost-audit.md).

## Phase 2 — Triage And Route

Each open incident must end the phase in one of: deployed, scheduled, deferred, or rejected.

What the player does:

- sort incidents by priority, deadline, and risk
- decide which incidents need a team this week
- defer or deprioritize lower-value work
- accept that not every incident will get coverage

Routing is explicit. An incident that is not routed will escalate, drift, or spawn follow-ups.

See [mission-intake-triage-routing-audit.md](mission-intake-triage-routing-audit.md), [progress-clock-audit.md](progress-clock-audit.md).

## Phase 3 — Compose And Equip

Selected incidents are matched to teams and prepared for deployment.

What the player does:

- pick or build a team that meets the incident's required role coverage
- assign a leader and confirm composition is valid
- select a loadout that satisfies required equipment gates and matches countermeasure tags
- confirm certifications and training locks
- resolve hard blockers; weigh soft risks

Readiness is categorical: `mission_ready`, `conditional`, `temporarily_blocked`, `hard_blocked`, `recovery_required`. Anything below `mission_ready` carries an explicit reason.

See [team-composition-cohesion-audit.md](team-composition-cohesion-audit.md), [gear-loadouts-audit.md](gear-loadouts-audit.md), [training-certification-audit.md](training-certification-audit.md), [deployment-readiness-time-cost-audit.md](deployment-readiness-time-cost-audit.md).

## Phase 4 — Deploy

Committing a team locks in the assignment for the week.

What the player accepts:

- the team's current readiness state will shape resolution
- soft risks become possible failure contributors
- the time cost (travel, setup, execution, recovery) is allocated
- the team is unavailable for parallel work during its deployment window

Deployment is a commitment under bounded information. Recon and intel reduce uncertainty but do not remove it.

See [scouting-recon-audit.md](scouting-recon-audit.md), [knowledge-intel-partial-information-audit.md](knowledge-intel-partial-information-audit.md).

## Phase 5 — Resolve

Resolution is deterministic from inputs: team state, mission state, active modifiers, protocols, and intel.

What the simulation does:

- applies team and agent readiness against mission difficulty and weights
- applies cohesion, fatigue, loadout fit, and certification effects
- runs encounter tracking and protocol activations
- evaluates the weakest link
- emits an outcome category (success, partial, fail, escalated, delayed) with a failure margin and reason codes

The player does not roll dice. Outcomes are explainable.

See [weakest-link-mission-resolution-audit.md](weakest-link-mission-resolution-audit.md), [combat-resolver-audit.md](combat-resolver-audit.md), [encounter-tracking-audit.md](encounter-tracking-audit.md), [outcome-branching-audit.md](outcome-branching-audit.md), [protocols-audit.md](protocols-audit.md).

## Phase 6 — Aftermath

The week's outcomes update the agency.

What lands on the agency:

- recovery and trauma load on operatives and teams
- attrition and replacement pressure
- fallout effects (pressure, legitimacy, faction standing, budget)
- spawned follow-up cases tied to source resolutions
- training debt, gear damage, and downtime
- changes to support capacity and bottlenecks

Consequences propagate. A failed mission today raises pressure that shapes next week's intake.

See [recovery-trauma-downtime-audit.md](recovery-trauma-downtime-audit.md), [operative-attrition-loss-replacement-audit.md](operative-attrition-loss-replacement-audit.md), [funding-procurement-budget-pressure-audit.md](funding-procurement-budget-pressure-audit.md), [factions-audit.md](factions-audit.md), [spawn-rules-audit.md](spawn-rules-audit.md).

## Phase 7 — Read The Report

The weekly report explains what happened in player-readable terms.

What the report surfaces:

- outcome categories with named contributing factors
- pressure and standing changes with their sources
- new incidents spawned, with attribution
- recovery and readiness changes per team
- bottleneck and capacity warnings

Reports are surfaced from canonical state, not recomputed independently. If a report is wrong, the underlying state is wrong.

See [report-notes-audit.md](report-notes-audit.md), [event-logging-audit.md](event-logging-audit.md), [visibility-layer-audit.md](visibility-layer-audit.md).

## Phase 8 — Plan The Next Week

Before advancing, the player can act on slow-moving systems.

What the player can do between weeks:

- start or continue training and certifications
- queue recruitment and process candidates
- procure gear, materials, and supplies
- start or progress research programs
- adjust doctrine, protocols, and standing orders
- rebalance support capacity and specialist assignment

These actions take real weeks to mature. Decisions made here pay off (or fail to) in future weeks.

See [training-certification-audit.md](training-certification-audit.md), [scouting-recon-audit.md](scouting-recon-audit.md), [funding-procurement-budget-pressure-audit.md](funding-procurement-budget-pressure-audit.md), [research-system-audit.md](research-system-audit.md), [protocols-audit.md](protocols-audit.md).

## Worked Example — One Week

Starting state:

- two open incidents: a Containment Breach (deadline 2 weeks, requires occult + tactical coverage) and an Investigation Lead (deadline 4 weeks, requires investigation + tech)
- one Containment Strike Team (`mission_ready`, leader present, full kit)
- one Investigation Cell (`conditional`: investigator fatigued, missing field_recon)
- support capacity is at 80%; one specialist bottleneck flagged on maintenance
- pressure: case load elevated, faction pressure low

The player's week:

1. **Read the board.** The breach is the urgent item; the lead has slack. Maintenance bottleneck threatens loadout turnaround.
2. **Triage.** Route the breach to the strike team this week. Defer the lead one week to recover the investigator.
3. **Compose and equip.** Confirm the strike team's loadout includes the breach's required countermeasure tag. Loadout passes.
4. **Deploy.** Commit the strike team to the breach. Time cost: 1 week execution + 1 week recovery.
5. **Resolve.** Deterministic outcome: partial success. Containment held; one operative injured; minor collateral.
6. **Aftermath.** Injured operative enters recovery. Team drops to `recovery_required` for 2 weeks. Faction pressure unchanged. One spawned follow-up case (witness cleanup, low priority).
7. **Read the report.** Report attributes the partial outcome to the operative's missing trauma kit (a soft risk the player saw and accepted). Maintenance bottleneck flagged again.
8. **Plan next week.** Queue maintenance specialist hire. Start trauma kit procurement. Investigation Cell will be ready for the lead next week.

Advance week. The cycle repeats under changed conditions.

## When The Loop Breaks

Common failure modes the loop should make legible:

- routing every incident regardless of capacity → cascading attrition
- ignoring recovery → teams drop into `recovery_required` and stay there
- skipping training and recruitment → role coverage erodes
- chasing soft risks too often → partials accumulate into failures
- deferring high-priority incidents → stage escalation and spawned follow-ups

These are not arbitrary punishments. They are direct readings of the simulation state surfaced in the report.

For objectives and the failure model, see [rules-and-objectives.md](rules-and-objectives.md).
