# SPE-868 — Post-incident review mirror linked-review columns (slice 6)

One-page implementation plan. Linear: child [SPE-2375](https://linear.app/spectranoir/issue/SPE-2375) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 5 (`planning/post-incident-review-registry-slice-5.md`, PR #2616 / [SPE-2374](https://linear.app/spectranoir/issue/SPE-2374)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2375 — Post-incident review mirror linked-review columns (slice 6)](https://linear.app/spectranoir/issue/SPE-2375) |
| **Status** | **Shipped** — PR #2618 @ `46986368`                                                                        |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-post-incident-review-mirror-links-slice-6`                                                        |
| **Base `main` SHA** | `4ffab94a`                                                                                          |

## Goal

Extend `RecurrentCatastropheMirrorPage` to display composed link summaries from `getRecurrentCatastrophePostIncidentReviewLinksView` — review route, closure outcome, and unresolved review refs — using the link-group column pattern from SPE-2347.

## Prerequisite (on `main` @ `4ffab94a`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Compose wire-up      | `getRecurrentCatastrophePostIncidentReviewLinksView` (SPE-2374 / PR #2616) |
| Catastrophe mirror   | `RecurrentCatastropheMirrorPage` + `recurrentCatastropheMirrorView` (SPE-2369) |
| Link-group column pattern | `ContainedPersonIntegratedHealthBundleMirrorPage` (SPE-2347)      |

## Mirror UI contract

| Rule | Detail |
| --- | --- |
| **Links view source** | `getRecurrentCatastrophePostIncidentReviewLinksView(game)` — read-only compose over hydrated maps |
| **Join key** | `linksView.records[].recordId` ↔ `view.records[].id` |
| **Link column** | Per-link group: review ref, route, closure outcome; redacted suffix when `link.redacted` |
| **Unresolved refs** | Amber warning line when refs fail to resolve; no re-sanitize of dropped hydrated entries |
| **Summary stats** | `totalLinkedReviews`, `totalUnresolvedReviewRefs` from links view summary |
| **Empty link groups** | Em dash in column when no resolved links |
| **Ordering** | Inherited byte-stable ordering from links view compose |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Wire links view into `RecurrentCatastropheMirrorPage`              | Domain link API changes                       |
| Summary stat cards + linked-review table column                    | Weekly orchestration / `advanceWeek` changes  |
| Copy strings in `RECURRENT_CATASTROPHE_MIRROR_UI_TEXT`             | New persistence fields                        |
| Component tests + links view regression                            | Post-incident review mirror page changes      |
| Slice doc (this file) + backlog handoff on ship                    | SPE-1310 lifecycle / full retrospective engine |

## Acceptance

- [x] Empty catastrophe map renders empty links column without throw
- [x] `RECURRENCE_DAMAGE_LEDGER_FIXTURE` shows resolved route + closure in linked-review column
- [x] Missing review refs surface unresolved ref labels in column
- [x] Summary stat cards show linked review and unresolved ref counts
- [x] Redacted projection fields render as `—` via view formatters; redacted suffix when flagged
- [x] Slice 5 compose + mirror regressions green
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| UI     | `src/features/operations/RecurrentCatastropheMirrorPage.tsx`, `src/data/copy.ts` |
| Tests  | `src/features/operations/RecurrentCatastropheMirrorPage.test.tsx`     |
| Plan   | `planning/post-incident-review-registry-slice-6.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of mirror UI boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Mirror UI slice only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-5.md`
- `planning/contained-person-integrated-health-bundle-slice-7.md` — link-group column pattern (SPE-2347)
