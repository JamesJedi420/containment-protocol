# Containment Protocol — Persistence Model

## Purpose

This document defines how Containment Protocol should think about persistence.

It explains:

- what should be saved
- what should be derived on load
- what must remain canonical
- how weekly simulation outputs should persist
- how versioning and migration should be handled conceptually

This is a design and architecture document, not an implementation-specific storage adapter spec.

---

## Persistence goals

The persistence model should:

- preserve full campaign continuity
- keep canonical state authoritative
- avoid storing unnecessary duplicate derived state
- support deterministic reload behavior
- allow safe schema evolution over time
- support debugging and test fixture creation
- keep save data inspectable and recoverable where practical

A good save model should let the game answer:

- if the player loads this save, do they get the same strategic state?
- can the next week simulate deterministically from this state?
- can reports and surfaced outputs be regenerated or safely reused?
- can schema changes be migrated without silent corruption?

---

## 1. Core persistence principles

### 1.1 Save canonical state, not just visible UI state

The save file should preserve the true campaign state needed to continue play.

### 1.2 Prefer regeneration for derived output where safe

If a value can be deterministically rebuilt from canonical state and events, it should usually not be stored redundantly unless there is a strong reason.

### 1.3 Weekly transition boundaries matter

The most important persistence checkpoint is the end of a completed weekly simulation step.

### 1.4 One source of truth per field

Do not store the same gameplay-critical state in multiple authoritative locations.

### 1.5 Save what the player’s next decision depends on

If removing a field would change next-week decision quality or deterministic outcome, it probably belongs in canonical persistent state.

---

## 2. What must be persisted

The following categories should persist.

### 2.1 Meta / version state

Examples:

- save format version
- current week
- campaign id
- optional deterministic seed if used
- migration version markers

#### Why — Meta / version state

Needed for:

- loading
- migration
- debugging
- deterministic inspection

---

### 2.2 Agency state

Examples:

- funding
- legitimacy
- standing
- support capacity
- specialist availability
- institutional pressure flags
- coordination or overload flags if they are true campaign state
- relevant agency-level bottleneck state

#### Why — Agency state

This is the main player-facing root entity.

---

### 2.3 Operatives and teams

Examples:

- operative role/certifications/status
- injuries / trauma / recovery state
- loadouts
- team membership
- deployment state
- cohesion/readiness if canonically stored

#### Why — Operatives and teams

These directly affect future routing, readiness, and resolution.

---

### 2.4 Incidents and missions

Examples:

- unresolved incidents
- escalation state
- mission assignments
- mission outcomes if still relevant to ongoing campaign consequences
- linked mission/incident references
- fallout still affecting the world

#### Why — Incidents and missions

The campaign must remember unresolved pressure and prior commitments.

---

### 2.5 Facilities and economy

Examples:

- upgrades
- capacity state
- market or procurement state if persistent
- recurring upkeep or cost burdens

#### Why — Facilities and economy

These shape long-horizon agency capability.

---

### 2.6 Hub state

Persist if hub state is meaningfully persistent across weeks.

Examples:

- active opportunities
- persistent rumors or leads
- hub faction presence
- district states
- opportunity exhaustion or cooldowns if used

#### Why — Hub state

If the hub evolves across weeks, it must survive reloads.

---

### 2.7 Faction state

Examples:

- relationship values
- faction pressure
- presence or access state
- persistent hostility/cooperation markers

#### Why — Faction state

Faction state feeds future opportunity, legitimacy, and campaign outcomes.

---

### 2.8 Knowledge state

Examples:

- discovered incidents
- known factions/sites
- intel fragments
- confidence states if persistent
- player-facing compendium unlocks

#### Why — Knowledge state

Player knowledge is part of campaign continuity.

---

### 2.9 Recovery and backlog states

Examples:

- operative recovery
- equipment recovery backlog if canonical
- delayed specialist work
- pending support recovery effects

#### Why — Recovery and backlog states

Recovery burdens create future constraints and cannot be lost.

---

### 2.10 Domain event history (bounded or full)

Persist some event history if needed for:

- report browsing
- history inspection
- debugging
- future analytics

This may be:

- full event log
- recent rolling event window
- report-only summarized event archive

#### Why — Domain event history

Depends on desired report/history depth.

---

### 2.11 Weekly reports

Persist reports if the player can browse prior weeks without regenerating them from raw events.

