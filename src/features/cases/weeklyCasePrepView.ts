import { listInvestigationCustodyLossMarkers } from '../../domain/investigationCustodyLoss'
import { readInvestigationBudget } from '../../domain/investigationEconomy'
import type { CaseInstance, GameState } from '../../domain/models'
import { buildConcealmentCasePrepView } from './concealmentCasePrepView'
import { buildInfiltrationCasePrepView } from './infiltrationCasePrepView'
import {
  buildInvestigationCasePrepView,
  type InvestigationBudgetView,
} from './investigationCasePrepView'
import { buildStealthLeaveBehindSelectionView } from './stealthLeaveBehindSelectionView'

export interface WeeklyCasePrepSectionsView {
  readonly concealment: boolean
  readonly infiltration: boolean
  readonly stealthLeaveBehind: boolean
  readonly investigation: boolean
}

export interface WeeklyCasePrepView {
  readonly visible: boolean
  readonly sections: WeeklyCasePrepSectionsView
  readonly showSharedForensicBudget: boolean
  readonly forensicBudget: InvestigationBudgetView
  readonly custodyMarkerCount: number
}

export function buildWeeklyCasePrepView(
  caseData: CaseInstance,
  game: GameState
): WeeklyCasePrepView {
  const concealment = buildConcealmentCasePrepView(caseData, game)
  const infiltration = buildInfiltrationCasePrepView(caseData)
  const stealth = buildStealthLeaveBehindSelectionView(caseData, game)
  const investigation = buildInvestigationCasePrepView(caseData, game)

  const sections: WeeklyCasePrepSectionsView = {
    concealment: concealment.visible,
    infiltration: infiltration.visible,
    stealthLeaveBehind: stealth.visible,
    investigation: investigation.visible,
  }

  const visible = Object.values(sections).some(Boolean)
  const forensicBudget = readInvestigationBudget(game, caseData.id, 'forensic')
  const custodyMarkerCount = listInvestigationCustodyLossMarkers(game, caseData.id).length

  return {
    visible,
    sections,
    showSharedForensicBudget: sections.stealthLeaveBehind || sections.investigation,
    forensicBudget: {
      granted: forensicBudget.granted,
      spent: forensicBudget.spent,
      custodyLossBurden: forensicBudget.custodyLossBurden,
      remaining: forensicBudget.remaining,
      maxBudget: forensicBudget.maxBudget,
    },
    custodyMarkerCount,
  }
}
