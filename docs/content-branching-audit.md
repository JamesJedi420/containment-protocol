# Content Branching Audit (Authored Non-VN Layer)

> Documentation-only support note for authored content branching in Containment Protocol.
>
> Scope: deterministic authored copy/content selection for non-VN surfaces (front-desk notices, briefings, alerts, report text, and similar UI content blocks).

## 1) Branching categories

Recommended authored branching categories for non-conversation content:

- **State posture branches**
  - Variants selected from persistent state (flags, faction stance, encounter phase, location).
  - Example: hostile-faction warning copy vs neutral-status baseline copy.

- **Queue-priority branches**
  - A queued follow-up branch takes precedence over steady-state/default copy.
  - Example: top-of-queue follow-up notice overrides regular weekly reminder text.

- **Progress-threshold branches**
  - Variant text unlocked by progress clock thresholds, completion, or hidden-progress gates.
  - Example: milestone briefing text replacing baseline status copy.

- **One-shot lifecycle branches**
  - One-shot availability/spent state controls whether a “first-time” message or a calmer fallback appears.
  - Example: tutorial/opening alert shown once, then replaced by routine copy.

- **Context-scoped branches**
  - Branches constrained by active authored context for modal/surface-specific wording.
  - Example: same notice id with different copy inside front-desk modal vs operations dashboard card.

- **Diagnostic/debug-friendly branches**
  - Branch metadata designed for deterministic inspection (ids, reasons, selected route ids).
  - Supports fast verification in overlay/log views.

## 2) Recommended condition patterns

Use composable, deterministic patterns that reuse existing condition semantics:

- **Ordered branch pattern with explicit fallback**
  - Define specific branches first, broad/default branch last.
  - Keep first-match behavior explicit and intentional.

- **Single-source condition reuse pattern**
  - Reuse condition evaluators from routing/trigger systems instead of re-implementing checks.
  - Keep authored condition language consistent across surfaces.

- **Queue-then-state precedence pattern**
  - Evaluate queued follow-up condition before baseline state branches.
  - Prevents queued intent from being hidden by lower-priority default content.

- **One-shot + quiet fallback pattern**
  - “Available one-shot” branch for first exposure; “spent” or default branch afterward.
  - Avoid repeated high-noise alerts after acknowledgement.

- **Threshold replacement pattern**
  - Use clock thresholds to replace baseline text with milestone text.
  - Prefer threshold checks over proliferating ad-hoc flags.

- **Context guard pattern**
  - Use active context conditions only where branch meaning truly differs by surface scope.
  - Keep context ids stable and semantically scoped.

## 3) Evaluation order and fallback guidance

Recommended deterministic branch lifecycle:

1. **Assemble branch set in authored order**
   - Keep order explicit in authoring files; avoid implicit runtime reshuffling.

2. **Evaluate branches sequentially**
   - First passing conditional branch wins.

3. **Treat first unconditional branch as fallback**
   - If no conditional branch passes, use fallback.

4. **Return selection metadata**
   - Include selected branch id and fallback status for diagnostics.

5. **Do not mutate state during selection**
   - Selection remains pure read-time logic; all writes happen in choices/triggers/actions.

6. **Re-evaluate after state-changing actions**
   - After choice application/trigger fire, run selection again to reflect new state.

Guidance:

- Always include a clear fallback for player-facing surfaces.
- Keep fallback copy quiet/stable to reduce churn when high-priority branches are exhausted.
- Avoid hidden “priority magic”; put precedence in authored branch order.

## 4) Integration with triggers, queue, routing, choices, logging, and overlay

### Triggers

- Branching should consume trigger **results**, not duplicate trigger logic.
- Trigger eligibility can feed branch conditions (e.g., trigger id set membership) while trigger firing remains separate.

### Queue

- Queue presence can gate highest-priority authored variants.
- Recommended pattern: branch on queue head/type/target match, then fall back to non-queue variants.
- Queue consumption should remain explicit handler behavior, not implicit in branch selection.

### Routing

- Branching should reuse existing route-condition evaluators and first-match semantics.
- Keep content-branching layer thin: authored content selection on top of existing routing primitives.

### Choices

- Choices mutate state; branching reads resulting state.
- Keep “select -> present -> choose -> mutate -> re-select” loop deterministic.
- Preserve consequence ordering in existing choice system; do not embed mutation logic into branching layer.

### Logging

- Record selected branch ids and key condition context for debugging.
- Include enough detail to explain why one variant won (branch id, context id, queue refs where relevant).
- Keep log payload compact and deterministic.

### Overlay

- Expose selected route/branch ids and relevant authored context in developer overlay.
- Surface queue head and branch selection side-by-side when queue precedence is used.
- Ensure overlay remains read-only diagnostics, not branch-control logic.

### Save/load

- Branching state should be derived from canonical runtime state at load time.
- Persist underlying conditions (flags, one-shots, clocks, queue, location/context state), not transient rendered copy.
- After load, branch selection should deterministically re-resolve to the same variant under equivalent state.

## 5) Common pitfalls

- **Duplicating condition logic across systems**
  - Rewriting checks in branching, triggers, and view layer creates drift.

- **Mixing selection and mutation**
  - Mutating state while selecting content breaks purity and determinism.

- **Ambiguous fallback behavior**
  - Missing/poor fallback causes blank or unstable surfaces.

- **Unclear precedence**
  - Hidden priority rules make authored behavior hard to reason about.

- **Context id leakage**
  - Reusing one context id for unrelated scopes causes false positives/negatives.

- **Queue starvation or masking**
  - Over-aggressive queue-first branches can hide important steady-state content indefinitely.

- **One-shot branch resurrection**
  - If one-shot checks are inconsistent, first-time content can reappear incorrectly.

- **Over-fragmented branch catalogs**
  - Too many tiny branch sets increases maintenance and debugging burden.

## 6) Open questions

- Should branch definitions be centralized by surface/domain, or remain inline near each view builder?
- Do we need standardized branch metadata (`category`, `tags`, `description`) for diagnostics and tooling?
- Should queue-aware branching check only queue head, or allow any matching queued item?
- What is the canonical policy for context scope naming (`page`, `modal`, `choice` granularity)?
- Should branch-selection traces be persisted (debug mode) or remain ephemeral overlay/runtime diagnostics?
- Do we need lint-like validation for branch ordering/fallback presence to prevent authoring regressions?
- What retention policy should apply if branch selections are mirrored into developer logs?
