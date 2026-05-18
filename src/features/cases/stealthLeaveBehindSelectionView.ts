import {
  applyStealthLeaveBehindSelection,
  canSelectStealthLeaveBehindOnCase,
  listSelectableStealthLeaveBehinds,
  readStealthLeaveBehindSelection,
} from '../../domain/stealthLeaveBehindSelection'
import { projectInvestigationCustodyLossBurdenAfterRefs } from '../../domain/investigationCustodyLoss'
import { readInvestigationBudget } from '../../domain/investigationEconomy'
import {
  evaluateStealthLeaveBehindMissionPressure,
  getStealthLeaveBehindById,
  DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY,
} from '../../domain/stealthLeaveBehindRegistry'
import type { CaseInstance, GameState } from '../../domain/models'

export interface StealthLeaveBehindForensicBudgetPreview {
  readonly granted: number
  readonly spent: number
  readonly custodyLossBurden: number
  readonly remaining: number
  readonly markerCount: number
}

export interface StealthLeaveBehindOptionView {
  readonly id: string
  readonly label: string
  readonly discoveryRisk: number
  readonly custodyLossRefCount: number
  readonly summary?: string
  readonly selected: boolean
  readonly scoreAdjustmentPreview: number
  readonly projectedCustodyLossBurden: number
  readonly projectedForensicRemaining: number
}

export interface StealthLeaveBehindSelectionView {
  readonly visible: boolean
  readonly selectedLeaveBehindId?: string
  readonly options: readonly StealthLeaveBehindOptionView[]
  readonly activePressurePreview: boolean
  readonly forensicBudget: StealthLeaveBehindForensicBudgetPreview
}

function projectForensicRemaining(granted: number, spent: number, custodyLossBurden: number) {
  return Math.max(0, granted - spent - custodyLossBurden)
}

function buildForensicBudgetPreview(game: GameState, caseId: string): StealthLeaveBehindForensicBudgetPreview {
  const budget = readInvestigationBudget(game, caseId, 'forensic')

  return {
    granted: budget.granted,
    spent: budget.spent,
    custodyLossBurden: budget.custodyLossBurden,
    remaining: budget.remaining,
    markerCount: budget.custodyLossBurden,
  }
}

export function buildStealthLeaveBehindSelectionView(
  caseData: CaseInstance,
  game: GameState
): StealthLeaveBehindSelectionView {
  if (!canSelectStealthLeaveBehindOnCase(caseData)) {
    return {
      visible: false,
      options: [],
      activePressurePreview: false,
      forensicBudget: {
        granted: 0,
        spent: 0,
        custodyLossBurden: 0,
        remaining: 0,
        markerCount: 0,
      },
    }
  }

  const forensicBudget = buildForensicBudgetPreview(game, caseData.id)
  const selectedLeaveBehindId = readStealthLeaveBehindSelection(game, caseData.id)
  const options = listSelectableStealthLeaveBehinds(caseData).map((definition) => {
    const previewCase: CaseInstance = {
      ...caseData,
      stealthLeaveBehindId: definition.id,
    }
    const pressure = evaluateStealthLeaveBehindMissionPressure(previewCase)
    const projectedCustodyLossBurden = projectInvestigationCustodyLossBurdenAfterRefs(
      game,
      caseData.id,
      definition.custodyLossRefs
    )

    return {
      id: definition.id,
      label: definition.label,
      discoveryRisk: definition.discoveryRisk,
      custodyLossRefCount: definition.custodyLossRefs.length,
      summary: definition.summary,
      selected: selectedLeaveBehindId === definition.id,
      scoreAdjustmentPreview: pressure.scoreAdjustment,
      projectedCustodyLossBurden,
      projectedForensicRemaining: projectForensicRemaining(
        forensicBudget.granted,
        forensicBudget.spent,
        projectedCustodyLossBurden
      ),
    }
  })

  const activePressurePreview = evaluateStealthLeaveBehindMissionPressure(caseData).active

  return {
    visible: true,
    selectedLeaveBehindId,
    options,
    activePressurePreview,
    forensicBudget,
  }
}

export function selectStealthLeaveBehindOnCase(
  game: GameState,
  caseId: string,
  leaveBehindId: string
) {
  return applyStealthLeaveBehindSelection(game, { caseId, leaveBehindId })
}

export function describeStealthLeaveBehindSelection(
  game: GameState,
  caseId: string
): string | undefined {
  const selectedId = readStealthLeaveBehindSelection(game, caseId)
  if (!selectedId) {
    return undefined
  }

  const definition = getStealthLeaveBehindById(DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY, selectedId)
  return definition?.label
}
