# SPE-956 — Private hotline / direct-contact channel (slice 1)

One-page implementation plan. Linear: [SPE-2628](https://linear.app/spectranoir/issue/SPE-2628) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Second participatory-channel boundary for the SPE-956 umbrella (after SPE-2620 advisory influence). Parent stays **Backlog**.

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2628 — Private hotline / direct-contact channel (slice 1)](https://linear.app/spectranoir/issue/SPE-2628)                   |
| **Status**          | **Shipped** — PR #3162                                                                                                           |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog** |
| **Branch**          | `spe-956-hotline-channel-slice-1`                                                                                                |
| **Base `main` SHA** | `ab8ab54c`                                                                                                                       |

## Goal

Ship the smallest pure deterministic private-hotline surface: one authored hotline channel with script quality, staffing capacity, language support, escalation rules, and unanswered/anger handling modes can materially change guidance or support routing via a frozen proposed-adjustment envelope — without UI, persistence, store, week-close wiring, or a call-center simulator.

## Prerequisite (on `main` @ `ab8ab54c`)

| Shipped / pattern            | Anchor                                                            |
| ---------------------------- | ----------------------------------------------------------------- |
| Frozen evaluator envelopes   | `communityAdvisoryDecisionInfluence.ts` (SPE-2620)                |
| Bounded proposed adjustments | SPE-2620 adjustment shape (reuse pattern, do not reopen contract) |
| Feedback workflow envelopes  | `segmentedFeedbackWorkflow.ts`                                    |
| Inquiry queues (avoid)       | SPE-860 — do not rewrite inquiry queue types                      |

## Evaluation contract

- **Module:** `src/domain/hotlineChannel.ts` (distinct from SPE-2620 advisory evaluator and SPE-860 inquiry queues).
- **Channel:** id, scriptQuality (0–1), staffingCapacity (0–1), languageSupport, escalationRules, unansweredMode, angerMode, handleThreshold (0–1).
- **Call:** callId, channelId, callerMode (`inquiry` \| `anger` \| `pressure`), requiresLanguageSupport, proposedScope (`guidance` \| `support_routing`), proposedValue.
- **Baseline:** incidentId + guidance + supportRouting strings.
- **handleScore** = `scriptQuality * staffingCapacity` (micro-rounded for display; compare with raw product).
- **Outcome priority:**
  1. Missing/invalid evaluation input, channel, call, or baseline → `unanswered`, resolved === baseline, no adjustment.
  2. channelId mismatch → `unanswered`, no adjustment.
  3. callerMode `anger` + channel `angerMode` `anger_only` → `anger_only`, no adjustment (vent-only path).
  4. requiresLanguageSupport and channel lacks languageSupport → `escalated` (`language_unsupported`), no adjustment.
  5. handleScore < handleThreshold → `escalated` when unansweredMode is `queue_callback`; `unanswered` when unansweredMode is `mark_unanswered` (`below_handle_threshold`); no adjustment.
  6. Otherwise → `handled`, apply proposed guidance/routing adjustment.
- Result is frozen: outcome, channelId, callId, baseline, resolved, proposedAdjustment \| null, handleScore, handleThreshold, reasonCodes (unique sorted).
- Never mutates baseline; never invents parallel queue state or call-center dialogue.

## Scope

| In                                                                | Out                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| Compact channel / call / baseline types + pure evaluator          | Full call-center / free-form dialogue simulator       |
| Outcomes `handled` \| `escalated` \| `unanswered` \| `anger_only` | SPE-860 inquiry queues; SPE-911 notifications         |
| One authored fixture where hotline changes support routing        | SPE-875 worker governance; SPE-1682 survivor registry |
| Focused Vitest + slice doc + backlog handoff                      | UI / persistence / store / week-close                 |
|                                                                   | Reopening SPE-2620 advisory evaluator contract        |

## Acceptance

- [x] One hotline channel has explicit script, staffing, escalation, and handling modes.
- [x] One authored call path materially changes guidance or support routing (`handled`).
- [x] At least one call escalates or fails under low staffing/script quality.
- [x] Empty/missing input is a deterministic no-op without throw.
- [x] Focused tests cover stable reason codes and immutability.
- [x] SPE-956 remains **Backlog** after this child ships; child Done only after merge.

## Validation

- `npm.cmd run test:run -- src/test/hotlineChannel.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`
- Direct Prettier check for touched files only.

## Deferred

| Item                                  | Suggested owner                                           | Why deferred                            |
| ------------------------------------- | --------------------------------------------------------- | --------------------------------------- |
| Persistence / store / week-close wire | SPE-956 follow-up child                                   | Domain-only foundation this slice       |
| UI / planning mirror                  | SPE-956 follow-up child                                   | No presentational surface this slice    |
| Async / transcript discussion surface | [SPE-2629](https://linear.app/spectranoir/issue/SPE-2629) | Next SPE-956 participatory child        |
| Survivor informal registry            | Later SPE-956 child; SPE-860 / SPE-1682                   | Separate registry surface               |
| SPE-860 inquiry queue coordination    | [SPE-860](https://linear.app/spectranoir/issue/SPE-860)   | Hotline must not rewrite inquiry queues |
| Stakeholder notification duties       | [SPE-911](https://linear.app/spectranoir/issue/SPE-911)   | Separate notification matrix            |
| Compose with SPE-2620 advisory body   | Later SPE-956 child                                       | Keep evaluators distinct this slice     |

## See also

- `src/domain/communityAdvisoryDecisionInfluence.ts` (SPE-2620 — do not reopen)
- `src/domain/segmentedFeedbackWorkflow.ts`
- `src/domain/contentOwnerTakedownResistance.ts`
- `planning/spe-956-community-advisory-decision-influence-slice-1.md`
- `planning/backlog.md`
