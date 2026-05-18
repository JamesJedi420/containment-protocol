import { readPersistentFlag } from '../../domain/flagSystem'
import { listInvestigationCustodyLossMarkers } from '../../domain/investigationCustodyLoss'
import {
  buildInvestigationAskedFlagId,
  buildInvestigationLeverageFlagId,
  listInvestigationQuestionSet,
  readInvestigationBudget,
  type InvestigationQuestionDomain,
} from '../../domain/investigationEconomy'
import type { CaseInstance, GameState } from '../../domain/models'

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
}

export function canShowInvestigationCasePrepOnCase(caseData: CaseInstance) {
  return caseData.status === 'in_progress'
}

function buildDomainPrepView(
  game: GameState,
  caseId: string,
  domain: InvestigationQuestionDomain
): InvestigationDomainPrepView {
  const budget = readInvestigationBudget(game, caseId, domain)
  const questions = listInvestigationQuestionSet(domain).map((question) => {
    const asked = Boolean(readPersistentFlag(game, buildInvestigationAskedFlagId(caseId, question.id)))
    const leverageActive = asked
      ? Boolean(readPersistentFlag(game, buildInvestigationLeverageFlagId(caseId, question.leverage.id)))
      : false

    return {
      id: question.id,
      prompt: question.prompt,
      answer: question.answer,
      asked,
      canAsk: !asked && budget.remaining > 0,
      leverageLabel: leverageActive ? question.leverage.label : undefined,
      leverageDescription: leverageActive ? question.leverage.description : undefined,
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
  }
}
