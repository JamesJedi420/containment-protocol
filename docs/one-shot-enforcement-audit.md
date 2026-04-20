# One-shot Enforcement Audit (Integration Patterns)

> Documentation-only support note for integrating one-shot enforcement consistently across authored surfaces.

## 1) Common one-shot content categories

Recommended authored categories where one-shot semantics should be explicit:

- **Onboarding/tutorial prompts**
  - e.g., first-time front-desk onboarding notices.
- **Critical incident alerts**
  - e.g., breach follow-up alert surfaced once, then spent.
- **Opportunity popups/notices**
  - e.g., special recruit opportunity shown once per opportunity id.
- **Decision acknowledgements**
  - confirmation/acknowledge choices that intentionally retire a notice.
- **Narrative follow-up gates**
  - one-time unlock signals that hand off into durable state flags or progress clocks.

## 2) Recommended enforcement points

Enforce one-shot behavior at multiple explicit integration points (not one global hidden interceptor):

- **Condition evaluation (read-time gate)**
  - Use `FlagConditionSet.availableOneShots` / `consumedOneShots` via routing/trigger condition layers.
  - Ensures already-spent content cannot be selected for display.

- **Choice availability (pre-action gate)**
  - Choices intended for one-shot content should include `when.flags.availableOneShots`.
  - Prevents invoking stale actions when UI/view lags.

- **Choice consequence application (write-time gate)**
  - Use explicit `consume_one_shot` consequence in authored choice definitions.
  - Keep consumption colocated with the user action that semantically spends content.

- **Post-apply rerender/reselect**
  - Re-evaluate route/content selection after consequence application.
  - Guarantees consumed content no longer appears in selected branches.

- **Persistence boundary**
  - Ensure one-shot state round-trips through save/load (`runtimeState.oneShotEvents`) with no lossy migration path.

## 3) Typical failure modes

- **Display-only gating without consume consequence**
  - Content appears once, but never transitions to spent state.

- **Consume too early**
  - Marking spent on render/select instead of user-confirmed action.

- **Consume too late**
  - Follow-up surfaces can re-open before state mutation occurs.

- **Partial gating drift**
  - Route selection checks one-shot, but related choices/actions do not.

- **ID mismatch / namespace drift**
  - Different ids used across route condition, choice consequence, and analytics/debug logs.

- **Fallback branch leakage**
  - Incorrect branch order allows fallback content to look like one-shot content is still active.

## 4) Integration with triggers, routing, choices, logging, and save/load

- **Triggers / conditional layer**
  - Put one-shot predicates in trigger conditions (available/consumed), not custom ad-hoc checks.

- **Routing/content selection**
  - Prefer deterministic branch ordering:
    1. post-choice resolved branch,
    2. one-shot eligible branch,
    3. neutral fallback branch.

- **Authored choices**
  - For one-shot UI actions, standard pattern:
    - `when.flags.availableOneShots: ['<id>']`
    - consequence `consume_one_shot` for same id
    - optional durable follow-up flag and/or scene visit record.

- **Developer logging / overlay**
  - Log consume attempt results (`consumed=true/false`) and context id.
  - Overlay should show:
    - active authored context,
    - consumed one-shot ids,
    - last choice id/next target/follow-up ids,
    - recent developer log entries.

- **Save/load**
  - Keep `runtimeState.oneShotEvents` authoritative for spent status.
  - Verify malformed payload normalization does not resurrect spent content.

## 5) Recommended authoring conventions

- **Stable one-shot id namespace**
  - Use predictable prefixes by surface/domain (e.g., `front-desk.tutorial.*`, `containment.breach.*`).

- **Pairing convention**
  - For every one-shot branch, define:
    - one-shot eligibility condition,
    - explicit consume consequence in the terminal user action.

- **Choice id and one-shot id traceability**
  - Keep ids semantically linked to simplify debugging and analytics.

- **No implicit consumption on render**
  - Only consume during explicit action handling.

- **Fallback-first clarity in authored docs**
  - Document branch order and intended post-consumption destination.

- **Prefer one-shot + durable state handoff**
  - one-shot controls repeat visibility;
  - durable flag/clock records long-term narrative state.

## 6) Open questions

- Should repeated consume attempts (`consumed=false`) be treated as expected debug telemetry or suppressed as noise?
- Do we need a formal schema/lint for one-shot id naming to prevent drift across authored modules?
- Should all one-shot notices require a standardized acknowledgement choice, or are auto-resolve patterns allowed?
- What is the canonical policy for one-shot lifetime across imported legacy runs vs new saves?
- Should trigger-level one-shot checks and choice-level checks be required in both places by policy, or selectively based on risk?
- Do we need a lightweight authoring checklist/CI rule to enforce one-shot pairing (eligible branch + consume consequence)?
