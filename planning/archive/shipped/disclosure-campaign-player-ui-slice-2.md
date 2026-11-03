# SPE-861 — Disclosure campaign public-trust outcome projection (slice 2)

One-page implementation plan. Linear: child under [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — **Disclosure campaign public-trust outcome projection (slice 2)** (create/claim on start). Parent [SPE-861](https://linear.app/spectranoir/issue/SPE-861) stays **Done** on Linear — full trust-to-compliance engine not in scope.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-861 child — Disclosure campaign public-trust outcome projection (slice 2)                            |
| **Status** | **Shipped** — PR #2806 @ `47e3e652`                                                                        |
| **Parent** | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — public trust and compliance engine (umbrella)    |
| **Branch** | `spe-861-disclosure-campaign-trust-outcomes-slice-2`                                                       |
| **Base `main` SHA** | `256a156e`                                                                                          |

## Goal

Smallest deterministic trust-outcome hook reading post-tick `publicDisclosureRecords` — compliance/cooperation band projection, weekly report note, and Front Desk signal wired from a single domain read-side module.

## Prerequisite (on `main` @ `256a156e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109)               |
| Weekly progression   | `applyWeeklyPublicDisclosureProgressionTick` in `advanceWeek` (SPE-2326) |
| Player campaign UI   | `getPublicDisclosureCampaignView` + `/campaign/public-disclosure` (SPE-861 slice 1 / PR #2805) |
| Planning mirror UI   | `getPublicDisclosureMirrorView` + `/public-disclosure-state` (SPE-2331) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `projectPublicDisclosureTrustOutcome` domain projection            | Full SPE-861 compliance engine              |
| `buildWeeklyPublicDisclosureTrustOutcomeReportNotes` + `advanceWeek` hook | Weekly tick / sanitize contract changes |
| Front Desk attention from domain projection                        | SPE-1347 contradiction engine changes       |
| Campaign summary `cooperationBandLabel` surfacing                  | Disclosure choice mechanics                   |
| `public_disclosure.trust_outcome` report note type                 | Planning mirror route changes               |
| Domain + `advanceWeek` integration tests                           | Segmented population trust scores           |
| Slice doc (this file) + backlog handoff                            | SPE-861 parent scope expansion              |

## Outcome contract

- **Read-only** — project hydrated `publicDisclosureRecords`; no GameState mutation from projection.
- **Post-tick** — weekly notes emit after disclosure progression tick and normalization compose in `advanceWeek`.
- **Bands** — dominant awareness level, aggregate regional trust band (minimum non-redacted score), cooperation band (`aligned` / `watchful` / `opposed` / `inactive`).
- **Redaction** — respect `projectDisclosureRegionalView` redaction; omit redacted trust scores from aggregate band.
- **Front Desk** — attention item tone/summary from domain projection; no duplicate campaign-view band logic.
- **Empty maps** — inactive cooperation band; no weekly note; no Front Desk attention item.

## Acceptance

- [x] Empty `publicDisclosureRecords` map yields inactive projection without throw
- [x] `DISCLOSURE_PROGRESSION_FIXTURE` projects opposed cooperation + low regional trust
- [x] `NORMALIZATION_INPUT_FIXTURE` projects aligned cooperation + moderate regional trust
- [x] `advanceWeek` appends `public_disclosure.trust_outcome` note when active campaigns exist
- [x] Front Desk attention uses domain projection summary/tone
- [x] Campaign summary surfaces cooperation band label
- [x] `publicDisclosureMirrorView.test.ts` unchanged / regression green
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publicDisclosureTrustOutcomeProjection.ts`, `src/domain/publicDisclosureTrustOutcomeWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| View   | `src/features/operations/publicDisclosureCampaignView.ts`, `src/features/operations/frontDeskView.ts`, `src/features/operations/PublicDisclosureCampaignPage.tsx`, `src/features/report/reportNoteView.ts` |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/publicDisclosureTrustOutcomeProjection.test.ts`, `src/test/advanceWeek.publicDisclosureTrustOutcome.integration.test.ts`, `src/test/publicDisclosureCampaignView.test.ts`, `src/features/operations/PublicDisclosureCampaignPage.test.tsx`, `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts` |
| Plan   | `planning/disclosure-campaign-player-ui-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full public-trust / compliance outcomes engine | SPE-861 follow-up | Parent umbrella; out of smallest hook boundary |
| Segmented population trust scores | SPE-861 | Deferred to later SPE-861 children |
| Disclosure choice mechanics | SPE-861 | Out of read-side projection boundary |
| Mass-anomalous population wire-up | SPE-2122 | Deferred governance integration |

## See also

- `planning/disclosure-campaign-player-ui-slice-1.md` — player briefing UI (slice 1)
- `planning/public-disclosure-state-registry-slice-3.md` — weekly progression hook
