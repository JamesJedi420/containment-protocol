# SPE-947 — Parent umbrella reconciliation after SPE-2576–2617 (slice 2)

One-page hygiene record. Linear: [SPE-2618](https://linear.app/spectranoir/issue/SPE-2618/spe-947-parent-umbrella-reconciliation-after-spe-2576-2617-slice-2) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576)–[SPE-2617](https://linear.app/spectranoir/issue/SPE-2617); parent **Done** (owner acceptance July 2026).

| Field               | Value                                                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2618 — SPE-947 parent umbrella reconciliation after SPE-2576–2617 (slice 2)](https://linear.app/spectranoir/issue/SPE-2618/spe-947-parent-umbrella-reconciliation-after-spe-2576-2617-slice-2) |
| **Status**          | **Done** (PR #3137 @ `8f713c51`)                                                                                                                                                                                     |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; **Done** (owner acceptance July 2026)                                      |
| **Branch**          | `spe-947-parent-umbrella-reconciliation-slice-2`                                                                                                                                                    |
| **Base `main` SHA** | `6e88d513`                                                                                                                                                                                          |

## Goal

Reconcile the SPE-947 parent Linear AC matrix + deferred table after SPE-2576–2617 wire-up/integration children shipped. Evaluate whether remaining deferred items (SPE-956 propagation graph vs SPE-947 wire-up) block parent **Done**. Record explicit disposition. Do **not** mark SPE-947 Done without owner acceptance.

## Prerequisite (on `main` @ `6e88d513`)

Prior reconciliation: [SPE-2575](https://linear.app/spectranoir/issue/SPE-2575) — 7/7 parent AC rows **Yes** at domain-evaluator / focused-test level (`planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`).

| Wire-up / integration child                      | Shipped evidence                                                                                                    | PR    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----- |
| GameState persistence / schema / hydration       | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576) — `spe947*` maps + sanitize/hydrate                       | #3075 |
| Weekly / `advanceWeek` orchestration hooks       | [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) — week-close tick over persisted maps                     | #3077 |
| Store / UI / planning-mirror surfacing           | [SPE-2578](https://linear.app/spectranoir/issue/SPE-2578) — read-only mirror + Front Desk link                      | #3079 |
| Weekly report-note surfacing                     | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596) — week-close notes from map deltas                        | #3098 |
| Full SPE-2111 registry linkage                   | [SPE-2602](https://linear.app/spectranoir/issue/SPE-2602) — `spe947VisualTriggerHazardBindings`                     | #3108 |
| Pursuit vector simulator integration             | [SPE-2604](https://linear.app/spectranoir/issue/SPE-2604) — pursuit readings over linkage                           | #3112 |
| Countermeasure ledger link                       | [SPE-2605](https://linear.app/spectranoir/issue/SPE-2605) — attempt → reliability-class ledger                      | #3114 |
| Adaptation / commercialization persistence kinds | [SPE-2606](https://linear.app/spectranoir/issue/SPE-2606) — expand `POST_CASE_MEDIA_KINDS`                          | #3116 |
| Compact media-economy continuity                 | [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609) — economy weights / bindings                              | #3120 |
| GameState economy-map persistence                | [SPE-2610](https://linear.app/spectranoir/issue/SPE-2610) — sanitize/hydrate economy maps                           | #3122 |
| Full commercialization / media-economy simulator | [SPE-2611](https://linear.app/spectranoir/issue/SPE-2611) — one authored actor/path                                 | #3124 |
| Broader multi-actor media-economy growth         | [SPE-2612](https://linear.app/spectranoir/issue/SPE-2612) — ≥2 actors / multi-path compose                          | #3126 |
| Cross-path aggregate                             | [SPE-2613](https://linear.app/spectranoir/issue/SPE-2613) — any/worse aggregate over multi-path                     | #3128 |
| Third commercial path                            | [SPE-2614](https://linear.app/spectranoir/issue/SPE-2614) — three-path aggregate                                    | #3130 |
| Week-close orchestration over aggregate          | [SPE-2615](https://linear.app/spectranoir/issue/SPE-2615) — pure week-close compose                                 | #3132 |
| Persisted commercialization-actor map            | [SPE-2616](https://linear.app/spectranoir/issue/SPE-2616) — actor map + tick stamp                                  | #3134 |
| Authored weekly economy-map delta fields         | [SPE-2617](https://linear.app/spectranoir/issue/SPE-2617) — `weeklyContinuityFactorDelta` / `weeklyEconomyWeightId` | #3136 |

**Delta:** After SPE-2575, the parent deferred table still listed GameState / weekly / UI / propagation-graph wire-up as open. SPE-2576–2617 closed every SPE-947-owned wire-up row from that table. Only cross-parent propagation graph (SPE-956) and explicit umbrella acceptance remain.

## Parent AC vs shipped evidence (post SPE-2576–2617)

| Parent AC                                           | Shipped evidence                                                                           | Met?              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------- |
| Platform reach multiplier from view count           | SPE-2568 evaluator + SPE-2576 persistence + SPE-2577 week-close                            | **Yes** (wire-up) |
| Footage/post increases civilian exposure or traffic | SPE-2571 evaluator + SPE-2576 persistence + SPE-2577 week-close                            | **Yes** (wire-up) |
| Counter-memetic lore + distributor + uptake gate    | SPE-2570 evaluator + SPE-2576 persistence + SPE-2577 week-close                            | **Yes** (wire-up) |
| Platform outage / reach failure degrades operation  | SPE-2569 evaluator + SPE-2576 persistence + SPE-2577 week-close                            | **Yes** (wire-up) |
| Content owner resists takedown                      | SPE-2572 evaluator + SPE-2576 persistence + SPE-2577 week-close                            | **Yes** (wire-up) |
| Post-case hazardous media persistence               | SPE-2573 evaluator + SPE-2606 kinds + SPE-2609–2617 continuity / economy chain             | **Yes** (wire-up) |
| Integration tests for parent scenarios              | SPE-2574 focused-test + `advanceWeek.spe947Evaluator.integration.test.ts` wire-up coverage | **Yes** (wire-up) |

**Level note:** Rows remain **Yes** at domain-evaluator level from SPE-2575. SPE-2576–2617 add wire-up/integration evidence (persistence, week-close, mirror, registry linkage, media-economy compose). Wire-up Yes ≠ umbrella **Done** without explicit owner acceptance.

## SPE-956 propagation graph vs SPE-947 wire-up — blocking evaluation

| Deferred item                             | Owner                                                                         | Blocks SPE-947 Done?       | Reasoning                                                                                                                                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Propagation graph wire-up                 | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965 family | **No** (for SPE-947 AC)    | Carved out since SPE-2111 slice 1 (`planning/visual-trigger-hazard-registry-slice-1.md` § Out). Separate parent umbrella — not a SPE-947 acceptance row. SPE-947 evaluators + wire-up do not require full propagation-graph runtime. |
| SPE-947 wire-up / integration (2576–2617) | SPE-947 children                                                              | **No** — **Done**          | All rows from SPE-2575 deferred table shipped.                                                                                                                                                                                       |
| Parent umbrella **Done**                  | Owner explicit acceptance                                                     | **Yes** (intentional gate) | 7/7 AC Yes at wire-up level; propagation graph is SPE-956 scope. Parent stays **Backlog** until owner explicitly accepts umbrella closure — not because wire-up remains open.                                                        |

**Disposition:** SPE-956 propagation graph does **not** block marking SPE-947 **Done** from an AC-evidence standpoint. This slice does **not** mark SPE-947 Done — owner must accept umbrella closure in a follow-up decision.

## Scope (this slice)

| In                                                                                 | Out                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------ |
| SPE-947 Linear parent AC matrix + deferred table refresh                           | GameState / weekly / UI code changes       |
| Slice doc (this file) + `planning/backlog.md` handoff                              | Propagation graph implementation (SPE-956) |
| Update `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md` deferred rows | Rewrite SPE-2568–2574 evaluator contracts  |
| SPE-2617 slice doc status → Done                                                   | Mark SPE-947 Done                          |
| Parent comment hygiene (SPE-2616/2617 merge closeout pattern)                      | SPE-956 scope changes                      |

## Acceptance

- [x] SPE-947 Linear deferred table marks SPE-2576–2617 wire-up rows **Done**; propagation graph stays SPE-956
- [x] Parent body records propagation graph does not block SPE-947 AC; umbrella Done awaits explicit acceptance
- [x] Slice doc + backlog handoff present (SPE-2616/2617 → shipped; reconciliation current)
- [x] Parent SPE-947 **Done** accepted (Linear-only, July 2026); child SPE-2618 Done after merge
- [x] No `src/` domain/runtime changes

## Deferred

| Item                                        | Suggested owner                                                               | Why deferred                           |
| ------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| Propagation graph wire-up                   | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965 family | Cross-parent; not SPE-947 AC           |
| Parent umbrella **Done**                    | **Done** — owner acceptance July 2026                                         | SPE-2618 disposition; 7/7 AC at wire-up |
| Full internet / sprawling media-economy sim | Owner reprioritization                                                        | Out of bounded SPE-947 slices          |

## Validation

Docs/hygiene only — no new domain tests.

## See also

- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/spe-947-media-economy-weekly-delta-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
