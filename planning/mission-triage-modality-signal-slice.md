# SPE-70 — Mission triage illusion/tell signal chips (SPE-2306)

One-page implementation plan. Linear: [SPE-2306](https://linear.app/spectranoir/issue/SPE-2306) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Deferred from shipped [SPE-2303](https://linear.app/spectranoir/issue/SPE-2303) / `planning/hidden-modality-matrix-slice-11.md`.

| Field      | Value |
| ---------- | ----- |
| **Linear** | [SPE-2306 — Mission triage illusion/tell signal chips](https://linear.app/spectranoir/issue/SPE-2306) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70) |
| **Branch** | `spe-2306-mission-triage-modality-signal-chips` |
| **Status** | In progress |

## Goal

Surface bounded **modality tell** and **illusion lifecycle** signals as read-only chips on the compact `/cases` triage list — reusing shipped domain helpers without new modality mechanics or layout refresh.

## Prerequisite (on `main` @ `f730ca14`)

| Shipped | Anchor |
| ------- | ------ |
| Modality tells | `hiddenStateModalityTells.ts` (SPE-2286) |
| Illusion lifecycle | `hiddenStateIllusionLifecycle.ts` (SPE-2285) |
| List scan chips | `buildMissionTriageListRowChips` (SPE-2259 / slice 6) |

## Scope (this slice)

| In | Out |
| -- | --- |
| `missionTriageModalitySignalView.ts` — tell + illusion markers | New modality families |
| Chip integration in `missionTriageLayoutView.ts` | Full triage layout / bulk actions |
| `CaseListItemView.modalitySignals` when triage options enabled | Orchestration / weekly tick changes |
| Targeted Vitest | SPE-854 intake UI (parent Done) |
| Slice doc + backlog shipped row | SPE-70 parent Done (chips only) |

## Acceptance

- [ ] Open case with authored tell tags shows preview tell chip on list row
- [ ] Assigned in-progress case shows active tell chip when `evaluateHiddenStateModalityTell` fires
- [ ] False-entity / structural-illusion cases show illusion chips (active + disproved)
- [ ] Resolved cases hide modality markers
- [ ] `npm run lint` + targeted `npm run test:run` green

## File touch list

| Area | Files |
| ---- | ----- |
| View | `src/features/cases/missionTriageModalitySignalView.ts` |
| Wiring | `caseView.ts`, `missionTriageLayoutView.ts`, `CasesPage.tsx`, `ShellStatusBar.tsx` |
| Tests | `src/test/missionTriageModalitySignalView.test.ts` |
| Docs | `planning/mission-triage-modality-signal-slice.md`, `planning/backlog.md`, `ux/mission-triage.md` |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Full SPE-70 parent Done | SPE-70 | Chips only; parent may stay Backlog |
| Mission triage compare-top-2 / bulk actions | SPE-16 | Out of slice boundary |
| SPE-854 intake signal chips on triage | SPE-16 or UX child | Separate deferred row from parent integration slices |

## Parent

Keep [SPE-70](https://linear.app/spectranoir/issue/SPE-70) **Backlog** until owner evaluates parent closure after chips ship.
