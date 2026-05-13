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
  meta: PersistedMeta;
  gameState: PersistedGameState;
  reports?: PersistedReportArchive;
  eventLog?: PersistedEventArchive;
}
```

Example breakdown:

```ts
interface PersistedMeta {
  saveVersion: number;
  gameVersion?: string;
  currentWeek: number;
  campaignId: string;
  savedAt: string;
}

interface PersistedGameState {
  agency: AgencyState;
  operatives: Record<string, OperativeState>;
  teams: Record<string, TeamState>;
  incidents: Record<string, IncidentState>;
  missions: Record<string, MissionState>;
  factions: Record<string, FactionState>;
  hub: HubState;
  facilities: FacilityState;
  economy: EconomyState;
  knowledge: KnowledgeState;
  world: WorldState;
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

#### Continuity, attrition, and rotating-roster reconciliation (SPE-281 / SPE-283)

**Attrition persistence (SPE-281)** carries operative loss and replacement pressure through the same save/export path as the rest of `GameState`. Recap surfaces read it directly. The continuity recap line uses **roster-only** replacement pressure (`computeReplacementPressure`), not funding-inflated `buildReplacementPressureState`. Cross-session continuity recap is active when `challengeModeEnabled` and `durationModel === 'attrition'` (hydration parity). Chapter-break reset clears attrition carryover via `applyChapterBreakAttritionReset` (recomputes replacement pressure, mission routing, deployment readiness, then contract board) without requiring a full new-run wipe.

**Rotating-roster continuity (SPE-283)** builds on that envelope; it is not a separate persistence mechanism. When an **in-flight** case’s **assigned team** includes **at least one absent operative** (`lost` / `temporarily_unavailable`), preserve the **prior mission decision surface** — the inherited slice that must not thrash because the bench changed. `applyRotatingRosterContinuityReconciliation` holds these fields stable across rotation:

- `route`
- `displacementTarget`
- `detectionConfidence`
- `counterDetection`

**Hidden-case fallback:** if **no active assigned operative** remains on a case with `hiddenState === 'hidden'`, **promote** it to `revealed` and **floor `detectionConfidence` at `1`**, restoring player-facing participation while keeping route continuity.

Reconciliation re-derives routing, replacement pressure, readiness, and contracts through `recomputeAttritionDerivedState` and remains **idempotent**.

**Recap continuity** for roster rotation is surfaced through the **rotating-roster continuity summary** (alongside SPE-281 recap lines in the challenge + attrition configuration).

- optional `deploymentMomentum` (SPE-282): bounded stack counter for sustained-deployment earn/spend in the same challenge+attrition configuration; same save/hydration path, clamped on load (stack cap and `lastChangeWeek` bounded to `1..loadedWeek`), reset to zero with an explicit chapter-break summary when `applyChapterBreakAttritionReset` runs.

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

## Regional module conversion (design)

Treat a **regional cell** as a **bounded operational module**, not a genre set-piece. Each cell packages:

- **Subhex / keyed POIs** — stable anchors for sites, access points, and revisit logic.
- **Local resources** — material, logistical, or institutional affordances with upkeep and scarcity.
- **Hazards** — environmental, infrastructural, or anomalous risk that persists or mutates across visits.
- **Hidden populations** — see social-system modeling below; never flatten to ambient “monsters.”
- **Adjacent spillover hooks** — explicit, bounded links where pressure, refugees, runoff, rumor, or secondary incidents cross cell edges.

**Hard split — maps:** preserve a strict boundary between **player-facing claim maps** (what the agency believes it can show, sanction, or brief) and **hidden operational truth maps** (routing, hazards, populations, and geometry the simulation must not leak through UI alone). Authoring and generation should assume both layers exist even when the player only sees one.

**Hydrological anchors** (spring, river source, underground stream, sinkhole) should act as **route**, **evidence**, and **site-memory** systems: they justify movement constraints, forensic chains, revisitable traces, and long-horizon state change without becoming magical shortcuts by default.

**Hidden populations** are **social systems**, not encounter tables. Model at minimum:

- **Care needs** — shelter, medical, legitimacy, supply, or secrecy-dependent resources.
- **Secrecy tiers** — who knows what, and what exposure costs.
- **Leadership knowledge asymmetry** — planners vs scouts vs public-facing actors see different slices of truth.
- **Negotiation pressure** — cooperation is costly; refusal escalates along institutional or social clocks.

**Evidence in hostile environments** should **cost time** and **raise contact / clock pressure** whenever extraction implies sustained presence, visible commotion, or contested custody.

**Remains, relics, valuables, and unusual resources** default to **custody / provenance / identification** framing (chain of evidence, legitimacy, lab routing, disposition risk), not **loot** framing.

**Fantasy-to-CP vocabulary:** prefer CP-native terms such as **place-bound intelligence**, **hidden population**, **breakaway faction**, **hazardous object**, **old belief trace**, and **environmental telemetry** instead of importing tabletop monster categories as first-class simulation types.

### Regional operations map stack (SPE-49)

Campaign play should assume a **partially known regional layer** inside the same operational stack: **route confidence**, **zone control / stabilization** states with **upkeep burden**, **revisitable mutated zones**, **liminal hidden-domain access**, and **linked geography** across surface, shoreline, submerged, and liminal entry bands. This remains a **bounded spoke-and-corridor operational map**, not a free-roam world simulator.

## Large complex generation guardrails (design)

**Staging:** large sites generate in ordered phases — **macro structure** → **area / depth layout** → **inter-area links** → **room/corridor topology** → **occupancy / factions** → **evidence / hazards / clocks**. Skipping phases or collapsing them into one opaque pass invites unmaintainable geometry and untestable outcomes.

**Hard split — truth vs claims:** the same player-vs-truth map boundary as regional modules applies, especially for **secret links**, **hidden exits**, **same-depth subdivisions**, and **disconnected internal levels**. Player-facing claims must never accidentally become the authoritative navmesh for hidden-state routing.

**Living complexes:** treat large sites as **living systems**. Cleared zones may be **reoccupied**; routes may **reopen or collapse**; factions may **move during downtime**. **“Fully clear the whole site”** should not be the default objective — partial stabilization, evidence extraction, or bounded containment beats total clearance as the norm.

**Encounter vocabulary:** convert fantasy **monster / faction tables** into CP-native categories such as **hidden population**, **altered remains**, **rival group**, **environmental hazard**, **place-bound intelligence**, and **hazardous object**.

**Recoverables:** **valuables, relics, remains, and crystals** default to **custody / provenance / evidence / legitimacy** framing, not loot tables.

**Depth is multidimensional:** depth influences more than threat strength — include **air quality**, **light**, **route confidence**, **extraction burden**, **evidence age**, and **rescue difficulty** in how deep bands behave.

**Procedural quality bar:** large-site procedural outputs must stay **editable**, **explainable**, and **plausibly infrastructural / geological / anomalous** — not arbitrary maze noise. Every generated corridor should answer “why would this exist?” at a schematic level.

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
