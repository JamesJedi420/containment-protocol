# Stability Audit (Desync Detection + Softlock Prevention)

> Scope: documentation-only support note for the Containment Protocol stability layer.
>
> Intent: define deterministic detection and recovery guidance for authored/runtime desync and softlock risk, without broad refactors.

## 1) Stability issue categories

Recommended top-level issue categories for deterministic runtime validation:

- **Event queue integrity**
  - Stale follow-up targets
  - Invalid payload shape
  - Duplicate queue items where uniqueness is expected
  - Future-dated or impossible sequencing metadata

- **Authored context integrity**
  - Active context IDs that no longer map to valid authored surfaces
  - Breadcrumbs pointing to stale choice/target IDs
  - Context references inconsistent with current routed content

- **Routing and fallback integrity**
  - No valid branch and no fallback for required surfaces
  - Required route path unavailable under current state
  - Branch conditions passing contradictory states

- **Trigger eligibility integrity**
  - Trigger target references no longer valid
  - One-shot trigger eligible after consumption
  - Trigger consumed but still repeatedly surfaced

- **Progress clock integrity**
  - Value out of range (`value < 0`, `value > max`, `max < 1`)
  - Completion metadata inconsistent with value/max
  - Invalid hidden/completed combinations where policy requires consistency

- **Encounter runtime integrity**
  - Active encounter missing required lifecycle metadata (`startedWeek`, phase policy)
  - Resolved encounter missing outcome linkage (`latestOutcome`, `resolvedWeek`, `resolutionId`)
  - Encounter follow-ups referencing missing encounter records

- **Cross-layer desync**
  - One-shot consumed state disagrees with surfaced authored eligibility
  - Queue follow-up references valid ID but invalid in current route context
  - Overlay snapshot missing expected runtime/authored correspondence

## 2) Recommended invariant checks

Use pure checks first and return compact machine-readable results.

### Queue invariants

- Every queued entry has stable non-empty `id`, `type`, and `targetId`
- `nextSequence` remains monotonic and >= 1
- Queue entries do not violate dedupe policy (if configured)
- Authored follow-up target IDs resolve against known authored target catalog

### Context invariants

- `activeContextId` (if set) resolves to a known/current context namespace
- `lastChoiceId` and `lastNextTargetId` are either empty or known IDs
- `lastFollowUpIds` are normalized and consistent with queued follow-up types

### Trigger and one-shot invariants

- For `one_shot` triggers: if consumed, eligibility must be false
- `consumeId` normalization is stable and deterministic
- Trigger target IDs are known and routable

### Progress clock invariants

- `max >= 1`
- `0 <= value <= max`
- If completed metadata exists, completion semantics are consistent with policy
- Raw persisted payload and normalized view do not diverge silently without a reported warning

### Encounter invariants

- Active encounters carry required active-state metadata
- Resolved encounters carry required resolved-state metadata
- Encounter state keys and embedded encounter IDs stay aligned
- Encounter-linked queue entries refer to existing encounter runtime records

### Routing/fallback invariants

- Required surfaces expose at least one route path and one deterministic fallback
- Branch selection never returns null where fallback is mandatory by UX policy
- Critical authored surfaces have a safe baseline route even under sparse runtime state

## 3) Softlock-risk patterns

Flag as **softlock risk** (high-priority) when any of these occur:

- No valid route + no fallback for a required user surface
- Consumed one-shot remains eligible and blocks expected progression path
- Active authored context points nowhere and prevents expected interaction chain
- Queue head points to invalid/stale target with no alternate actionable item
- Encounter flow stuck in active/resolved contradiction with no valid follow-up path
- Progress clock corruption blocks threshold-gated authored branches

Recommended severity model:

- `error` => high-confidence softlock risk or progression blocker
- `warning` => desync likely recoverable, or policy mismatch requiring review

## 4) Recovery strategy guidance

Prefer **detect → recommend → explicit apply**.

### Principles

- No hidden global mutation
- No automatic cleanup on read/render/tick
- Recovery actions are explicit, bounded, and auditable
- Return recovery summaries with exact counts/IDs

### Recovery tiers

1. **Non-mutating guidance (default)**
   - Suggest candidate actions (e.g., prune queue, clear stale context)
   - Provide issue-linked recommendations

2. **Targeted explicit recovery**
   - Prune invalid queue items only
n   - Clear stale authored context only
   - Keep unrelated runtime/simulation domains untouched

3. **Policy repair workflows (manual/assisted)**
   - Route catalog mismatch review
   - Trigger/one-shot rule review
   - Encounter lifecycle metadata correction

### Safety notes

- Recovery helpers should be idempotent
- Recovery helpers should preserve ordering/counters unless policy says otherwise
- Recovery helpers should not mutate long-term simulation state unless explicitly scoped

## 5) Integration guidance

### Event queue

- Stability layer reads queue state and validates target integrity
- Optional explicit helper prunes invalid entries
- Keep queue sequence policy stable and deterministic

### Routing/content selection

- Validate branch/fallback availability for critical surfaces
- Reuse existing condition evaluators instead of duplicate logic
- Report missing-fallback conditions as high-priority softlock risks

### Triggers

- Validate trigger target references and one-shot eligibility semantics
- Ensure trigger mode (`one_shot` vs `repeatable`) is honored consistently

### Progress clocks

- Validate both normalized view and raw persisted payload where practical
- Report range/completion inconsistencies before and after hydration

### Encounters

- Validate lifecycle coherence and follow-up linkage
- Detect stale encounter-linked queue events

### Logging

- Emit compact developer-facing summaries for analyses and explicit recoveries
- Avoid per-item log spam when one action can summarize the batch

### Overlay/debug surfaces

- Expose compact stability summary (`issueCount`, `errorCount`, `softlockRisk`)
- Show top issues and suggested recovery actions
- Keep display read-only unless user explicitly invokes a recovery helper

### Save/load

- Stability checks should work on hydrated state deterministically
- Explicit recovery output should round-trip cleanly through save/load
- Avoid introducing transient-only schema fields for stability output unless intentionally persisted

## 6) Common pitfalls

- **Auto-heal in read path**
  - Silent mutation during snapshot/render makes debugging unreliable

- **Over-broad recovery actions**
  - “Fix everything” helpers accidentally mutate unrelated domains

- **Catalog drift**
  - Stability target catalogs fall behind authored content additions

- **False positives from normalized-only checks**
  - Invalid raw payloads can be hidden if only normalized views are audited

- **Duplicate validator logic**
  - Re-implementing condition rules instead of reusing canonical evaluators

- **Unclear severity semantics**
  - Treating warnings as blockers or errors as informational causes noisy workflows

- **No-op recoveries without explanation**
  - Hard for QA to confirm whether action did anything

## 7) Open questions

- Should stability checks run continuously in dev mode or only on explicit trigger points?
- What is the canonical authored target/context catalog source for cross-feature validation?
- Which queue duplicate patterns are valid vs invalid by policy?
- Should stale context clearing remove only `activeContextId` or all authoring breadcrumbs?
- Do we need encounter-specific recovery helpers beyond recommendation-only guidance?
- Should softlock-risk status be persisted in saves for QA reproducibility, or remain ephemeral?
- What is the threshold for promoting warnings to errors in CI-oriented stability checks?
- Should stability analysis provide deterministic issue fingerprints for trend tracking over time?
