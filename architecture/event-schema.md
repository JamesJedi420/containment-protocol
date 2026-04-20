# Containment Protocol — Event Schema

## Purpose

This document defines the conceptual event model for Containment Protocol.

Events exist to record meaningful domain transitions so the game can:

- generate reports
- explain outcomes
- support deterministic tests
- inspect weekly causality
- avoid recomputing explanation logic in UI
- support persistence, debugging, and future analytics

This is a conceptual schema and design reference.
It is not a strict serialization contract yet.

---

## Event model goals

The event system should:

- represent meaningful domain changes
- remain deterministic
- preserve cause visibility
- support report generation and test assertions
- avoid becoming a second simulation layer
- avoid duplicating canonical state
- stay compact enough to be inspectable

Events should describe:

- what changed
- when it changed
- which system emitted it
- what entity it affected
- enough metadata to surface correct player-facing notes

Events should not become:

- the sole source of truth for simulation state
- a giant firehose of low-value logs
- a replacement for canonical game state

---

## 1. Event model overview

A domain event represents a meaningful state transition emitted during weekly processing or other bounded state transitions.

Conceptually:

```ts
interface DomainEvent {
  id: string
  week: number
  type: string
  sourceSystem: string

  entityRefs?: EntityRef[]
  payload: Record<string, unknown>

  severity?: 'low' | 'medium' | 'high'
  surfaced?: boolean
}
```

This shape is intentionally generic. Specific event types should define more specific payload expectations.

## 2. Event design principles

### 2.1 Events are downstream of canonical state

Canonical state owns the truth.
Events describe meaningful transitions and causes.

### 2.2 Events should support reports, not just debugging

If an event cannot be surfaced, tested, or otherwise justify its existence, it may be too low value.

### 2.3 Events should preserve bounded causality

Events should capture enough context for:

- report note generation
- QA review
- debugging
- future replay-like inspection

### 2.4 Prefer meaningful events over noisy events

Do not emit events for every trivial mutation.

Bad:

- “team list viewed”
- “button pressed”
- “week integer incremented”

Good:

- mission resolved
- support shortage degraded follow-through
- maintenance bottleneck delayed recovery
- escalation advanced because response was delayed

## 3. Core event fields

### 3.1 id

Unique event identifier.

`id: string`

Used for:

- debugging
- reference
- log ordering
- event de-duplication if needed

### 3.2 week

The simulation week when the event occurred.

`week: number`

Used for:

- weekly report generation
- chronological grouping
- persistence inspection

### 3.3 type

Canonical event type string.

`type: string`

Should be namespaced and stable.

Examples:

- mission.resolved
- mission.follow_through_degraded
- support.shortage_applied
- specialist.maintenance_bottleneck
- coordination.overload_applied
- incident.escalated
- hub.opportunity_generated

### 3.4 sourceSystem

Identifies which domain system emitted the event.

`sourceSystem: string`

Examples:

- advanceWeek
- missionResolution
- support
- hubSimulation
- procurement
- recovery

This is important for debugging and tracing system boundaries.

### 3.5 entityRefs

Optional references to the entities most directly involved.

```ts
interface EntityRef {
  entityType: string
  id: string
}
```

Examples:

- mission
- incident
- team
- operative
- faction
- hub opportunity
- agency

Example:

```ts
entityRefs: [
  { entityType: 'mission', id: 'm1' },
  { entityType: 'incident', id: 'i4' },
  { entityType: 'team', id: 't2' },
]
```

### 3.6 payload

Event-specific metadata.

`payload: Record<string, unknown>`

Payload should contain:

- the specific cause or result details needed for report surfacing
- bounded structured values
- no duplicated full state blobs

Good:

```ts
payload: {
  result: "partial",
  followThrough: "degraded",
  cause: "support_shortage"
}
```

Bad:

```ts
payload: {
  fullGameState: { ... }
}
```

### 3.7 severity

Optional severity classification.

`severity?: "low" | "medium" | "high"`

Used to:

- prioritize surfaced report notes
- sort warnings
- decide what belongs in summaries vs deep drilldown

### 3.8 surfaced

Optional flag indicating whether the event is a candidate for player-facing surfacing.

`surfaced?: boolean`

This can help report-generation logic filter low-value technical events.

## 4. Event categories

Containment Protocol should use a bounded set of event categories.

### 4.1 Mission events

Used for mission lifecycle and outcome changes.

Examples:

- mission.assigned
- mission.deployed
- mission.resolved
- mission.follow_through_degraded
- mission.failed
- mission.partial
- mission.fallout_applied

Example:

