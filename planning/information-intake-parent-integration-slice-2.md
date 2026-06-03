# SPE-854 — Mission routing hydration intake linkage (parent slice 2)

One-page implementation plan. Linear: [SPE-2304](https://linear.app/spectranoir/issue/SPE-2304). Deferred from [SPE-2301](https://linear.app/spectranoir/issue/SPE-2301) / `planning/information-intake-parent-integration-slice-1.md`.

| Field      | Value |
| ---------- | ----- |
| **Linear** | [SPE-2304 — Mission routing hydration intake linkage — parent slice 2](https://linear.app/spectranoir/issue/SPE-2304) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine |
| **Branch** | `spe-854-information-intake-parent-integration-slice-2` |
| **Status** | **In Progress** |

## Goal

On save hydration, recompute intake-linked triage fields (`triageScore`, `priorityReasonCodes`, `intakeSource`) from live `informationIntakeReports` and case tags. Do not serve stale persisted routing scores or reason codes when intake state changed.

## Prerequisite (slice 1 on `main`)

| Shipped | Anchor |
| ------- | ------ |
| Live intake triage | `triageMission` + `deriveMissionIntakeInformationSignals` (SPE-2301) |
| Intake persistence | `sanitizeInformationIntakeReports` hydrate path (SPE-2293) |

## Scope (this slice)

| In | Out |
| -- | --- |
| `SanitizeMissionRoutingContext` + hydrate triage baseline | Weekly intake tick / narrative templates (SPE-2295–2300) |
| `normalizeMissionRecord` intake-linked triage refresh | Cases triage UI layout |
| `sanitizePersistedMissionRoutingState` post-sanitize refresh | `InformationIntakeReportRecord` schema |
| `runTransfer` hydrate wiring | Parent SPE-854 Done |

## Acceptance

- [ ] Canal-bridge linked mission: save round-trip restores live `triageScore` and `intake-*` reason codes
- [ ] Unlinked mission: persisted triage fields unchanged after hydrate
- [ ] Player disposition / `triageIgnored` preserved on hydrate
- [ ] `npm run test:run -- src/test/missionIntakeInformationRouting.integration.test.ts src/test/missionIntakeRouting.hydration.test.ts` and `npm run lint` pass

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/missionIntakeRouting.ts`, `src/domain/missionIntakeInformationRouting.ts` |
| Hydrate | `src/app/store/runTransfer.ts` |
| Tests | `src/test/missionIntakeRouting.hydration.test.ts` |
| Plan | `planning/information-intake-parent-integration-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| Full parent SPE-854 acceptance (remaining bullets) | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Hydration linkage only |
| UI surfacing of intake signals on Cases triage panel | SPE-16 or UX child | Domain-only slice |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) tracking open per team convention until full parent acceptance ships; slice 2 does not close the parent.
