# Outcome Branching Audit (Encounter Aftermath Layer)

> Scope: documentation-only support note for deterministic encounter outcome branching in Containment Protocol.
>
> Goal: define a compact, reusable branching/application model that maps encounter resolution outcomes into authored/runtime aftermath behavior.

## 1) Outcome categories

Recommended stable categories for encounter aftermath:

- `success`
  - Encounter objective achieved with clean or mostly clean closure.
  - Typical default posture: transition to `resolved` and schedule any optional follow-up debrief.

- `partial`
  - Objective mixed/contested; requires follow-up handling.
  - Typical default posture: keep encounter `active` (or set explicit partial phase) and enqueue a follow-up scene/event.

- `failure`
  - Objective failed; likely escalation or lingering fallout.
  - Typical default posture: keep encounter `active` unless explicit authored rule resolves/archives it.

Design note: keep categories stable for cross-system predictability; variant behavior should happen in branch definitions, not by inventing many new outcomes.

## 2) Recommended branch inputs

Use deterministic, explicit inputs only.

### Core resolution context

- `encounterId: string`
- `resolutionId: string`
- `week: number`
- `outcome: 'success' | 'partial' | 'failure'`
- `score?: number` (optional, if resolver provides it)

### Current state context

- Encounter runtime state snapshot (status/phase/followUps/flags)
- Relevant persistent flags / one-shot status
- Progress clock values and completion state
- Optional authored route context (`activeContextId`, queue-aware context)

### Branch definitions (author-facing)

Recommended shape:

- `id: string`
- `outcome: 'success' | 'partial' | 'failure' | 'any'`
- `when?: condition` (reuse existing routing/content condition semantics)
- `effects?: structured aftermath outputs`
- `summary?: string` (developer/debug label)

Selection policy:

- Filter branches to matching `outcome` + `any`.
- Apply first-match deterministic selection by authored order.
- Allow fallback branch behavior through unconditional entries.

## 3) Aftermath output types

Keep outputs compact and structured.

- `branchId` / `outcomeId`
  - For deterministic debugability and traceability.

- `encounterPatch`
  - Explicit runtime patch (status/phase/flags/updated week, optional resolvedWeek).

- `followUpIds`
  - Compact references to authored aftermath targets.

- `queueEvents`
  - Explicit queue payloads (type, targetId, context/source, optional payload).

- `flagEffects`
  - `set` and `clear` operations for persistent flags.

- `progressEffects`
  - Clock deltas and optional defaults.

- `authoredContextPatch`
  - Optional UI/authored breadcrumb updates (active context, last next target, follow-up ids).

Model split recommendation:

1. **Select phase (pure):** produce selected branch metadata + merged effect payload.
2. **Apply phase (explicit):** mutate state by applying queued effects in a fixed order.

## 4) Integration guidance

### Combat resolver

- Resolver remains responsible for deterministic outcome classification.
- Outcome branching consumes resolver result and produces aftermath effects.
- Do not add a second combat engine; branching is post-resolution only.

### Encounter tracking

- Apply encounter patch explicitly (status/phase/outcome linkage).
- Record `resolutionId`, `latestOutcome`, and merged follow-up references.
- Preserve deterministic lifecycle transitions.

### Queue

- Enqueue explicit aftermath/follow-up events in deterministic order.
- Keep event payload compact (encounterId, outcome, resolutionId when useful).
- Avoid hidden queue interception.

### Flags

- Apply set/clear effects explicitly in apply phase.
- Keep global flags for cross-system gating; avoid accidental encounter-local/global drift.

### Progress clocks

- Apply explicit per-branch deltas only.
- Avoid implicit “auto-advance” side effects.
- Keep defaults deterministic when creating absent clocks.

### Content branching

- Reuse existing authored condition evaluation patterns for branch `when` logic.
- Keep branch ordering authored and explicit.
- Prefer fallback branch rather than hidden default behavior.

### Logging

- Emit compact developer log entry on selection/application:
  - outcomeId
  - branchId
  - fallback marker
  - encounterId/resolutionId
  - follow-up/queue counts

### Overlay

- Surface selected outcome branch metadata and aftermath summary in developer snapshot:
  - selected branch id/outcome id
  - follow-up ids
  - queue entries produced
  - encounter patch summary

### Save/load

- Persist canonical state changes only:
  - encounter runtime updates
  - flags
  - progress clocks
  - queue
  - authored UI breadcrumbs (if intentionally persisted)
- Selection internals should be recomputable from persisted canonical state + authored branch definitions.

## 5) Common pitfalls

1. **Mixing selection and mutation**
   - Causes hard-to-debug side effects in preview/debug paths.

2. **Branch order ambiguity**
   - Unclear fallback semantics produce inconsistent outcomes.

3. **Outcome-category drift**
   - Adding ad hoc categories breaks downstream assumptions.

4. **Duplicate follow-ups and queue spam**
   - Re-apply paths without dedupe policy can flood queue/history.

5. **Implicit mutations via global hooks**
   - Hidden interception undermines deterministic reasoning.

6. **Overly verbose payloads**
   - Queue/log bloat harms readability and save portability.

7. **Cross-scope flag misuse**
   - Encounter-local intent accidentally encoded as global flags (or vice versa).

## 6) Open questions

1. Should `partial` default to `active` everywhere, or be configurable per encounter family?
2. Should unconditional branch matches be explicitly labeled as fallback in all diagnostics?
3. Do we want first-class dedupe policy for follow-up IDs/queue targets at branching layer?
4. Should branch selection metadata be persisted on encounter runtime, or remain log/snapshot-only?
5. How much authored-context patching should be allowed from outcome branches vs dedicated choice flows?
6. Should queue event typing for outcome aftermath be standardized (`encounter.follow_up` + variants) by policy?