#### Why — Weekly reports

Reports are player-facing history and may be worth keeping stable across versions.

If a weekly report is expected to preserve exactly what the player saw that
week, persist compact canonical snapshots such as weekly supply-network output
instead of asking the UI to reconstruct historical blocked paths or support
coverage from later state.

---

## 3. What should usually be derived rather than saved

These should generally be recomputed from canonical state unless there is a strong performance or stability reason to persist them.

### 3.1 UI layout state

Examples:

- currently selected tab
- expanded panels
- temporary filters

These are session-state concerns, not campaign-state concerns.

---

### 3.2 Report summaries that can be regenerated

If reports are generated from stable events or canonical state, some aggregate views may be derived rather than stored.

---

### 3.3 Projection outputs

Examples:

- expected pressure warnings
- deployment projections
- risk banners

These should generally be recomputed from canonical state on load.

---

### 3.4 Low-level intermediate calculation state

Examples:

- temporary weekly calculation buckets
- transition-only counters
- non-canonical helper structures

These should not persist unless they are actually required to resume a partially processed step.

---

### 3.5 Duplicated mirror fields

Examples:

- root-level mirror of agency support if agency already owns it canonically
- dashboard-only copy of blocked supply regions if `GameState.supplyNetwork` or
  `WeeklyReport.supplyNetwork` already own that summary canonically
- UI-optimized duplicate of report categories if reports already store source notes

Avoid persisting redundant mirrors.

---

## 4. Save boundary recommendations

### Recommended safe save points

#### A. End of week

Best default save point.

State includes:

- post-resolution canonical campaign state
- generated report
- updated supply-network traces, transport readiness, and strategic support
  control state
- updated hub/opportunities
- updated incidents, factions, recovery, and pressure

This is the cleanest and safest checkpoint.

#### B. Pre-advance planning state

Also useful.

State includes:

- current week pre-resolution
- agency planning and routing state
- incidents and opportunities before the next simulation step

This supports returning to the planning phase.

#### C. Mid-flow save (optional, only if needed)

Saving during deployment or inside multi-step transactional state is riskier.

Only support this if:

- the system explicitly models resumable mid-phase state
- the save format clearly preserves partial transitions

Otherwise prefer phase-complete save points.

---

## 5. Suggested top-level persisted structure

Conceptual example:

```ts
interface PersistedCampaign {
  meta: PersistedMeta
  gameState: PersistedGameState
  reports?: PersistedReportArchive
  eventLog?: PersistedEventArchive
}
```

Example breakdown:

```ts
interface PersistedMeta {
  saveVersion: number
  gameVersion?: string
  currentWeek: number
  campaignId: string
  savedAt: string
}

interface PersistedGameState {
  agency: AgencyState
  operatives: Record<string, OperativeState>
  teams: Record<string, TeamState>
  incidents: Record<string, IncidentState>
  missions: Record<string, MissionState>
  factions: Record<string, FactionState>
  hub: HubState
  facilities: FacilityState
  economy: EconomyState
  knowledge: KnowledgeState
  world: WorldState
}
```

## 6. Persistence by entity

### Agency

Persist:

- yes, fully

Do not derive:

- support capacity
- specialist availability
- legitimacy/funding/standing
- active overload flags if they matter next week

### Teams and operatives

Persist:

- yes, fully for campaign continuity

Do not derive:

- injuries
- recovery state
- loadout ownership
- deployment status

May derive:

- some aggregate display metrics if computed from member state

### Incidents

Persist:

- all active/unresolved incidents
- escalated incidents still affecting the world
- recent resolved incidents if they still matter for the campaign/hub

May archive:

- fully resolved, no-longer-relevant incidents

### Missions

Persist:

- active missions
- recent missions still shaping fallout, reports, or follow-up logic

May archive:

- older resolved missions if the history model supports it

### Hub

Persist:

- if opportunities, rumors, or district states survive across weeks

If the hub is fully regenerated each week:

- persist only what is required to regenerate correctly

### Reports

Persist:

- if player report history is a product feature

Otherwise:

- allow regeneration from event archive if stable enough

### Event log

Persist:

- rolling recent event history at minimum if report generation or history review needs it

Avoid:

- infinite growth without pruning/archive strategy

## 7. Regeneration strategy

On load, the game should ideally:

