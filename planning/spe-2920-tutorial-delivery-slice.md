# SPE-2920 — Tutorial delivery, archive and telemetry

| Field             | Value                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                               |
| **Issue**         | [SPE-2920](https://linear.app/spectranoir/issue/SPE-2920)                                          |
| **Parent**        | SPE-2743 (current Linear status Done; preserve existing status, independently evaluate completion) |
| **Branch**        | `jamesdyedbq/spe-2920-spe-2743-slice-4-tutorial-archive-replay-delivery-telemetry`                 |
| **Base main SHA** | `40fb3feb`                                                                                         |

## Selection and plan

User authorized continuous shipping. SPE-2918 and SPE-2919 are Done; this existing high-priority approved slice is unblocked. GitHub mirror #3701 remains open. No backlog-shape mutation or campaign-specific work.

1. Expose immutable definition registration and latest-version application reads/dispatch through the existing gameStore. Retain the earlier boolean persistence API for compatibility.
2. Build a pure archive from registered definitions and canonical durable state; require an owner visibility predicate. Unknown save-only identities never become entries. Incompatible saves remain unavailable without writes.
3. Reuse SPE-2919 for live guidance, bindings, accessibility and explanation visibility; expose recovery-needed state and an explicit recovery-report command. Reads never emit telemetry or mutate state.
4. Return typed deterministic lifecycle events and a generic completion signal; persist diagnostic events through the existing bounded developer log. Successful revision-CAS transitions protect completion from stale duplicates even after log eviction/clear. Failed/recovery diagnostics deduplicate against retained stable event IDs; clearing/evicting diagnostic history begins a new diagnostic window, without changing lifecycle state or IDs.
5. Test persistence-backed delivery, archive, replay production non-mutation, suppression/interruption, migration events, duplicate completion/failure/recovery, current context and visibility. Update schema/API/handoff. Six-pass audit, validators, PR/review/CI/merge/main sync.

## Boundary and risks

No new store, telemetry backend, campaign definition, New Campaign routing, seven-beat onboarding, settings UI, production commands/rewards or simulation rules. Only tutorial runtime state and the existing UI debug log change. Registration is immutable and application-owned rather than persisted authored code.

Owners supply production condition evaluations to lifecycle dispatch and permitted visible data to guidance reads. Recovery reporting is explicit and carries only tutorial identity/step/revision, never hidden causes or explanation payloads. Debug retention stays 120 entries, shared with existing debug categories; typed result events let external inspectors consume deterministic identities without an analytics transport. Restoring completed suppression emits unsuppressed, never completed again. Migration emits only when a successful command durably commits the new version.

## Validation and audit

Six passes repeated until clean: scope/integration (existing store/log only); edge cases (stale/future/missing definitions, hidden context, suppressed completion restoration); determinism/state (stable typed IDs, CAS, pure reads, immutable results, replay production equality); regression (save/envelope/debug/boundary and browser); schema/API/handoff docs; cleanup. No remaining in-boundary findings.

Focused six-file suite: 107 passed. Full suite: 967 files / 10,537 tests passed (test:run:ci, forks pool, maxWorkers=8, 381.60s). Full lint, scoped Prettier, handoff validation and all 11 required Chromium tests passed. Final forced compiler diagnostics exactly match the prior normalized baseline, with no new tutorial diagnostics. Local Node 24; PR CI verifies Node 22. Baseline compiler/broad-format drift is not claimed clean.

Architecture and completion advisor preflights both returned parent_runtime_unavailable; no consultation ran, and the skill allows root work. Recently shipped handoff is effective on merge; Linear remains In Progress until then.

## Deferred

No in-boundary deferrals. Existing SPE-2907 owns downstream campaign-specific presentation reconciliation; SPE-2744 owns first-run onboarding. SPE-1119 retains broader analytics ownership; SPE-3395 retains input registry/remapping ownership. No activation or new issue creation here.
