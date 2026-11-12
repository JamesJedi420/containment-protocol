# SPE-2116 — Naming-hazard descriptor registry weekly orchestration hook (slice 4)

One-page implementation plan. Linear: child under [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116). Follows shipped slice 3 (`planning/naming-hazard-descriptor-registry-slice-3.md`, PR #2586). Mirrors [SPE-2343](https://linear.app/spectranoir/issue/SPE-2343) / [SPE-2317](https://linear.app/spectranoir/issue/SPE-2317) weekly-hook pattern.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2360 — Naming-hazard descriptor registry weekly orchestration hook (slice 4)](https://linear.app/spectranoir/issue/SPE-2360)                             |
| **Parent** | [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) — registry anchor; umbrella [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) stays open |
| **Branch** | `spe-2116-naming-hazard-weekly-hook-slice-4`                                                               |
| **Status** | **Shipped** — PR #2588 @ `8e0f5d0a`                                                                                            |
| **Base `main` SHA** | `37d3d2bb`                                                                                          |

## Goal

Wire persisted `namingHazardDescriptorRecords` into `advanceWeek` with a pure domain tick: substitution-policy hardening and confidence erosion using existing record fields only.

## Prerequisite (on `main` @ `37d3d2bb`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/namingHazardDescriptorRegistry.ts` (SPE-2116 slice 1)      |
| Persistence          | `namingHazardDescriptorRecords` on `GameState` (SPE-2357 / PR #2582)   |
| Investigation UI     | `investigationNamingHazardSubstitution.ts` (SPE-2359 / PR #2586)       |
| Cross-link compose   | `informationIntakeNamingHazardCrossLink.ts` (SPE-2358 / PR #2584)      |
| Sibling weekly hooks | `containedPersonTherapeuticCareWeeklyOrchestration.ts` (SPE-2343), `unexplainedLocationWeeklyLifecycle.ts` (SPE-2317) |

## Orchestration tick contract (slice 4)

| Step | Rule |
| --- | --- |
| **Idempotency** | Before mutation, if `unknownFields` contains `orchestration_week:<week>` (sorted, de-duped list), no-op. On successful mutation, append that token. |
| **One step per week** | Composite candidate applies a single prioritized step, then freezes; re-tick same week returns same reference. |
| **Priority 1 — substitution hardening** | Only when `trueNameForbidden`; skip when `uiSubstitutionPolicy === 'redacted'`. `pool_descriptor` → `pool_with_grid_fallback`; `pool_with_grid_fallback` or `grid_ref` → `redacted`. When policy becomes `redacted`, sync `mapLabelMode` → `redacted` if not already. |
| **Priority 2 — confidence erosion** | Only when `confidence` defined, `'confidence' ∉ redactedFields`, and policy not yet `redacted`. Decrement by `0.02`, floor `0.25`; at floor append `'confidence'` to `redactedFields` (sorted). |
| **Pool stability** | Do not reorder `safeDescriptorPool`. |
| **Validation gate** | Invalid post-tick candidate → return source reference unchanged. |
| **Empty map** | Return same `{}` reference without throw. |

### `unknownFields` token convention

- Format: `orchestration_week:<normalizedWeek>` (e.g. `orchestration_week:5`).
- Orchestration-only marker; does not alter `projectSafeLabel` semantics.
- Sorted lexicographically with other `unknownFields` entries; de-duplicated.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyNamingHazardDescriptorTick` + `advanceNamingHazardDescriptorRecordForWeek` | New persistence fields, UI |
| Call from `advanceWeek` after week increment (`result.week`)       | `projectSafeLabel` contract changes           |
| Targeted domain + `advanceWeek` integration tests                  | `investigationNamingHazardSubstitution.ts`    |
| Slice doc (this file) + backlog handoff                            | Runtime compulsive-phrase lint in tick        |
|                                                                    | SPE-1464 branch continuity validator          |

## Acceptance

- [x] Empty `namingHazardDescriptorRecords` map is a no-op without throw
- [x] Substitution policy escalates pool_descriptor → pool_with_grid_fallback → redacted (with mapLabelMode sync)
- [x] Confidence erodes by fixed step; at floor appends `confidence` to `redactedFields`
- [x] Re-applying tick after advance is idempotent for the same week (`orchestration_week:<week>` marker)
- [x] Invalid post-tick record must not mutate source record
- [x] Terminal redacted policy and warning-only fixtures byte-stable where contract applies
- [x] `safeDescriptorPool` order unchanged after tick
- [x] `npm run lint` + targeted tests + naming-hazard + advanceWeek neighbor regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/namingHazardDescriptorWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/namingHazardDescriptorWeeklyOrchestration.test.ts`, `src/test/advanceWeek.namingHazardDescriptor.integration.test.ts` |
| Plan   | `planning/naming-hazard-descriptor-registry-slice-4.md`, `planning/backlog.md`, slice 3 deferred row |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cross-link surfacing in triage/report notes | SPE-854 / UX owner | Out of weekly-hook boundary |
| SPE-1464 runtime validation hooks | SPE-1464 | Optional backlog follow-up |
| Bundle compose chain integration | SPE-854 / SPE-2108 follow-up | Out of slice 4 boundary |
| Richer monitoring cadence / transition history | SPE-2116 slice 5+ | Needs new persistence fields |
| Mirror UI | SPE-2116 slice 5+ | After weekly hook ships |

## See also

- `planning/naming-hazard-descriptor-registry-slice-1.md`
- `planning/naming-hazard-descriptor-registry-slice-2.md`
- `planning/naming-hazard-descriptor-registry-slice-3.md`
- `planning/contained-person-therapeutic-care-registry-slice-3.md`
- `planning/unexplained-location-registry-slice-3.md`
