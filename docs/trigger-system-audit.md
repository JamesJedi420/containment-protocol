# Trigger System Audit (Authored Conditional Design)

> Documentation-only support note for authored/runtime trigger design in Containment Protocol.

## 1) Trigger categories

Recommended top-level categories for authored triggers:

- **State-gated triggers**
  - Driven by persistent flags and one-shot consumption status.
  - Backed by `FlagConditionSet` semantics (`allFlags`, `anyFlags`, `noFlags`, `consumedOneShots`, `availableOneShots`).

- **Location/context triggers**
  - Route/hub/scene-aware activation (`hubId`, `locationId`, `sceneId`) plus `activeContextId`.
  - Useful for front-desk notices, modal-specific choices, and scene variants.

- **Progression triggers**
  - Clock thresholds/min-max/completed checks.
  - Ideal for chain progression and staged narrative beats.

- **Encounter-state triggers**
  - Driven by encounter `status`, `phase`, and encounter-local flags.
  - Useful for branch continuity and follow-up routing.

- **Predicate/scalar triggers**
  - Deterministic computed checks via `predicates` and optional context `scalars`.
  - Keep as extension hook for edge cases not worth first-class schema yet.

- **Action-result triggers**
  - Triggered by authored choice consequences (`set_flag`, `consume_one_shot`, `patch_encounter`, etc.).
  - These are transition triggers, not merely display conditions.

## 2) Recommended condition patterns

Use composable patterns that stay deterministic and debuggable:

- **Branch-first routing pattern**
  - Ordered branches with explicit fallback.
  - Prefer specific conditions first, then broad fallback.

- **Single-source gating pattern**
  - Use `flagSystem` + `screenRouting` helpers; avoid ad-hoc direct reads from nested runtime state.

- **One-shot + persistent-flag pair pattern**
  - One-shot prevents repeated surfacing.
  - Persistent flag stores long-term authored decision/result.

- **Clock threshold pattern**
  - Use progression clocks for staged unlocks rather than proliferating boolean flags.

- **Encounter phase + route context pattern**
  - Combine encounter `phase` with `activeContextId` for precise modal/notice targeting.

- **Guarded consequence pattern**
  - Choice `when` conditions should mirror trigger conditions to avoid stale UI actions.

## 3) Trigger lifecycle

Suggested lifecycle model:

1. **Evaluate**
   - Evaluate route/trigger conditions against current game + context.
2. **Select**
   - First passing conditional branch wins; otherwise fallback branch.
3. **Present**
   - Surface selected notice/choice content.
4. **Apply**
   - On choice execution, apply deterministic consequences in order.
5. **Record**
   - Record scene visits/follow-ups/one-shot consumption and debug breadcrumb fields.
6. **Re-evaluate**
   - Re-run trigger selection on updated state.

Design expectation: lifecycle should be repeatable with same input state and context (deterministic behavior).

## 4) Common pitfalls

- **Flag explosion**
  - Too many one-off booleans for staged flows; prefer clocks/typed values where appropriate.

- **Condition duplication drift**
  - Divergence between display conditions and choice-action conditions.

- **Ambiguous fallback ordering**
  - Incorrect branch order can shadow intended specific cases.

- **One-shot misuse**
  - Consuming one-shot too early (before player intent) or too late (duplicate exposure).

- **Context leakage**
  - Overloading `activeContextId` with mixed semantic scopes (page, modal, micro-interaction).

- **Non-deterministic predicates**
  - Predicate checks that depend on unstable or time-varying inputs.

## 5) Integration points (routing, choices, logging, overlay)

- **Routing integration**
  - `screenRouting.ts`
  - Condition evaluation and first-match branch selection for authored surfaces.

- **Choice integration**
  - `choiceSystem.ts`
  - Consequence orchestration and execution result summary (`applied`, changed flags, touched clocks, follow-ups).

- **Flag/runtime integration**
  - `flagSystem.ts` and `gameStateManager.ts`
  - Canonical persistent flags, one-shots, location/encounter/progress clock state.

- **Logging integration**
  - Trigger evaluations and consequence applications should emit compact dev-log summaries (especially for failed conditions and branch selection).
  - Keep logs deterministic and correlation-friendly (choice id, context id, trigger id).

- **Overlay integration**
  - `developerOverlayView.ts`
  - Surface active context, routed branch ids, choice debug breadcrumbs, and recent dev log entries for fast diagnosis.

## 6) Open questions

- Should trigger evaluation logs be always-on in dev builds, or opt-in by overlay/debug flag?
- What is the canonical naming convention scope for `activeContextId` (route-level only vs component-level granularity)?
- Should failed trigger evaluations be retained in dev logs, or only successful branch selections?
- Are follow-up ids intended to be purely informational, or eventually routable entities with persistence semantics?
- Should progression clocks be preferred over typed flag values for multi-step authored chains by policy?
- What retention/compaction policy should apply to trigger debug history in persisted saves?
