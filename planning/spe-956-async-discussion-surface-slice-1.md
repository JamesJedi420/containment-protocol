# SPE-956 — Async / transcript discussion surface (slice 1)

One-page implementation plan. Linear: [SPE-2629](https://linear.app/spectranoir/issue/SPE-2629) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Third participatory-channel boundary for the SPE-956 umbrella (after SPE-2620 advisory influence and SPE-2628 hotline). Parent stays **Backlog**.

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2629 — Async / transcript discussion surface (slice 1)](https://linear.app/spectranoir/issue/SPE-2629)                      |
| **Status**          | **Shipped** — PR #3164                                                                                                           |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog** |
| **Branch**          | `spe-956-async-discussion-surface-slice-1`                                                                                       |
| **Base `main` SHA** | `01485d73`                                                                                                                       |

## Goal

Ship the smallest pure deterministic asynchronous / transcript-preserving discussion surface: one authored discussion surface with participation window, transcript retention mode, widening rule, and memory-stabilization flag can widen participation or preserve institutional memory via a frozen proposed-adjustment envelope — without UI, persistence, store, week-close wiring, or a deliberative-democracy simulator.

## Prerequisite (on `main` @ `01485d73`)

| Shipped / pattern            | Anchor                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Frozen evaluator envelopes   | `hotlineChannel.ts` (SPE-2628), `communityAdvisoryDecisionInfluence.ts` (SPE-2620) |
| Bounded proposed adjustments | SPE-2620 / SPE-2628 adjustment shape (reuse pattern, do not reopen contracts)      |
| Feedback workflow envelopes  | `segmentedFeedbackWorkflow.ts`                                                     |
| Inquiry queues (avoid)       | SPE-860 — do not rewrite inquiry queue types                                       |

## Evaluation contract

- **Module:** `src/domain/asyncDiscussionSurface.ts` (distinct from SPE-2620 advisory and SPE-2628 hotline evaluators).
- **Surface:** id, participationWindow `{ startWeek, endWeek }`, transcriptRetentionMode (`ephemeral` \| `session_bound` \| `institutional`), wideningRule (`closed` \| `invite_extend` \| `open_async`), memoryStabilization (boolean).
- **Session:** sessionId, surfaceId, week, intent (`record` \| `widen` \| `stabilize_memory`), proposedScope (`participation` \| `institutional_memory`), proposedValue.
- **Baseline:** topicId + participation + institutionalMemory strings.
- **Outcome priority:**
  1. Missing/invalid evaluation input, surface, session, or baseline → `deferred`, resolved === baseline, no adjustment.
  2. Incomplete surface (window / retention / widening / memory flag) → `deferred` (`incomplete_discussion_surface`), no adjustment.
  3. Session week outside participation window → `deferred` (`outside_participation_window`), no adjustment.
  4. surfaceId mismatch → `rejected`, no adjustment.
  5. `widen` + wideningRule `closed` → `rejected` (`widening_not_allowed`), no adjustment.
  6. `stabilize_memory` without memoryStabilization or without `institutional` retention → `deferred` / `rejected` under incomplete retention rules, no adjustment.
  7. `record` with `ephemeral` retention → `deferred` (`incomplete_transcript_retention`), no adjustment.
  8. `widen` with `invite_extend` / `open_async` → `widened`, apply participation adjustment.
  9. `stabilize_memory` with institutional retention + memoryStabilization → `recorded`, apply institutional_memory adjustment.
  10. Otherwise valid `record` → `recorded`, apply proposed adjustment.
- Result is frozen: outcome, surfaceId, sessionId, baseline, resolved, proposedAdjustment \| null, reasonCodes (unique sorted).
- Never mutates baseline; never invents a forum / elections simulator.

## Scope

| In                                                               | Out                                                   |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| Compact surface / session / baseline types + pure evaluator      | Full deliberative-democracy / elections simulator     |
| Outcomes `recorded` \| `widened` \| `deferred` \| `rejected`     | SPE-860 inquiry queues; SPE-911 notifications         |
| One authored fixture where async discussion widens participation | SPE-875 worker governance; SPE-1682 survivor registry |
| Focused Vitest + slice doc + backlog handoff                     | UI / persistence / store / week-close                 |
|                                                                  | Reopening SPE-2620 / SPE-2628 evaluator contracts     |

## Acceptance

- [x] One discussion surface has explicit participation window, transcript retention, and widening rules.
- [x] One authored session path widens participation or preserves institutional memory (`widened` / `recorded`).
- [x] At least one session is deferred or rejected under incomplete retention / window rules.
- [x] Empty/missing input is a deterministic no-op without throw.
- [x] Focused tests cover stable reason codes and immutability.
- [x] SPE-956 remains **Backlog** after this child ships; child Done only after merge.

## Validation

- `npm.cmd run test:run -- src/test/asyncDiscussionSurface.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`
- Direct Prettier check for touched files only.

## Deferred

| Item                                  | Suggested owner                                           | Why deferred                         |
| ------------------------------------- | --------------------------------------------------------- | ------------------------------------ |
| Persistence / store / week-close wire | SPE-956 follow-up child                                   | Domain-only foundation this slice    |
| UI / planning mirror                  | SPE-956 follow-up child                                   | No presentational surface this slice |
| Survivor informal registry            | [SPE-2630](https://linear.app/spectranoir/issue/SPE-2630) | Next SPE-956 participatory child     |
| SPE-860 inquiry queue coordination    | [SPE-860](https://linear.app/spectranoir/issue/SPE-860)   | Must not rewrite inquiry queues      |
| Stakeholder notification duties       | [SPE-911](https://linear.app/spectranoir/issue/SPE-911)   | Separate notification matrix         |
| Compose with SPE-2620 / SPE-2628      | Later SPE-956 child                                       | Keep evaluators distinct this slice  |

## See also

- `src/domain/hotlineChannel.ts` (SPE-2628 — do not reopen)
- `src/domain/communityAdvisoryDecisionInfluence.ts` (SPE-2620 — do not reopen)
- `src/domain/segmentedFeedbackWorkflow.ts`
- `planning/spe-956-hotline-channel-slice-1.md`
- `planning/spe-956-community-advisory-decision-influence-slice-1.md`
- `planning/backlog.md`
