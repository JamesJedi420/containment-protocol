# SPE-2117 — Recurrent catastrophe amelioration registry planning mirror UI (slice 4)

One-page implementation plan. Linear: child [SPE-2369](https://linear.app/spectranoir/issue/SPE-2369) under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) / anchor [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117). Follows shipped slice 3 (`planning/recurrent-catastrophe-amelioration-registry-slice-3.md`, PR #2597).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2369 — Recurrent catastrophe amelioration registry planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2369) |
| **Status** | **Shipped** — PR #2606 @ `7f31d0f0`                                                                        |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Case / facility lifecycle (stays open)         |
| **Anchor** | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) — Recurrent catastrophe amelioration registry    |
| **Branch** | `spe-2117-recurrent-catastrophe-mirror-ui-slice-4`                                                         |
| **Base `main` SHA** | `4ef0c135`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `recurrentCatastropheRecords` and `projectNextRecurrenceRisk` projection — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `4ef0c135`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/recurrentCatastropheAmeliorationRegistry.ts` (SPE-2117 / PR #2436) |
| Persistence          | `recurrentCatastropheRecords` on `GameState` (SPE-2363 / PR #2595)       |
| Weekly progression hook | `applyWeeklyRecurrentCatastropheTick` (SPE-2364 / PR #2597)          |
| Sibling mirror template | `ruleDocumentComplianceMirrorView` (SPE-2368), `publicDisclosureMirrorView` (SPE-2331) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getRecurrentCatastropheMirrorView` + `RecurrentCatastropheMirrorPage` | New persistence fields                     |
| Route `/recurrent-catastrophe-amelioration` + Front Desk quick link | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-1310 parent closure                       |
| Slice doc (this file) + backlog handoff on ship                    | Re-validation of hidden/dropped records       |
| Severity band + risk score display from `projectNextRecurrenceRisk` at `game.week` | SPE-868 post-incident review wire-up |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Projection at current week** — `projectNextRecurrenceRisk(record, { currentWeek: game.week })`; display-only, no tick mutation.
- **Legibility gaps** — redacted or unknown projection fields render as `—`, not hidden truth.
- **Validation warnings** — warnings-only records (e.g. `recurrence_without_damage_ledger`) surface warning detail labels.
- **Prevention ceiling** — `preventionCeiling: impossible` posture visible in summary and record rows.
- **Empty state** — when `recurrentCatastropheRecords` map is empty after hydrate.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `recurrentCatastropheRecords` map renders empty state without throw
- [x] Records table shows cadence, failure mode, prevention ceiling, recurrence history, severity band, and risk score from persisted fields + projection
- [x] Redacted/unknown projection fields render as legibility gaps
- [x] Warnings-only records display validation warnings
- [x] Impossible prevention ceiling records visible in summary and rows
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests + slice 1–3 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/recurrentCatastropheMirrorView.ts`         |
| UI     | `src/features/operations/RecurrentCatastropheMirrorPage.tsx`        |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/recurrentCatastropheMirrorView.test.ts`, `src/features/operations/RecurrentCatastropheMirrorPage.test.tsx` |
| Plan   | `planning/recurrent-catastrophe-amelioration-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 follow-up | Out of mirror UI boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Case lifecycle transitions on compliance breach | SPE-1310 | Mirror display only in slice 4 |

## See also

- `planning/recurrent-catastrophe-amelioration-registry-slice-3.md`
- `planning/rule-document-compliance-containment-registry-slice-4.md` — sibling mirror UI template (SPE-2368)
- `planning/public-disclosure-state-registry-slice-4.md` — mirror UI template (SPE-2331)
