# SPE-2307 — Mission triage intake signal chips (slice 8 UX)

One-page implementation plan. Linear: [SPE-2307](https://linear.app/spectranoir/issue/SPE-2307). Deferred from [SPE-2301](https://linear.app/spectranoir/issue/SPE-2301) / [SPE-2304](https://linear.app/spectranoir/issue/SPE-2304) / `planning/information-intake-parent-integration-slice-1.md`.

| Field      | Value |
| ---------- | ----- |
| **Linear** | [SPE-2307 — Mission triage intake signal chips (slice 8 UX)](https://linear.app/spectranoir/issue/SPE-2307) |
| **Parent** | [SPE-16](https://linear.app/spectranoir/issue/SPE-16) — Mission Intake, Triage, & Routing |
| **Branch** | `spe-2307-mission-triage-intake-signal-chips` |
| **Status** | **In PR** — https://github.com/JamesJedi420/containment-protocol/pull/2477 |

## Goal

Surface bounded **intake-* reason codes** as read-only chips on the compact `/cases` triage list and detail panel — reusing shipped domain helpers without weekly-hook or routing core changes.

## Prerequisite (on `main` @ `25eee991`)

| Shipped | Anchor |
| ------- | ------ |
| Intake routing signals | `deriveMissionIntakeInformationSignals` (SPE-2301) |
| Hydration linkage | `sanitizePersistedMissionRoutingState` intake refresh (SPE-2304) |
| List scan chips | `buildMissionTriageListRowChips` (SPE-2259 / slice 6) |
| Modality chips pattern | `missionTriageModalitySignalView.ts` (SPE-2306 / slice 7) |

## Scope (this slice)

| In | Out |
| -- | --- |
| `missionTriageIntakeSignalView.ts` — intake marker builder (max 2 markers) | `missionIntakeInformationRouting.ts` core changes |
| Chip integration in `missionTriageLayoutView.ts` + `caseView.ts` | Weekly intake tick / registry wave |
| `includeIntakeSignals` on triage list/detail consumers | Compare-top-2 / bulk actions |
| Targeted Vitest (canal-bridge fixture) | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) parent reopen |

## Acceptance

- [ ] Canal-bridge linked mission shows intake chips on list row (`Intake: conflict`, `Intake: incomplete`)
- [ ] Unlinked missions show no intake chips
- [ ] Resolved missions hide intake markers
- [ ] Chips derive from live `informationIntakeReports`, not stale persisted routing codes
- [ ] `npm run lint` + targeted Vitest green

## File touch list

| Area | Files |
| ---- | ----- |
| View | `src/features/cases/missionTriageIntakeSignalView.ts` |
| Wiring | `caseView.ts`, `missionTriageLayoutView.ts`, `CasesPage.tsx`, `ShellStatusBar.tsx` |
| Tests | `src/test/missionTriageIntakeSignalView.test.ts` |
| Docs | `planning/mission-triage-intake-signal-slice.md`, `planning/backlog.md`, `ux/mission-triage.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Raise global row chip cap above 5 | SPE-16 | Intake capped locally at 2; busy rows may still drop modality/covert chips |
| Full SPE-16 parent Done | SPE-16 | Chips-only slice; parent stays Backlog |
| Compare-top-2 / bulk actions | SPE-16 | Out of slice boundary |

## Parent

Keep [SPE-16](https://linear.app/spectranoir/issue/SPE-16) **Backlog** — slice 8 is child evidence only.
