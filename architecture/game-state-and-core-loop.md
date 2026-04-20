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

## Supply Network and Connected Support Surfacing (Issue #72)

The supply-network pass adds a small canonical logistics substrate rather than
folding connected support into UI-only summaries or ad hoc per-case flags.

Canonical ownership now lives in:

- `src/domain/supplyNetwork.ts`
- `GameState.supplyNetwork`
- `WeeklyReport.supplyNetwork`

This substrate owns:

- explicit supply sources
- strategic support nodes with controller and region coverage
- traced road links and blocked-path reasons
- vulnerable transport assets with bounded lift and disruption state
- supported or unsupported region traces and deterministic weekly summaries

`src/domain/sim/advanceWeek.ts` now recomputes the supply snapshot before case
resolution. Region-anchored operations read supported vs unsupported state from
that canonical trace, not from UI logic. Report notes, operation events, the
dashboard, and the agency summary render canonical supply summaries instead of
re-deriving blocked support or transport status locally.

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
  territorialPower: TerritorialPowerState
  supplyNetwork: SupplyNetworkState
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

... (content truncated for brevity, full details in source)

## See also

- `architecture/entity-relationship-model.md`
- `architecture/event-schema.md`
- `docs/glossary.md`
