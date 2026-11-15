# SPE-48 — shared template kernel prerequisite

## Assigned boundary

Codex implements the existing shared authoring kernel and its three declared family hooks on base `5240ba6cec249a40fceb7f4373951658b908f237`. Linear SPE-48 owns scope and acceptance. This document records a bounded prerequisite, not parent completion or SPE-695 gameplay readiness. The separate terminology branch and Cursor SPE-2226 artifact bundles are untouched.

## Contract

`ContentTemplateKernel` retains exactly protocol-material, hazard-incident, and doctrine-playbook families. Existing definitions without a runtime declaration remain supported. A declared runtime requires an explicitly supplied `TemplateBandPolicy` whose id matches `policyRef`; there is no default production policy.

Action bands configure minimum authoring cost, maximum scope rating, and maximum integer exception count. Power bands configure maximum authoring power rating. Ratings and limits must be finite and nonnegative. Exact limits pass; excessive scope/power/exception counts and under-cost entries fail. These are caller-owned authoring ratings, not inferred gameplay units, effect-magnitude conversions, or universal balance values. Policy authors remain responsible for truthful ratings. The kernel cannot establish balance by inspecting a rating alone.

The fixed hooks are `prepare-material`, `resolve-incident`, and `apply-doctrine`. Their family runtimes retain execution. Context alternatives contain an id, a nonempty conjunction of exact scalar context matches, and only the parameters supported by that hook: recognition threshold, incident risk thresholds, or doctrine reliability respectively. Unknown keys, duplicate alternative ids, nonfinite values, and invalid family parameters fail validation before dispatch, including on nonmatching alternatives. Missing context selects the baseline. Multiple matching alternatives reject rather than choose by authoring order. Incident alternatives replace the full threshold list and must cover every non-final escalation step. Returned risk-threshold arrays are copied.

Each family resolver validates its family definition, then resolves context and applies the selected parameters. Invalid authoring/runtime inputs throw `TemplateValidationError` with diagnostics; ordinary insufficient skill or mismatched preparation remains a normal failure result. Incident zero thresholds are valid and honored. Doctrine retains its pre-existing reliability comparison direction; this prerequisite does not reinterpret that field.

The optional brief has separate required nonempty `implementationSurface`, `runtimeBehavior`, and `playerResult` fields. A brief is validated when present. Existing requirements, modifiers, investigation metadata, and risk hooks retain their authoring roles; this prerequisite does not start executing previously inert strings.

## Verification and acceptance accounting

The existing protocol-material test file exercises the shared contract and all three family integrations, alongside the existing incident and doctrine regression suites. Fixture policies are explicitly test-only. Coverage includes exact/excessive bounds, malformed/nonfinite values, unknown bands/policies/hooks, context fallback/conflicts/order, independent brief fields, and a second authored material using the same hook without runtime edits.

The original prerequisite evidence above used constructed inputs. SPE-695 subsequently binds the existing Combat Stim fabrication recipe to the protocol-material preparation hook. The normal fabrication queue validates that declaration before spending, then the existing weekly production, lot, equipment-instance and Combat Stim owners retain their behavior. The template output `equipment:combat_stims` and magnitude `1` mean one existing equipment unit, not one dose or a change to overdrive potency. Self-use still consumes one of two doses and uses the existing one-phase overdrive and recovery-debt rules.

The `fabricated-equipment-v1` policy uses one bounded standard authoring band: cost 0, scope/power at most 1, and no exceptions. These are validation ratings, not the recipe's funding/material costs or effect units. The existing fabrication command has no individual preparer or skill input, so this binding uses a zero recognition threshold and neutral skill value rather than inventing an agent skill gate. `fabrication` and `equipment` identify the existing process and output route; declared alternatives can match the explicit recipe and output identifiers. Existing stock, funding, grade, activation eligibility and save semantics remain authoritative. Invalid template or mismatched output fails before queue resources are consumed. Other undeclared recipes retain their existing behavior; new declared equipment recipes can reuse the same hook with their own verified output and policy.

The sample `neutralize` and `analyze` entries remain illustrative, not production effects. This integration does not assign them gameplay meanings or introduce a generic effect executor. A constructed end-to-end test exercises the normal queue, save/load, week advance, lot materialization, equipment and activation path; it is not a separate browser-observed play session.

SPE-48 remains In Progress: its whole acceptance and the separate authoring consumers/child boundaries must be verified before completion. This prerequisite does not close existing children or establish that every family's gameplay integration is shipped. No persistence fields, migrations, runtime dependencies, or parallel kernel are introduced.

Pre-ship and post-merge checkpoints use direct bounded verification under the session's external-dispatch restriction. Six audit passes cover scope/integration, malformed edges, deterministic state, adjacent regressions, documentation, and dead-code/diff cleanup. Actual command results and latest-head review/merge evidence belong in the PR and existing Linear owner comment.
