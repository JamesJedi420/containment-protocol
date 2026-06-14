# SPE-861 — Disclosure choice mechanics (slice 4)

One-page implementation plan. Linear: child under [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — **Disclosure choice mechanics (slice 4)** (create/claim on start). Parent [SPE-861](https://linear.app/spectranoir/issue/SPE-861) stays **Done** — full trust-to-compliance engine not in scope.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-861 child — Disclosure choice mechanics (slice 4)                                                    |
| **Status** | Ready for PR                                                                                               |
| **Parent** | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — public trust and compliance engine (umbrella)    |
| **Branch** | `spe-861-disclosure-choice-mechanics-slice-4`                                                            |
| **Base `main` SHA** | `ad173090`                                                                                          |

## Goal

Smallest deterministic write-side hook that lets the player set disclosure posture choices on active campaigns and see downstream cooperation / segment-trust effects through existing trust-outcome projections — no full SPE-861 compliance engine.

## Prerequisite (on `main` @ `ad173090`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109)               |
| Weekly progression   | `applyWeeklyPublicDisclosureProgressionTick` in `advanceWeek` (SPE-2326) |
| Trust outcome hook   | `projectPublicDisclosureTrustOutcome` + weekly note (SPE-861 slice 2) |
| Segmented trust hook | `projectPublicDisclosureSegmentedTrustOutcome` (SPE-861 slice 3)     |
| Player campaign UI   | `getPublicDisclosureCampaignView` + `/campaign/public-disclosure` (SPE-861 slice 1) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publicDisclosurePostureChoices` on `GameState` + sanitize         | Full SPE-861 compliance engine              |
| `applyPublicDisclosurePostureChoice` domain command                | SPE-2109 registry schema / sanitize changes |
| Posture trust adjustment at projection time (no record mutation)   | Weekly tick contract changes                |
| Campaign posture choice UI + store action                          | Planning mirror route changes               |
| `advanceWeek` trust-outcome notes honor posture choices            | SPE-861 parent scope expansion              |
| Domain + integration + campaign view/page tests                    | Raw trust score surfacing in choice UI      |
| Slice doc (this file) + backlog handoff                            | Authored-choice flag orchestration          |

## Outcome contract

- **Write-side choice state** — `publicDisclosurePostureChoices` keyed by disclosure record id; hydrate drops orphan ids and invalid postures.
- **Projection-only trust delta** — `transparent` (+0.10), `managed_secrecy` (0), `restrictive` (−0.10) applied when projecting cooperation/segment trust; persisted `trustByRegion` unchanged.
- **Active campaigns only** — choices available when `awarenessLevel !== 'secrecy_intact'`; empty/no-active-campaign states stay inactive.
- **Redaction** — choice UI shows band labels only; no raw trust scores or redacted score reveal.
- **Determinism** — sort-stable record iteration; idempotent re-selection; slice 2–3 projection tests unchanged without posture input.
- **Front Desk** — attention summary/tone continues via `projectPublicDisclosureTrustOutcomeFromGame` with posture choices.

## Acceptance

- [x] Empty `publicDisclosureRecords` map yields inactive posture UI without throw
- [x] Active campaign exposes three posture options and persists selection
- [x] Transparent posture shifts opposed fixture to watchful cooperation band
- [x] Restrictive posture preserves or deepens opposed posture on low-trust fixture
- [x] `advanceWeek` trust-outcome note metadata reflects posture-adjusted cooperation band
- [x] Persisted registry records unchanged after posture selection
- [x] Front Desk attention regression green
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publicDisclosurePostureChoice.ts`, `src/domain/publicDisclosureTrustOutcomeProjection.ts`, `src/domain/publicDisclosureSegmentedTrustOutcomeProjection.ts`, `src/domain/publicDisclosureTrustOutcomeWeeklyReportNotes.ts`, `src/domain/publicDisclosureSegmentedTrustOutcomeWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/gameStore.ts`, `src/app/store/runTransfer.ts`          |
| View   | `src/features/operations/publicDisclosureCampaignView.ts`, `src/features/operations/PublicDisclosureCampaignPage.tsx` |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/publicDisclosurePostureChoice.test.ts`, `src/test/advanceWeek.publicDisclosurePostureChoice.integration.test.ts`, `src/test/publicDisclosureCampaignView.test.ts`, `src/features/operations/PublicDisclosureCampaignPage.test.tsx` |
| Plan   | `planning/disclosure-campaign-player-ui-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full public-trust / compliance outcomes engine | SPE-861 follow-up | Parent umbrella; out of smallest hook boundary |
| Authored-choice / Front Desk notice orchestration for posture | SPE-861 follow-up | Campaign surface sufficient for slice 4 |
| Mass-anomalous population wire-up | SPE-2122 | Deferred governance integration |

## See also

- `planning/disclosure-campaign-player-ui-slice-3.md` — segmented trust projection (slice 3)
- `planning/disclosure-campaign-player-ui-slice-2.md` — trust outcome projection (slice 2)
- `planning/disclosure-campaign-player-ui-slice-1.md` — player briefing UI (slice 1)
