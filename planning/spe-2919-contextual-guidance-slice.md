# SPE-2919 — Contextual guidance adapters

| Field             | Value                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                     |
| **Issue**         | [SPE-2919](https://linear.app/spectranoir/issue/SPE-2919)                                |
| **Parent**        | SPE-2743 (current Linear status Done; child completion does not prove parent completion) |
| **Branch**        | `jamesdyedbq/spe-2919-spe-2743-slice-3-contextual-guidance-explanation-input`            |
| **Base main SHA** | `18fe72bc`                                                                               |

## Selection and plan

User authorized continuous shipping. SPE-2917 and SPE-2918 merged; SPE-2919 is unblocked and enables SPE-2920. GitHub mirror #3700 remains open. Linear parent currently reads Done despite outstanding children and its prior keep-open comments; preserve current parent status and record the discrepancy without claiming parent completion.

1. Reuse lifecycle eligibility and screenRouting conditions over authoritative GameState/current UI context. Missing condition references fail closed. Filter suppressed, terminal, interrupted and stale-version lifecycle states.
2. Add a pure read adapter requiring owner-approved visible semantic content and ordinary action visibility/availability. No production actions are executed or eligibility recomputed locally.
3. Validate/project existing OperationalExplanationRecord values at the lesser of requested and owner-permitted depth. Omit ambiguous duplicate identities and malformed records. Do not expose failed conditions or hidden action data.
4. Inject current semantic-action/device binding labels. Missing capability/binding uses an optional-guidance fallback. Preserve semantic text across reduced-motion, screen-reader, text-scale and non-hover inputs.
5. Add focused tests, update API docs/handoff, run required validation and six audit passes, then PR/review/CI/merge/main sync.

## Boundary and risks

Adapters are typed trusted production code, not save-payload parsers. Owners must supply ordinary player-visible text, record field-depth permission and current action availability. The selector cannot infer visibility from a record or from raw GameState. Registered definitions retain authored stable IDs and step order. Conditions are checked at read time; triggers are required for first entry and not reconsumed by active guidance.

No React delivery, authored campaign flow, persistence, settings UI/store, remapping engine, global action registry, analytics transport, production mutation or dependency changes. Parent status remains untouched.

## Validation and audit

Six audit passes repeated until clean: approved scope and architecture; missing/hidden/ambiguous inputs and lifecycle boundaries; pure deterministic reads and immutable explanation copies; lifecycle/routing/shared-explanation regression; API docs and handoff; cleanup. No remaining in-boundary findings.

Full suite: 966 files / 10,521 tests passed (test:run:ci, forks pool, maxWorkers=8, 384.76s). Final focused lifecycle/guidance: 56 passed; earlier five-file routing/explanation/boundary run: 68 passed before two final regressions. Full lint, scoped Prettier, handoff validation and 11 Chromium tests pass. Forced compiler diagnostics exactly match the previous baseline after normalizing source positions; no new tutorial diagnostics. Local Node 24; CI will verify Node 22. Existing broad formatting/compiler drift is not claimed clean.

Architecture and completion advisor preflights returned parent_runtime_unavailable; no consultation process ran. The skill permits root verification to continue. Recently shipped is effective upon merge; Linear remains In Progress until then.

## Deferred

No in-boundary deferrals. Existing SPE-3395 owns canonical input registry/remapping/persistence; SPE-2920 owns archive/replay delivery and integration. These boundaries are not implemented here.

## Independent review and reviewer dispositions

Full seven-file diff reviewed against main: no critical/warning findings. Amazon Q requested explicit omitted-action-adapter, accessibility-default and nested-output-freeze assertions; added to existing regressions. The shared sorter preserves references, and the shared validator rejects noncanonical IDs, so those crash/validation concerns do not require production changes. Missing action ownership intentionally hides the step; reduced motion defaults conservatively to true as documented. Final focused lifecycle/guidance suite: 56 passed; test-file lint passes. All six audit passes rechecked without new findings.