```json
{
  "id": "evt-001",
  "week": 12,
  "type": "mission.follow_through_degraded",
  "sourceSystem": "advanceWeek",
  "entityRefs": [
    { "entityType": "mission", "id": "m1" },
    { "entityType": "team", "id": "t1" }
  ],
  "payload": {
    "result": "partial",
    "cause": "support_shortage"
  },
  "severity": "medium",
  "surfaced": true
}
```

### 4.2 Incident events

Used when incidents change meaningfully.

Examples:

- incident.generated
- incident.routed
- incident.escalated
- incident.resolved
- incident.visibility_increased
- incident.expired

Example:

```json
{
  "id": "evt-020",
  "week": 12,
  "type": "incident.escalated",
  "sourceSystem": "advanceWeek",
  "entityRefs": [{ "entityType": "incident", "id": "i3" }],
  "payload": {
    "escalationFrom": 1,
    "escalationTo": 2,
    "cause": "delayed_response"
  },
  "severity": "high",
  "surfaced": true
}
```

### 4.3 Support events

Used for agency-side support state changes affecting operational throughput or follow-through.

Examples:

- support.shortage_applied
- support.capacity_restored
- support.overload_detected
- support.follow_through_penalty_applied

Example:

```json
{
  "id": "evt-101",
  "week": 12,
  "type": "support.shortage_applied",
  "sourceSystem": "support",
  "entityRefs": [
    { "entityType": "agency", "id": "agency" },
    { "entityType": "mission", "id": "m1" }
  ],
  "payload": {
    "supportAvailable": 1,
    "supportRequired": 2,
    "consequence": "follow_through_degraded"
  },
  "severity": "medium",
  "surfaced": true
}
```

### 4.4 Specialist events

Used when specialist capacity affects throughput or creates a bottleneck.

Examples:

- specialist.maintenance_bottleneck
- specialist.recovery_queue_cleared
- specialist.capacity_consumed

Example:

```json
{
  "id": "evt-130",
  "week": 12,
  "type": "specialist.maintenance_bottleneck",
  "sourceSystem": "advanceWeek",
  "entityRefs": [{ "entityType": "agency", "id": "agency" }],
  "payload": {
    "specialistType": "maintenance",
    "jobsCompleted": 1,
    "jobsDelayed": 2
  },
  "severity": "medium",
  "surfaced": true
}
```

### 4.5 Coordination events

Used when bounded command-coordination friction affects outcomes.

Examples:

- coordination.overload_applied
- coordination.follow_through_degraded

Example:

```json
{
  "id": "evt-150",
  "week": 12,
  "type": "coordination.overload_applied",
  "sourceSystem": "advanceWeek",
  "entityRefs": [
    { "entityType": "agency", "id": "agency" },
    { "entityType": "mission", "id": "m2" }
  ],
  "payload": {
    "trigger": "concurrent_load_plus_support_strain",
    "consequence": "follow_through_degraded"
  },
  "severity": "medium",
  "surfaced": true
}
```

### 4.6 Recovery events

Used for personnel or equipment recovery state changes.

Examples:

- recovery.started
- recovery.delayed
- recovery.completed
- recovery.partial

Example:

```json
{
  "id": "evt-170",
  "week": 12,
  "type": "recovery.delayed",
  "sourceSystem": "advanceWeek",
  "entityRefs": [{ "entityType": "agency", "id": "agency" }],
  "payload": {
    "recoveryType": "equipment",
    "delayedCount": 2,
    "cause": "maintenance_bottleneck"
  },
  "severity": "medium",
  "surfaced": true
}
```

### 4.7 Faction / legitimacy events

Used when social or political campaign conditions shift.

Examples:

- faction.relationship_changed
- legitimacy.reduced
- faction.presence_shifted
- access.narrowed

### 4.8 Hub events

Used for surfaced opportunities or rumors.

Examples:

- hub.opportunity_generated
- hub.rumor_generated
- hub.faction_presence_updated
- hub.lead_filtered

## 5. Canonical event naming rules

Use namespaced strings

Format:

`<domain>.<action>`

Examples:

- mission.resolved
- incident.escalated
- support.shortage_applied

Use stable names

Do not rename event types casually once report/test logic depends on them.

Prefer cause-aware actions

Good:

- support.shortage_applied

Bad:

- support.changed

Good:

- coordination.overload_applied

Bad:

- coordination.updated

## 6. Payload design rules

### 6.1 Include only what is needed

Payload should carry enough structured context for:

- report note generation
- deterministic testing
- debugging

### 6.2 Prefer explicit cause fields

Good:

```ts
payload: {
  cause: 'support_shortage'
}
```

This helps reports generate causal notes cleanly.

### 6.3 Prefer bounded enums/flags over prose

Good:

```ts
payload: {
  result: "partial",
  followThrough: "degraded"
}
```

Bad:

```ts
payload: {
  explanation: 'the team had some trouble and things got worse'
}
```

## 7. Event -> report relationship

