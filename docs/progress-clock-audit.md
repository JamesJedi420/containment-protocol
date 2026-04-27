# Progress Clock Audit (Design + Authoring Guidance)

> Documentation-only support note for progress clock usage in Containment Protocol.

## 1) Clock categories

Recommended authored categories for progress clocks:

- **Narrative chain clocks**
  - Multi-step story progression (e.g., breach chains, escalating arcs).
- **Posture/stance clocks**
  - Captures intensity/commitment of a chosen response path.
- **Opportunity window clocks**
  - Time/segment based windows for one-time or limited opportunities.
- **Investigation/discovery clocks**
  - Incremental intel depth and unlock thresholds.
- **Recovery/stabilization clocks**
  - Structured de-escalation or cleanup progression.
- **Meta campaign clocks**
  - Cross-surface campaign milestones used by route/trigger gating.

## 2) Recommended metadata fields

Use stable metadata in `ProgressClockDefinition` and runtime state:

- **Required identity fields**
  - `id` (stable, namespaced)
  - `label` (author-facing display label)
  - `max` (total segments, integer >= 1)
- **Recommended authored metadata**
  - `description` (clear author intent)
  - `tags` (surface/domain discovery + filtering)
  - `hidden` (default visibility intent)
- **Runtime state fields to preserve**
  - `value`, `max`, `completedAtWeek?`, `hidden?`
- **Suggested naming convention**
  - `<domain>.<chain>.<purpose>`
  - e.g. `containment.breach.followup.posture`

## 3) Threshold and completion patterns

Use deterministic threshold patterns that are easy to evaluate and debug:

- **Unlock at threshold**
  - Prefer `threshold`/`minValue` checks for route and trigger unlocks.
- **Clamp-safe advancement**
  - Use explicit advance helpers that clamp to `[0, max]`.
- **Completion semantics**
  - Treat completed when `value >= max` or `completedAtWeek` is set.
- **Phase checkpoints**
  - Define authored checkpoints by segment ranges (e.g., 1, 2, final).
- **Bidirectional caution**
  - If decrementing is allowed, define whether completion can be reversed (policy required).

## 4) Visible vs hidden clock guidance

- **Visible clocks**
  - Use when player comprehension benefits from progress awareness.
  - Include concise labels and limited count per surface.
- **Hidden clocks**
  - Use for behind-the-scenes authored gating to avoid UI noise/spoilers.
  - Still keep discoverable in developer overlay/debug snapshots.
- **Transition policy**
  - Decide whether hidden clocks can become visible after threshold/completion.
- **Consistency rule**
  - Avoid dual clocks representing the same concept (one hidden + one visible) unless explicitly mirrored.

## 5) Integration with triggers, routing, choices, logging, overlay, and save/load

- **Triggers**
  - Trigger conditions should consume clock evaluations through shared helpers, not ad-hoc field checks.
- **Routing/content selection**
  - Route branches should use progress-clock conditions for deterministic selection and fallback.
- **Choices**
  - Choice consequences should use explicit clock mutations (`set_progress_clock`, `advance_progress_clock`) in authored consequence lists.
- **Logging**
  - Emit compact dev events for clock mutations (id, delta, previous/new value, context id).
- **Overlay**
  - Developer overlay should present clock value/max, visibility, completion, and tags for diagnosis.
- **Save/load**
  - Persist `runtimeState.progressClocks` as authoritative clock state.
  - Normalization should sanitize invalid values while preserving valid completed clocks.

## 6) Common pitfalls

- **Clock id drift**
  - Inconsistent ids across definitions, choices, and route conditions.
- **Unbounded max/value edits**
  - Changing `max` after content ships can invalidate threshold logic.
- **Implicit mutation paths**
  - Mutating clocks outside explicit authored consequences causes hard-to-trace behavior.
- **Over-fragmentation**
  - Too many tiny clocks for related narrative chains increases maintenance overhead.
- **Visibility mismatch**
  - Hidden clocks accidentally surfaced in player UI or visible clocks omitted from critical surfaces.
- **Threshold ambiguity**
  - Mixing `minValue` and `threshold` semantics inconsistently across authored modules.

## 7) Open questions

- Should `threshold` become the canonical authored field with `minValue` treated as internal compatibility?
- Is reverse progression supported in design, and if so, how should `completedAtWeek` behave?
- Should clock definitions be centrally curated with lint-style validation for id/tag conventions?
- What policy governs changing `max` for clocks that already exist in persisted saves?
- Should hidden clocks ever be serialized into player-facing export artifacts, or only internal saves?
- Do we want a standard dashboard/overlay grouping by clock tags/domains for large authored catalogs?

## 8) Construction-clock operational policy (current runtime)

For construction-site progression clocks, runtime behavior follows these guardrails:

- **Resolved cases do not advance construction clocks**
  - Construction progression is considered active only for non-resolved cases with active spatial construction flags and positive timeline.

- **Clock entries initialize even when weekly delta is `0`**
  - A stalled week (e.g., interference) still creates/retains the clock entry at value `0`.
  - This keeps state inspectable from first touch and avoids invisible “flag-only” progression.

- **Advancement remains deterministic and clamped**
  - Once interference clears, subsequent positive deltas continue from the initialized value.
  - Clock math remains bounded by canonical progress-clock helpers.
