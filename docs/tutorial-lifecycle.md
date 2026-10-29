# Tutorial lifecycle API (SPE-2917)

`src/domain/tutorialLifecycle.ts` owns the pure definition registry and guidance transitions. SPE-2743 remains open: persistence, adapters and delivery belong to SPE-2918–2920.

Create a registry with `createTutorialRegistry`. Each `(id, version)` pair is unique; versions are positive safe integers. Registry order is code-point ID order followed by numeric version. Steps retain authored order. Definitions, steps and reference arrays are copied and frozen. Use definitions returned by this registry with `createTutorialState` and `transitionTutorial`.

Definitions distinguish sequenced and contextual use, allow or disallow back navigation, and declare replay availability. Steps reference expected production action IDs without executing or certifying those actions. Presentation can use stable tutorial/step IDs to resolve authored text and accessible delivery; this slice supplies no UI, binding resolver or content.

## Eligibility

`conditionIds` identify caller-owned authoritative route conditions. Evaluate those conditions through `evaluateScreenRouteCondition` and supply their results in `TutorialEligibility.conditions`. Missing or failed conditions fail closed; the kernel adds no alternative condition grammar or hidden truth query. `triggerId` requires a matching explicit event reference in `triggerIds`. Adapters are responsible for visibility-filtered inputs and current evaluations. No global event queue is introduced.

Start/replay require conditions and entry triggers at their destination. Advance/complete require current conditions and destination conditions/triggers when one exists. Resume requires current conditions without repeating the original entry trigger. The `reachedCursor` records the furthest step entered in the current run. Revisiting any reached step rechecks current conditions without repeating its earlier entry trigger; entering an unreached step requires its trigger, including when skipping the preceding step. Replay resets this history. Unavailable destinations produce an unchanged `ineligible` result, so callers can retry with fresh authoritative results, dismiss, or cancel. No ineligible step is automatically skipped or marked complete. Event reference inputs are caller-owned observations, not a persisted event log.

## Commands and state

Every command includes `expectedRevision`. A changed result increments revision once and emits one semantic command event. Repeating a command token after a successful state change produces `stale`, no event and the identical state reference. Ineligible/illegal commands preserve revision; retrying them with the same token rechecks eligibility and can succeed when conditions change. Revision stays monotonic across replay; `run` increments on start/replay. Step commands additionally require the current `stepId`.

- `start`: not-started → active, first authored step.
- `advance`: completes the current step and enters the next; at the final step completes the flow.
- `complete`: explicit final-step completion only.
- `back`: returns to the prior step when allowed; resets the step being left to not-started while retaining entry-event history.
- `skip`: skips the current step and enters the next; a fully skipped flow is skipped, otherwise reaching the end completes the guidance flow with skipped steps preserved.
- `dismiss`: ends active guidance without claiming production-action completion.
- `suppress` / `unsuppress`: save and restore the flow status and cursor, including not-started and terminal statuses; other progression is disabled while suppressed.
- `interrupt` / `resume`: preserve the active cursor and completed/skipped step history.
- `cancel`: ends active or interrupted guidance.
- `replay_start`: explicitly resets completed/dismissed/skipped/canceled guidance when replay is allowed, preserving monotonic revision.

The step-status array records not-started/active/completed/skipped progress. Flow status records dismissal, suppression and interruption separately so resumable progress is retained. Replayability is an immutable definition property, not another mutable completion state.

State/results are pure values. The state factory and changed transitions freeze their state and step arrays. Results expose a semantic event hook for later telemetry but write no log or backend. No GameState mutation, persistence, migration, resource grant, input binding, or gameplay authorization occurs here. Consumers must continue invoking and validating normal production commands independently of guidance progression.

Transitions reject invalid identity/version, counters/cursor, status vocabulary, missing or invalid suppression resume status, and malformed step-status arrays with an unchanged `invalid_state` result. This check does not replace the persistence owner's hydration/migration contract.

Skip affects the current step only. It does not authorize showing an unreached destination whose trigger or current conditions are unsatisfied. Dismiss/cancel remain available while a destination is ineligible, so guidance never blocks ordinary play.
