# SPE-947 — Platform reach multiplier from view count (slice 1)

One-page implementation plan. Linear: [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568/platform-reach-multiplier-from-view-count-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows grooming closure in `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`; [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2568 — Platform reach multiplier from view count (slice 1)](https://linear.app/spectranoir/issue/SPE-2568/platform-reach-multiplier-from-view-count-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                   |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                         |
| **Branch**          | `spe-947-platform-reach-multiplier-slice-1`                                                                                                                       |
| **Base `main` SHA** | `4a87042b`                                                                                                                                                        |

## Goal

Satisfy SPE-947 parent AC row 1 with a pure deterministic evaluator: an in-world platform node multiplies an anomaly's reach value by a configured factor that scales with view count, verifiable from the resulting reach value in tests.

## Prerequisite

| Shipped                        | Anchor                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| Visual-trigger hazard registry | SPE-2111 slices 1–5 — substrate only; **not** parent AC         |
| Parent AC / deferred hygiene   | `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md` |
| Pure-evaluator pattern         | e.g. `entityWelfareStatusPermissions.ts` under SPE-1046         |

## Scope

| In                                                                | Out                                            |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| Compact `PlatformReachNode` + `evaluatePlatformReachMultiplier`   | GameState persistence / schema / hydration     |
| Linear view-scale: `multiplier = reachFactor * (1 + views/unit)`  | Weekly orchestration / advanceWeek hooks       |
| Deterministic fallbacks for zero views and missing/invalid config | Store / UI / planning mirror                   |
| Focused Vitest coverage of scaled reach values                    | Full internet sim / platform outage model      |
| Slice doc + backlog handoff line                                  | Counter-memetic pipeline / takedown resistance |
|                                                                   | SPE-947 parent Done                            |

## Evaluation contract

- `viewScale = viewCount / viewsPerScaleUnit` when config is valid.
- `multiplier = reachFactor * (1 + viewScale)`.
- `reachValue = anomalyReach * multiplier` (default `anomalyReach = 1`).
- Zero views → base factor only (`zero_views_base_factor_only`), including incomplete-config paths.
- Missing platform / invalid factor / invalid views-per-scale-unit → no throw; reason codes; invalid factor disables view amplification; invalid scale keeps a valid base factor only.
- Negative view counts clamp to 0; invalid (non-finite / negative) anomaly reach falls back to 1; `anomalyReach: 0` is valid.
- Non-finite intermediates clamp to 0 with `non_finite_reach_clamped`.

## Acceptance

- [x] Domain helper exports stable platform-node types and `evaluatePlatformReachMultiplier`.
- [x] Configured factor scales reach with view count; resulting `reachValue` asserted in tests.
- [x] Zero views and missing/invalid config return deterministic fallbacks with reason codes.
- [x] No GameState, persistence, schema, weekly hook, store, or UI changes.
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge.
- [x] Targeted tests + lint green.

## Validation

- `npm.cmd run test:run -- src/test/platformReachMultiplier.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                                 | Owner                        | Why                                      |
| ---------------------------------------------------- | ---------------------------- | ---------------------------------------- |
| Platform uptime / outage / audience graph            | SPE-947 follow-up child      | Parent AC row 4 / broader platform model |
| Counter-memetic lore + distributor + uptake          | SPE-947 follow-up child      | Parent AC row 3                          |
| Content-owner takedown resistance                    | SPE-947 follow-up child      | Parent AC row 5                          |
| Post-case media persistence                          | SPE-947 follow-up / SPE-1085 | Parent AC row 6                          |
| Persistence / weekly / UI wire-up for platform nodes | SPE-947 follow-up child      | This slice is domain-only foundation     |
| Propagation graph wire-up                            | SPE-956 / harvest family     | Deferred since SPE-2111                  |

## See also

- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/visual-trigger-hazard-registry-slice-1.md`
- `planning/spe-1046-status-class-permission-sets-slice-1.md`
- `planning/backlog.md`
