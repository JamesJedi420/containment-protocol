# Tutorial lifecycle API (SPE-2917)

`src/domain/tutorialLifecycle.ts` owns the pure definition registry and guidance transitions. SPE-2918 owns persistence; SPE-2919 owns contextual adapters; SPE-2920 owns delivery. Parent completion is evaluated separately from these APIs.

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

`getAvailableTutorialCommands(definition, state, eligibility?)` is a pure presentation query over those same transitions. It returns the currently accepted command types without writing state or emitting telemetry. Actual dispatch must still supply the current revision/step and authoritative eligibility; availability is not a production-action authorization.

Transitions reject invalid identity/version, counters/cursor, status vocabulary, missing or invalid suppression resume status, and malformed step-status arrays with an unchanged `invalid_state` result. This check does not replace the persistence owner's hydration/migration contract.

Skip affects the current step only. It does not authorize showing an unreached destination whose trigger or current conditions are unsatisfied. Dismiss/cancel remain available while a destination is ineligible, so guidance never blocks ordinary play.

## Persistence and definition upgrades (SPE-2918)

Optional `RuntimeState.tutorials` is the only persisted tutorial branch. It contains `schemaVersion: 1` and records keyed by stable tutorial ID, each storing ordered `stepIds` and the lifecycle value. At most 128 tutorial identities and 128 steps per record are accepted. Hydration copies/freezes valid records in deterministic ID order; malformed siblings are dropped, unsupported branch formats are omitted, and missing legacy branches stay absent (including when a fallback game has progress). Unrelated runtime/game state follows its existing normalization.

Use `getTutorialLifecycle(game, registeredDefinition)` for definition-aware reads and `applyTutorialCommand` through the existing managed state/store authority for writes. Store persistence and manual save/run transfer use the existing storage paths; there is no new backend, storage key or definition catalog. Saved unknown definitions are retained as data and never auto-activated.

Definition migration is deterministic and derived at read, then committed on the next successful managed command. Identical ordered step IDs with a newer version retain cursor/status/progress and increment revision once. At the safe-integer ceiling, migration retains a saturated read-only revision instead of overflowing; all commands remain disabled on that exhausted snapshot. Structural additions/removals/reordering retain matching completed/skipped identities and terminal outcomes but cancel active/interrupted flows; suppressed flows remain suppressed with a canceled resume state where needed. New steps are not automatically activated or marked completed. Explicit replay can restart guidance when the current definition permits it; replay cannot execute production actions. Same-version layout drift and definition downgrades fail closed without erasing the newer saved record. Stable step IDs must retain their meaning; author a new identity when an instruction's semantics change.

Exhausted safe-integer counters remain readable after save/load so a final completion is not lost. Further state-changing commands fail closed before overflow; stale revision tokens remain stale.

Hydration also checks progress coherence: active/interrupted (including suppressed resume states) must name the sole active cursor with completed/skipped predecessors and not-started successors. Terminal migration snapshots may retain matching completion history with new steps unstarted. Impossible run/revision relationships and inconsistent active records are dropped.

## Contextual guidance adapters (SPE-2919)

`selectTutorialGuidance` in `src/domain/tutorialGuidance.ts` derives one optional presentation context from a registered definition, current GameState/UI context, and optional current lifecycle. Pass the canonical saved lifecycle when one exists: omission means a new, unstarted flow. Suppressed, terminal, interrupted, mismatched-version and ineligible guidance produces no context. Missing condition references fail closed. The selector evaluates only the current step's references through `evaluateScreenRouteCondition` and the lifecycle's shared `evaluateTutorialStepEligibility`; it exposes no failed predicates or condition results. First-entry triggers are required for unstarted flows; an already active step does not consume its trigger again. This selector reads guidance; lifecycle commands still use their own destination eligibility inputs.

Owners inject pure `resolveContent` and `resolveAction` adapters. Content must contain only ordinary player-visible semantic text, including any applicable scope, constraints, permitted projection, exception/override path and uncertainty (estimated/bounded/verified/contested). Undefined/empty content hides the step. An expected action requires an explicit visible production projection; missing/hidden actions hide guidance without resolving bindings or exposing action/explanation data. Availability comes directly from the owner. Tutorial completion never grants authorization or executes an action.

Visible actions may supply existing `OperationalExplanationRecord` values with an explicit `permittedDepth`. The selector uses the shared validator, ordering and projection functions; it never recomputes a reason. Requested depth defaults to summary and is capped by each owner's permission. Owners must authorize every exposed field through that depth, including source/subject identities at summary depth. Malformed records and duplicate identities are omitted. An unavailable action without explanations retains a generic unavailable message; it does not acquire an invented recovery rule.