The event log is one of the main inputs to report generation.

Flow:

Canonical state changes
-> domain events emitted
-> report-note builder reads surfaced events
-> report notes generated
-> player sees causal summary

This allows:

- reusable explanation logic
- testable report surfacing
- less UI-side duplication

As implemented after SPE-41, this reflection path should stay canonical:

- typed consequence and outcome interpretation belongs in shared domain helpers
- report-note content belongs in `src/domain/reportNotes.ts`
- UI surfaces should render canonical note content or canonical summary helpers,
  not reconstruct distortion, consequence, or outcome text from raw payloads

Example:

event: system.supply_network_updated

report note: Supply network - Support 2/3 traced regions / 1 ready transport / control score 9 / blocked occult_district.

Example:

event: specialist.maintenance_bottleneck

report note: Maintenance bottleneck delayed full equipment recovery.

## 8. Event priority / surfacing rules

Not all events deserve equal report prominence.

High-priority surfaced events

Usually include:

- mission failures / partials
- major escalation
- support shortage effects
- blocked support paths or disrupted transport that leave operations unsupported
- specialist bottlenecks
- coordination overload
- legitimacy loss
- major recovery delays

Medium-priority surfaced events

Usually include:

- successful recovery
- faction presence shifts
- non-critical opportunity generation
- manageable overload warnings

Low-priority or unsurfaced events

Usually include:

- internal transitional state changes
- technical bookkeeping
- intermediate calculations

## 9. Event lifecycle

- Emission: A system emits an event when a meaningful state transition occurs.
- Aggregation: Events are collected during weekly processing.
- Surfacing: Relevant events are transformed into report notes and summaries.
- Persistence: Events may be stored in an event log for the week or longer-term history depending on save design.
- Inspection: Events can be used by QA, debugging tools, replay-like reasoning, future analytics.

## 10. Event anti-patterns

- Anti-pattern 1: Full-state snapshots in payload
  - Too heavy, too duplicative, and too hard to maintain.
- Anti-pattern 2: Pure UI events mixed with domain events
  - Keep button clicks and domain consequences separate.
- Anti-pattern 3: Overly generic event names
  - Bad: state.updated, mission.changed, agency.modified
  - These are hard to use for reports or tests.
- Anti-pattern 4: Freeform prose-only payloads
  - Events should be structured enough to support deterministic surfacing.
- Anti-pattern 5: Emitting everything
  - If every tiny step creates an event, reports and debugging become noisy and weak.
- Anti-pattern 6: UI-side reconstruction of canonical explanation text
  - If distortion summaries, typed consequence ladders, or outcome-band
    explanations already exist in domain helpers, surface those outputs instead
    of rebuilding them from event payloads.

## 11. Example weekly event sequence

A partial containment week might emit:

- incident.escalated
- mission.deployed
- support.shortage_applied
- mission.follow_through_degraded
- mission.resolved
- recovery.delayed
- legitimacy.reduced
- hub.opportunity_generated

This is a useful sequence because it captures:

- prior pressure
- deployment
- causal bottleneck
- operational degradation
- outcome
- persistent recovery burden
- wider social cost
- future campaign consequence

## 12. Suggested TypeScript references

Conceptual forms:

```ts
type DomainEventType =
  | 'mission.resolved'
  | 'mission.follow_through_degraded'
  | 'mission.failed'
  | 'incident.generated'
  | 'incident.escalated'
  | 'support.shortage_applied'
  | 'support.capacity_restored'
  | 'specialist.maintenance_bottleneck'
  | 'coordination.overload_applied'
  | 'recovery.delayed'
  | 'legitimacy.reduced'
  | 'hub.opportunity_generated'

interface EntityRef {
  entityType: 'agency' | 'mission' | 'incident' | 'team' | 'operative' | 'faction' | 'hub'
  id: string
}

interface DomainEvent {
  id: string
  week: number
  type: DomainEventType | string
  sourceSystem: string
  entityRefs?: EntityRef[]
  payload: Record<string, unknown>
  severity?: 'low' | 'medium' | 'high'
  surfaced?: boolean
}
```

## 13. Testing expectations

Events should support tests that verify:

- the correct event is emitted for a given deterministic condition
- the payload carries enough cause information
- the correct report note is later generated
- low-value events are not over-surfaced
- no contradictory event sequences are produced

Example test:

- support shortage active
- mission resolves partial
- support.shortage_applied emitted
- report includes Support shortage degraded clean follow-through.

## 14. Summary

The event schema in Containment Protocol should:

- describe meaningful domain changes
- stay structured and bounded
- support reports, tests, and debugging
- preserve causal explanation
- avoid duplicating canonical state

The core rule is:

state remains canonical, events describe meaningful transitions, and reports surface those transitions in player-facing language.
