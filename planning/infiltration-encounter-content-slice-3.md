# Infiltration encounter/content slice 3 (optional report copy depth)

One-page implementation plan. Linear: [SPE-2305](https://linear.app/spectranoir/issue/SPE-2305) (child under [SPE-2250](https://linear.app/spectranoir/issue/SPE-2250)). Follows shipped template stacks in slices 1–2 and report-copy module from SPE-2250.

| Field      | Value                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2305 — Infiltration encounter content slice 3](https://linear.app/spectranoir/issue/SPE-2305) |
| **Parent** | [SPE-2250](https://linear.app/spectranoir/issue/SPE-2250)                                            |
| **Branch** | `jamesdyedbq/spe-2305-infiltration-encounter-content-slice-3-report-copy-depth`                      |
| **Status** | Shipped — SPE-2305 / PR #2473                                                                        |

## Goal

Deepen **player-facing weekly infiltration report copy** with deterministic encounter flavor — probe-action operational detail, stage observer pressure, and cover-role friction — without new probe mechanics or template migrations.

## Prerequisite (on `main`)

| Shipped | Anchor |
| ------- | ------ |
| Batch-4 template stacks | `planning/infiltration-encounter-content-slice-1.md`, slice 2 |
| Report copy module | `src/domain/infiltrationEncounterReportNotes.ts` |
| Weekly wire-up | `advanceWeek` → `infiltration.weekly_encounter`, threshold enrich |

## Gap (pre-slice)

- Weekly summaries list prep action and tracks but lack operational encounter detail.
- Threshold enrichments prefix prep context only; no stage or cover-role observer flavor.
- Cover roles appear as labels without situational friction copy.

## Scope (this slice)

| In | Out |
| -- | --- |
| Probe-action encounter detail lines (`probe_access` / `probe_route` / `cleanup`) | New probe track mechanics |
| Stage observer clauses for `exposed` and `violent` | Template catalog migrations |
| Cover-role observer friction when `claimedRole` is set | Case prep UI changes |
| Wire into weekly + threshold formatters | `infiltrationProbe.ts` threshold math |
| Unit + `advanceWeek` integration tests | Mission triage layout |

## Copy contract (deterministic)

### Probe-action encounter detail

One sentence per `InfiltrationProbeAction`, appended after the prep clause in weekly summaries and threshold enrichments.

### Stage observer pressure

- `probing`: no extra clause (track line suffices).
- `exposed`: observers treat cover as doubtful.
- `violent`: site security shifts toward force response.

### Cover-role friction

When `coverRole` is set, one role-specific observer-friction sentence after the cover posture clause.

## Acceptance

- [x] Weekly summary includes probe-action detail and cover-role friction when applicable.
- [x] Exposed/violent stages add observer pressure clause in weekly and enriched threshold notes.
- [x] Existing SPE-2250 substrings preserved; targeted tests green.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Encounter detail** — per-action copy + formatter.
2. **Stage observer** — exposed/violent clauses only.
3. **Cover friction** — per-role copy when role present.
4. **Weekly summary compose** — wire clauses in stable order.
5. **Threshold enrich** — same flavor in enriched threshold path.
6. **`advanceWeek`** — one integration assertion for new copy in `infiltration.weekly_encounter`.

## File touch list (expected)

| Area | Files |
| ---- | ----- |
| Report copy | `src/domain/infiltrationEncounterReportNotes.ts` |
| Tests | `src/test/infiltrationEncounterReportNotes.test.ts`, `src/test/infiltrationEncounterReportCopy.test.ts` |
| Docs | `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Additional template probe/cover stacks | SPE-2250 follow-up | Out of slice 3 copy-only boundary |
| Case prep UI encounter summaries | [SPE-2308](https://linear.app/spectranoir/issue/SPE-2308) | Shipped in prep encounter preview slice |

## See also

- `planning/infiltration-encounter-content-slice-2.md`
- `src/domain/infiltrationEncounterReportNotes.ts`
