import {
  applyStealthLeaveBehindSelection,
  canSelectStealthLeaveBehindOnCase,
  listSelectableStealthLeaveBehinds,
  readStealthLeaveBehindSelection,
} from '../../domain/stealthLeaveBehindSelection'
import {
  evaluateStealthLeaveBehindMissionPressure,
  getStealthLeaveBehindById,
  DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY,
} from '../../domain/stealthLeaveBehindRegistry'
import type { CaseInstance, GameState } from '../../domain/models'

export interface StealthLeaveBehindOptionView {
  readonly id: string
  readonly label: string
  readonly discoveryRisk: number
  readonly custodyLossRefCount: number
  readonly summary?: string
  readonly selected: boolean
  readonly scoreAdjustmentPreview: number
}

export interface StealthLeaveBehindSelectionView {
  readonly visible: boolean
  readonly selectedLeaveBehindId?: string
  readonly options: readonly StealthLeaveBehindOptionView[]
  readonly activePressurePreview: boolean
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
    }
  }

  const selectedLeaveBehindId = readStealthLeaveBehindSelection(game, caseData.id)
  const options = listSelectableStealthLeaveBehinds(caseData).map((definition) => {
    const previewCase: CaseInstance = {
      ...caseData,
      stealthLeaveBehindId: definition.id,
    }
    const pressure = evaluateStealthLeaveBehindMissionPressure(previewCase)

    return {
      id: definition.id,
      label: definition.label,
      discoveryRisk: definition.discoveryRisk,
      custodyLossRefCount: definition.custodyLossRefs.length,
      summary: definition.summary,
      selected: selectedLeaveBehindId === definition.id,
      scoreAdjustmentPreview: pressure.scoreAdjustment,
    }
  })

  const activePressurePreview = evaluateStealthLeaveBehindMissionPressure(caseData).active

  return {
    visible: true,
    selectedLeaveBehindId,
    options,
    activePressurePreview,
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
