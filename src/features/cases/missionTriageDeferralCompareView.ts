import { AWARENESS_COMPLICATION_THRESHOLD } from '../../domain/infiltrationProbe'
import {
  hasHighMissionEscalationRisk,
  triageMission,
  type MissionTriageResult,
} from '../../domain/missionIntakeRouting'
import { isOperationalMajorIncidentCase } from '../../domain/majorIncidentOperations'
import type { CaseInstance, GameState } from '../../domain/models'
import {
  formatMissionTriageDeferralCarryoverDetail,
  formatMissionTriageDeferralCarryoverLink,
  formatMissionTriageDeferralRiskDetail,
  formatMissionTriageDeferralRiskValue,
  formatMissionTriageCovertPrepCostDetail,
  formatMissionTriageCovertPrepCostValue,
  MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS,
} from '../../data/copy'
import {
  buildMissionTriageCovertPrepSignals,
  type MissionTriageCovertPrepSignals,
} from './missionTriageCovertPrepView'
import {
  buildInfiltrationCasePrepView,
  canShowInfiltrationCasePrepOnCase,
  type InfiltrationCasePrepView,
} from './infiltrationCasePrepView'
import {
  buildInvestigationCasePrepView,
  canShowInvestigationCasePrepOnCase,
  type InvestigationCasePrepView,
} from './investigationCasePrepView'
import {
  buildStealthLeaveBehindSelectionView,
  type StealthLeaveBehindSelectionView,
} from './stealthLeaveBehindSelectionView'

export type MissionTriageDeferralCompareTone = 'low' | 'medium' | 'high'

export interface MissionTriageDeferralCompareColumn {
  readonly id: 'covertPrepCost' | 'deferralRisk' | 'escalationCarryover'
  readonly label: string
  readonly value: string
  readonly detail?: string
  readonly tone: MissionTriageDeferralCompareTone
}

export interface MissionTriageDeferralCompareCarryoverLink {
  readonly label: string
  readonly detail: string
}

export interface MissionTriageDeferralCompareView {
  readonly visible: boolean
  readonly columns: readonly MissionTriageDeferralCompareColumn[]
  readonly carryoverLink?: MissionTriageDeferralCompareCarryoverLink
}

interface DeferralComparePrepContext {
  readonly infiltration: InfiltrationCasePrepView | null
  readonly leaveBehind: StealthLeaveBehindSelectionView
  readonly investigation: InvestigationCasePrepView | null
}

const AWARENESS_COMPLICATION_PERCENT = Math.round(AWARENESS_COMPLICATION_THRESHOLD * 100)

function escalationBand(escalationRisk: number): MissionTriageDeferralCompareTone {
  if (escalationRisk >= 14) {
    return 'high'
  }

  if (escalationRisk >= 7) {
    return 'medium'
  }

  return 'low'
}

function buildDeferralComparePrepContext(
  caseData: CaseInstance,
  game: GameState
): DeferralComparePrepContext {
  return {
    infiltration: canShowInfiltrationCasePrepOnCase(caseData)
      ? buildInfiltrationCasePrepView(caseData)
      : null,
    leaveBehind: buildStealthLeaveBehindSelectionView(caseData, game),
    investigation: canShowInvestigationCasePrepOnCase(caseData)
      ? buildInvestigationCasePrepView(caseData, game)
      : null,
  }
}

function hasForensicStrain(investigation: InvestigationCasePrepView | null) {
  if (investigation === null || !investigation.visible) {
    return false
  }

  const forensic = investigation.forensic.budget
  return (
    investigation.custodyMarkers.length > 0 ||
    (forensic.granted > 0 && forensic.remaining === 0)
  )
}

function resolveCovertPrepCostTone(context: DeferralComparePrepContext): MissionTriageDeferralCompareTone {
  const { infiltration, leaveBehind, investigation } = context

  if (infiltration?.visible) {
    if (
      infiltration.hasCoverStrain ||
      infiltration.awarenessPercent >= AWARENESS_COMPLICATION_PERCENT
    ) {
      return 'high'
    }

    if (infiltration.probeProgressPercent > 0) {
      return 'medium'
    }
  }

  if (hasForensicStrain(investigation)) {
    return 'medium'
  }

  if (leaveBehind.visible && leaveBehind.selectedLeaveBehindId !== undefined) {
    return 'medium'
  }

  return 'low'
}

function infiltrationDrivesCovertPrepCost(context: DeferralComparePrepContext) {
  const infiltration = context.infiltration
  if (infiltration === null || !infiltration.visible) {
    return false
  }

  return (
    infiltration.hasCoverStrain ||
    infiltration.awarenessPercent >= AWARENESS_COMPLICATION_PERCENT ||
    infiltration.probeProgressPercent > 0
  )
}

