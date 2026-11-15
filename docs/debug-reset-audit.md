# Debug Reset Audit (Documentation-Only Support)

> Scope: design support note for deterministic debug reset tools in Containment Protocol.
>
> Constraints respected: no runtime logic edits, no symbol renames, no test changes, documentation-only output.
>
> **Resolution status (2026-11-15, static verification at `44205211`):** §6 distinguishes queue-helper and full-reset sequence behavior. Reset feedback appears in the overlay's developer log, while a dedicated last-reset panel and encounter-targeted queue policy remain open. This is code reading, not runtime verification.

## 1) Reset categories

Recommended reset categories for development and QA workflows:

- **Diagnostics-only resets**
  - Clear developer log traces and debug breadcrumbs.
  - Intended for “fresh signal” inspections in overlay/debug workflows.

- **Queue hygiene resets**
  - Clear runtime event queue entries without mutating unrelated authored/simulation state.
  - Useful after scripted follow-up or trigger-order testing.

- **Authored gating resets**
  - Reset selected or all persistent flags.
  - Reset selected or all one-shot consumptions.
  - Supports replaying authored content paths from deterministic checkpoints.

- **Progression-state resets**
  - Reset selected/all progress clocks to a known baseline.
  - Optional reset-to-definition defaults for authored clocks.

- **Encounter debug resets**
  - Clear selected/all encounter runtime/tracking records.
  - Useful after hidden-combat or outcome-branching test loops.

- **Context/UI-debug resets**
  - Reset authored/debug context pointers (`activeContextId`, last-choice breadcrumbs, selected inspector references).
  - Helps return overlay and authored routing to neutral state.

- **Bounded full runtime-debug reset**
  - Optional explicit reset for authored/runtime debug layer only.
  - Must not act as a general simulation wipe.

## 2) Recommended reset scopes

Use explicit scope profiles plus a composable request shape:

### A. Queue + log quick reset

- Clears:
  - runtime event queue
  - developer log entries
- Preserves:
  - flags, one-shots, clocks, encounters, simulation economy/roster

### B. Front-desk authored baseline reset

- Clears:
  - runtime event queue
  - encounter runtime state
  - authored/debug context breadcrumbs
  - developer log (optional but recommended in this profile)
- Preserves:
  - long-term simulation data
  - flags/one-shots/clocks unless explicitly requested

### C. Encounter test cleanup reset

- Clears:
  - encounter runtime/tracking (selected or all)
  - related queue entries (recommended)
- Preserves:
  - flags, clocks, long-term campaign state unless explicitly requested

### D. Targeted authored replay reset

- Resets selected:
  - flags
  - one-shots
  - progress clocks
- Clears selected:
  - encounter runtime entries
- Preserves all unrelated domains

### E. Bounded full runtime debug reset (explicit only)

- Resets runtime/authored-debug layer to deterministic defaults.
- Should preserve core simulation systems (teams, cases, economy, config, RNG, templates, reports, etc.).

## 3) Safety guardrails

Hard guardrails for all reset tooling:

- **Deterministic only**
  - No random branching or time-based side effects in reset logic.

- **Explicit invocation only**
  - No auto-reset on route changes, render lifecycle, or weekly tick.

- **Bounded domain policy**
  - Reset layer must be constrained to authored/runtime debug state unless a separate explicit simulation reset action exists.

- **Narrow primitive first**
  - Build small, single-purpose reset primitives and compose profiles from them.

- **No hidden cascade**
  - Clearing one scope must not silently wipe unrelated scopes.

- **Observable reset summaries**
  - Return compact reset summaries (counts/flags) so callers and QA can confirm what changed.

- **Stable id handling**
  - Normalize ids and ignore invalid entries safely.

- **Idempotent behavior**
  - Re-running the same reset request on already-cleared state should be safe and deterministic.

- **Dev-surface gating**
  - Reset controls exposed in UI should remain dev-only/test-only surfaces.

## 4) Integration guidance

### Overlay integration

- Expose reset actions in developer overlay as explicit buttons.
- Recommended controls:
  - “Reset Queue + Log”
  - “Reset Encounter State”
  - “Front-Desk Baseline”
- Show last reset summary in overlay for immediate verification. **Partial (2026-11-15):** overlay handlers do not retain the returned summary, but store actions append reset summaries and details to the developer log (`src/app/store/gameStore.ts:926-1045`), which the overlay renders (`src/features/developer/DeveloperOverlay.tsx:395-400`). There is no separate last-reset panel.

