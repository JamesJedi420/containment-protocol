# SPE-2247 — Stealth leave-behind tradeoff selection (slice 5)

## Shipped status

| Field                             | Value                                                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**                        | [SPE-2247](https://linear.app/spectranoir/issue/SPE-2247/stealth-leave-behind-tradeoff-selection-slice-5)                                     |
| **Parent**                        | [SPE-70](https://linear.app/spectranoir/issue/SPE-70)                                                                                         |
| **Merged PR**                     | [#2323](https://github.com/JamesJedi420/containment-protocol/pull/2323) — `feat(SPE-2247): stealth leave-behind tradeoff selection (slice 5)` |
| **Shipped scope**                 | Player selection of `stealthLeaveBehindId` on eligible cases; `stealthLeaveBehindSelection.ts` + `StealthLeaveBehindSelectionPanel`           |
| **Validation**                    | `stealthLeaveBehindSelection.test.ts`, `stealthLeaveBehindSelectionView.test.ts`                                                              |
| **Doc reconciliation (SPE-2278)** | May 2026 @ main `64225023` — shipped block is authoritative; historical sections below are archival only.                                     |

**Prerequisite (shipped):** SPE-2163 registry, SPE-2244 mission fallout, SPE-2246 template catalog + `advanceWeek` proof, investigation custody-loss markers + forensic `custodyLossBurden` (PR #2321).

> **Agent note:** Do not treat domain contract sections below as unimplemented.

---

## Original implementation plan (historical)

### Goal

Let players **choose** an authored stealth leave-behind on eligible infiltration cases before weekly resolution, instead of only using the template default. Selection must drive existing `evaluateStealthLeaveBehindMissionPressure()` and custody-loss apply paths unchanged in semantics.

## Non-goals

- Full SPE-867 evidence custody / SPE-809 `CustodyChain` pipeline
- Changing discovery-risk math or degrade priority order
- Runtime override of registry catalog rows
- Non-infiltration cases or cases without concealment eligibility

## Domain contract

### Eligibility (reuse; do not fork)

Same gates as `evaluateStealthLeaveBehindMissionPressure()`:

- `hiddenState === 'hidden'`
- Concealment activation tag present (via `isStealthLeaveBehindMissionEligible`)
- Valid `stealthLeaveBehindId` in `DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY` when pressure is evaluated

### New surface (pure)

```ts
// src/domain/stealthLeaveBehindSelection.ts (shipped)

listSelectableStealthLeaveBehinds(caseData, registry?): readonly StealthLeaveBehindDefinition[]

applyStealthLeaveBehindSelection(
  state: GameState,
  input: { caseId: string; leaveBehindId: string }
): { state: GameState; applied: boolean; reason?: 'invalid_case' | 'ineligible' | 'unknown_id' }

readStealthLeaveBehindSelection(state, caseId): string | undefined // from case instance
```

**Persistence:** write `cases[caseId].stealthLeaveBehindId` only (no new persistence shape). Optional flag `investigation.case.{caseId}.leave-behind.selection-locked` after first week of active pressure if re-pick must be blocked — prefer **allow change until first resolution** unless tests need lock.

### Defaulting rule

| State                     | `stealthLeaveBehindId` on case       |
| ------------------------- | ------------------------------------ |
| Spawn / instantiate       | Template default (current behavior)  |
| Player never selects      | Keep template default                |
| Player selects            | Overwrite instance field             |
| Invalid selection attempt | No mutation; return `applied: false` |

Templates remain authoritative **defaults**; catalog invariant `infiltrationProbePlan ⇒ stealthLeaveBehindId` stays.

## Wiring

1. **Assignment / case prep (UI or store action)** — call `applyStealthLeaveBehindSelection` when user picks a row.
2. **`advanceWeek`** — no new pressure logic; existing block after resolution already applies custody when pressure active + refs present.
3. **Preview** — `resolveAssignedCaseForWeek` / `previewResolutionForTeamIds` should reflect **current** `case.stealthLeaveBehindId` (already does if instance field set).

## UI / projection (minimal slice)

| Surface                             | Content                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Case detail (in-progress, eligible) | List 5 catalog rows: label, `discoveryRisk`, custody ref count; highlight current selection                                                   |
| Mission result / explanation        | Already receives custody note + leave-behind malus reasons                                                                                    |
| Forensic investigation              | Expose `custodyLossBurden` + marker count via `readInvestigationBudget` / `listInvestigationCustodyLossMarkers` (follow-up if not in same PR) |

Use existing Zustand/game store case mutation patterns; no new API routes (client-only SPA).

## Tests (TDD order)

1. `listSelectableStealthLeaveBehinds` — eligible hidden case → 5 ids; revealed / no concealment tag → `[]`
2. `applyStealthLeaveBehindSelection` — writes id; rejects unknown id; rejects ineligible case
3. Pressure integration — after apply, `evaluateStealthLeaveBehindMissionPressure` active with chosen id’s `discoveryRisk`
4. `advanceWeek` — tuned stealth case: change selection before week → resolution uses new malus (optional)
5. Regression — spawn still copies template default when player does not interact

## Shipped acceptance evidence

- [x] Player can set `stealthLeaveBehindId` on an eligible in-progress case from the canonical registry
- [x] Mission resolution and `advanceWeek` use the **instance** id, not re-read template at resolve time
- [x] Invalid / ineligible selection fails closed with stable `reason` codes
- [x] Template default remains when no selection API call runs
- [x] Vitest coverage for apply + eligibility; no full-suite regression

## Shipped file map

| Area      | Files                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------- |
| Domain    | `src/domain/stealthLeaveBehindSelection.ts`, `src/domain/stealthLeaveBehindRegistry.ts`         |
| View / UI | `src/features/cases/stealthLeaveBehindSelectionView.ts`, `StealthLeaveBehindSelectionPanel.tsx` |
| Store     | `src/app/store/gameStore.ts` (`selectStealthLeaveBehind`)                                       |
| Tests     | `src/test/stealthLeaveBehindSelection.test.ts`, `stealthLeaveBehindSelectionView.test.ts`       |

## Risks

- **Double custody apply:** selection change mid-week must not re-apply same refs; existing dedupe by flag suffix handles this
- **Preview vs live drift:** ensure preview reads same `CaseInstance` reference as live resolve
- **Template-only tests:** many tests set `stealthLeaveBehindId` directly — keep valid

## See also

- `src/domain/stealthLeaveBehindRegistry.ts`
- `src/domain/investigationCustodyLoss.ts`
- `src/domain/caseResolutionOrchestration.ts`
- `src/test/stealthLeaveBehindMission.test.ts`
