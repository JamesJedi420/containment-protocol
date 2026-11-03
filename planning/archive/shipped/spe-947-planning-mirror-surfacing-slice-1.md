# SPE-947 — Store / UI / planning-mirror surfacing for evaluators (slice 1)

One-page implementation plan. Linear: [SPE-2578](https://linear.app/spectranoir/issue/SPE-2578/store-ui-planning-mirror-surfacing-for-spe-947-evaluators-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next deferred row after shipped [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**.

| Field               | Value                                                                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2578 — Store / UI / planning-mirror surfacing for SPE-947 evaluators (slice 1)](https://linear.app/spectranoir/issue/SPE-2578/store-ui-planning-mirror-surfacing-for-spe-947-evaluators-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                                                                   |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                                                                         |
| **Branch**          | `spe-947-planning-mirror-surfacing-slice-1`                                                                                                                                                                       |
| **Base `main` SHA** | `a73a81a9`                                                                                                                                                                                                        |

## Goal

Ship a read-only planning mirror over persisted `spe947*` maps (platforms, counter-memetic plans, content owners, post-case media cases) so operators can inspect authored evaluator inputs without re-deriving domain truth in UI. Weekly tick Done ≠ umbrella Done.

## Prerequisite (on `main` @ `a73a81a9`)

| Shipped               | Anchor                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| GameState persistence | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576) — `spe947*` maps + sanitize/hydrate   |
| Weekly orchestration  | [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) — pure week-close tick                |
| Planning mirror pattern | [SPE-2338](https://linear.app/spectranoir/issue/SPE-2338) / [SPE-2489](https://linear.app/spectranoir/issue/SPE-2489) — Front Desk + ops route |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted map entries as labels; do not call SPE-2568–2573 evaluators from UI.
- **Empty state** — when platforms, plans, owners, and media-case maps are all empty after hydrate; empty ≠ parent AC met.
- **Ticked fields** — surface already-persisted weekly fields (`viewCount`, `uptimeState`, `elapsedPropagationWeeks`, `lastWeeklyTickWeek`) as labels when present.
- **Ordering** — byte-stable sort by record id within each table.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| `getSpe947EvaluatorMirrorView` + `Spe947EvaluatorMirrorPage`       | New domain evaluators                      |
| Route `/hazardous-content-propagation` + Front Desk quick link     | Propagation graph / internet simulator     |
| Focused Vitest: empty/no-op + authored platform/plan row           | Store writes from mirror                   |
| Slice doc + backlog handoff                                        | Evaluator contract changes (SPE-2568–2574) |
|                                                                    | Weekly report-note surfacing               |
|                                                                    | SPE-947 parent Done                        |

## Acceptance

- [x] Empty `spe947*` maps show empty mirror without throw or false AC claims
- [x] Authored platform and/or plan rows surface labels from persisted maps (no UI re-derivation of evaluator outcomes)
- [x] Projection is pure; mirror makes no store writes
- [x] Front Desk / ops route link matches SPE-2338 pattern
- [ ] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/features/operations/spe947EvaluatorMirrorView.test.ts src/features/operations/Spe947EvaluatorMirrorPage.test.tsx`
- `npm.cmd run lint`

## Deferred

| Item                         | Suggested owner               | Why deferred                  |
| ---------------------------- | ----------------------------- | ----------------------------- |
| Propagation graph wire-up    | SPE-956 / harvest #965 family | Deferred since SPE-2111       |
| Weekly report-note surfacing | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596) | Pure week-close notes from SPE-2577 prior/next deltas |
| Full SPE-2111 registry linkage | SPE-947 follow-up child     | Compact evaluator inputs only |
| Parent umbrella Done         | Later SPE-947 reconciliation  | Wire-up still open            |

## See also

- `planning/spe-947-weekly-orchestration-slice-1.md`
- `planning/spe-947-gamestate-persistence-slice-1.md`
- `planning/visual-trigger-hazard-registry-slice-4.md`
- `planning/backlog.md`
