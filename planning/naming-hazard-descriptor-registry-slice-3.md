# SPE-2116 — Naming-hazard descriptor registry investigation UI substitution (slice 3)

One-page implementation plan. Linear: child under [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116). Follows shipped slice 2 (`planning/naming-hazard-descriptor-registry-slice-2.md`, PR #2582) and cross-link compose ([SPE-2358](https://linear.app/spectranoir/issue/SPE-2358) / PR #2584).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2359 — Naming-hazard descriptor registry investigation UI substitution (slice 3)](https://linear.app/spectranoir/issue/SPE-2359) |
| **Parent** | [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) — registry anchor; umbrella [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) stays open |
| **Branch** | `spe-2116-naming-hazard-ui-substitution-slice-3`                                                           |
| **Status** | **Shipped** — PR #2586 @ `1df0b0fa`                                                                        |
| **Base `main` SHA** | `5801844c`                                                                                          |

## Goal

Wire `projectSafeLabel` into investigation case-prep surfaces for persisted `namingHazardDescriptorRecords`. Route descriptors via intake topic cross-link list helpers; never leak true names when `trueNameForbidden`.

## Prerequisite (on `main` @ `5801844c`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema + projection | `src/domain/namingHazardDescriptorRegistry.ts` (SPE-2116 slice 1) |
| Persistence          | `namingHazardDescriptorRecords` on `GameState` (SPE-2357 / PR #2582) |
| Cross-link compose   | `informationIntakeNamingHazardCrossLink.ts` (SPE-2358 / PR #2584)     |
| Investigation prep   | `investigationCasePrepView.ts`, `InvestigationCasePrepPanel.tsx`       |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `investigationNamingHazardSubstitution.ts` domain projection       | New persistence fields                        |
| Topic routing via `listNamingHazardDescriptorsForIntakeTopic` + mission intake topic keys | Bundle compose chain |
| `buildInvestigationCasePrepView` + panel safe-label section        | SPE-76 procedural naming                        |
| Domain + view tests; persistence + cross-link regression         | `projectSafeLabel` contract changes             |
| Slice doc (this file) + backlog handoff                            | Cross-link surfacing in triage/report notes     |

## Acceptance

- [x] In-progress cases with linked naming-hazard descriptors show safe briefing labels in investigation prep
- [x] `trueNameForbidden` records never surface raw `record.label` in investigation views
- [x] Redacted / grid-fallback projection paths render deterministically
- [x] Empty descriptor pools / empty maps no-op without throw
- [x] `npm run lint` + targeted tests + persistence + SPE-2358 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/investigationNamingHazardSubstitution.ts`                 |
| Features | `src/features/cases/investigationCasePrepView.ts`, `InvestigationCasePrepPanel.tsx` |
| Tests  | `src/test/investigationNamingHazardSubstitution.test.ts`, `investigationCasePrepView.test.ts`, `CaseDetailPage.test.tsx` |
| Plan   | `planning/naming-hazard-descriptor-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cross-link surfacing in triage/report notes | SPE-854 / UX owner | Out of investigation-prep boundary |
| SPE-1464 runtime validation hooks | SPE-1464 | Optional backlog follow-up |
| Bundle compose chain integration | SPE-854 / SPE-2108 follow-up | Out of slice 3 boundary |
| Weekly orchestration hook | SPE-2116 slice 4+ | UI substitution only this slice |

## See also

- `planning/naming-hazard-descriptor-registry-slice-1.md`
- `planning/naming-hazard-descriptor-registry-slice-2.md`
- `planning/information-intake-naming-hazard-cross-link-slice-1.md`
