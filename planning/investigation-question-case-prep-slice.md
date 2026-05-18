# SPE-626 slice — Investigation question case prep (UI)

One-page implementation plan. Parent: [SPE-626 — Question-budget investigation and tactical reads](https://linear.app/spectranoir/issue/SPE-626/question-budget-investigation-and-tactical-reads). Complements merged [SPE-2247](https://linear.app/spectranoir/issue/SPE-2247/stealth-leave-behind-tradeoff-selection-slice-5) / PR #2323.

## Why this is next

| Shipped | Gap |
| --- | --- |
| `investigationEconomy.ts` — budgets, `askInvestigationQuestion`, leverage flags | No case-detail UI; no store action for player asks |
| `advanceWeek` — `applySuccessfulInvestigation`, auto tactical read on recon success | Player cannot spend forensic budget before resolve except via sim paths |
| `investigationCustodyLoss.ts` — markers + `custodyLossBurden` on forensic budget | Markers only visible indirectly via leave-behind **preview**; no post-resolution list |
| SPE-521 / SPE-70 infiltration + leave-behind stacks | Domain-complete; player prep surfaces still thin on case detail |

**Backlog alignment:** `planning/backlog.md` item 2 (infiltration follow-through) is largely domain-done; item 1 (hidden activation) is broader. This slice tightens the **investigation / casework** loop on the same case-detail surface as leave-behind selection.

## Goal

On **in-progress** cases, let the player:

1. See forensic and tactical question **budget** (granted / spent / custody burden / remaining).
2. **Ask** catalog questions via store action (deterministic `askInvestigationQuestion`).
3. See **custody-loss markers** applied after stealth leave-behind resolution (read-only list).

Reuse existing domain math; no new persistence shapes.

## Non-goals

- New question catalogs or SPE-2159 fuzzy-clue registry
- Full SPE-867 `CustodyChain` pipeline
- Infiltration probe **player** action picker (`probe_access` / `probe_route` / `cleanup`) — separate slice under SPE-521 deferred UX
- Granting budget from UI (keep `applySuccessfulInvestigation` / `advanceWeek` as grant sources)

## Domain contract (reuse only)

```ts
// Already in src/domain/investigationEconomy.ts
readInvestigationBudget(state, caseId, 'forensic' | 'tactical')
listInvestigationQuestionSet(domain)
askInvestigationQuestion(state, { caseId, domain, questionId })

// Already in src/domain/investigationCustodyLoss.ts
listInvestigationCustodyLossMarkers(state, caseId)
```

No new domain file required unless a thin `canAskInvestigationQuestionOnCase(case)` helper reduces duplication (optional).

## View / store surface

```ts
// src/features/cases/investigationCasePrepView.ts

buildInvestigationCasePrepView(caseData, game): {
  visible: boolean
  forensic: InvestigationDomainPrepView
  tactical: InvestigationDomainPrepView
  custodyMarkers: readonly CustodyMarkerView[]
}

// gameStore
askInvestigationQuestion: (caseId, domain, questionId) => void
```

`InvestigationDomainPrepView`: budget snapshot, questions with `asked` / `disabled` (budget exhausted), leverage flag labels when applied.

## UI (minimal)

| Surface | Content |
| --- | --- |
| `CaseDetailPage` `detail-main` | `InvestigationCasePrepPanel` below leave-behind panel (or merged forensic budget strip later) |
| Forensic block | Budget line; list FORENSIC_QUESTIONS; Ask / Asked per row; show answer + leverage on success |
| Tactical block | Same for TACTICAL_READ_QUESTIONS |
| Custody strain | When `custodyMarkers.length > 0`, list ref + leave-behind label + applied week |

**Eligibility:** `caseData.status === 'in_progress'` (mirror leave-behind panel). Resolved cases: hide panel or read-only asked state only — prefer **hide** for slice 1.

## Wiring

1. Store calls `askInvestigationQuestion`; no-op when `applied: false` (same pattern as `selectStealthLeaveBehind`).
2. Do **not** call `askInvestigationQuestion` from `advanceWeek` paths differently — existing auto tactical read stays.
3. Forensic `remaining` already subtracts `custodyLossBurden` — panel should match `readInvestigationBudget` (same source as leave-behind preview).

## Tests (TDD order)

1. `buildInvestigationCasePrepView` — hidden for open/resolved; shows budgets after `applySuccessfulInvestigation` or `grantInvestigationQuestionBudget`
2. `buildInvestigationCasePrepView` — custody markers listed when flags present
3. `askInvestigationQuestion` store action — spends budget, sets asked flag, returns leverage id
4. `CaseDetailPage.test.tsx` — panel visible on tuned in-progress case; ask forensic question updates UI
5. Regression — `investigationEconomy.test.ts` / `sim.investigationEconomy.integration.test.ts` unchanged

## Acceptance criteria

- [ ] Player can ask a forensic and a tactical catalog question on an in-progress case with budget
- [ ] Asked questions cannot be re-asked; exhausted budget disables remaining rows
- [ ] Custody markers from leave-behind fallout appear on case detail after `advanceWeek` apply
- [ ] Forensic remaining reflects `custodyLossBurden` consistently with leave-behind panel
- [ ] Vitest coverage for view + case detail + store; CI green

## File touch list (expected)

| Area | Files |
| --- | --- |
| View | `src/features/cases/investigationCasePrepView.ts` |
| UI | `src/features/cases/InvestigationCasePrepPanel.tsx` |
| Page | `src/features/cases/CaseDetailPage.tsx` |
| Store | `src/app/store/gameStore.ts` |
| Tests | `src/test/investigationCasePrepView.test.ts`, `src/features/cases/CaseDetailPage.test.tsx` |

## Risks

- **Double spend:** store must use domain result; do not decrement clocks locally
- **Panel clutter:** three panels on infiltration cases — acceptable for slice; consolidate budget strip in follow-up
- **SPE-626 Linear status:** domain AC largely met in repo; close parent or add child issue when UI ships

## Runner-up (next after this)

1. **Infiltration case prep panel** — probe progress, awareness, stage, cover posture summary, optional weekly probe action override (SPE-521 deferred UX).
2. **SPE-1464** — branch/path continuity validation (backlog near-term hint).
3. **Hidden activation expansion** — backlog #1; broader than case-detail slice.

## See also

- `src/domain/investigationEconomy.ts`
- `src/domain/investigationCustodyLoss.ts`
- `src/features/cases/stealthLeaveBehindSelectionView.ts` (forensic budget preview pattern)
- `planning/stealth-leave-behind-tradeoff-selection-slice-5.md`
