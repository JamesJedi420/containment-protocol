# SPE-854 — Mixed-source intake mission routing integration (parent slice 1)

One-page implementation plan. Linear: [SPE-2301](https://linear.app/spectranoir/issue/SPE-2301). Follows shipped weekly-hook slices [SPE-2292](https://linear.app/spectranoir/issue/SPE-2292)–[SPE-2300](https://linear.app/spectranoir/issue/SPE-2300).

| Field      | Value |
| ---------- | ----- |
| **Linear** | [SPE-2301 — Mixed-source intake mission routing integration (parent slice 1)](https://linear.app/spectranoir/issue/SPE-2301) |
| **Parent** | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) — Information intake and verification engine |
| **Branch** | `spe-854-information-intake-parent-integration-slice-1` |
| **Status** | **Shipped** (PR #2465) |

## Goal

Wire persisted `informationIntakeReports` into mission intake triage and routing so mixed-source verification and coverage signals adjust operational priority and intake source — without reopening weekly-hook mechanics.

## Prerequisite (on `main` @ `6b537551`)

| Shipped | Anchor |
| ------- | ------ |
| Intake report model + persistence | `informationIntakeReport.ts`, GameState (SPE-2292 / SPE-2293) |
| Topic coverage compose | `evaluateTopicIntakeCoverage` (SPE-2294) |
| Weekly corroboration + report notes | SPE-2295–SPE-2300 |

## Scope (this slice)

| In | Out |
| -- | --- |
| `missionIntakeInformationRouting.ts` — topic key resolution, report linkage, routing signals | New registry rows |
| `triageMission` score + `intake-*` reason codes | UI copy / triage panel layout |
| `deriveMissionIntakeSource(state)` nonstandard hook → `pressure` | Weekly tick / narrative template changes |
| Integration tests | Parent SPE-854 Done |

## Acceptance

- [ ] Canal-bridge mixed fixtures linked via `topic:` tag raise triage score and emit `intake-*` reason codes
- [ ] Conflicting incomplete intake maps to `pressure` when case would otherwise be `scripted`
- [ ] Missions without linked reports remain triage-stable
- [ ] `npm run test:run -- src/test/missionIntakeInformationRouting.integration.test.ts src/test/mission.intake.triage.routing.test.ts src/test/reportNoteTypeAudit.test.ts` and `npm run lint` pass

## File touch list

| Area | Files |
| ---- | ----- |
| Domain | `src/domain/missionIntakeInformationRouting.ts`, `src/domain/missionIntakeRouting.ts` |
| Tests | `src/test/missionIntakeInformationRouting.integration.test.ts` |
| Plan | `planning/information-intake-parent-integration-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| Full parent SPE-854 acceptance (remaining acceptance bullets) | [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Slice 1 covers routing integration only |
| UI surfacing of intake signals on Cases triage panel | SPE-16 or UX child | Domain-only slice |
| Hydration path `sanitizePersistedMissionRoutingState` intake linkage | Follow-up child | `normalizeMissionRecord` recomputes live state |

## Parent

Keep [SPE-854](https://linear.app/spectranoir/issue/SPE-854) **In Progress** until full parent acceptance ships.
