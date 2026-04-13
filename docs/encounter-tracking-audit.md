wwwwww# Encounter Tracking Audit (Design Support)

> Scope: documentation-only support note for encounter state tracking in Containment Protocol.
>
> Constraints respected: no runtime logic changes, no symbol renames, no test edits.

## 1) Encounter lifecycle stages

Recommended high-level lifecycle for encounter tracking:

- **hidden**
  - Encounter exists as authored potential but should not yet be player-visible.
  - Typical entry condition: setup flags or prerequisite route/clock context not met.

- **available**
  - Encounter is discoverable/selectable and can transition to active play.
  - Typical entry condition: prerequisite flags/clocks satisfied; not yet committed.

- **active**
  - Encounter is currently in progress (resolver/choices can mutate outcome-driving state).
  - Typical entry condition: launch/commit action or explicit activation event.

- **resolved**
  - Encounter has reached a terminal outcome for the current chain node.
  - Typical entry condition: resolver result attached (`success`, `partial`, `failure`) with optional follow-up scheduling.

- **archived**
  - Encounter is no longer part of active flow and is retained for audit/history.
  - Typical entry condition: post-resolution cleanup or superseded branch finalization.

## 2) Recommended tracked fields

Keep fields compact, deterministic, and save-safe:

- `encounterId: string`
- `status: 'hidden' | 'available' | 'active' | 'resolved' | 'archived'`
- `phase?: string`
  - Fine-grained authored substate (e.g., `containment`, `post-op`, `hidden-combat:partial`).
- `startedWeek?: number`
- `resolvedWeek?: number`
- `latestOutcome?: 'success' | 'partial' | 'failure'`
- `lastResolutionId?: string`
- `followUpIds?: string[]`
  - Compact references only; avoid embedding large payloads.
- `hiddenModifierIds: string[]`
- `revealedModifierIds: string[]`
- `flags: Record<string, boolean>`
  - Encounter-local booleans for authored gating.
- `lastUpdatedWeek: number`

Optional (if needed later):

- lightweight timeline/event refs (IDs only) rather than full event objects.

## 3) Transition rules

Use explicit, deterministic transitions (no implicit render-time mutation):

1. **Initialize**
   - If encounter tracking is first touched, initialize with explicit `status` (`available` or `active` depending on flow), set `startedWeek`, and set `lastUpdatedWeek`.

2. **Phase updates**
   - `phase` changes should not automatically flip `status` unless authored policy explicitly does so.

3. **Activation**
   - `available -> active` only through explicit action (launch/commit/entry event).

4. **Resolution attachment**
   - Resolver attaches:
     - `latestOutcome`
     - `lastResolutionId`
     - optional `followUpIds`
     - `resolvedWeek` when terminal path intends closure
   - Default outcome mapping policy (recommended):
     - `success` => `resolved`
     - `partial`/`failure` => `active` unless authored override says resolved

5. **Archival**
   - `resolved -> archived` only through explicit archival policy/handler.

6. **Idempotency**
   - Re-attaching the same resolution should not duplicate follow-up IDs or corrupt deterministic order.

## 4) Integration guidance

### Combat resolver

- Keep resolver split:
  - pure resolve (score/outcome)
  - explicit apply (state mutation)
- Apply step should initialize encounter tracking if missing, then attach outcome metadata and follow-up IDs.

### Flags

- Global flags: for cross-system gating (`flagSystem`-style helpers).
- Encounter-local flags: for encounter-internal authored predicates.
- Keep roles distinct to avoid drift and accidental global pollution.

### Progress clocks

- Use explicit progress effects by outcome.
- Avoid hidden implicit clock increments in resolver core.
- Prefer deterministic per-outcome deltas.

### Queue

- Follow-ups should enqueue compact events (e.g., type + targetId + context/source).
- Preserve FIFO ordering and avoid hidden reordering.
- Track `followUpIds` on encounter state as references for diagnostics.

### Logging

- Emit concise developer log entries for:
  - encounter phase/status updates
  - resolution attachment (id/outcome)
  - follow-up enqueue count/ids
- Keep payload compact and deterministic.

### Overlay

- Show encounter summary fields:
  - id, status, phase, latestOutcome, lastResolutionId, resolvedWeek, follow-up count
- Optionally show modifier IDs and flags under debug-expanded sections.

### Save/load

- Persist encounter tracking as canonical runtime state.
- On load, sanitize:
  - enum-like status/outcome values
  - numeric weeks
  - string arrays (de-dup, trim)
  - flags as booleans only
- Never require volatile/computed-only fields to deserialize.

## 5) Common pitfalls

- **Implicit state mutation during read/render**
  - Causes nondeterminism and replay/debug drift.

- **Conflating global and encounter-local flags**
  - Leads to brittle authored conditions.

- **Overloading `phase` as both UX label and transition driver**
  - Makes transition semantics unclear.

- **Duplicate follow-up references**
  - Happens when re-applying outcomes without dedupe policy.

- **Resolver/application coupling**
  - Side effects in pure resolve path complicate testing.

- **Non-canonical save assumptions**
  - Relying on transient UI/debug fields during hydration.

## 6) Open questions

- Should `partial` default to `active` universally, or be configurable per encounter family?
- Should `archived` be automatic after follow-up queue drains, or always explicit?
- Do we need a standard policy for re-resolution of already `resolved` encounters?
- Should encounter-local flags support non-boolean values, or remain boolean-only by design?
- How much encounter detail should be shown in non-debug UI versus developer overlay?
- Is a minimal encounter timeline (IDs only) needed for auditability beyond current summary fields?
