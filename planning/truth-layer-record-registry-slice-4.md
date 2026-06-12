# SPE-1343 — Truth-layer record registry planning mirror UI (slice 4)

One-page implementation plan. Linear: child under [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343). Follows shipped slice 3 (`planning/truth-layer-record-registry-slice-3.md`, PR #2776).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | Truth-layer record registry planning mirror UI (slice 4) — child under SPE-1343                            |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Public myth / operational truth split          |
| **Branch** | `spe-1343-truth-layer-record-registry-slice-4`                                                           |
| **Base `main` SHA** | `86e0bd4d`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `truthLayerRecords` and `truthLayerWeeklyProjectionSnapshots` — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `86e0bd4d`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/truthLayerRecordRegistry.ts` (SPE-2447 / PR #2772)         |
| Persistence          | `truthLayerRecords` on `GameState` (SPE-2448 / PR #2774)               |
| Weekly orchestration | `applyWeeklyTruthLayerTick` (SPE-2449 / PR #2776)                      |
| Sibling mirror template | `PublicDisclosureMirrorPage` (SPE-2331 / PR #2529)                  |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getTruthLayerMirrorView` + `TruthLayerMirrorPage`               | New persistence fields                     |
| Route `/truth-layer-records` + Front Desk quick link               | Weekly tick / sanitize contract changes       |
| Separate claim/doctrine/verification review slot display           | SPE-1343 parent status changes               |
| Ops flags + weekly snapshot column from persisted snapshots        | PublicDisclosureRecord extensions             |
| View + component tests                                             | Mission triage expansion                      |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Separate layers** — claim, doctrine, and verification stay distinct in display; no collapsed objective truth column.
- **Ops flags** — `mythInfrastructureActive` and `correctionPressure` from review projection; weekly snapshot column from persisted `truthLayerWeeklyProjectionSnapshots`.
- **Empty state** — when `truthLayerRecords` map is empty after hydrate.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `truthLayerRecords` map renders empty state without throw
- [x] Records table shows separate claim, doctrine, and verification slots from `projectTruthLayerReviewView`
- [x] Ops flags and weekly snapshot display persisted projection without collapsing layers
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/truthLayerMirrorView.ts`                     |
| UI     | `src/features/operations/TruthLayerMirrorPage.tsx`                    |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/truthLayerMirrorView.test.ts`, `src/features/operations/TruthLayerMirrorPage.test.tsx` |
| Plan   | `planning/truth-layer-record-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cover narrative dual-incident pairing | SPE-899 / SPE-1347 | Parent AC row 4 partial |
| Historical-icon normalcy pressure surfaces | SPE-1343 follow-up | Parent AC row 5 |
| Disclosure campaign player UI | SPE-861 | Out of registry mirror boundary |

## See also

- `planning/truth-layer-record-registry-slice-3.md`
- `planning/public-disclosure-state-registry-slice-4.md` — mirror UI template (SPE-2331)
