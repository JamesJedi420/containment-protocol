# Containment Protocol — Game State Schema

## Outcome Registrar and Exclusive Bucketing (SPE-20)

All case outcome assignment (resolved, failed, partial, unresolved) is now
routed through a single canonical registrar in
`src/domain/sim/advanceWeek.ts`. This registrar enforces exclusive bucketing
per tick, preventing any case from being assigned to more than one outcome in a
single week. Post-tick assertions validate exclusivity, and all
simulation/scheduler tests verify this behavior.

## Shared Rules Substrate and Canonical Surfacing (SPE-41)

The shared rules substrate is now implemented and is the canonical owner for
cross-system rule interpretation:

- `src/domain/shared/tags.ts`
- `src/domain/shared/outcomes.ts`
- `src/domain/shared/modifiers.ts`
- `src/domain/shared/distortion.ts`

These modules now own:

- canonical tags and bounded condition helpers
- graded outcomes and contested resolution helpers
- bounded modifiers, resistance, and countermeasure explanation
- typed consequence ladders and consequence routing
- deterministic distortion-state normalization and propagation

Report and explanation surfaces should consume canonical domain outputs rather
than rebuilding local interpretations. In practice this means:

- report-note content and outcome rollups come from `src/domain/reportNotes.ts`
- cadence, threshold, and pressure summaries come from
  `src/domain/strategicState.ts`
- dashboard, agency, containment, and shared copy surfaces render those shared
  outputs instead of duplicating rule interpretation in UI or copy constants

## Purpose

This document describes the high-level structure of Containment Protocol’s
canonical game state.

It is a design-facing schema reference, not a strict implementation dump. Its
purpose is to:

- describe the canonical game state at a high level
- provide a design-facing schema reference for systems work
- anchor weekly simulation around `advanceWeek`

## Schema principles

### 1. Canonical state first

Every meaningful system value should have one owner.

### 2. Derived state should not become parallel truth

UI and report outputs should derive from domain state rather than persisting
redundant logic.

### 3. Weekly simulation is the main state transition

Most global state changes are processed through `advanceWeek`.

### 4. The agency is the primary root actor

The player plays the institution, not an individual character.

## Top-level state shape

```ts
interface GameState {
  meta: MetaState
  agency: AgencyState
  world: WorldState
  factions: Record<FactionId, FactionState>
  operatives: Record<OperativeId, OperativeState>
  teams: Record<TeamId, TeamState>
  incidents: Record<IncidentId, IncidentState>
  missions: Record<MissionId, MissionState>
  hub: HubState
  facilities: FacilityState
  economy: EconomyState
  knowledge: KnowledgeState
  reports: WeeklyReport[]
  eventLog: DomainEvent[]
}
```

This is conceptual. Actual implementation may split or flatten parts of this.

## Containment Protocol — Core Loop & Systems Map

### Core Loop Overview

This document explains how the major systems connect during normal play.
It focuses on:

- the main weekly campaign loop
- major subloops
- system boundaries
- state transitions
- where player decisions occur
- where consequences are applied

This is a design flow document, not code documentation.

## 1. Primary campaign loop

Containment Protocol’s primary loop is a deterministic weekly institutional cycle.

```text
World pressure / incidents update
-> Hub opportunities and surfaced information update
-> Player triage and planning
-> Team / resource preparation
-> Deployment and mission resolution
-> Recovery / fallout / institutional pressure update
-> Weekly reports and summaries
-> Next week
```

This loop should remain the center of the game.

### Subloops and integration reminders

- **Mission intake → triage → routing** mutates canonical weekly state; it is not disposable UI setup (SPE-16).
- **Weakest-link resolution** is the shared bounded outcome surface for missions (SPE-18); readiness, intel, and pressure feed it — see `systems/mission-resolution.md`.
- **Knowledge / intel** routes through routing, readiness, research, stability overlays, and save/load validation as one integrated layer (SPE-23); see `docs/knowledge-intel-partial-information-audit.md` and `planning/dependency-map.md`.
- **Execution instability** overlays readiness/time-cost without adding a parallel timer (SPE-17); see `docs/deployment-readiness-time-cost-audit.md`.
- **Narrow calibration passes** (for example SPE-25) touch thresholds/constants only; they do not change loop architecture — see `systems/resolution-thresholds-tuning.md`.

### Architecture index notes

Issue numbers in the **See also** list are **not contiguous by design**. Gaps usually mean work lives in `docs/` audits, was merged into a neighboring issue, or never received a dedicated `architecture/` row in this map.

- **SPE-62** — operational phase-resolution pipeline; see `docs/combat-resolver-audit.md` (not a separate architecture file here).
- **SPE-96–105** — no dedicated bullets in this list.
- **SPE-116–124** — no dedicated bullets; **SPE-125** / **SPE-128** life-anchor scope is consolidated on a single line below.

## See also

### Persistence, schema expansion, and entity detail