- load persisted canonical campaign state
- validate schema version
- migrate if necessary
- reconstruct any transient derived structures
- recompute projections and UI summaries
- make the game immediately playable without additional hidden simulation steps

Do not:

- silently rerun major weekly logic on load unless that is explicitly part of the save/load contract

## 8. Versioning and migration

Every save should have a version

At minimum:

- saveVersion: number

Migration rules

When schema changes:

- migrate old saves forward explicitly
- do not rely on implicit undefined-field behavior for critical state
- document canonical ownership changes carefully

Common migration examples

- moving a field from root to agency
- renaming an event type
- splitting one field into several bounded fields
- adding persistent hub state
- replacing old mirror fields with canonical ownership

Migration safety rule

If a field affects deterministic weekly outcomes, migration must set it explicitly.

## 9. Canonical vs persisted event data

There are three viable event persistence strategies:

### Strategy A — No event persistence

Save only canonical state and current reports.

Pros:

- simpler
- smaller saves

Cons:

- weak history inspection
- harder debugging

### Strategy B — Rolling recent event archive

Persist the last N weeks of surfaced and/or critical events.

Pros:

- enough for reports/history/debugging
- bounded size

Cons:

- incomplete long-term event history

### Strategy C — Full event archive

Persist all domain events.

Pros:

- strongest history/audit support
- useful for analytics or replay-like systems

Cons:

- size growth
- migration complexity
- more maintenance burden

Recommendation

Use Strategy B unless a full event-history feature is explicitly desired.

## 10. Non-canonical backlog / queue caution

A repeated persistence hazard is allowing a useful temporary queue or helper structure to become “sort of canonical” without formal ownership.

Rule:

if a queue changes future deterministic outcomes, it must either:

- become explicitly canonical and persist, or
- be safely derivable from canonical state on load

Avoid shadow state that only survives in a running process.

## 11. Example save snapshot

```json
{
  "meta": {
    "saveVersion": 3,
    "currentWeek": 14,
    "campaignId": "cp-001",
    "savedAt": "2026-04-17T12:00:00Z"
  },
  "gameState": {
    "agency": {
      "funding": 18,
      "legitimacy": 62,
      "standing": 41,
      "supportAvailable": 2,
      "maintenanceSpecialistsAvailable": 1,
      "coordinationFrictionActive": true,
      "coordinationStatus": "overloaded"
    },
    "teams": {},
    "operatives": {},
    "incidents": {},
    "missions": {},
    "factions": {},
    "hub": {
      "opportunities": [],
      "rumors": []
    },
    "facilities": {
      "upgrades": ["med_bay_2", "training_room_1"]
    },
    "economy": {
      "currentFunds": 18
    },
    "knowledge": {
      "knownIncidents": [],
      "knownFactions": []
    },
    "world": {
      "regions": {}
    }
  },
  "reports": {
    "recentWeeks": []
  }
}
```

This is conceptual only.

## 12. Persistence anti-patterns

- Anti-pattern 1: Saving mirrored truth in multiple places
  - Example: agency.supportAvailable, root supportAvailable, report-derived support state. This creates drift risk.
- Anti-pattern 2: Persisting too much transient state
  - If a field only exists during advanceWeek, it probably should not be saved.
- Anti-pattern 3: Not versioning saves
  - Without explicit versioning, migrations become brittle and unsafe.
- Anti-pattern 4: Depending on runtime-only helper structures
  - If a value matters after load, it must be canonical or derivable.
- Anti-pattern 5: Letting reports become authoritative
  - Reports explain state. They should not replace simulation state.

## 13. Testing expectations for persistence

Persistence tests should verify:

- Save/load continuity: saving then loading preserves campaign state
- Deterministic continuity: a loaded state produces the same next weekly result as the pre-save state
- Migration safety: old-version saves load into correct canonical ownership
- Derived recomputation: projections, warnings, and reports regenerate or reload correctly
- No hidden state dependency: no important system breaks because a runtime-only helper was lost

## 14. Summary

The persistence model for Containment Protocol should:

- save canonical campaign state
- derive UI/transient state on load where practical
- respect weekly simulation boundaries
- version everything clearly
- avoid duplicate truth
- preserve enough history for reports and debugging
- keep deterministic continuity intact

The core rule is:

if a piece of state can change future outcomes, it must be either canonically persisted or safely derivable from canonical persisted state.
