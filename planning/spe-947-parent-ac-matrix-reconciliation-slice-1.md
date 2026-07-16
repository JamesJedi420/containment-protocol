# SPE-947 — Parent AC matrix reconciliation after SPE-2568–2574 (slice 1)

One-page hygiene record. Linear: [SPE-2575](https://linear.app/spectranoir/issue/SPE-2575/spe-947-parent-ac-matrix-reconciliation-after-spe-2568-2574-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568)–[SPE-2574](https://linear.app/spectranoir/issue/SPE-2574); parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2575 — SPE-947 parent AC matrix reconciliation after SPE-2568–2574 (slice 1)](https://linear.app/spectranoir/issue/SPE-2575/spe-947-parent-ac-matrix-reconciliation-after-spe-2568-2574-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                                                       |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                             |
| **Branch**          | `spe-947-parent-ac-matrix-reconciliation-slice-1`                                                                                                                                                     |
| **Base `main` SHA** | `73e4971d`                                                                                                                                                                                            |

## Goal

Reconcile the SPE-947 parent Linear AC matrix + grooming mirror after SPE-2568–2574 so rows 1–7 read **Yes** at domain-evaluator / focused-test level. Record remaining GameState / weekly / UI / propagation-graph wire-up as explicit deferred. Do **not** implement wire-up. Do **not** mark SPE-947 Done.

## Prerequisite (on `main` @ `73e4971d`)

| Parent AC row                       | Shipped child                                             | Domain / test anchors                                                                                                                        | PR    |
| ----------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1 Platform reach multiplier         | [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) | `evaluatePlatformReachMultiplier` — `src/domain/platformReachMultiplier.ts`, `src/test/platformReachMultiplier.test.ts`                      | #3059 |
| 2 Footage/post → exposure / traffic | [SPE-2571](https://linear.app/spectranoir/issue/SPE-2571) | `evaluateFootageExposureTraffic` — `src/domain/footageExposureTraffic.ts`, `src/test/footageExposureTraffic.test.ts`                         | #3065 |
| 3 Counter-memetic uptake gate       | [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) | `evaluateCounterMemeticUptakeGate` — `src/domain/counterMemeticUptakeGate.ts`, `src/test/counterMemeticUptakeGate.test.ts`                   | #3063 |
| 4 Platform outage / reach failure   | [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) | `evaluatePlatformOperationDegrade` — `src/domain/platformOperationDegrade.ts`, `src/test/platformOperationDegrade.test.ts`                   | #3061 |
| 5 Content-owner takedown resistance | [SPE-2572](https://linear.app/spectranoir/issue/SPE-2572) | `evaluateContentOwnerTakedownResistance` — `src/domain/contentOwnerTakedownResistance.ts`, `src/test/contentOwnerTakedownResistance.test.ts` | #3067 |
| 6 Post-case media persistence       | [SPE-2573](https://linear.app/spectranoir/issue/SPE-2573) | `evaluatePostCaseMediaPersistence` — `src/domain/postCaseMediaPersistence.ts`, `src/test/postCaseMediaPersistence.test.ts`                   | #3069 |
| 7 Parent scenario integration tests | [SPE-2574](https://linear.app/spectranoir/issue/SPE-2574) | `src/test/spe947ParentAcScenarioIntegration.test.ts` composing SPE-2568–2573 EXAMPLE fixtures                                                | #3071 |

Prior grooming (stale matrix): [SPE-2481](https://linear.app/spectranoir/issue/SPE-2481) — `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md` (0/7 Yes after SPE-2111 registry substrate only).

**Delta:** Before SPE-2575, the parent Linear body still showed the SPE-2481 matrix (No / Partial) while SPE-2568–2574 had already shipped pure evaluators + focused parent-scenario Vitest. This slice updates the parent body to 7/7 **Yes** at domain-evaluator / focused-test level. Domain-evaluator Yes ≠ umbrella Done — GameState / weekly / UI / propagation-graph wire-up remain open.

## Parent AC vs shipped evidence (post SPE-2568–2574)

| Parent AC                                           | Shipped evidence                                                                                                          | Met?                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Platform reach multiplier from view count           | SPE-2568 `evaluatePlatformReachMultiplier` + Vitest; EXAMPLE platform scales reach with view count                        | **Yes** (domain-evaluator) |
| Footage/post increases civilian exposure or traffic | SPE-2571 `evaluateFootageExposureTraffic` + Vitest; active footage amplifies exposure / attraction traffic                | **Yes** (domain-evaluator) |
| Counter-memetic lore + distributor + uptake gate    | SPE-2570 `evaluateCounterMemeticUptakeGate` + Vitest; lore + distributor + propagation + uptake readiness                 | **Yes** (domain-evaluator) |
| Platform outage / reach failure degrades operation  | SPE-2569 `evaluatePlatformOperationDegrade` + Vitest; outage / crash / insufficient reach → failed or degraded            | **Yes** (domain-evaluator) |
| Content owner resists takedown                      | SPE-2572 `evaluateContentOwnerTakedownResistance` + Vitest; audience/status incentives → `resists`                        | **Yes** (domain-evaluator) |
| Post-case hazardous media persistence               | SPE-2573 `evaluatePostCaseMediaPersistence` + Vitest; after containment, persisting media → `remains_risky`               | **Yes** (domain-evaluator) |
| Integration tests for parent scenarios              | SPE-2574 `spe947ParentAcScenarioIntegration.test.ts` composes six evaluators; incomplete-config paths do not falsely pass | **Yes** (focused-test)     |

**Level note:** **Yes** means parent AC is evidenced at pure domain-evaluator / focused Vitest level. It does **not** mean GameState persistence, weekly orchestration, store, UI, or propagation-graph wire-up shipped.

**Parent [SPE-947](https://linear.app/spectranoir/issue/SPE-947) disposition:** **Backlog** — 7/7 rows Yes at domain-evaluator / focused-test level; wire-up/integration shipped SPE-2576–2617 ([SPE-2618](https://linear.app/spectranoir/issue/SPE-2618) reconciliation). Umbrella stays open until owner explicit acceptance; SPE-956 propagation graph does not block SPE-947 AC.

## Scope (this slice)

| In                                                    | Out                                                  |
| ----------------------------------------------------- | ---------------------------------------------------- |
| SPE-947 Linear parent AC matrix + deferred table      | GameState / schema / weekly / UI / store wire-up     |
| Slice doc (this file) + `planning/backlog.md` handoff | Propagation graph implementation                     |
| Pointer / delta note on SPE-2481 grooming mirror      | Rewrite of SPE-2568–2574 evaluator or test contracts |
| Distinguish domain-evaluator Yes vs umbrella Done     | SPE-2111 registry changes                            |
|                                                       | Mark SPE-947 Done                                    |

## Acceptance

- [x] SPE-947 Linear AC matrix marks rows 1–7 **Yes** at domain-evaluator / focused-test level with SPE-2568–2574 anchors
- [x] Parent deferred table lists remaining GameState/weekly/UI/propagation-graph wire-up (and related siblings) with owners
- [x] Slice doc + backlog handoff present
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge
- [x] No `src/` domain/runtime changes

## Deferred

| Item                                                              | Suggested owner                                                                                                                                | Why deferred                                                                                                                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GameState persistence / schema / hydration for SPE-947 evaluators | **Done** — [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576) / PR #3075                                                                | `spe947*` maps + sanitize/hydrate                                                                                                                             |
| Weekly / `advanceWeek` orchestration hooks                        | **Done** — [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) / PR #3077                                                                | Week-close tick over persisted maps                                                                                                                           |
| Store / UI / planning-mirror surfacing                            | **Done** — [SPE-2578](https://linear.app/spectranoir/issue/SPE-2578) / PR #3079                                                                | Read-only mirror + Front Desk link                                                                                                                            |
| Weekly report-note surfacing                                      | **Done** — [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596) / PR #3098                                                                | Week-close notes from map deltas                                                                                                                              |
| Full SPE-2111 registry linkage                                    | **Done** — [SPE-2602](https://linear.app/spectranoir/issue/SPE-2602) / PR #3108                                                                | Authored bind map + read/compose over `visualTriggerHazardRecords`                                                                                            |
| Pursuit vector simulator integration                              | **Done** — [SPE-2604](https://linear.app/spectranoir/issue/SPE-2604) / PR #3112                                                                | Pure pursuit-vector readings over SPE-2602 linkage + SPE-2111 pursuit fields                                                                                  |
| Countermeasure ledger link                                        | **Done** — [SPE-2605](https://linear.app/spectranoir/issue/SPE-2605) / PR #3114                                                                | Pure attempt → SPE-645-style reliability-class ledger resolve/compose                                                                                         |
| Adaptation / commercialization persistence kinds                  | **Done** — [SPE-2606](https://linear.app/spectranoir/issue/SPE-2606) / PR #3116                                                                | Expand SPE-2573 kinds                                                                                                                                         |
| Media-economy continuity / persistence / compose chain            | **Done** — [SPE-2609](https://linear.app/spectranoir/issue/SPE-2609)–[SPE-2617](https://linear.app/spectranoir/issue/SPE-2617) / PR #3120–3136 | Economy weights, actors, week-close orchestration, weekly deltas                                                                                              |
| Propagation graph wire-up                                         | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965 family                                                                  | Cross-parent; carved out since SPE-2111 slice 1 — does not block SPE-947 AC                                                                                   |
| Parent umbrella Done                                              | Owner explicit acceptance                                                                                                                      | Wire-up complete ([SPE-2618](https://linear.app/spectranoir/issue/SPE-2618) reconciliation); see `planning/spe-947-parent-umbrella-reconciliation-slice-2.md` |

**Superseding reconciliation ([SPE-2618](https://linear.app/spectranoir/issue/SPE-2618) — July 2026):** After [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576)–[SPE-2617](https://linear.app/spectranoir/issue/SPE-2617), all SPE-947-owned wire-up rows above are **Done**. Canonical umbrella disposition: `planning/spe-947-parent-umbrella-reconciliation-slice-2.md`.

## Validation

Docs/hygiene only — no new domain tests. Run `verify:audits-index` / `verify:theme-contracts` only if those files move (they do not in this slice).

## See also

- `planning/spe-947-parent-ac-integration-tests-slice-1.md`
- `planning/spe-947-post-case-media-persistence-slice-1.md`
- `planning/spe-947-takedown-resistance-slice-1.md`
- `planning/spe-947-footage-exposure-traffic-slice-1.md`
- `planning/spe-947-counter-memetic-uptake-gate-slice-1.md`
- `planning/spe-947-platform-outage-degrade-slice-1.md`
- `planning/spe-947-platform-reach-multiplier-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/spe-947-parent-umbrella-reconciliation-slice-2.md`
- `planning/backlog.md`
