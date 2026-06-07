# SPE-868 — Recurrent catastrophe post-incident review ref wire-up (slice 5)

One-page implementation plan. Linear: child [SPE-2370](https://linear.app/spectranoir/issue/SPE-2370) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868) / anchor [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117). Follows shipped slice 4 (`planning/recurrent-catastrophe-amelioration-registry-slice-4.md`, PR #2606).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2370 — Recurrent catastrophe post-incident review ref wire-up (slice 5)](https://linear.app/spectranoir/issue/SPE-2370) |
| **Status** | **Ready for ship**                                                                                         |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Anchor** | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) — Recurrent catastrophe amelioration registry    |
| **Branch** | `spe-868-recurrent-catastrophe-review-wire-up`                                                             |
| **Base `main` SHA** | `163b4fce`                                                                                          |

## Goal

Pure domain ref wire-up: resolve and validate `RecurrentCatastropheRecord.postIncidentReviewRefs` against a compact post-incident review registry stub — for deterministic linkage visibility, not player-facing canon or full SPE-868 retrospective engine.

## Prerequisite (on `main` @ `163b4fce`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/recurrentCatastropheAmeliorationRegistry.ts` (SPE-2117 / PR #2436) |
| Persistence          | `recurrentCatastropheRecords` on `GameState` (SPE-2363 / PR #2595)       |
| Weekly progression hook | `applyWeeklyRecurrentCatastropheTick` (SPE-2364 / PR #2597)          |
| Planning mirror UI | `getRecurrentCatastropheMirrorView` (SPE-2369 / PR #2606)              |
| Sibling wire-up template | `informationIntakeNamingHazardCrossLink` (SPE-2358), health-bundle link derive (SPE-2345) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `postIncidentReviewRegistry.ts` stub schema + fixtures             | GameState persistence for review records      |
| `recurrentCatastrophePostIncidentReviewLinks.ts` validate/resolve/compose | Slice 1–4 validation/sanitize/hydration changes |
| Targeted domain tests                                              | Mirror UI changes                             |
| Slice doc (this file) + backlog handoff on ship                    | Weekly tick / advanceWeek hook changes        |
| Franchise token scan on review descriptors and review refs         | SPE-1310 case lifecycle transitions           |

## Wire-up contract

- **Hydrated truth only** — resolve from persisted recurrent catastrophe records and supplied review registry map; skip invalid review entries without re-surfacing dropped payloads.
- **Warnings-only registry gaps** — missing review refs and recurrence without review refs emit warnings, not errors (slice 1–4 sanitize unchanged).
- **Projection legibility** — review summary projection respects `redactedFields` / `unknownFields`; no hidden dossier truth.
- **Ordering** — links sorted by review ref within each catastrophe record; compose map keyed by catastrophe record id.
- **Copy** — CP-neutral labels; no franchise tokens in descriptors or refs.

## Acceptance

- [x] Empty `postIncidentReviewRefs` lists validate without throw
- [x] `RECURRENCE_DAMAGE_LEDGER_FIXTURE` resolves `review:cycle-3-closeout` from stub registry
- [x] Missing review refs emit warning-only issues
- [x] Recurrence without review refs emits warning (parallel to damage-ledger warning)
- [x] Franchise token in review ref or review descriptor emits error
- [x] Slice 1–4 recurrent catastrophe regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewRegistry.ts`, `src/domain/recurrentCatastrophePostIncidentReviewLinks.ts` |
| Tests  | `src/test/postIncidentReviewRegistry.test.ts`, `src/test/recurrentCatastrophePostIncidentReviewLinks.test.ts` |
| Plan   | `planning/recurrent-catastrophe-amelioration-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 follow-up | Out of review ref wire-up boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Case lifecycle transitions on compliance breach | SPE-1310 | Domain ref wire-up only in slice 5 |
| Full SPE-868 retrospective engine | SPE-868 | Stub registry only; parent stays open |

## See also

- `planning/recurrent-catastrophe-amelioration-registry-slice-4.md`
- `planning/mass-anomalous-population-emergence-registry-slice-5.md` — derive + compose wire-up template (SPE-2335)
