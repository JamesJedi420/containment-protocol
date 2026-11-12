# SPE-861 — Front Desk posture choice notice (slice 5)

One-page implementation plan. Linear: child under [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — **Front Desk posture choice notice orchestration (slice 5)** (create/claim on start). Parent [SPE-861](https://linear.app/spectranoir/issue/SPE-861) stays **Done** — full trust-to-compliance engine not in scope.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-861 child — Front Desk posture choice notice orchestration (slice 5)                                 |
| **Status** | **Shipped** — PR #2820 @ `da5b8fbf`                                                                        |
| **Parent** | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) — public trust and compliance engine (umbrella)    |
| **Branch** | `spe-861-front-desk-posture-choice-slice-5`                                                                |
| **Base `main` SHA** | `9e1f17bb`                                                                                          |

## Goal

Smallest authored-choice hook that surfaces pending disclosure posture decisions on the Front Desk when active campaigns lack a selected posture — reusing slice 4 write-side state and the existing `applyAuthoredChoice` executor.

## Prerequisite (on `main` @ `9e1f17bb`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Posture choice state | `publicDisclosurePostureChoices` + `applyPublicDisclosurePostureChoice` (SPE-861 slice 4) |
| Campaign briefing UI | `getPublicDisclosureCampaignView` + `/campaign/public-disclosure` (SPE-861 slice 1) |
| Trust outcome hook   | `projectPublicDisclosureTrustOutcomeFromGame` (SPE-861 slice 2)       |
| Front Desk attention | `buildAttentionItems` disclosure summary (slice 2–4)                   |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `listPendingPublicDisclosurePostureDecisions` domain helper        | Full SPE-861 compliance engine              |
| Front Desk briefing notices + authored posture choices               | SPE-2109 registry schema / sanitize changes |
| `set_public_disclosure_posture` authored-choice consequence        | Weekly tick contract changes                |
| `disclosure` Front Desk notice action target → campaign briefing     | Raw trust score surfacing in notice copy    |
| Front Desk + choiceSystem regression tests                           | Slice 2–4 projection contract changes       |
| Slice doc (this file) + backlog handoff                            | Campaign page posture UI changes            |

## Outcome contract

- **Pending detection** — active campaigns (`awarenessLevel !== 'secrecy_intact'`) without a stored posture appear as Front Desk briefing notices (sort-stable per record id).
- **Authored execution** — posture buttons route through `buildPublicDisclosurePostureChoices` → `applyAuthoredChoice` → `applyPublicDisclosurePostureChoice`.
- **Inactive when resolved** — notice and choices disappear once posture is set; idempotent re-selection stays unavailable.
- **Redaction** — notice copy uses record label only; no raw trust scores or cooperation-band duplication in notice body.
- **Attention item** — existing disclosure trust attention summary unchanged; posture prompt is the new briefing notice layer.

## Acceptance

- [x] Empty or secrecy-intact registry yields no disclosure posture notices
- [x] Active campaign without posture exposes three Front Desk choice buttons
- [x] Choosing a posture persists via authored-choice executor and clears the notice
- [x] Already-set posture keeps notice inactive
- [x] Notice copy does not surface numeric trust scores
- [x] Front Desk attention regression green
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publicDisclosurePostureChoice.ts`, `src/domain/choiceSystem.ts` |
| View   | `src/features/operations/frontDeskView.ts`, `src/features/operations/frontDeskChoices.ts` |
| Tests  | `src/test/frontDeskView.test.ts`, `src/test/choiceSystem.test.ts`, `src/test/publicDisclosurePostureChoice.test.ts` |
| Plan   | `planning/disclosure-campaign-player-ui-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full public-trust / compliance outcomes engine | SPE-861 follow-up | Parent umbrella; out of smallest hook boundary |
| Mass-anomalous population wire-up | SPE-2122 | Deferred governance integration |

## See also

- `planning/disclosure-campaign-player-ui-slice-4.md` — posture choice write-side (slice 4)
- `planning/disclosure-campaign-player-ui-slice-1.md` — player briefing UI (slice 1)
