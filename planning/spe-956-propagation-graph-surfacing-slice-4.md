# SPE-956 — Propagation graph store / UI / mirror surfacing (slice 4)

One-page implementation plan. Linear: [SPE-2626](https://linear.app/spectranoir/issue/SPE-2626) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped slice 3 ([SPE-2624](https://linear.app/spectranoir/issue/SPE-2624), PR #3147) and hydration fix ([SPE-2622](https://linear.app/spectranoir/issue/SPE-2622), PR #3149).

| Field               | Value                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2626 — Store / UI / planning-mirror surfacing for SPE-956 propagation graphs (slice 4)](https://linear.app/spectranoir/issue/SPE-2626) |
| **Status**          | **In Progress**                                                                                            |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — **Done**                                |
| **Branch**          | `spe-956-propagation-graph-surfacing-slice-4`                                                                |
| **Base `main` SHA** | `223ae71d`                                                                                                 |

## Goal

Ship a read-only planning mirror over persisted `spe956PropagationGraphRecords` so operators can inspect authored graph structure and week-close orchestration fields without re-deriving compose/evaluator truth in UI. Sibling slice deferred from persistence slices 1–3.

## Prerequisite (on `main` @ `223ae71d`)

| Shipped                         | Anchor                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Pure graph compose              | [SPE-2619](https://linear.app/spectranoir/issue/SPE-2619) — `spe956PropagationGraph.ts`         |
| GameState persistence           | [SPE-2621](https://linear.app/spectranoir/issue/SPE-2621) — `spe956PropagationGraphPersistence.ts` |
| Week-close tick                 | [SPE-2624](https://linear.app/spectranoir/issue/SPE-2624) — `spe956PropagationGraphWeeklyOrchestration.ts` |
| Hydration fix                   | [SPE-2622](https://linear.app/spectranoir/issue/SPE-2622) — explicit `{}` + unsafe key rejection |
| Mirror pattern                  | [SPE-2578](https://linear.app/spectranoir/issue/SPE-2578) — SPE-947 evaluator mirror           |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted graph records as labels; do not call `composeSpe956PropagationGraph` or SPE-947 evaluators from UI.
- **Empty state** — when `spe956PropagationGraphRecords` is `{}` after hydrate; empty ≠ parent AC met.
- **Ticked fields** — surface already-persisted weekly fields (`elapsedPropagationWeeks`, `weeklyElapsedWeeksDelta`, `lastWeeklyTickWeek`) as labels when present.
- **Ordering** — byte-stable sort by record id within each table.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| `getSpe956PropagationGraphMirrorView` + `Spe956PropagationGraphMirrorPage` | Compose semantic changes          |
| Route `/propagation-graph` + Front Desk quick link                 | Week-close tick logic changes              |
| Focused Vitest: empty/no-op + authored graph row + hydrate round-trip | SPE-2568–2574 / SPE-2617 contract edits |
| Slice doc + backlog handoff                                        | SPE-956 parent AC (advisory/hotline)       |
|                                                                    | Store writes from mirror                   |

## Acceptance

- [x] Empty `{}` graph records map shows empty mirror without throw or false AC claims
- [x] Authored graph rows surface persisted structure + weekly fields as labels only
- [x] Projection is pure; mirror makes no store writes
- [x] Front Desk / ops route link matches SPE-2578 pattern
- [x] Hydrate round-trip preserves surfaced graph records
- [x] `npm run lint` + targeted tests green

## Deferred

| Item                              | Suggested owner | Why deferred              |
| --------------------------------- | --------------- | ------------------------- |
| Weekly report-note surfacing      | SPE-956 sibling | Out of slice 4 boundary   |
| Compose aggregate surfacing in UI | SPE-956 sibling | Would leak evaluator truth |
| SPE-956 parent AC (advisory/hotline) | SPE-956 siblings | Separate umbrella scope |

## Validation

- `npm.cmd run test:run -- src/features/operations/spe956PropagationGraphMirrorView.test.ts src/features/operations/Spe956PropagationGraphMirrorPage.test.tsx`
- `npm.cmd run lint`

## See also

- `planning/spe-956-propagation-graph-week-close-slice-3.md`
- `planning/spe-947-planning-mirror-surfacing-slice-1.md`
- `SCHEMA_REGISTRY.md` — SPE-956 propagation graph persistence section
