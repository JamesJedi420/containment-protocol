# SPE-861 — Disclosure segmented population trust (slice 3)

One-page implementation plan. Linear: child under [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — **Disclosure segmented population trust (slice 3)**. Parent [SPE-861](https://linear.app/spectranoir/issue/SPE-861) stays **Done** on Linear — full trust-to-compliance engine not in scope.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2459](https://linear.app/spectranoir/issue/SPE-2459) — Disclosure segmented population trust (slice 3) |
| **Status** | **Shipped** — PR #2818 @ `86d0956f`                                                                        |
| **Parent** | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — public trust and compliance engine (umbrella)    |
| **Branch** | `spe-861-segmented-population-trust-slice-3`                                                               |
| **Base `main` SHA** | `d45b250a`                                                                                          |

## Goal

Smallest deterministic read-side projection exposing per-population / per-channel trust divergence from existing `publicDisclosureRecords` + `projectDisclosureRegionalView` — weekly report note + Front Desk signal extension + campaign summary segment chips.

## Prerequisite (on `main` @ `d45b250a`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109)               |
| Weekly progression   | `applyWeeklyPublicDisclosureProgressionTick` in `advanceWeek` (SPE-2326) |
| Trust outcome hook   | `projectPublicDisclosureTrustOutcome` + weekly note (SPE-861 slice 2 / PR #2806) |
| Player campaign UI   | `getPublicDisclosureCampaignView` + `/campaign/public-disclosure` (SPE-861 slice 1) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `projectPublicDisclosureSegmentedTrustOutcome` domain projection   | Full SPE-861 compliance engine              |
| `buildWeeklyPublicDisclosureSegmentedTrustOutcomeReportNotes` + `advanceWeek` hook | Weekly tick / sanitize contract changes |
| Front Desk attention summary/tone extension from segmented projection | SPE-1347 contradiction engine changes |
| Campaign summary segment chips + divergence label                  | Disclosure choice mechanics (slice 4)       |
| `public_disclosure.segment_trust_divergence` report note type    | Planning mirror route changes               |
| Domain + `advanceWeek` integration tests                           | SPE-2109 registry schema changes            |
| Slice doc (this file) + backlog handoff                            | SPE-861 parent scope expansion              |

## Outcome contract

- **Read-only** — project hydrated `publicDisclosureRecords` via `projectDisclosureRegionalView`; no GameState mutation.
- **Post-tick** — weekly notes emit after disclosure progression tick compose in `advanceWeek` (same hook block as slice 2).
- **Segments** — classify `trustByRegion` refs: `population:*`, `region:*` → population; `channel:*` → channel; sort-stable by kind then ref.
- **Divergence** — two or more visible non-redacted segments with different trust bands; uniform or single-segment posture does not emit weekly note.
- **Redaction** — respect regional projection redaction; omit redacted scores from divergence math and note copy.
- **Front Desk** — append divergence summary to existing disclosure attention item; elevate tone to `warning` when divergent.
- **Empty maps** — inactive projection; no weekly note; no divergence Front Desk extension.

## Acceptance

- [x] Empty `publicDisclosureRecords` map yields inactive projection without throw
- [x] Mixed population/channel fixture projects divergent bands deterministically
- [x] Redacted `trustByRegion` excludes scores from divergence and chips
- [x] `advanceWeek` appends `public_disclosure.segment_trust_divergence` note when segments diverge
- [x] Uniform segment trust does not emit segment-divergence note
- [x] Front Desk attention summary includes divergence copy when applicable
- [x] Campaign summary surfaces segment chips + divergence label
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publicDisclosureSegmentedTrustOutcomeProjection.ts`, `src/domain/publicDisclosureSegmentedTrustOutcomeWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| View   | `src/features/operations/publicDisclosureCampaignView.ts`, `src/features/operations/frontDeskView.ts`, `src/features/operations/PublicDisclosureCampaignPage.tsx`, `src/features/report/reportNoteView.ts` |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/publicDisclosureSegmentedTrustOutcomeProjection.test.ts`, `src/test/advanceWeek.publicDisclosureSegmentedTrust.integration.test.ts`, `src/test/publicDisclosureCampaignView.test.ts`, `src/features/operations/PublicDisclosureCampaignPage.test.tsx`, `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts` |
| Plan   | `planning/disclosure-campaign-player-ui-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full public-trust / compliance outcomes engine | SPE-861 follow-up | Parent umbrella; out of smallest hook boundary |
| Disclosure choice mechanics | SPE-861 slice 4 candidate | Out of read-side projection boundary |
| Mass-anomalous population wire-up | SPE-2122 | Deferred governance integration |

## See also

- `planning/disclosure-campaign-player-ui-slice-2.md` — trust outcome projection (slice 2)
- `planning/disclosure-campaign-player-ui-slice-1.md` — player briefing UI (slice 1)
