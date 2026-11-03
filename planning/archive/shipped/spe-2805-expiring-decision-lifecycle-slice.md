# SPE-2805 — Expiring decision lifecycle and deterministic default resolution

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-2805](https://linear.app/spectranoir/issue/SPE-2805/expiring-decision-lifecycle-and-deterministic-default-resolution) |
| **Parent** | none (leaf) |
| **Branch** | `jamesdyedbq/spe-2805-expiring-decision-lifecycle-and-deterministic-default` |
| **Base main SHA** | `45a47185` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `45a47185`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291…`)  
**Decision:** `delegated_approve` SPE-2805  

Linear comment on SPE-2805 records queue state (SPE-3120 Done @ `45a47185` / PR #4452), selection among SPE-3186 / SPE-2157 / parked set, contradiction review (SPE-2187 remains Canceled; SPE-2162 canceled; SPE-1310 not broadened), and eligibility checklist. No new issue/child/parent/relationship created. SPE-62 / SPE-1127 / SPE-1287 / SPE-1585 remain adjacent owners.

## Approved boundary

- Pure domain `src/domain/expiringDecisionLifecycle.ts` — reusable deterministic lifecycle for time-bounded decisions
- Stable IDs, authoritative clock domain, expiry, states (`open` / `explicitly_resolved` / `expired` / `default_resolved` / `canceled` / `superseded`)
- Producer-declared options + default contract (`expire_without_action` / `maintain_status_quo` / `decline` / `continue_current_state` / `named_domain_action`)
- Exactly-once timeout resolution; late-response rejection; UI-order independence
- SPE-1585 deadline-source refs consumed (shift before expiry); no second deadline ontology
- Action-route stubs to SPE-1127 / SPE-62 without implementing those systems or SPE-2187 registry / SPE-1287 queue
- Two stub producers: correspondence-window (`expire_without_action`) + operational-recommendation (`named_domain_action` → SPE-1127); phase-held-response routes to SPE-62
- Hydrate/normalize helpers + versioned correspondence misclassification repair; no GameState field
- SPE-1135 re-exports terminal provenance types from this owner
- Targeted Vitest `src/domain/expiringDecisionLifecycle.test.ts`
- SCHEMA_REGISTRY evidence-only

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| At least two unrelated producers use the same lifecycle | Test "uses the same lifecycle contract across two unrelated producers" |
| Explicit resolve before expiry suppresses timeout | Test "resolves explicitly before expiry…" |
| Unanswered expires and invokes declared default exactly once | Test "expires an unanswered decision…" |
| Explicit vs timeout historically distinguishable | Test "keeps explicit selection and timeout…" |
| Late responses cannot mutate / double-resolve | Test "rejects late responses…" |
| Authoritative deadline shifts respected before expiry | Test "respects authoritative deadline shifts…" |
| Save/load preserves expiry and terminal behavior | Test "preserves identical expiry… across save/load" |
| Reload does not re-invoke fallback | Test "does not re-invoke fallback when reloading…" |
| UI option ordering cannot affect fallback | Test "does not let UI option ordering…" |
| At least one `expire_without_action` producer | Correspondence stub + test "supports expire_without_action…" |
| At least one timeout routes real action to SPE-1127/SPE-62 | Operational recommendation → SPE-1127; phase-held → SPE-62 |
| Phase-local held-response continues through SPE-62 | Test "routes phase-local held-response timeout through SPE-62…" |
| Async delivery failure can timeout without explicit refusal | Test "records async delivery failure timeout…" |
| Correspondence expiry → terminal; no further reply action | Test "lets a correspondence-domain obligation consumer…" |
| Misclassified expired correspondence repairs exactly once | Test "repairs a historically misclassified…" |
| Legitimate explicit refusal is not repaired | Test "does not repair a legitimate explicit refusal" |
| Targeted tests cover listed behaviors | Full suite in `expiringDecisionLifecycle.test.ts` |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live GameState field / week-close wire | Future consumer | Pure record hydrate first; acceptance allows evidence-only persistence |
| Full SPE-1127 vetoable / SPE-62 phase execution | SPE-1127 / SPE-62 | Route stubs only; domain executors remain authoritative |
| SPE-1287 timed-operations enqueue | SPE-1287 | No second universal timer queue |
| SPE-2802 recommendation semantics | SPE-2802 | Stub producer only; recommendation domain stays there |
| Player-facing UI surfaces | Feature consumers | Presentation projection exists for semantic fields; UI not in slice |

## Out of scope (preserved)

- Do not recreate SPE-2187 held-action registry
- Do not broaden SPE-1310 into generic decision lifecycle
- Do not treat SPE-2162 as general timeout owner
