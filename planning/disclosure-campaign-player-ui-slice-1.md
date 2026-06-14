# SPE-861 — Disclosure campaign player UI (slice 1)

One-page implementation plan. Linear: child under [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — **Disclosure campaign player UI (slice 1)** (create/claim on start). Parent [SPE-861](https://linear.app/spectranoir/issue/SPE-861) stays **Backlog** — full trust-to-compliance engine not in scope.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-861 child — Disclosure campaign player UI (slice 1)                                                    |
| **Status** | **Shipped** — PR #2805 @ `517b1824`                                                                        |
| **Parent** | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — public trust and compliance engine (umbrella)    |
| **Branch** | `spe-861-disclosure-campaign-player-ui-slice-1`                                                            |
| **Base `main` SHA** | `5aed7be3`                                                                                          |

## Goal

Player-facing disclosure progression UI wired to existing `publicDisclosureRecords` and `projectDisclosureRegionalView` projections — institutional briefing tone, read-only, no weekly tick or cover-story orchestration changes.

## Prerequisite (on `main` @ `5aed7be3`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109)               |
| Persistence          | `publicDisclosureRecords` on `GameState` (SPE-2325)                   |
| Weekly progression   | `applyWeeklyPublicDisclosureProgressionTick` in `advanceWeek` (SPE-2326) |
| Planning mirror UI   | `getPublicDisclosureMirrorView` + `/public-disclosure-state` (SPE-2331) |
| Cover-narrative pairing | `resolveTruthLayerDualIncidentPairing` (SPE-1343)                   |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getPublicDisclosureCampaignView` player projection              | Weekly tick / sanitize contract changes       |
| `PublicDisclosureCampaignPage` + route `/campaign/public-disclosure` | SPE-1347 registry / contradiction engine   |
| Front Desk attention segment + conditional quick link              | Planning mirror route / copy changes        |
| `PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT` in `copy.ts`                  | SPE-861 parent Done                           |
| View + component tests (no store mutation)                         | Trust-to-compliance outcomes engine         |
| Slice doc (this file) + backlog handoff                            | Segmented population scores / choice mechanics |

## Player contract

- **Read-only** — no mutations to GameState from the campaign surface.
- **Hydrated truth only** — display persisted records; do not re-validate dropped entries.
- **Redaction policy** — respect `redactedFields`, confidence suppression, and unknown fields; no raw internal refs or operational truth-layer slots.
- **Cover context** — optional linked cover-narrative label via `linkedDisclosureRecord`; omit operational record text and contradiction channel scores.
- **Empty state** — institutional empty copy when `publicDisclosureRecords` map is empty.
- **Mirror separation** — `/public-disclosure-state` planning mirror unchanged; player route uses campaign/briefing copy.

## Acceptance

- [x] Empty `publicDisclosureRecords` map renders empty state without throw
- [x] Progression fixture displays institutional awareness/fallout and regional trust bands
- [x] Redacted summary/confidence suppressed in player copy
- [x] Front Desk attention item + quick link when records non-empty
- [x] `publicDisclosureMirrorView.test.ts` unchanged / regression green
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/publicDisclosureCampaignView.ts`             |
| UI     | `src/features/operations/PublicDisclosureCampaignPage.tsx`            |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/publicDisclosureCampaignView.test.ts`, `src/features/operations/PublicDisclosureCampaignPage.test.tsx` |
| Plan   | `planning/disclosure-campaign-player-ui-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Public-trust / compliance outcomes engine | SPE-861 | Parent umbrella; out of player UI slice 1 |
| Segmented population trust scores | SPE-861 | Deferred to later SPE-861 children |
| Disclosure choice mechanics | SPE-861 | Out of read-only surfacing boundary |
| Mass-anomalous population wire-up | SPE-2122 | Deferred governance integration |

## See also

- `planning/public-disclosure-state-registry-slice-4.md` — planning mirror template (SPE-2331)
- `planning/truth-layer-cover-narrative-pairing-slice-1.md` — optional cover-narrative context