### Logging integration

- Record each reset invocation in developer log with:
  - reset profile/type
  - scope summary (counts and booleans)
- Keep entry compact and deterministic.
- Avoid writing multi-entry spam for one reset action.

### Queue integration

- Queue resets should use canonical queue helpers.
- Preserve deterministic ordering semantics and sequence counter policy unless explicitly reset by policy.

### Encounter integration

- Encounter resets should clear runtime tracking records through canonical state paths.
- Avoid partial mutation that leaves stale phase/outcome artifacts.

### Flags / one-shots integration

- Use canonical flag/one-shot APIs where possible.
- For batch clear operations, ensure deterministic id normalization and explicit count reporting.

### Progress clocks integration

- Support:
  - selected clock reset
  - all clock reset
  - optional reset to authored defaults
- Do not silently delete clock definitions; reset runtime values.

### Save/load integration

- Resets should produce canonical state that serializes and hydrates without migration issues.
- Save/load round-trip should preserve post-reset state exactly.
- Avoid adding reset-only transient fields to persisted schema unless explicitly designed.

## 5) Common pitfalls

- **Over-scoped “full reset”**
  - Accidentally wiping core simulation data when only authored/runtime debug state was intended.

- **Mixed mutation pathways**
  - Some reset operations use canonical helpers while others mutate nested state directly, causing drift.

- **Silent no-op ambiguity**
  - Not reporting what changed makes QA validation difficult.

- **Coupling reset to UI lifecycle**
  - Triggering resets from mount/render logic breaks deterministic expectations.

- **Queue/encounter orphaning**
  - Clearing encounters but leaving queued follow-ups targeting removed context.

- **One-shot resurrection mistakes**
  - Inconsistent handling can unintentionally re-enable consumed one-shot content.

- **Clock semantics drift**
  - Confusion between “clear,” “set to zero,” and “restore authored defaults.”

- **Log noise inflation**
  - Emitting too many per-item reset logs instead of one scoped summary.

## 6) Open questions

**Resolved by shipped code (verified 2026-11-15 at `44205211`):**

- ~~Should bounded full runtime-debug reset preserve current location/player identity by default?~~ **Resolved — yes by default.** The `fullRuntimeDebugReset` branch replaces only `runtimeState` and re-applies the prior `player` and `currentLocation`, with the intent stated in-line (“Preserve identity + current location so reset does not strand navigation.”). Anchor: `src/domain/debugResetTools.ts:132-143` (comment at line 139, preserved `player` and `currentLocation` at lines 140-141). Simulation systems are not touched.
- ~~Should queue reset preserve `nextSequence` or reset it to 1 in all profiles?~~ **Resolved — behavior differs by operation.** `clearRuntimeEventQueue` preserves the cursor (`src/domain/eventQueue.ts:162-167`), including the queue-clearing helper profiles. `fullRuntimeDebugReset` instead replaces runtime state with defaults (`src/domain/debugResetTools.ts:132-143`), whose queue starts at `nextSequence: 1` (`src/domain/gameStateManager.ts:1049-1068`).

**Still open or partially addressed:**

- Which reset summaries should be user-visible in overlay vs developer-log-only? **Partially implemented:** reset actions return a `summary` and append log entries with summary/details (`src/app/store/gameStore.ts:926-1045`); the developer overlay renders those entries (`src/features/developer/DeveloperOverlay.tsx:395-400`) but has no dedicated last-reset panel.
- Do we need a policy for automatically clearing encounter-targeted queue events when encounter reset is selected? **Unmet:** `applyEncounterDebugReset` clears the whole runtime event queue, not encounter-targeted entries (`src/domain/debugResetTools.ts:301-306`); no targeting policy is implemented.
- Should profile presets be centralized (single catalog) or remain composed in store/UI actions? — open; presets are currently composed in `debugResetTools.ts` helpers and called from the store.
- Should one-shot reset support namespace/prefix filters in addition to explicit id lists? — open; explicit id lists and `clearAll` only.
- Is there a need for “dry-run reset” preview to show what would be reset before applying? — open; not implemented.
- Should save/export include optional metadata noting last reset action for QA reproducibility? — open; not implemented.