`resolveBinding(actionId, inputMethod)` consumes current labels from the input owner. It is called on every read for a supported keyboard/controller/pointer/touch method, so remapping needs no definition change. Unknown/unsupported capabilities skip binding resolution; missing/blank labels use a generic ordinary-controls fallback. Guidance is always optional and cannot gate ordinary play. SPE-3395 retains ownership of the global registry, device profiles, remapping and persistence.

`semanticText` is the common visual/screen-reader meaning, with explanation confidence and recovery text included at permitted depth. Reduced motion and non-hover access never remove semantic content. Presentation metadata carries the injected input method, screen-reader preference, positive finite text scale (default 1), reduced motion (conservative default true) and hover capability (default false). Critical meaning never requires hover. Concrete renderers remain responsible for using this text and metadata accessibly; no UI or global preference store is added by this API.

## Application delivery and archive (SPE-2920)

Register definitions with `createTutorialRuntime(definitions)` from `src/app/tutorialRuntime.ts`. The returned immutable facade binds to the existing `useGameStore`; it creates no store or storage key. `definition(id, version?)` reads a registered immutable definition (latest version by default). Registration remains authored application data; it is never serialized as callbacks/code in saves.

- `archive(isVisible)` returns latest registered identities in deterministic ID order, after the owning system's explicit visibility predicate. Entries include durable status, run/revision token, completion/skip counts and replay eligibility. Save-only unknown identities are omitted. Incompatible newer saves/layouts appear unavailable, without writes. A saturated lifecycle cannot replay.
- `read(id, contextInput)` combines canonical saved lifecycle with SPE-2919 adapters, returning visible guidance plus run/revision and `recoveryNeeded`. Reads are pure and never emit diagnostics. Hidden, terminal, interrupted or suppressed guidance returns undefined. Missing saved lifecycle starts from an unstarted snapshot; it does not overwrite durable state.
- `dispatch(id, command, eligibility?)` sends the latest registered definition through the existing store's `dispatchTutorialCommand`. Commands use expected revision and step IDs from the current snapshot. Owners supply authoritative condition evaluations and current triggers for relevant command destinations; binding labels and explanation text never substitute for eligibility. The normal production command still owns action execution/authorization.
- `dispatch(id, { type: 'report_recovery', expectedRevision })` explicitly records recovery-needed for an active step. A visible unavailable action can request recovery without gating skip/dismiss/cancel or ordinary play. No hidden cause, arbitrary failure text, binding or explanation payload is logged.

Dispatch returns `changed` (any guidance/debug write), `lifecycleChanged`, a reason, typed immutable `events`, and an optional generic `completion` identity (tutorial/version/run/revision). Completion is emitted only by a new active-to-completed progression. Suppression restoration, stale requests, reads and migration alone cannot re-emit it. Downstream flows can consume the result or derive durable completion from the archive after reload; this API does not route or bootstrap a campaign. Replay requires an explicit `replay_start` command and changes only guidance plus debug state, never rewards/resources/production actions. The earlier boolean `applyTutorialCommand` store method remains a lower-level persistence compatibility API without delivery telemetry.

## Bounded lifecycle telemetry

`TutorialTelemetryRecord` in `src/domain/tutorialDelivery.ts` distinguishes started, step-entered, step-completed, completed, step/flow skipped, dismissed, suppressed/unsuppressed, replayed, interrupted/resumed, canceled, failed, recovery-needed and migrated outcomes. A step outcome has `stepId`; a flow outcome has none. Stable IDs include tutorial/version/run/revision/command/kind/step identity and failure reason where applicable; no clock or RNG is used. Failed requests name the canonical current step, never an arbitrary requested-step payload. Migration is emitted when a successful command first commits an upgraded definition, not by lazy read. Step entry may describe an explicit revisit/resume; it never re-executes a production action.

The existing developer log persists these as `tutorial.lifecycle`, retaining its shared 120-entry limit. Typed dispatch events are also available directly to inspectors. Positive lifecycle transitions use persisted revision CAS, so stale completions emit nothing even after debug history is cleared or evicted. Failure/recovery events deduplicate against retained stable IDs; clearing/evicting history opens a new diagnostic window, with the same deterministic event identities. This bounded log is not a lifetime analytics ledger. No backend, transport or broad SPE-1119 analytics framework is introduced.
