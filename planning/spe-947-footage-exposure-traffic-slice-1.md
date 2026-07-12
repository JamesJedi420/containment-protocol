# SPE-947 — Footage/post → civilian exposure or attraction traffic (slice 1)

One-page implementation plan. Linear: [SPE-2571](https://linear.app/spectranoir/issue/SPE-2571/footagepost-civilian-exposure-or-attraction-traffic-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) / [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) / [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2571 — Footage/post → civilian exposure or attraction traffic (slice 1)](https://linear.app/spectranoir/issue/SPE-2571/footagepost-civilian-exposure-or-attraction-traffic-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                                          |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                |
| **Branch**          | `spe-947-footage-exposure-traffic-slice-1`                                                                                                                                               |
| **Base `main` SHA** | `e46115b2`                                                                                                                                                                               |

## Goal

Satisfy SPE-947 parent AC row 2 with a pure deterministic evaluator: a footage or post artifact increases civilian exposure or attraction traffic when acting as an active spread vector, and does not amplify when serving as passive documentation / archival only, verifiable from the resulting deltas in tests.

## Prerequisite

| Shipped                      | Anchor                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Platform reach multiplier    | [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568) — AC row 1; related, not rewritten |
| Platform outage / degrade    | [SPE-2569](https://linear.app/spectranoir/issue/SPE-2569) — AC row 4; related, not composed  |
| Counter-memetic uptake gate  | [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) — AC row 3; related, not composed  |
| Visual-trigger hazard media  | SPE-2111 `HazardousMediaInstance` / `projectExposureChainRisk` — substrate only              |
| Parent AC / deferred hygiene | `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`                              |
| Pure-evaluator pattern       | `platformReachMultiplier.ts` / `counterMemeticUptakeGate.ts`                                 |

## Scope

| In                                                                     | Out                                        |
| ---------------------------------------------------------------------- | ------------------------------------------ |
| Compact artifact input + `evaluateFootageExposureTraffic`              | GameState persistence / schema / hydration |
| Active spread → positive civilian exposure / attraction-traffic deltas | Weekly orchestration / advanceWeek hooks   |
| Passive documentation / archival paths that do **not** amplify         | Store / UI / planning mirror               |
| Deterministic fallbacks for missing/invalid config                     | Full internet sim / platform node graph    |
| Focused Vitest coverage of amplify, non-amplify, and invalid fallbacks | Takedown (row 5), post-case media (row 6)  |
| Slice doc + backlog handoff line                                       | SPE-2111 registry rewrite; SPE-947 Done    |

## Evaluation contract

- Active spread: `civilianExposureDelta = exposureWeight * intensity`; `attractionTrafficDelta = attractionWeight * intensity` (default `intensity = 1` when omitted).
- `amplified` when either **raw** delta is > 0 (before micro-rounding); reason `active_spread_amplified`.
- Zero weights or zero intensity on a complete active path → `active_spread_zero_weights` (no amplification).
- `passive_documentation` / `archival` → zero deltas; reasons `passive_documentation_no_amplification` / `archival_no_amplification`.
- Missing/invalid kind, role, either weight, or intensity (including `null`) → no throw; reason codes; **zero deltas** (incomplete config never amplifies).
- Negative baselines clamp to 0; non-finite baselines fall back to 0 with reason codes.
- Finite metrics whose ×1e6 scale overflows preserve the original finite value (match platform reach helper).

## Acceptance

- [x] Domain helper exports stable artifact types and `evaluateFootageExposureTraffic`.
- [x] Active footage/post path increases civilian exposure or attraction traffic; asserted in tests.
- [x] Passive documentation / archival paths do not amplify.
- [x] Missing/invalid config returns deterministic fallbacks with reason codes.
- [x] No GameState, persistence, schema, weekly hook, store, or UI changes.
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge.
- [x] Targeted tests + lint green.

## Validation

- `npm.cmd run test:run -- src/test/footageExposureTraffic.test.ts`
- `npm.cmd run lint`
- Direct Prettier check for touched files only.

## Deferred

| Item                                       | Owner                        | Why                                  |
| ------------------------------------------ | ---------------------------- | ------------------------------------ |
| Content-owner takedown resistance          | SPE-947 follow-up child      | Parent AC row 5                      |
| Post-case media persistence                | SPE-947 follow-up / SPE-1085 | Parent AC row 6                      |
| Persistence / weekly / UI wire-up          | SPE-947 follow-up child      | This slice is domain-only foundation |
| Propagation graph wire-up                  | SPE-956 / harvest family     | Deferred since SPE-2111              |
| Compose with platform reach / uptake gates | SPE-947 follow-up child      | Keep evaluators independently pure   |

## See also

- `planning/spe-947-platform-reach-multiplier-slice-1.md`
- `planning/spe-947-platform-outage-degrade-slice-1.md`
- `planning/spe-947-counter-memetic-uptake-gate-slice-1.md`
- `planning/spe-947-spe-1046-parent-acceptance-review-slice-1.md`
- `planning/backlog.md`
