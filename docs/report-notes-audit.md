# Report Notes Audit — Weekly Report Notes, Event Reflection, and Hub Notes

> Design note and architectural reference for `src/domain/reportNotes.ts` and `src/domain/hub/hubReportNotes.ts`.

---

## 1. Overview

Report notes (`ReportNote[]`) populate the weekly debrief log. Two systems produce them:

1. **Event-driven reflection** (`reportNotes.ts → buildDeterministicReportNotesFromEventDrafts`) — maps `AnyOperationEventDraft` objects to deterministic notes with stable IDs and timestamps
2. **Hub simulation surface** (`hub/hubReportNotes.ts → buildHubReportNotes`) — surfaces hub opportunities and rumors as notes at end-of-week

Both are pure functions. Neither writes to `GameState` directly.

---

## 2. Note Identity and Timestamps

### `buildReportNoteTimestamp`

```text
baseTimestamp provided → Math.trunc(baseTimestamp) + sequence
default               → CLOCK_START_MS + (week−1) × WEEK_MS + sequence
```

`CLOCK_START_MS` is `Date.UTC(2042, 0, 1, 0, 0, 0)` — the fictional calendar epoch.
`WEEK_MS` is `7 × 24 × 60 × 60 × 1000`.

### `createDeterministicReportNote`

ID format: `note-{timestamp}-{sequence in base-36}`.

Fields set only when defined (no `undefined` values stored):

- `type` — optional note type enum
- `metadata` — optional typed `ReportNoteMetadata` payload

---

## 3. Note Types and Content Formats

### Case outcome notes

| Type | Content template | Key metadata fields |
| --- | --- | --- |
| `case.resolved` | `{title}: operation concluded. Threat contained. {rewards?}` | caseId, caseTitle, stage, reward fields |
| `case.partially_resolved` | `{title}: partially stabilised. Case returned to active queue. {rewards?}` | caseId, caseTitle, fromStage, toStage, reward fields |
| `case.failed` | `{title}: containment failed. Threat escalated to Stage {stage}. {rewards?}` | caseId, caseTitle, fromStage, toStage, reward fields |
| `case.escalated` | `{title}: deadline lapsed. Escalated to Stage {stage}. {rewards?}` | caseId, caseTitle, fromStage, toStage, trigger, reward fields |

### Case lifecycle notes

| Type | Content summary | Key metadata fields |
| --- | --- | --- |
| `case.spawned` | Source-aware: world\_activity / faction\_pressure / pressure\_threshold / parent-spawn | caseId, parentCaseId, trigger, factionId, sourceReason |
| `case.raid_converted` | `{title}: Converted to multi-team operation.` | caseId, stage, trigger |
| `case.aggregate_battle` | Battle outcome, rounds, routed counts, special damage, movement denial | battleId, roundsResolved, winnerLabel, routed unit lists |

### Agent notes

| Type | Content template | Key metadata fields |
| --- | --- | --- |
| `agent.training_completed` | `{agentName}: {trainingName} completed.` | agentId, trainingId, queueId |

### Market and economy notes

| Type | Content template | Key metadata fields |
| --- | --- | --- |
| `market.shifted` | `Market shift: {pressureLabel} conditions. Featured fabrication {name}.` | featuredRecipeId, pressure, costMultiplier |
| `market.transaction_recorded` | `Market purchase/sale: {qty}x {name} for ${total}.` | action, listingId, itemId, qty, unitPrice, totalPrice, remaining |

### Faction notes

| Type | Content template | Key metadata fields |
| --- | --- | --- |
| `faction.standing_changed` | `{factionName}: standing {±delta} after {caseTitle}.` | factionId, delta, standingBefore, standingAfter, reason |
| `faction.unlock_available` | `{factionName}: {label} channel available.` | factionId, contactId, contactName, disposition |

### Recruitment notes

| Type | Content template | Key metadata fields |
| --- | --- | --- |
| `recruitment.scouting_initiated` | `Scouting opened on {name}. Projected {tier}-tier at {confidence} for ${cost}.` | candidateId, stage, projectedTier, confidence, fundingCost, revealLevel |
| `recruitment.scouting_refined` | Same as above + tier-change annotation | previousProjectedTier, previousConfidence |
| `recruitment.intel_confirmed` | `Deep scan confirmed {name} as {tier}-tier for ${cost}.` | confirmedTier, revealLevel |

### System notes

| Type | Content template | Key metadata fields |
| --- | --- | --- |
| `system.equipment_recovered` | Inline from draft payload | recovered[], delayed[], counts, maintenanceCapacity, damagedCount |
| `system.recruitment_expired` | `Recruitment pipeline expired {count} candidate(s).` | count |
| `system.recruitment_generated` | `Recruitment pipeline generated {count} candidate(s).` | count |
| `system.party_cards_drawn` | `Party cards drawn: {count}.` | count |
| `agency.containment_updated` | `Agency posture updated: containment X% → Y%, funding $A → $B.` | containmentDelta, fundingDelta, clearanceLevelAfter |
| `directive.applied` | `Directive applied: {label}. Effects activated for this week.` | directiveId, directiveLabel |

