# SPE-2116 — Naming-hazard descriptor registry planning mirror UI (slice 5)

One-page implementation plan. Linear: [SPE-2405](https://linear.app/spectranoir/issue/SPE-2405) (child under [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116)). Follows shipped slice 4 (`planning/naming-hazard-descriptor-registry-slice-4.md`, PR #2588).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2405 — Naming-hazard descriptor registry planning mirror UI (slice 5)](https://linear.app/spectranoir/issue/SPE-2405) |
| **Parent** | [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) — registry anchor; umbrella [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) stays open |
| **Branch** | `spe-2116-naming-hazard-mirror-ui-slice-5`                                                                 |
| **Status** | **Ready for PR**                                                                                           |
| **Base `main` SHA** | `a550df90`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `namingHazardDescriptorRecords` showing substitution state, confidence erosion markers, and intake cross-link labels for agent routing visibility — not player-facing canon.

## Prerequisite (on `main` @ `a550df90`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/namingHazardDescriptorRegistry.ts` (SPE-2116 slice 1)      |
| Persistence          | `namingHazardDescriptorRecords` on `GameState` (SPE-2357 / PR #2582)   |
| Investigation UI     | `investigationNamingHazardSubstitution.ts` (SPE-2359 / PR #2586)       |
| Cross-link compose   | `informationIntakeNamingHazardCrossLink.ts` (SPE-2358 / PR #2584)      |
| Weekly orchestration hook | `applyWeeklyNamingHazardDescriptorTick` (SPE-2360 / PR #2588)     |
| Sibling mirror template | `containedPersonTherapeuticCareMirrorView` (SPE-2344), `visualTriggerHazardMirrorView` (SPE-2338) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getNamingHazardDescriptorMirrorView` + `NamingHazardDescriptorMirrorPage` | New persistence fields                     |
| Route `/naming-hazard-descriptor` + Front Desk quick link | Weekly tick / sanitize contract changes       |
| View + component tests; one `advanceWeek` mirror integration assertion | `investigationNamingHazardSubstitution.ts` |
| Slice doc (this file) + backlog handoff                            | SPE-2358 cross-link compose changes           |
| Read-time `projectSafeLabel` + cross-link list helpers             | SPE-1309 parent closure                         |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation to drop entries.
- **Display guards** — `validateNamingHazardDescriptorRecord` surfaces warning-severity issues only; warning-only records remain visible.
- **Safe labels** — `projectSafeLabel` for briefing/map columns; when `trueNameForbidden`, primary display label uses briefing projection, not raw `record.label`.
- **Confidence** — show numeric confidence only when `'confidence' ∉ redactedFields`.
- **Cross-links** — `listIntakeReportsForNamingHazardDescriptor` at mirror build; read-only compose labels.
- **Orchestration markers** — surface `orchestration_week:*` tokens from `unknownFields` (slice 4 weekly tick).
- **Empty state** — when `namingHazardDescriptorRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `namingHazardDescriptorRecords` map renders empty state without throw
- [x] Records table shows substitution policy, map label mode, and safe briefing/map labels
- [x] `trueNameForbidden` records use safe briefing label for primary display, not raw `record.label`
- [x] Confidence redaction and orchestration week markers display after weekly tick fields
- [x] Intake cross-link labels surface when reports share topic refs
- [x] Warning-only records still shown with validation warning labels
- [x] Front Desk quick link routes to mirror page
- [x] `advanceWeek` integration asserts mirror reflects post-tick substitution state
- [x] `npm run lint` + targeted tests + slice 1–4 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/namingHazardDescriptorMirrorView.ts`           |
| UI     | `src/features/operations/NamingHazardDescriptorMirrorPage.tsx`          |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/namingHazardDescriptorMirrorView.test.ts`, `NamingHazardDescriptorMirrorPage.test.tsx`, `src/test/advanceWeek.namingHazardDescriptor.integration.test.ts` |
| Plan   | `planning/naming-hazard-descriptor-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cross-link surfacing in triage/report notes | SPE-854 / UX owner | Out of mirror UI boundary |
| SPE-1464 runtime validation hooks | SPE-1464 | Optional backlog follow-up |
| Bundle compose chain integration | SPE-854 / SPE-2108 follow-up | Out of slice 5 boundary |
| Richer monitoring cadence / transition history | SPE-2116 follow-up | Needs new persistence fields |
| SPE-2116 parent Done | SPE-2116 | Slice 5 is mirror UI only; umbrella SPE-2108 may stay open |

## See also

- `planning/naming-hazard-descriptor-registry-slice-1.md`
- `planning/naming-hazard-descriptor-registry-slice-2.md`
- `planning/naming-hazard-descriptor-registry-slice-3.md`
- `planning/naming-hazard-descriptor-registry-slice-4.md`
- `planning/contained-person-therapeutic-care-registry-slice-4.md` — mirror UI template (SPE-2344)
