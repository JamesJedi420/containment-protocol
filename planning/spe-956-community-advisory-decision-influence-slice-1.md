# SPE-956 — Community advisory body decision influence (slice 1)

One-page implementation plan. Linear: [SPE-2620](https://linear.app/spectranoir/issue/SPE-2620) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). First participatory-decision boundary for the SPE-956 umbrella. Parent stays **Backlog**.

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2620 — Community advisory body decision influence (slice 1)](https://linear.app/spectranoir/issue/SPE-2620)                 |
| **Status**          | **In Progress**                                                                                                                  |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog** |
| **Branch**          | `spe-956-community-advisory-decision-influence-slice-1`                                                                          |
| **Base `main` SHA** | `0c2d31ea`                                                                                                                       |

## Goal

Ship the smallest pure deterministic community-advisory surface: one authored advisory body with mission, membership rule, stakeholder classes, authorized scopes, and influence threshold can materially change an incident response choice via a frozen proposed-adjustment envelope — without UI, persistence, store, week-close wiring, or parallel policy state.

## Prerequisite (on `main` @ `0c2d31ea`)

| Shipped / pattern              | Anchor                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Frozen evaluator envelopes     | `contentOwnerTakedownResistance.ts`, `segmentedFeedbackWorkflow.ts`             |
| Bounded proposed adjustments   | `authorityNegotiation.ts` adjustment pattern (reuse shape, not authority graph) |
| Operational advisories (avoid) | `advisory.ts` — team arrangement / instability hints; **do not extend**         |
| SPE-956 graph siblings         | SPE-2619–2626 propagation graph chain (orthogonal; do not rewrite)              |

## Evaluation contract

- **Module:** `src/domain/communityAdvisoryDecisionInfluence.ts` (distinct from operational `advisory.ts`).
- **Body:** id, mission, membershipRule, representedStakeholderClasses, authorizedDecisionScopes, influenceThreshold, decisionCriteria.
- **Signal:** bodyId, recommendation `{ scope, proposedValue }`, supportBand, confidence (0–1), urgency, optional conditions.
- **Baseline:** incidentId + responseTiming / restrictionLevel / framing / supportRouting strings (single source of truth input).
- **supportScore** = `SUPPORT_BAND_WEIGHT[supportBand] * confidence` (micro-rounded for display; compare with raw product).
- **Disposition priority:**
  1. Missing/invalid evaluation input, body, signal, or baseline (including partial baselines missing required fields) → `deferred`, resolved === baseline, no adjustment.
  2. bodyId mismatch → `rejected`, no adjustment.
  3. Recommendation scope ∉ authorizedDecisionScopes → `rejected` (`recommendation_out_of_scope`), no adjustment.
  4. Malformed `conditions` (non-array or non-string entries) → `deferred` (`invalid_advisory_conditions`), no adjustment.
  5. supportScore < influenceThreshold → `deferred` when urgency is `elevated`/`urgent`, else `rejected` (`below_influence_threshold`); no adjustment.
  6. Meets threshold + conditions present → `modified`, apply proposed value, keep conditions inspectable.
  7. Meets threshold + no conditions → `adopted`, apply proposed value.
- Result is frozen: disposition, baseline, resolved, proposedAdjustment | null, supportScore, influenceThreshold, bodyId, reasonCodes (unique sorted).
- Never mutates baseline; never invents parallel policy maps.

## Scope

| In                                                               | Out                                                       |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| Compact body / signal / baseline types + pure evaluator          | Hotline intake / scripts / staffing (later SPE-956 child) |
| Dispositions `adopted` \| `modified` \| `deferred` \| `rejected` | SPE-860 inquiry queues; SPE-911 notifications             |
| One authored incident fixture where advisory changes routing     | SPE-875 worker governance; SPE-1682 survivor registry     |
| Focused Vitest + slice doc + backlog handoff                     | UI / persistence / store / week-close                     |
|                                                                  | Full deliberative-democracy / elections simulator         |
|                                                                  | Edits to `advisory.ts` operational hints                  |

## Acceptance

- [x] One advisory body has explicit mission, membership rules, stakeholders, scope, and decision criteria.
- [x] One authored advisory signal materially changes an incident response decision (`adopted`).
- [x] At least one signal is `modified`, `deferred`, or `rejected` for scope exceed or threshold failure.
- [x] Empty/missing advisory input is a deterministic no-op without throw.
- [x] Focused tests cover adopted influence, bounded reject/defer/modify, stable reason codes, immutability.
- [ ] SPE-956 remains **Backlog** after this child ships; child Done only after merge.

## Validation

- `npm.cmd run test:run -- src/test/communityAdvisoryDecisionInfluence.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`
- Direct Prettier check for touched files only.

## Deferred

| Item                                     | Suggested owner                                         | Why deferred                                      |
| ---------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| Hotline intake / callback queues         | Later SPE-956 child; coordinate SPE-860                 | Parent participatory channel, not this boundary   |
| Stakeholder notification duties          | [SPE-911](https://linear.app/spectranoir/issue/SPE-911) | Separate notification matrix                      |
| Worker / contractor governance           | [SPE-875](https://linear.app/spectranoir/issue/SPE-875) | Out of advisory-body influence                    |
| Survivor registry / recurrence           | Later SPE-956 child; SPE-860 / SPE-1682                 | Separate registry surface                         |
| Persistence / store / week-close wire    | SPE-956 follow-up child                                 | Domain-only foundation this slice                 |
| UI / planning mirror                     | SPE-956 follow-up child                                 | No presentational surface this slice              |
| Compose with operational `getAdvisories` | Do not merge                                            | Distinct operational vs community advisory spaces |

## See also

- `src/domain/contentOwnerTakedownResistance.ts`
- `src/domain/segmentedFeedbackWorkflow.ts`
- `src/domain/authorityNegotiation.ts`
- `src/domain/advisory.ts` (operational — do not extend)
- `planning/spe-956-propagation-graph-wire-up-slice-1.md`
- `planning/backlog.md`
