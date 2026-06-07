import { readPersistentFlag } from '../../domain/flagSystem'
import { listInvestigationCustodyLossMarkers } from '../../domain/investigationCustodyLoss'
import {
  buildInvestigationAskedFlagId,
  listInvestigationQuestionSet,
  readInvestigationBudget,
  type InvestigationQuestionDomain,
} from '../../domain/investigationEconomy'
import {
  buildInvestigationNamingHazardDescriptorViews,
  type InvestigationNamingHazardDescriptorView,
} from '../../domain/investigationNamingHazardSubstitution'
import type { CaseInstance, GameState } from '../../domain/models'

export type { InvestigationNamingHazardDescriptorView }

export interface InvestigationBudgetView {
  readonly granted: number
  readonly spent: number
  readonly custodyLossBurden: number
  readonly remaining: number
  readonly maxBudget: number
}

export interface InvestigationQuestionRowView {
  readonly id: string
  readonly prompt: string
  readonly answer: string
  readonly asked: boolean
  readonly canAsk: boolean
  readonly leverageLabel?: string
  readonly leverageDescription?: string
}

export interface InvestigationDomainPrepView {
  readonly domain: InvestigationQuestionDomain
  readonly domainLabel: string
  readonly budget: InvestigationBudgetView
  readonly questions: readonly InvestigationQuestionRowView[]
}

export interface InvestigationCustodyMarkerView {
  readonly ref: string
  readonly leaveBehindLabel: string
  readonly appliedWeek: number
}

export interface InvestigationCasePrepView {
  readonly visible: boolean
  readonly forensic: InvestigationDomainPrepView
  readonly tactical: InvestigationDomainPrepView
  readonly custodyMarkers: readonly InvestigationCustodyMarkerView[]
  readonly namingHazardDescriptors: readonly InvestigationNamingHazardDescriptorView[]
}

export function canShowInvestigationCasePrepOnCase(caseData: CaseInstance) {
  return caseData.status === 'in_progress'
}

/** Shared with mission triage covert chips and deferral-compare (SPE-2255 / SPE-16 slice 2). */
export function hasInvestigationForensicStrain(investigation: InvestigationCasePrepView | null) {
  if (investigation === null || !investigation.visible) {
    return false
  }

  const forensic = investigation.forensic.budget
  return (
    investigation.custodyMarkers.length > 0 ||
    (forensic.granted > 0 && forensic.remaining === 0)
  )
}

export function canAskInvestigationQuestionOnCase(caseData: CaseInstance | undefined) {
  return caseData !== undefined && canShowInvestigationCasePrepOnCase(caseData)
}

function buildDomainPrepView(
  game: GameState,
  caseId: string,
  domain: InvestigationQuestionDomain
): InvestigationDomainPrepView {
  const budget = readInvestigationBudget(game, caseId, domain)
  const questions = listInvestigationQuestionSet(domain).map((question) => {
    const asked = Boolean(readPersistentFlag(game, buildInvestigationAskedFlagId(caseId, question.id)))

    return {
      id: question.id,
      prompt: question.prompt,
      answer: question.answer,
      asked,
      canAsk: !asked && budget.remaining > 0,
      leverageLabel: asked ? question.leverage.label : undefined,
      leverageDescription: asked ? question.leverage.description : undefined,
    }
  })

  return {
    domain,
    domainLabel: domain === 'forensic' ? 'Forensic inquiry' : 'Tactical read',
    budget: {
      granted: budget.granted,
      spent: budget.spent,
      custodyLossBurden: budget.custodyLossBurden,
      remaining: budget.remaining,
      maxBudget: budget.maxBudget,
    },
    questions,
  }
}

const EMPTY_DOMAIN_VIEW: InvestigationDomainPrepView = {
  domain: 'forensic',
  domainLabel: 'Forensic inquiry',
  budget: {
    granted: 0,
    spent: 0,
    custodyLossBurden: 0,
    remaining: 0,
    maxBudget: 6,
  },
  questions: [],
}

export function buildInvestigationCasePrepView(
  caseData: CaseInstance,
  game: GameState
): InvestigationCasePrepView {
  if (!canShowInvestigationCasePrepOnCase(caseData)) {
    return {
      visible: false,
      forensic: EMPTY_DOMAIN_VIEW,
      tactical: { ...EMPTY_DOMAIN_VIEW, domain: 'tactical', domainLabel: 'Tactical read' },
      custodyMarkers: [],
      namingHazardDescriptors: [],
    }
  }

  const caseId = caseData.id
  const custodyMarkers = listInvestigationCustodyLossMarkers(game, caseId).map((marker) => ({
    ref: marker.ref,
    leaveBehindLabel: marker.label,
    appliedWeek: marker.appliedWeek,
  }))

  return {
    visible: true,
    forensic: buildDomainPrepView(game, caseId, 'forensic'),
    tactical: buildDomainPrepView(game, caseId, 'tactical'),
    custodyMarkers,
    namingHazardDescriptors: buildInvestigationNamingHazardDescriptorViews(game, caseData),
  }
}
