# Hidden Mechanics Combat Resolver Audit

> Scope: documentation-only support note for deterministic hidden-mechanics encounter resolution.
>
> Goal: define a compact, reusable resolver contract for authored/runtime encounter outcomes without introducing a full tactical engine.

## 1) Resolver categories

### A. Pure evaluation resolver

- **Purpose:** deterministically classify an encounter result from explicit input state.
- **Behavior:** no mutation, no side effects.
- **Output:** structured resolution result that downstream systems can apply.

### B. Resolution application layer

- **Purpose:** apply the structured result to canonical game state.
- **Behavior:** explicit writes to encounter runtime state, flags, progress clocks, and queued follow-ups.
- **Output:** updated state + compact application metadata (e.g., queued follow-up IDs).

### C. Orchestration wrapper (optional)

- **Purpose:** convenience entrypoint that resolves and applies in one call.
- **Behavior:** calls A then B in order, preserving deterministic behavior.
- **Output:** both raw resolution and applied-state summary for debug/log surfaces.

## 2) Recommended input fields

Use a compact input object with explicit values and optional condition-driven modifiers.

### Core identity

- `encounterId: string`
- `resolutionId?: string` (optional stable identifier for logging/traceability)
- `week?: number` (if caller does not use state week)

### Deterministic score inputs

- `basePower: number`
- `baseDifficulty: number`
- `thresholds?: { successAt: number; partialAt: number }`

### Conditional modifiers (optional)

- `modifiers?: Array<{
  id: string
  when?: ScreenRouteCondition
  powerDelta?: number
  difficultyDelta?: number
}>`

Notes:

- Reuse existing condition language (`flags`, `progressClocks`, `location`, `encounter`, predicates) to avoid duplicate gating logic.
- Keep modifier math additive and deterministic.

### Outcome effect maps (optional)

- `encounterPatchByOutcome?: { success?; partial?; failure? }`
- `flagEffectsByOutcome?: { success?; partial?; failure? }`
- `progressEffectsByOutcome?: { success?; partial?; failure? }`
- `followUpByOutcome?: { success?; partial?; failure? }`

### Debug control

- `includeDebug?: boolean` for developer-only diagnostics.

## 3) Outcome categories

Recommended stable categories:

- `success`
- `partial`
- `failure`

Optional derivations:

- `success: boolean` convenience field
- numeric `score` for tie-breaking and diagnostics

These three categories are enough for authored branching while staying compact.

## 4) Integration guidance

### Encounter runtime state

- Apply explicit `EncounterRuntimePatch` by outcome.
- Typical defaults:
  - `success` → `status: resolved`
  - `partial` / `failure` → `status: active` (or authored override)
- Track a compact phase marker (e.g., `hidden-combat:success`) only if useful for routing/debug.

### Flags

- Set/clear authored flags after resolution via canonical flag helpers.
- Prefer namespaced IDs (e.g., `encounter.<id>.resolved`).
- Do not write flags during pure evaluation.

### Progress clocks

- Apply post-resolution clock deltas via clock helpers.
- Keep per-outcome clock effects explicit and small.
- Avoid hidden implicit increments.

### Event queue

- Enqueue outcome follow-ups as runtime queue events (e.g., `encounter.follow_up`).
- Include compact payload: `encounterId`, `outcome`, `resolutionId`.
- Keep ordering deterministic by enqueue order only.

### Developer logging

- Log one compact summary entry for resolution result.
- Optionally log queued follow-up summary if events were enqueued.
- Avoid verbose internals in player-facing paths.

### Developer overlay

- Surface compact fields: encounter ID, outcome, status/phase, queued follow-up count.
- Show debug internals (modifier IDs, effective totals) only in debug sections.

### Save/load compatibility

- Persist only canonical state changes (encounter runtime, flags, clocks, queue).
- Do not require special persistence shape for resolver internals.
- Ensure debug output can be recomputed or omitted without affecting gameplay state.

## 5) Common pitfalls

1. **Mixing evaluation and mutation**
   - Causes side effects during preview/debug calls and breaks determinism guarantees.

2. **Duplicating condition logic**
   - Re-implementing flag/clock checks outside shared condition evaluators drifts quickly.

3. **Unstable thresholds**
   - Hard-to-trace behavior if thresholds change implicitly or depend on hidden mutable globals.

4. **Over-verbose payloads**
   - Queue/log payload bloat complicates save/load and debug readability.

5. **Leaking hidden mechanics to player copy**
   - Player-facing surfaces should consume outcomes and authored follow-ups, not raw resolver internals.

6. **Non-deterministic math**
   - Randomness or time-based values inside resolver path undermines replayability and tests.

## 6) Open questions

1. Should `partial` default to `status: active` or a distinct `phase` convention across all encounters?
2. Do we want standardized outcome severity tags for feed/report formatting?
3. Should queue events for encounter outcomes use one type (`encounter.follow_up`) or typed variants by family?
4. How much debug detail should be retained in developer logs vs computed on demand in overlay views?
5. Should authored content branching read encounter resolution outcomes directly from flags, encounter phase, or queued follow-ups as primary source?
6. Is there a need for a “dry-run” preview API explicitly exposed for tools/debug UI?

## 7) Suggested implementation invariants

- Resolver function is pure and deterministic.
- Application function performs all mutations explicitly and only once.
- Outcome categories remain stable (`success` / `partial` / `failure`).
- Integrations reuse existing helpers (flags, clocks, queue, routing predicates).
- Tests assert deterministic outcome selection and structured apply behavior.

## 8) Current aggregate-battle side-gating invariants

The aggregate-battle resolver currently applies ingress and anchor logic with explicit side semantics:

- **Ingress melee attack modifiers are attacker-side only when `defenderSideId` is set**
  - Institutional defenders are treated as already inside the site and are not penalized by ingress traversal when counter-attacking.
  - If `defenderSideId` is absent, the legacy symmetric fallback remains (modifier may apply to all sides).

- **`construction.incomplete` defense penalty keeps loose fallback behavior**
  - Penalty is intended for the institutional defender side.
  - When `defenderSideId` is absent, behavior remains backward-compatible and can affect all sides.

- **Restricted/locked anchor defense bonus requires explicit defender identity**
  - Anchor-derived defense bonus is granted only when `defenderSideId` is explicitly provided and matches the unit side.
  - No silent universal anchor bonus is granted when defender identity is ambiguous.

- **Determinism requirement**
  - Given identical battle input/context, side-gating outcomes are stable and reproducible across runs.