function buildCovertPrepCostColumn(
  context: DeferralComparePrepContext
): MissionTriageDeferralCompareColumn {
  const tone = resolveCovertPrepCostTone(context)
  const { infiltration, leaveBehind, investigation } = context

  let detail: string
  if (infiltration !== null && infiltration.visible && infiltrationDrivesCovertPrepCost(context)) {
    detail = formatMissionTriageCovertPrepCostDetail(
      infiltration.effectiveActionLabel,
      infiltration.awarenessPercent,
      infiltration.hasCoverStrain
    )
  } else if (hasForensicStrain(investigation)) {
    detail = MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.covertPrepForensicDetail
  } else if (leaveBehind.visible && leaveBehind.selectedLeaveBehindId !== undefined) {
    detail = MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.covertPrepLeaveBehindDetail
  } else {
    detail = MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.covertPrepConcealmentDetail
  }

  return {
    id: 'covertPrepCost',
    label: MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.covertPrepCost,
    value: formatMissionTriageCovertPrepCostValue(tone),
    detail,
    tone,
  }
}

function buildDeferralRiskColumn(
  caseData: CaseInstance,
  triage: MissionTriageResult
): MissionTriageDeferralCompareColumn {
  const escalationRisk = triage.dimensions.escalationRisk
  const tone = escalationBand(escalationRisk)

  return {
    id: 'deferralRisk',
    label: MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.deferralRisk,
    value: formatMissionTriageDeferralRiskValue(tone, escalationRisk),
    detail: formatMissionTriageDeferralRiskDetail(
      caseData.deadlineRemaining,
      caseData.stage
    ),
    tone,
  }
}

function buildEscalationCarryoverColumn(caseData: CaseInstance): MissionTriageDeferralCompareColumn {
  const highEscalation = hasHighMissionEscalationRisk(caseData)
  const criticalStage = caseData.stage >= 4
  const raidPressure = caseData.kind === 'raid'
  const tone: MissionTriageDeferralCompareTone =
    highEscalation || criticalStage ? 'high' : raidPressure || caseData.stage >= 2 ? 'medium' : 'low'

  return {
    id: 'escalationCarryover',
    label: MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.escalationCarryover,
    value: formatMissionTriageDeferralCarryoverLink(tone),
    detail: formatMissionTriageDeferralCarryoverDetail(caseData.stage, caseData.kind),
    tone,
  }
}

function shouldShowDeferralCompare(
  caseData: CaseInstance,
  triage: MissionTriageResult,
  covertVisible: boolean
): boolean {
  if (caseData.status !== 'in_progress' || isOperationalMajorIncidentCase(caseData)) {
    return false
  }

  if (covertVisible) {
    return true
  }

  if (triage.dimensions.escalationRisk >= 7) {
    return true
  }

  return caseData.deadlineRemaining <= 2
}

function shouldShowCarryoverLink(caseData: CaseInstance, triage: MissionTriageResult) {
  return (
    hasHighMissionEscalationRisk(caseData) || triage.reasonCodes.includes('escalation-high')
  )
}

export interface BuildMissionTriageDeferralCompareViewOptions {
  readonly covertPrepSignals?: MissionTriageCovertPrepSignals
}

export function buildMissionTriageDeferralCompareView(
  caseData: CaseInstance,
  game: GameState,
  options?: BuildMissionTriageDeferralCompareViewOptions
): MissionTriageDeferralCompareView {
  const resolvedCase = game.cases[caseData.id] ?? caseData
  const covertPrepSignals =
    options?.covertPrepSignals ?? buildMissionTriageCovertPrepSignals(resolvedCase, game)
  const triage = triageMission(game, resolvedCase)

  if (!shouldShowDeferralCompare(resolvedCase, triage, covertPrepSignals.visible)) {
    return { visible: false, columns: [] }
  }

  const prepContext = buildDeferralComparePrepContext(resolvedCase, game)
  const columns = [
    buildCovertPrepCostColumn(prepContext),
    buildDeferralRiskColumn(resolvedCase, triage),
    buildEscalationCarryoverColumn(resolvedCase),
  ]

  const carryoverLink = shouldShowCarryoverLink(resolvedCase, triage)
    ? {
        label: MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.carryoverLinkLabel,
        detail: MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.carryoverLinkDetail,
      }
    : undefined

  return {
    visible: true,
    columns,
    carryoverLink,
  }
}
