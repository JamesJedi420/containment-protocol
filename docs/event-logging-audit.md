# Event Logging Audit (Authoring + Runtime Dev Logging)

> Scope: documentation-only support note for upcoming event logging implementation.
>
> Constraints honored: no runtime business logic edits, no symbol renames, no test changes.

## 1) Recommended event categories

Use a small set of top-level logging categories that map cleanly to current `OperationEvent` families and source systems:

- `incident`
  - Case lifecycle, escalations, raid conversion, assignment changes.
- `personnel`
  - Training, injuries/fatalities, promotions, relationships, resignations, hires.
- `recon_intel`
  - Scouting initiated/refined/confirmed, weekly intel report generation.
- `economy_logistics`
  - Production queue start/complete, market shifts, market transactions.
- `faction_diplomacy`
  - Standing changes, unlock availability, contact-facing shifts.
- `agency_system`
  - Directive application, containment/funding updates, academy upgrades.
- `authored_runtime`
  - Front-desk/choice-system route context decisions, one-shot consumption, flag mutations, scene visits.

## 2) Suggested compact payload fields for each category

Keep a compact common envelope plus category-specific mini payloads.

### Common envelope (all categories)

- `id` (event id)
- `ts` (ISO timestamp)
- `week`
- `type` (existing `OperationEventType` when available)
- `source` (existing `OperationEventSourceSystem`)
- `category` (one of the recommended categories)
- `severity` (`debug` | `info` | `warn` | `error`)
- `entity` (primary target id, if any)
- `corr` (optional correlation id for grouped actions/ticks)

### Category-specific compact fields

- `incident`
  - `caseId`, `stageFrom?`, `stageTo?`, `trigger?`, `teamCount?`, `result?`
- `personnel`
  - `agentId`, `agent2Id?`, `queueId?`, `delta?`, `reason?`, `status?`
- `recon_intel`
  - `candidateId?`, `reportWeek?`, `projectedTier?`, `confidence?`, `cost?`
- `economy_logistics`
  - `queueId?`, `listingId?`, `itemId?`, `qty?`, `unitPrice?`, `total?`, `pressure?`
- `faction_diplomacy`
  - `factionId`, `contactId?`, `standingDelta?`, `unlockId?`, `reason?`
- `agency_system`
  - `directiveId?`, `containmentDelta?`, `fundingDelta?`, `tierFrom?`, `tierTo?`
- `authored_runtime`
  - `contextId?`, `choiceId?`, `nextTargetId?`, `followUpIds?`, `flagId?`, `oneShotId?`, `sceneId?`, `locationId?`

## 3) High-value events for debugging

Prioritize these for default debug visibility because they explain state transitions with high player impact:

- Case outcome chain:
  - `case.resolved`, `case.partially_resolved`, `case.failed`, `case.escalated`, `case.spawned`, `case.raid_converted`
- Assignment and mission readiness transitions:
  - `assignment.team_assigned`, `assignment.team_unassigned`
- Critical personnel events:
  - `agent.injured`, `agent.killed`, `agent.betrayed`, `agent.resigned`, `agent.promoted`
- Economy decisions and pressure changes:
  - `market.shifted`, `market.transaction_recorded`, `production.queue_completed`
- Agency posture deltas:
  - `agency.containment_updated`, `directive.applied`, `system.academy_upgraded`
- Authored/runtime routing context (new logging domain):
  - choice execution summary (applied/not-applied + failed conditions)
  - one-shot consumption results (`consumed` true/false)
  - active authored context transitions (`activeContextId`)

## 4) Events too noisy to log by default

Keep these out of default INFO streams; enable only in DEBUG mode or sampled mode:

- High-frequency relationship drift chatter:
  - `agent.relationship_changed` bursts (especially passive/external drift)
- Repeated scouting refinements in candidate-heavy weeks:
  - `recruitment.scouting_refined` when many candidates are processed
- Low-impact queue lifecycle chatter:
  - `production.queue_started`, `agent.training_started` unless troubleshooting a queue bug
- Any repeated derived-view recomputation logs (UI-side)
  - Avoid logging each projection/render/filter pass; log only user action + resulting state summary

## 5) Suggested retention policy

Use tiered retention to balance debugging value with memory size:

- In-memory recent ring buffer (for overlay)
  - Last 200–500 entries.
- Persisted run log subset
  - Keep all high-value categories for full run lifespan.
  - Sample or summarize noisy categories (e.g., relationship/scouting churn).
- Export payload guidance
  - Include full high-value timeline + summarized low-value buckets by week/type.
- Purge/summarize thresholds
  - Optional weekly compaction for low-value categories into aggregate records:
    - counts by `type`
    - first/last timestamp
    - min/max deltas

## 6) Suggested overlay presentation for recent events

For developer overlay / diagnostics pane, prefer a compact three-band view:

- `Critical now` (last 10, severity warn/error)
  - Ordered newest-first.
- `Recent actions` (last 30, user/choice-triggered)
  - Include context id and correlation id when present.
- `System chatter` (collapsed)
  - Expandable list for noisy/debug-only events.

Suggested row fields:

- `time` (`ts` short form)
- `type` / `category`
- `entity` shortcut (`caseId`, `agentId`, etc.)
- `summary` (single-line compact message)
- `context` (`activeContextId` / `choiceId`) when applicable

Suggested quick filters:

- category
- severity
- entity id
- current week only

## 7) Known ambiguity / open questions to verify

- Should authored/runtime logging reuse `OperationEvent` directly, or remain a parallel debug stream to avoid gameplay event contamination?
- Is `activeContextId` expected to represent modal/page scope only, or also transient in-flow choice scopes?
- For one-shot content logging, is repeated consume attempt (`consumed=false`) considered useful audit evidence or just noise?
- Should relationship-change events be aggregated at emission time or only at presentation/query time (as currently done in feed summary mode)?
- Do we need deterministic correlation ids spanning multi-event operations (e.g., one choice causing flags + scene visit + encounter patch)?
- What is the intended persisted retention size budget for event diagnostics in local storage saves?
- Should faction/contact interaction logs stay solely in faction histories, or be mirrored into a consolidated debug log channel?