### Standalone system notes (direct builders, not event-driven)

| Function | Type | Content summary |
| --- | --- | --- |
| `buildEscalationConsequenceNote` | `system.escalation_consequence` | Threat family, escalation band, consequences, severeHit — sequence 910 |
| `buildThresholdCourtProxyConflictNote` | `system.proxy_conflict` | Only emitted when `effect === 'proxy_interference'` — sequence 911 |
| `buildThresholdCourtProtocolNote` | `system.protocol_contact` | Threshold Court contact outcome, reliability/distortion deltas — sequence 913 |
| `buildAnchorFactionInstabilityNote` | `system.anchor_instability` | Anchor faction cohesion, agendaPressure, reliability, distortion summary — sequence 914 |

---

## 4. Reward Summary Inlining

When an event draft includes `rewardBreakdown`, two helpers are called:

- `formatRewardSummary` — appends inline reward text to case outcome notes: `"Rewards: Funding +X, Reputation +Y, Materials +Z, Gear +N, Faction ±F."`
- `buildRewardMetadata` — attaches `fundingDelta`, `containmentDelta`, `reputationDelta`, `strategicValueDelta`, `materialRewardCount`, `equipmentRewardCount`, `factionStandingNet` to the note's metadata

Reward fields are derived from `getMissionRewardInventoryTotals` and `getMissionRewardFactionStandingNet`.

---

## 5. `buildDeterministicReportNotesFromEventDrafts`

Iterates `AnyOperationEventDraft[]` in order. For each draft:

1. `buildReflectedReportNote(draft)` maps the draft to `{ content, type, metadata? }` — returns `null` for unrecognized types
2. If not null, `createDeterministicReportNote` is called with `sequence` counter (starts at 0, increments per emitted note)
3. Returns `ReportNote[]` in emission order

Event types returning `null` (no note): all types not listed in section 3.

---

## 6. Historical Report Note Reconstruction

`getHistoricalReportNoteDrafts` reconstructs event drafts from persisted `OperationEvent[]` for historical weeks. Only three event types support this:

- `recruitment.scouting_initiated`
- `recruitment.scouting_refined`
- `recruitment.intel_confirmed`

All other event types are not re-surfaced from event history.

---

## 7. Hub Report Notes (`buildHubReportNotes`)

Produces notes from `HubState` without timestamp determinism (uses `Date.now()`):

### Opportunities

Content: `Hub Opportunity — {label}: {detail} (Confidence: X%)[accessExplanation?]`
Type: `hub.opportunity`
Metadata: `factionId`, `confidence`, `misleading`, optionally `accessState` and `requiredSanctionLevel`

### Rumors

Content: `Hub Rumor — {label}: {detail} (Confidence: X%)[Misleading?][Filtered?]`
Type: `hub.rumor`
Metadata: `confidence`, `misleading`, `filtered`

Hub notes are **not deterministic** — they use live `Date.now()` timestamps. This means hub note IDs are not stable across re-renders.

---

## 8. Integration Points

| Consumer | Usage |
| --- | --- |
| `sim/advanceWeek.ts` | Calls `buildDeterministicReportNotesFromEventDrafts` and `buildHubReportNotes` to populate `report.notes` |
| `sim/weeklyReport.ts` | Calls `buildDeterministicReportNotesFromEventDrafts` to finalize notes in weekly report builder |
| `AgencyReportSummary` (`agency.ts`) | Reads `latestReport.notes.length` for UI rollup |
| `agency.ts → countCriticalItems` | Counts `unresolvedTriggers` and `failedCases` in reports for urgency badge |

---

## 9. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Adding a new event type to `AnyOperationEventDraft` without a `case` branch in `buildReflectedReportNote` | Event is silently dropped from weekly reports | Add a `case` branch returning the note shape, or explicitly `return null` |
| Using `Date.now()` in event-reflected notes | Non-deterministic IDs — duplicate notes on hot reload or re-render | Always use `createDeterministicReportNote` with sequence counter |
| Emitting hub notes through the deterministic path | Hub notes lack a stable sequence anchor | Keep hub notes in `buildHubReportNotes` separate from event-driven path |
| Standalone system note sequences collide (e.g. two builders using sequence 910) | Notes share identical IDs — last-write wins or dedup errors | Reserve unique sequence values per builder (910–914 are currently claimed) |
| Calling `buildAnchorFactionInstabilityNote` with a partial game state that lacks `market` or `events` | `buildFactionStates` throws — note is silently dropped via catch | Ensure all required fields are present when constructing the partial game state arg |
| Reading `factionStandingNet` from `ReportNoteMetadata` as the total standing — it is the net delta across all factions for one mission | Overstates cumulative faction impact | Use per-faction `standingAfter` fields for current standing, not net |