- `architecture/persistence-model.md` — versioned save/load, store migration, **SPE-281** / **SPE-283** attrition and rotating-roster continuity; see `docs/save-load-audit.md`.
- `architecture/game-state-schema-expanded.md` — expanded typed `GameState` reference (companion to the conceptual shape in **Top-level state shape** above).
- `architecture/entity-relationship-model.md`
- `architecture/entity-relationship-model-detailed.md` — detailed ER narrative (companion to the summary model).
- `architecture/event-schema.md`

### Architecture topics (SPE-tagged)

- `docs/glossary.md`
- `docs/cross-scale-integration.md` — SPE-64 handoff packets and phase boundaries
- `architecture/knowledge-state-system.md` — SPE-58 epistemic model
- `docs/unknown-interaction-runtime.md` — SPE-59 provisional encounter identity
- `architecture/compliance-breakdown-non-core-actors.md` — SPE-56
- `architecture/spatial-layers-exposure.md` — SPE-57
- `architecture/personnel-progression-veteran-drift.md` — SPE-60
- `architecture/site-occupancy-repopulation.md` — SPE-61
- `architecture/fortified-site-breach-assault.md` — SPE-63
- `architecture/large-asset-disable-capture.md` — SPE-65
- `architecture/reserve-reinforcement-rescue-timing.md` — SPE-66
- `architecture/expansion-foothold-delayed-yield.md` — SPE-67
- `architecture/medical-stabilization-response.md` — SPE-68
- `architecture/covert-access-specialist-lane.md` — SPE-69
- `architecture/hidden-state-displacement-counter-detection.md` — SPE-70
- `architecture/site-trigger-authoring-kernel.md` — SPE-71
- `architecture/supply-network-strategic-nodes.md` — SPE-72
- `architecture/local-confrontation-odds-bands.md` — SPE-73
- `architecture/deception-false-signals-counterplay.md` — SPE-74
- `docs/contribution-and-release-operations.md` — SPE-75
- `architecture/procedural-naming-layered-identity.md` — SPE-76
- `architecture/optional-scenario-modes-asymmetric-play.md` — SPE-77
- `architecture/campaign-bootstrap-crisis-packets-pressure-maps.md` — SPE-78
- `architecture/integrity-drift-corruption-agency-loss.md` — SPE-79
- `architecture/bound-entities-risky-procedures.md` — SPE-80
- `architecture/apex-domain-authority-intervention.md` — SPE-81
- `architecture/compound-specialist-antidote-toxin-lane.md` — SPE-82
- `architecture/background-packages-inherited-start-state.md` — SPE-83
- `architecture/frenzy-berserk-specialist-lane.md` — SPE-84
- `architecture/specialist-outsourcing-transcription-flawed-output.md` — SPE-85
- `architecture/urban-service-nodes-legal-front-hidden-function.md` — SPE-86
- `architecture/civic-jurisdiction-detention-unrest.md` — SPE-87
- `architecture/anomaly-compendium-governed-taxonomy.md` — SPE-88
- `architecture/momentum-scarce-mitigation-resource.md` — SPE-89
- `architecture/pursuit-chase-transit-hazards.md` — SPE-90
- `architecture/asymmetric-infrastructure-raid-state.md` — SPE-91
- `architecture/complex-platform-state-resource-budgeting.md` — SPE-92
- `architecture/external-support-reliability-trust.md` — SPE-93
- `architecture/support-specialist-multipliers-bottlenecks.md` — SPE-94
- `architecture/command-coordination-under-pressure.md` — SPE-95
- `docs/aggregate-battle-audit.md` — SPE-106 (army-scale aggregate battle layer)
- `architecture/recruitment-markets-contract-quality-impressment.md` — SPE-107
- `architecture/siegeworks-fortification-destruction-tunnels.md` — SPE-108
- `architecture/district-scheduling-urban-cadence-witness-density.md` — SPE-109
- `architecture/construction-progress-interference-incomplete-sites.md` — SPE-110
- `architecture/subterranean-generation-geology-topology.md` — SPE-111
- `architecture/pre-mission-query-budgets-briefing-intel.md` — SPE-112
- `architecture/permanent-gear-mutation-stations.md` — SPE-113
- `architecture/authority-handoff-elimination-modes.md` — SPE-114
- `architecture/peril-survival-gates-escalating-failure.md` — SPE-115
- `architecture/identity-overwrite-possession-escalation.md` — SPE-126
- `architecture/clue-artifacts-rumor-packets.md` — SPE-127
- `architecture/life-anchor-relics-anchor-state-grammar.md` — SPE-125 (SPE-128 duplicate → use SPE-125 only)
- `architecture/fatigue-stress-exhaustion-multi-axis.md` — SPE-130
- `architecture/concurrent-multi-team-site-state.md` — SPE-131
- `architecture/transformation-control-upkeep-reversion.md` — SPE-132
- `architecture/sleeper-conditioning-triggered-obedience.md` — SPE-133
- `architecture/fixed-site-shells-movable-aftermath.md` — SPE-134
- `architecture/structured-room-key-records.md` — SPE-135
- `architecture/hidden-search-diminishing-retries.md` — SPE-136
- `architecture/multi-key-access-lock-networks.md` — SPE-137
- `architecture/command-word-artifacts-recharge.md` — SPE-138
- `architecture/district-aware-urban-encounter-generation.md` — SPE-139
- `architecture/maritime-licensed-predation-covert-shipping.md` — SPE-140
- `architecture/commission-crafting-reliability-tiers.md` — SPE-141
- `architecture/macro-travel-long-range-spotting.md` — SPE-142
- `architecture/prospecting-deposit-yield-classification.md` — SPE-143
- `architecture/polity-driven-settlement-generation.md` — SPE-144
- `architecture/composited-protective-gear-records.md` — SPE-145
- `architecture/conduct-gated-advancement-vow-bound-progression.md` — SPE-146
- `architecture/emergency-governance-crackdown-states.md` — SPE-147
- `architecture/inheritance-estate-transfer-registration.md` — SPE-148
- `architecture/public-recruitment-posting-pipeline.md` — SPE-149
- `architecture/project-labor-scaling-throughput.md` — SPE-150
- `architecture/world-law-compatibility-contradiction.md` — SPE-151
- `architecture/measure-to-value-conversion.md` — SPE-152
- `architecture/scene-control-deck-state-subplot-pressure.md` — SPE-153
- `architecture/mixed-surface-settlement-hidden-understructure.md` — SPE-154
- `architecture/morale-break-states-panic-branching.md` — SPE-155
- `architecture/civilization-capability-tier-taxonomy.md` — SPE-156
- `architecture/procedural-geases-bounded-wish-resolution.md` — SPE-157
- `architecture/actor-dossiers-lineage-snapshots.md` — SPE-158
- `architecture/diegetic-anti-stall-routing-live-clue-surfacing.md` — SPE-159
- `architecture/runtime-episode-assembly-scene-end-triggers.md` — SPE-160
- `architecture/appraisal-driven-emotion-goal-priority.md` — SPE-161
- `architecture/distributed-story-evaluation-narrative-signals.md` — SPE-162
- `architecture/submerged-site-interactions.md` — SPE-163
- `architecture/staged-ability-resolution-misfire-routing.md` — SPE-164
- `architecture/anatomy-aware-crit-fumble-resolution.md` — SPE-165
- `architecture/inherited-power-succession-violent-transfer.md` — SPE-166
- `architecture/territorial-power-nodes-domain-casting.md` — SPE-167
- `architecture/strategic-governance-turn-loop-authority-economy.md` — SPE-168
- `architecture/progressive-corruption-managed-manifestation.md` — SPE-169
- `architecture/overlapping-holdings-layered-territory-control.md` — SPE-170
- `architecture/face-honor-restitution-ledger.md` — SPE-171
- `architecture/regional-exchange-bargaining-currency-fragmentation.md` — SPE-172
- `architecture/maritime-strategy-staged-naval-action.md` — SPE-173
- `architecture/institution-records-calendars-affiliated-orders.md` — SPE-174
- `architecture/ceremonial-legitimacy-transfer-succession-machine.md` — SPE-175

