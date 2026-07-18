# SPE-956 — Collective memory-stabilization channel (slice 1)

One-page implementation plan. Linear: [SPE-2631](https://linear.app/spectranoir/issue/SPE-2631) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Fifth participatory-channel boundary for the SPE-956 umbrella (after SPE-2620 advisory, SPE-2628 hotline, SPE-2629 async discussion, SPE-2630 survivor informal registry). Parent stays **Backlog**.

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2631 — Collective memory-stabilization channel (slice 1)](https://linear.app/spectranoir/issue/SPE-2631)                    |
| **Status**          | **Shipped**                                                                                                                      |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog** |
| **Branch**          | `spe-956-collective-memory-stabilization-slice-1`                                                                                |
| **Base `main` SHA** | `7f02537c`                                                                                                                       |

## Goal

Ship the smallest pure deterministic collective memory-stabilization channel: one authored shared-narrative channel stabilizes fragmented procedure recall via a frozen proposed-adjustment envelope while resulting testimony stays weak in formal credibility terms — without a deliberative-democracy simulator, UI, persistence, store, week-close wiring, or reopening SPE-2620 / SPE-2628 / SPE-2629 / SPE-2630 / SPE-1682.

## Prerequisite (on `main` @ `7f02537c`)

| Shipped / pattern            | Anchor                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Frozen evaluator envelopes   | `survivorInformalRegistry.ts` (SPE-2630), `asyncDiscussionSurface.ts` (SPE-2629), hotline   |
| Bounded proposed adjustments | SPE-2620 / SPE-2628 / SPE-2629 / SPE-2630 adjustment shape (reuse pattern, do not reopen)   |
| Weak-testimony ceiling       | SPE-2630 `weak_testimony` / `credibilityCeiling` pattern; SPE-956 parent constraint         |
| Institutional memory (avoid) | SPE-2629 `stabilize_memory` — distinct institutional forum; do not duplicate as parallel UI |

## Evaluation contract

- **Module:** `src/domain/collectiveMemoryStabilization.ts` (distinct from SPE-2620 / SPE-2628 / SPE-2629 / SPE-2630 evaluators and SPE-1682 aftereffects).
- **Channel:** id, narrativeStance (`shared_survivor` \| `community_oral` \| `contested_fragment`), recallWindow (`active_session` \| `extended_recall` \| `closed`), credibilityCeiling (`anecdotal` \| `community_weak`), stabilizationRule (`open_shared` \| `procedure_fragments_only` \| `incomplete`).
- **Signal:** signalId, channelId, intent (`stabilize_recall` \| `share_narrative` \| `elevate_testimony`), proposedScope (`procedure_memory` \| `credibility_stance`), proposedValue.
- **Baseline:** memberId + procedureMemory + credibilityStance strings.
- **Outcome priority:**
  1. Missing/invalid evaluation input, channel, signal, or baseline → `deferred`, resolved === baseline, no adjustment.
  2. Incomplete channel (narrative / recall / ceiling / rule enums) → `deferred` (`incomplete_stabilization_rules`), no adjustment.
  3. `stabilizationRule` `incomplete` → `deferred` (`incomplete_stabilization_rule`), no adjustment.
  4. `recallWindow` `closed` → `rejected` (`recall_window_closed`), no adjustment.
  5. `stabilizationRule` `procedure_fragments_only` + intent `share_narrative` → `deferred` (`incomplete_stabilization_rule`), no adjustment.
  6. channelId mismatch → `rejected` (`channel_signal_mismatch`), no adjustment.
  7. intent/scope mismatch (`stabilize_recall` / `share_narrative` with `credibility_stance`, or other non-`procedure_memory` scopes) → `rejected` (`intent_scope_mismatch`), no adjustment.
  8. `elevate_testimony` + `proposedScope` `credibility_stance` → `weak_testimony` (`weak_testimony_ceiling`); no formal credibility elevation; no adjustment.
  9. Otherwise valid procedure-memory path → `stabilized`, apply procedure_memory adjustment; reason codes include `credibility_capped_weak`.
- Result is frozen: outcome, channelId, signalId, baseline, resolved, proposedAdjustment \| null, reasonCodes (unique sorted).
- Never mutates baseline; never invents a deliberative forum or institutional memory transcript (SPE-2629 owns that surface).

## Scope

| In                                                                                 | Out                                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Compact channel / signal / baseline types + pure evaluator                         | Full deliberative-democracy / elections simulator             |
| Outcomes `stabilized` \| `deferred` \| `rejected` \| `weak_testimony`              | SPE-860 inquiry queues; SPE-911 notifications                 |
| One authored fixture where shared narrative stabilizes fragmented procedure recall | SPE-875 worker governance; SPE-1682 aftereffects rewrite      |
| Focused Vitest + slice doc + backlog handoff                                       | UI / persistence / store / week-close                         |
|                                                                                    | Reopening SPE-2620 / SPE-2628 / SPE-2629 / SPE-2630 contracts |

## Acceptance

- [x] One memory-stabilization channel has explicit narrative stance, recall window, and credibility ceiling.
- [x] One authored signal path stabilizes fragmented procedure memory without formal credibility elevation (`stabilized`).
- [x] At least one signal is deferred or rejected under incomplete stabilization rules.
- [x] Empty/missing input is a deterministic no-op without throw.
- [x] Focused tests cover stable reason codes, weak-testimony ceiling, and immutability.
- [x] SPE-956 remains **Backlog** after this child ships; child Done only after merge.

## Validation

- `npm.cmd run test:run -- src/test/collectiveMemoryStabilization.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`
- Direct Prettier check for touched files only.

## Deferred

| Item                                       | Suggested owner                                           | Why deferred                         |
| ------------------------------------------ | --------------------------------------------------------- | ------------------------------------ |
| Persistence / store / week-close wire      | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632) | Domain-only foundation this slice    |
| UI / planning mirror                       | SPE-956 follow-up child                                   | No presentational surface this slice |
| SPE-860 inquiry queue coordination         | [SPE-860](https://linear.app/spectranoir/issue/SPE-860)   | Must not rewrite inquiry queues      |
| Stakeholder notification duties            | [SPE-911](https://linear.app/spectranoir/issue/SPE-911)   | Separate notification matrix         |
| Compose with SPE-2620 / 2628 / 2629 / 2630 | Later SPE-956 child                                       | Keep evaluators distinct this slice  |
| SPE-1682 aftereffects integration          | [SPE-1682](https://linear.app/spectranoir/issue/SPE-1682) | Do not rewrite aftereffects          |

## See also

- `src/domain/survivorInformalRegistry.ts` (SPE-2630 — do not reopen)
- `src/domain/asyncDiscussionSurface.ts` (SPE-2629 — institutional `stabilize_memory`; do not reopen)
- `src/domain/hotlineChannel.ts` (SPE-2628 — do not reopen)
- `src/domain/communityAdvisoryDecisionInfluence.ts` (SPE-2620 — do not reopen)
- `planning/spe-956-survivor-informal-registry-slice-1.md`
- `planning/spe-956-async-discussion-surface-slice-1.md`
- `planning/backlog.md`
