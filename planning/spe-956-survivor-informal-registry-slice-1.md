# SPE-956 — Survivor informal morbidity / recurrence registry (slice 1)

One-page implementation plan. Linear: [SPE-2630](https://linear.app/spectranoir/issue/SPE-2630) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Fourth participatory-channel boundary for the SPE-956 umbrella (after SPE-2620 advisory, SPE-2628 hotline, SPE-2629 async discussion). Parent stays **Backlog**.

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2630 — Survivor informal morbidity / recurrence registry (slice 1)](https://linear.app/spectranoir/issue/SPE-2630)          |
| **Status**          | **Shipped**                                                                                                                      |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog** |
| **Branch**          | `spe-956-survivor-informal-registry-slice-1`                                                                                     |
| **Base `main` SHA** | `a4bb6ee0`                                                                                                                       |

## Goal

Ship the smallest pure deterministic survivor-community informal registry surface: one authored survivor community functions as an informal morbidity / recurrence registry with nonofficial support-knowledge value via a frozen proposed-adjustment envelope — without a clinical/EHR simulator, UI, persistence, store, week-close wiring, or reopening SPE-2620 / SPE-2628 / SPE-2629 / SPE-1682.

## Prerequisite (on `main` @ `a4bb6ee0`)

| Shipped / pattern              | Anchor                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| Frozen evaluator envelopes     | `asyncDiscussionSurface.ts` (SPE-2629), `hotlineChannel.ts` (SPE-2628), advisory (SPE-2620) |
| Bounded proposed adjustments   | SPE-2620 / SPE-2628 / SPE-2629 adjustment shape (reuse pattern, do not reopen contracts)    |
| Credibility-ceiling constraint | SPE-956 parent — resulting testimony stays weak in formal credibility terms                 |
| Inquiry queues (avoid)         | SPE-860 — do not rewrite inquiry queue types                                                |

## Evaluation contract

- **Module:** `src/domain/survivorInformalRegistry.ts` (distinct from SPE-2620 / SPE-2628 / SPE-2629 evaluators and SPE-1682 aftereffects).
- **Registry:** id, recognitionStance (`informal_only` \| `contested` \| `institution_refused`), catalogRule (`open_community` \| `pattern_only` \| `closed`), supportKnowledgeBand (`none` \| `peer_shared` \| `registry_informed`), credibilityCeiling (`anecdotal` \| `community_weak`).
- **Signal:** signalId, registryId, intent (`record_symptom` \| `record_recurrence` \| `contribute_support`), proposedScope (`support_knowledge` \| `credibility_stance`), proposedValue.
- **Baseline:** communityId + supportKnowledge + credibilityStance strings.
- **Outcome priority:**
  1. Missing/invalid evaluation input, registry, signal, or baseline → `deferred`, resolved === baseline, no adjustment.
  2. Incomplete registry (recognition / catalog / band / ceiling) → `deferred` (`incomplete_registry_rules`), no adjustment.
  3. `catalogRule` `closed` → `rejected` (`catalog_closed`), no adjustment.
  4. `catalogRule` `pattern_only` + intent `record_symptom` → `deferred` (`incomplete_catalog_rule`), no adjustment.
  5. registryId mismatch → `rejected` (`registry_signal_mismatch`), no adjustment.
  6. intent/scope mismatch (`record_symptom` / `record_recurrence` with `credibility_stance`, or other non-`support_knowledge` scopes) → `rejected` (`intent_scope_mismatch`), no adjustment.
  7. `contribute_support` + `proposedScope` `credibility_stance` → `weak_testimony` (`weak_testimony_ceiling`); no formal credibility elevation; no adjustment.
  8. Otherwise valid support-knowledge path → `recorded`, apply support_knowledge adjustment; reason codes include `credibility_capped_weak`.
- Result is frozen: outcome, registryId, signalId, baseline, resolved, proposedAdjustment \| null, reasonCodes (unique sorted).
- Never mutates baseline; never invents a diagnosis engine or clinical database.

## Scope

| In                                                                      | Out                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| Compact registry / signal / baseline types + pure evaluator             | Full clinical / EHR / diagnosis simulator                    |
| Outcomes `recorded` \| `deferred` \| `rejected` \| `weak_testimony`     | SPE-860 inquiry queues; SPE-911 notifications                |
| One authored fixture where survivor community records support knowledge | SPE-875 worker governance; SPE-1682 aftereffects rewrite     |
| Focused Vitest + slice doc + backlog handoff                            | UI / persistence / store / week-close                        |
|                                                                         | Reopening SPE-2620 / SPE-2628 / SPE-2629 evaluator contracts |

## Acceptance

- [x] One survivor community registry has explicit recognition stance, catalog rule, and credibility ceiling.
- [x] One authored signal path records nonofficial support-knowledge value (`recorded`).
- [x] At least one signal is deferred or rejected under incomplete recognition / catalog rules.
- [x] Empty/missing input is a deterministic no-op without throw.
- [x] Focused tests cover stable reason codes, weak-testimony ceiling, and immutability.
- [x] SPE-956 remains **Backlog** after this child ships; child Done only after merge.

## Validation

- `npm.cmd run test:run -- src/test/survivorInformalRegistry.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`
- Direct Prettier check for touched files only.

## Deferred

| Item                                  | Suggested owner                                           | Why deferred                         |
| ------------------------------------- | --------------------------------------------------------- | ------------------------------------ |
| Persistence / store / week-close wire | SPE-956 follow-up child                                   | Domain-only foundation this slice    |
| UI / planning mirror                  | SPE-956 follow-up child                                   | No presentational surface this slice |
| Collective memory-stabilization       | [SPE-2631](https://linear.app/spectranoir/issue/SPE-2631) | Next SPE-956 participatory child     |
| SPE-860 inquiry queue coordination    | [SPE-860](https://linear.app/spectranoir/issue/SPE-860)   | Must not rewrite inquiry queues      |
| Stakeholder notification duties       | [SPE-911](https://linear.app/spectranoir/issue/SPE-911)   | Separate notification matrix         |
| Compose with SPE-2620 / 2628 / 2629   | Later SPE-956 child                                       | Keep evaluators distinct this slice  |
| SPE-1682 aftereffects integration     | [SPE-1682](https://linear.app/spectranoir/issue/SPE-1682) | Do not rewrite aftereffects          |

## See also

- `src/domain/asyncDiscussionSurface.ts` (SPE-2629 — do not reopen)
- `src/domain/hotlineChannel.ts` (SPE-2628 — do not reopen)
- `src/domain/communityAdvisoryDecisionInfluence.ts` (SPE-2620 — do not reopen)
- `planning/spe-956-async-discussion-surface-slice-1.md`
- `planning/spe-956-hotline-channel-slice-1.md`
- `planning/spe-956-community-advisory-decision-influence-slice-1.md`
- `planning/backlog.md`
