# SPE-1882 — Coercive contained-person protocol planning mirror UI (slice 4)

One-page implementation plan. Linear: [SPE-2423](https://linear.app/spectranoir/issue/SPE-2423) (child under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)). Follows shipped slice 3 (`planning/coercive-contained-person-protocol-model-slice-3.md`, PR #2713 / [SPE-2422](https://linear.app/spectranoir/issue/SPE-2422)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2423 — Coercive contained-person protocol planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2423) |
| **Status** | **Ready for PR**                                                                                           |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–3 shipped)          |
| **Branch** | `spe-1882-coercive-protocol-mirror-ui-slice-4`                                                             |
| **Base `main` SHA** | `5d792229`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `coerciveContainedPersonProtocolRecords` with read-time `projectContainmentCareTradeoff` and `projectCoerciveProtocolRiskReview` display for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `5d792229`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Persistence          | `coerciveContainedPersonProtocolRecords` on `GameState` (SPE-2421)     |
| Weekly orchestration | `applyWeeklyCoerciveProtocolTick` (SPE-2422)                           |
| Sibling mirror template | `containedPersonTherapeuticCareMirrorView` (SPE-2344)               |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getCoerciveContainedPersonProtocolMirrorView` + mirror page       | New persistence fields                     |
| Route `/coercive-contained-person-protocol` + Front Desk quick link | Weekly tick / sanitize contract changes       |
| View + component tests                                             | Contradiction-check siblings (SPE-1897+)      |
| Slice doc (this file) + backlog handoff                            | Welfare-debt accounting math changes          |
| Read-time tradeoff + risk-review projections from hydrated records | SPE-1882 parent Done                            |
| Owner refs display only (byte-stable)                              | SPE-1889 health-bundle wire-up                |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation to drop entries.
- **Display guards** — `validateCoerciveProtocolRecord` surfaces warning-severity issues only; warning-only records remain visible.
- **Read-time projections** — `projectContainmentCareTradeoff` and `projectCoerciveProtocolRiskReview` at mirror build; not objective truth.
- **Empty state** — when `coerciveContainedPersonProtocolRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id; owner refs displayed as stored.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `coerciveContainedPersonProtocolRecords` map renders empty state without throw
- [x] Records table shows handling mode, tradeoff scores, and coercion-risk review projections
- [x] Abusive posture and contradiction-risk flags display distinctly
- [x] Warning-only records still shown with validation warning labels
- [x] Owner refs (medication, custody, procedure, subject-fit validation) display byte-stable
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests + slice 1–3 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` |
| UI     | `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.test.tsx` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Persisted weekly projection snapshots | SPE-1882 follow-up | Slice 3 contract; projections computed but not persisted |
| Contradiction-check sibling implementations | SPE-1897+ | Registry exposes flags only |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of mirror UI boundary |
| SPE-1889 integrated health bundle compose | SPE-1889 | Out of mirror UI boundary |
| Full SPE-1882 parent Done | SPE-1882 | Multiple slices remain |

## See also

- `planning/coercive-contained-person-protocol-model-slice-3.md`
- `planning/contained-person-therapeutic-care-registry-slice-4.md` — mirror UI template (SPE-2344)