### Architecture supplements (cross-cutting and resource-synced topics)

These files extend the simulation design surface but are **not** tied to a single **SPE-** bullet in the numbered list above. Most were imported from Linear project resources (**Source** block in each file names the canonical URL; **git is canonical** for ongoing edits).

**Access, sites, extraction, travel**

- `architecture/access-state-grammar.md`
- `architecture/extraction-systems-and-workforce-site-states.md`
- `architecture/objective-degradation-and-capture-doctrine.md`
- `architecture/purpose-first-site-generation.md`
- `architecture/stage-conditioned-site-generation.md`
- `architecture/travel-scenes-and-roadside-negotiation.md`

**Combat-adjacent and encounter modeling**

- `architecture/artifact-mode-and-charge-states.md`
- `architecture/field-effects-and-nonstandard-combat-states.md`
- `architecture/summon-taxonomy-and-control.md`
- `architecture/transformation-and-shadow-state-systems.md`
- `architecture/micro-hostile-bypass-and-counters.md`
- `architecture/mass-encounter-unit-abstraction.md`

**Authoring, pressure, undead**

- `architecture/psychological-scenario-generation.md`
- `architecture/npc-pressure-and-roaming-behavior.md`
- `architecture/undead-domain-anchoring-and-manifestation.md`

**Puzzles and structured support**

- `architecture/card-schema-and-puzzle-support-records.md`

**External design depth (SPE-186+, knowledge children)**

- `architecture/external-design-theme-contracts.md` — theme-level implementation contracts grouped by mirrored **SPE-** band
- `architecture/knowledge-subsystems-expansion.md` — SPE-529 / 587 / 588 / 589 surface tables
- `docs/linear-external-documentation-follow-ups.md` — full mirrored prompt checklist (upstream prose out of repo)

**Integration audits**

- `docs/design-audits-index.md` — alphabetical catalog of `docs/*audit*.md` checklists (field names, routing, test hooks).

**Planning**

- `planning/backlog.md` — canonical near-term priority queue.
- `planning/documentation-curation.md` — ongoing curation (backlog vs roadmap vs maps).
